import { corsHeaders, jsonHeaders } from '../_shared/cors.ts';
import { logGenerationFailure } from '../_shared/generationFailures.ts';
import { computeRecoveryScore, proteinShare } from '../_shared/recovery.ts';
import { applyTrainingWeekdays, deriveAllowedEquipment } from '../_shared/planning.ts';
import { BLUEPRINTS } from '../_shared/blueprints/index.ts';
import { injuriesFromText, parseInjuries } from '../_shared/injuryRules.ts';
import {
  applyBlockWeek, applyRegenerationReason, fillBlueprint, fitPlan, nextBlockState, pickBlueprint, toPlan,
  type BlockState, type CatalogRow, type PlanOut,
} from '../_shared/planTree.ts';
import { UnauthorizedError, requireUser, userClientFromRequest } from '../_shared/supabaseClient.ts';
import { reportEdgeError } from '../_shared/sentry.ts';

// NG PHASE 5.4: the plan comes from a reviewed blueprint picked by rules (see _shared/planTree.ts). No model is
// called here, so there is no generation cap on this path either. The response keeps the shape the app has
// always read: { recovery, workout: { plan, ... }, generated }.

// experience x activity -> base training days/week, used only when the user hasn't chosen days.
const FREQUENCY_TABLE: Record<string, Record<string, number>> = {
  beginner: { sedentary: 2, moderate: 3, active: 3 },
  intermediate: { sedentary: 3, moderate: 4, active: 4 },
  advanced: { sedentary: 3, moderate: 4, active: 5 },
};

function computeTrainingDays(experienceLevel: string | null, activityLevel: string | null, age: number | null): number {
  const row = FREQUENCY_TABLE[experienceLevel ?? ''] ?? FREQUENCY_TABLE.intermediate;
  let days = row[activityLevel ?? ''] ?? row.moderate;
  if (age !== null && age >= 55) days = Math.min(days, 4);
  return days;
}

/** Months trained, when the profile doesn't say: a rough read from the experience level. */
const MONTHS_BY_LEVEL: Record<string, number> = { beginner: 0, intermediate: 12, advanced: 36 };

// Fallback used only if the catalog can't be read or a blueprint can't be filled, so the user always gets a usable plan.
const DEFAULT_PLAN: PlanOut = {
  days: [
    { day: 'Day 1', focus: 'Full Body', exercises: [
      { name: 'Bodyweight Squat', sets: 3, reps: 15, repMin: 12, repMax: 15, role: 'main', restSec: 90, rir: 2 },
      { name: 'Push-Up', sets: 3, reps: 10, repMin: 8, repMax: 12, role: 'main', restSec: 90, rir: 2 },
      { name: 'Plank', sets: 3, reps: 30, repMin: 30, repMax: 30, role: 'isolation', restSec: 60, rir: 2 },
    ] },
    { day: 'Day 2', focus: 'Full Body', exercises: [
      { name: 'Bodyweight Lunge', sets: 3, reps: 12, repMin: 10, repMax: 12, role: 'main', restSec: 90, rir: 2 },
      { name: 'Glute Bridge', sets: 3, reps: 15, repMin: 12, repMax: 15, role: 'main', restSec: 90, rir: 2 },
      { name: 'Bird Dog', sets: 3, reps: 10, repMin: 10, repMax: 10, role: 'isolation', restSec: 60, rir: 2 },
    ] },
  ],
  notes: 'Starter plan. Your setup will refresh it as soon as the exercise list is available.',
};

const GENERATION_COOLDOWN_MS = 30_000;

function deriveDaysPerWeek(personalizationProfile: Record<string, unknown> | null): number | null {
  const n = (personalizationProfile as { workoutDefaults?: { daysPerWeek?: unknown } } | null)?.workoutDefaults?.daysPerWeek;
  return typeof n === 'number' && n >= 2 && n <= 6 ? Math.round(n) : null;
}

function deriveTrainingDays(personalizationProfile: Record<string, unknown> | null): string[] | null {
  const wd = (personalizationProfile as { workoutDefaults?: { trainingDays?: unknown } } | null)?.workoutDefaults;
  return Array.isArray(wd?.trainingDays) && wd!.trainingDays!.length > 0 ? (wd!.trainingDays as string[]) : null;
}

const WORKOUT_COLUMNS = 'id, user_id, plan, created_at';
const WORKOUT_BLOCK_COLUMNS = `${WORKOUT_COLUMNS}, blueprint_id, block_number, block_week`;

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const supabase = userClientFromRequest(req);
    const user = await requireUser(supabase);

    const body = await req.json().catch(() => ({}));
    const reason = typeof body?.reason === 'string' ? body.reason : null;

    const last24h = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();

    // The NG 2 / NG 5 columns may not exist on an older database: ask for them, fall back to the old set.
    let profileRes = await supabase
      .from('profiles')
      .select('personalization_profile, equipment, age, goal, experience_level, training_months, session_minutes, injuries')
      .eq('id', user.id)
      .maybeSingle();
    if (profileRes.error) {
      profileRes = await supabase.from('profiles').select('personalization_profile, equipment, age, goal, experience_level').eq('id', user.id).maybeSingle();
    }
    const profile = profileRes.data as
      | { personalization_profile: Record<string, unknown> | null; equipment: string | null; age: number | null; goal: string | null; experience_level: string | null; training_months?: number | null; session_minutes?: number | null; injuries?: unknown }
      | null;

    let latestRes = await supabase.from('workouts').select(WORKOUT_BLOCK_COLUMNS).eq('user_id', user.id).order('created_at', { ascending: false }).limit(1).maybeSingle();
    if (latestRes.error) {
      latestRes = await supabase.from('workouts').select(WORKOUT_COLUMNS).eq('user_id', user.id).order('created_at', { ascending: false }).limit(1).maybeSingle();
    }
    const latestWorkout = latestRes.data as
      | { id: string; user_id: string; plan: unknown; created_at: string; blueprint_id?: string | null; block_number?: number | null; block_week?: number | null }
      | null;

    const [{ data: sleepLog }, { data: lastWorkout }, { data: recentMeals }] = await Promise.all([
      supabase.from('sleep_logs').select('hours, bedtime, wake_time, logged_at').eq('user_id', user.id).order('logged_at', { ascending: false }).limit(1).maybeSingle(),
      supabase.from('workout_logs').select('sets, reps_achieved, reps_prescribed, completed_at').eq('user_id', user.id).order('completed_at', { ascending: false }).limit(1).maybeSingle(),
      supabase.from('meal_logs').select('protein_g').eq('user_id', user.id).gte('logged_at', last24h),
    ]);

    const proteinTarget = (profile?.personalization_profile as { nutritionDefaults?: { protein_g?: number } } | null)?.nutritionDefaults?.protein_g ?? null;
    const proteinPct = proteinShare(recentMeals, proteinTarget);
    const recovery = computeRecoveryScore(sleepLog, lastWorkout, proteinPct === null ? null : { proteinPct });

    // Cooldown: a double-tap shouldn't create a second plan. Not applied when a regeneration reason was given.
    if (!reason && latestWorkout && Date.now() - new Date(latestWorkout.created_at).getTime() < GENERATION_COOLDOWN_MS) {
      return new Response(JSON.stringify({ recovery, workout: latestWorkout, cached: true }), { headers: jsonHeaders });
    }

    const personalizationProfile = (profile?.personalization_profile ?? null) as Record<string, unknown> | null;
    const workoutDefaults = (personalizationProfile as { workoutDefaults?: { injuries?: string; activityLevel?: string; dislikedExercises?: unknown } } | null)?.workoutDefaults;
    const trainingDays = deriveTrainingDays(personalizationProfile);
    const daysPerWeek = deriveDaysPerWeek(personalizationProfile) ?? trainingDays?.length || computeTrainingDays(profile?.experience_level ?? null, workoutDefaults?.activityLevel ?? null, profile?.age ?? null);
    const structured = parseInjuries(profile?.injuries);
    const injuries = structured.length > 0 ? structured : injuriesFromText(workoutDefaults?.injuries);
    const trainingMonths = profile?.training_months ?? MONTHS_BY_LEVEL[profile?.experience_level ?? ''] ?? 12;
    const dislikes = Array.isArray(workoutDefaults?.dislikedExercises) ? (workoutDefaults!.dislikedExercises as unknown[]).filter((x): x is string => typeof x === 'string') : [];

    const planProfile = { goal: profile?.goal ?? null, equipment: profile?.equipment ?? null, daysPerWeek, trainingMonths, sessionMinutes: profile?.session_minutes ?? null, injuries };

    const previousBlock =
      latestWorkout?.block_number && latestWorkout.block_week
        ? { blockNumber: latestWorkout.block_number, blockWeek: latestWorkout.block_week, createdAtMs: new Date(latestWorkout.created_at).getTime() }
        : null;
    const block: BlockState = nextBlockState(previousBlock, Date.now());

    let plan: PlanOut = DEFAULT_PLAN;
    let blueprintId: string | null = null;
    let generated = false;

    const { data: catalog, error: catalogError } = await supabase
      .from('exercises')
      .select('id, name, modality, equipment, primary_muscle, movement_pattern, role, stimulus_type')
      .eq('modality', 'strength')
      .in('equipment', deriveAllowedEquipment(profile?.equipment));

    if (catalogError || !catalog || catalog.length === 0) {
      const detail = catalogError?.message ?? 'exercise catalog is empty';
      console.error('[generate-plan] FELL BACK: could not read the exercise catalog:', detail);
      await logGenerationFailure(supabase, user.id, 'generate-plan', 'grounding_emptied', detail);
    } else {
      const picked = pickBlueprint(planProfile, BLUEPRINTS);
      const filled = fillBlueprint(picked.blueprint, catalog as CatalogRow[], {
        seed: user.id,
        allowedEquipment: deriveAllowedEquipment(profile?.equipment),
        injuries,
        blockNumber: block.blockNumber,
        dislikes,
        variant: reason === 'wrong_focus' ? Math.floor(Date.now() / 1000) : 0,
      });
      const fitted = fitPlan(filled, planProfile, picked.blueprint.goal);
      const adjusted = applyBlockWeek(applyRegenerationReason(fitted.plan, reason), block.blockWeek);
      if (adjusted.days.length === 0) {
        console.error('[generate-plan] FELL BACK: the blueprint filled with no sessions.');
        await logGenerationFailure(supabase, user.id, 'generate-plan', 'grounding_emptied', `blueprint ${picked.blueprint.id} filled with no sessions`);
      } else {
        plan = toPlan(adjusted);
        blueprintId = picked.blueprint.id;
        generated = true;
        console.log(
          `[generate-plan] PICKED blueprint ${blueprintId} for user ${user.id} (${plan.days.length} days, block ${block.blockNumber} week ${block.blockWeek}` +
            `${fitted.check.ok ? '' : `, checks: ${fitted.check.problems.join('; ')}`}).`
        );
      }
    }

    // Real weekday labels come from the user's picks.
    plan = applyTrainingWeekdays(plan, trainingDays);

    const row = { user_id: user.id, plan };
    let saved = await supabase.from('workouts').insert({ ...row, blueprint_id: blueprintId, block_number: block.blockNumber, block_week: block.blockWeek }).select().single();
    if (saved.error) {
      // The block columns aren't on this database yet (database/schema.sql, NG PHASE 5): save without them.
      saved = await supabase.from('workouts').insert(row).select().single();
    }
    if (saved.error) {
      throw new Error(`Failed to save workout plan: ${saved.error.message}`);
    }

    return new Response(JSON.stringify({ recovery, workout: saved.data, generated }), { headers: jsonHeaders });
  } catch (error) {
    if (!(error instanceof UnauthorizedError)) {
      await reportEdgeError('generate-plan', error);
    }
    const status = error instanceof UnauthorizedError ? 401 : 500;
    return new Response(JSON.stringify({ error: (error as Error).message }), { status, headers: jsonHeaders });
  }
});
