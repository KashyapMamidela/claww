import { z } from 'npm:zod@3';
import { corsHeaders, jsonHeaders } from '../_shared/cors.ts';
import { callGroqJSON, GroqPermissionError } from '../_shared/groq.ts';
import { computeRecoveryScore } from '../_shared/recovery.ts';
import { UnauthorizedError, requireUser, userClientFromRequest } from '../_shared/supabaseClient.ts';

const MODALITIES = ['strength', 'cardio', 'mobility', 'yoga'] as const;

// Equipment tiers: higher access implies the lower tiers too (a gym-goer
// can still do bodyweight moves; a bodyweight-only user can't do gym ones).
const EQUIPMENT_TIERS: Record<string, string[]> = {
  none: ['none'],
  home: ['none', 'home'],
  gym: ['none', 'home', 'gym'],
};

function deriveAllowedEquipment(equipment: string | null | undefined): string[] {
  return EQUIPMENT_TIERS[equipment ?? ''] ?? EQUIPMENT_TIERS.gym;
}

// ─────────────────────────────────────────────────────────────────────────
// Deterministic trainer thresholds. These are hard numeric constraints
// computed server-side from real exercise-science conventions (rep ranges
// per training goal, volume caps per experience level, age-adjusted
// intensity) — the model is told the exact numbers to stay within, and its
// output is clamped into range afterward regardless of what it returns.
// This is the same "don't trust the model, ground it" philosophy as the
// equipment/catalog filtering above, just applied to volume and frequency
// instead of exercise names.
// ─────────────────────────────────────────────────────────────────────────

interface RepRange {
  minSets: number;
  maxSets: number;
  minReps: number;
  maxReps: number;
}

// Standard hypertrophy/strength/endurance rep-range conventions per goal.
const GOAL_REP_RANGES: Record<string, RepRange> = {
  muscle_gain: { minSets: 3, maxSets: 5, minReps: 6, maxReps: 12 },
  fat_loss: { minSets: 2, maxSets: 4, minReps: 12, maxReps: 20 },
  endurance: { minSets: 2, maxSets: 3, minReps: 15, maxReps: 25 },
  maintenance: { minSets: 2, maxSets: 4, minReps: 8, maxReps: 15 },
  flexibility: { minSets: 1, maxSets: 3, minReps: 20, maxReps: 60 },
};

// A beginner shouldn't be programmed the same volume as an advanced lifter
// even for the same goal — this caps sets regardless of what the goal range allows.
const EXPERIENCE_MAX_SETS: Record<string, number> = { beginner: 3, intermediate: 4, advanced: 5 };

// experience x activity -> base training days/week. Matches how a trainer
// would scope a starting frequency before knowing anything else about the client.
const FREQUENCY_TABLE: Record<string, Record<string, number>> = {
  beginner: { sedentary: 2, moderate: 3, active: 3 },
  intermediate: { sedentary: 3, moderate: 4, active: 4 },
  advanced: { sedentary: 3, moderate: 4, active: 5 },
};

function computeRepRange(goal: string | null, experienceLevel: string | null, age: number | null): RepRange {
  const base = GOAL_REP_RANGES[goal ?? ''] ?? GOAL_REP_RANGES.maintenance;
  const experienceCap = EXPERIENCE_MAX_SETS[experienceLevel ?? ''] ?? EXPERIENCE_MAX_SETS.intermediate;
  let maxSets = Math.min(base.maxSets, experienceCap);
  let minReps = base.minReps;

  // Older adults: bias away from heavy near-maximal low-rep work and cap
  // volume further, even if their goal/experience would otherwise allow more.
  if (age !== null) {
    if (age >= 65) {
      maxSets = Math.min(maxSets, 3);
      minReps = Math.max(minReps, 10);
    } else if (age >= 50) {
      maxSets = Math.min(maxSets, 4);
      minReps = Math.max(minReps, 8);
    }
  }

  return { minSets: Math.min(base.minSets, maxSets), maxSets, minReps, maxReps: Math.max(base.maxReps, minReps) };
}

function computeTrainingDays(experienceLevel: string | null, activityLevel: string | null, age: number | null): number {
  const row = FREQUENCY_TABLE[experienceLevel ?? ''] ?? FREQUENCY_TABLE.intermediate;
  let days = row[activityLevel ?? ''] ?? row.moderate;
  if (age !== null && age >= 55) days = Math.min(days, 4);
  return days;
}

// ─────────────────────────────────────────────────────────────────────────
// Feed real history into the next plan — still entirely deterministic math,
// same "don't trust the model, ground it" philosophy as everything above.
// The model's job never widens: it still only picks exercise names within
// whatever range comes out of this.
// ─────────────────────────────────────────────────────────────────────────

type AdjustDirection = 'down' | 'up' | 'hold';

interface RecentSetLog {
  reps_achieved: number | null;
  reps_prescribed: number | null;
}

/**
 * Whether the next plan's rep prescriptions should shift down, up, or hold.
 * An explicit regeneration reason always wins — it's direct user feedback,
 * more trustworthy than an inferred trend. Otherwise it reads the trend
 * across recent logged sets: consistently achieving well under prescribed
 * reps means the target was too high, consistently meeting or beating it
 * means there's room to push.
 */
function deriveAdjustDirection(reason: string | null, recentLogs: RecentSetLog[]): AdjustDirection {
  if (reason === 'too_hard') return 'down';
  if (reason === 'too_easy') return 'up';
  // 'wrong_focus' (or no reason given) says nothing about intensity — read it from performance instead.
  const comparable = recentLogs.filter(
    (l) => l.reps_achieved !== null && l.reps_prescribed !== null && (l.reps_prescribed as number) > 0
  );
  if (comparable.length < 3) return 'hold'; // not enough real signal yet — first few sessions stay at the computed baseline
  const avgRatio =
    comparable.reduce((sum, l) => sum + (l.reps_achieved as number) / (l.reps_prescribed as number), 0) / comparable.length;
  if (avgRatio < 0.85) return 'down';
  if (avgRatio >= 1.05) return 'up';
  return 'hold';
}

/** Nudges the rep window by a small, bounded amount — a trend or one explicit reason moves it a couple of reps, never a jump. */
function applyAdjustDirection(range: RepRange, direction: AdjustDirection, explicit: boolean): RepRange {
  if (direction === 'hold') return range;
  const delta = (explicit ? 3 : 2) * (direction === 'down' ? -1 : 1);
  const minReps = Math.max(1, range.minReps + delta);
  const maxReps = Math.max(minReps, range.maxReps + delta);
  return { ...range, minReps, maxReps };
}

// Keyword -> exercise-name pattern exclusions. A deliberately simple,
// best-effort heuristic (not a physiotherapy-grade contraindication
// database) — flagged to the user in the intake copy as such.
const INJURY_EXCLUSIONS: { keywords: string[]; pattern: RegExp }[] = [
  { keywords: ['knee'], pattern: /squat|lunge|jump/i },
  { keywords: ['back', 'spine', 'spinal'], pattern: /deadlift|squat|row|good morning/i },
  { keywords: ['shoulder'], pattern: /overhead press|bench press|push-?up/i },
  { keywords: ['wrist'], pattern: /push-?up|plank/i },
  { keywords: ['ankle', 'foot'], pattern: /jump|lunge|run|jog/i },
  { keywords: ['hip'], pattern: /squat|lunge|deadlift/i },
];

function excludeInjuredExercises<T extends { name: string }>(exercises: T[], injuriesText: string | null | undefined): T[] {
  if (!injuriesText?.trim()) return exercises;
  const lowered = injuriesText.toLowerCase();
  const activePatterns = INJURY_EXCLUSIONS.filter((rule) => rule.keywords.some((kw) => lowered.includes(kw))).map((r) => r.pattern);
  if (activePatterns.length === 0) return exercises;
  return exercises.filter((ex) => !activePatterns.some((pattern) => pattern.test(ex.name)));
}

/** Hard-enforces the computed rep range and day count on the model's output, regardless of what it returned. */
function clampPlanToThresholds(plan: Plan, range: RepRange, maxDays: number): Plan {
  const days = plan.days.slice(0, maxDays).map((day) => ({
    ...day,
    exercises: day.exercises.map((ex) => ({
      ...ex,
      sets: Math.min(Math.max(ex.sets, range.minSets), range.maxSets),
      reps: Math.min(Math.max(ex.reps, range.minReps), range.maxReps),
    })),
  }));
  return { ...plan, days };
}

const PlanExerciseSchema = z.object({
  exerciseId: z.string().optional(),
  name: z.string(),
  sets: z.number().int().positive(),
  reps: z.number().int().positive(),
});

const PlanDaySchema = z.object({
  day: z.string(),
  focus: z.string(),
  exercises: z.array(PlanExerciseSchema).min(1),
});

const PlanSchema = z.object({
  days: z.array(PlanDaySchema).min(1),
  notes: z.string().optional(),
});

type Plan = z.infer<typeof PlanSchema>;

// Fallback used when the Groq response fails validation, so the user
// always gets a usable plan back instead of an error.
const DEFAULT_PLAN: Plan = {
  days: [
    {
      day: 'Day 1',
      focus: 'Full Body',
      exercises: [
        { name: 'Bodyweight Squat', sets: 3, reps: 15 },
        { name: 'Push-up', sets: 3, reps: 10 },
        { name: 'Plank', sets: 3, reps: 30 },
      ],
    },
    {
      day: 'Day 2',
      focus: 'Active Recovery',
      exercises: [
        { name: 'Walking', sets: 1, reps: 1 },
        { name: 'Stretching', sets: 1, reps: 1 },
      ],
    },
    {
      day: 'Day 3',
      focus: 'Full Body',
      exercises: [
        { name: 'Lunges', sets: 3, reps: 12 },
        { name: 'Glute Bridge', sets: 3, reps: 15 },
        { name: 'Bird Dog', sets: 3, reps: 10 },
      ],
    },
  ],
  notes: 'Default starter plan — personalize once more workout history is available.',
};

function derivePreferredModalities(personalizationProfile: Record<string, unknown> | null): string[] {
  const modalities = (personalizationProfile as { workoutDefaults?: { modalities?: unknown } } | null)
    ?.workoutDefaults?.modalities;
  if (Array.isArray(modalities) && modalities.every((m) => (MODALITIES as readonly string[]).includes(m))) {
    return modalities as string[];
  }
  return [...MODALITIES];
}

const GENERATION_COOLDOWN_MS = 30_000;

interface CatalogExercise {
  id?: string;
  name: string;
}

/**
 * Grounds the model's output in the exercise list we actually sent it —
 * Zod only checks shape/types, not that the names are real. Anything not
 * matching (case-insensitively) an offered exercise is dropped; days left
 * with nothing valid are dropped too; an empty result falls back further.
 * Surviving exercises get their exerciseId rewritten to the catalog row's
 * real id (the model's own id, if any, isn't trusted) so workout_logs can
 * link back to the catalog when one exists.
 */
function groundPlanInCatalog(plan: Plan, availableExercises: CatalogExercise[]): Plan {
  const byName = new Map(availableExercises.map((e) => [e.name.trim().toLowerCase(), e]));
  const days = plan.days
    .map((day) => ({
      ...day,
      exercises: day.exercises
        .filter((ex) => byName.has(ex.name.trim().toLowerCase()))
        .map((ex) => ({ ...ex, exerciseId: byName.get(ex.name.trim().toLowerCase())?.id })),
    }))
    .filter((day) => day.exercises.length > 0);
  return { ...plan, days };
}

function buildSystemPrompt(range: RepRange, dayCount: number, injuriesText: string | null | undefined, regenerationReason: string | null): string {
  const injuriesLine = injuriesText?.trim()
    ? `The user reported these injuries/limitations: "${injuriesText.trim()}". The available-exercises list has already been filtered to exclude movements that commonly stress those areas — do not work around the filter or suggest anything outside the provided list.`
    : 'The user reported no injuries or limitations.';

  // 'wrong_focus' is a selection concern (which days/exercises to pick), not
  // a numeric one — sets/reps stay entirely in the deterministic range
  // above regardless of reason. 'too_hard'/'too_easy' already moved that
  // range before this prompt was built, so they don't need a note here.
  const regenerationLine =
    regenerationReason === 'wrong_focus'
      ? 'The user regenerated because the previous plan\'s day split / focus areas were wrong for them — choose a meaningfully different day split and exercise selection this time, not a near-copy of a typical plan for their goal.'
      : '';

  return `You are a certified personal trainer generating a workout plan. You will be given the user's
recovery score/band, their personalization profile, recent workout history, and a filtered list of
available exercises. Build a plan using ONLY exercises from the provided list. Respond with ONLY a JSON
object matching this exact shape:
{"days": [{"day": string, "focus": string, "exercises": [{"exerciseId": string, "name": string, "sets": number, "reps": number}]}], "notes": string}

Hard constraints, already computed for this specific user — follow them exactly:
- Generate EXACTLY ${dayCount} training day(s).
- Every exercise must use ${range.minSets}-${range.maxSets} sets and ${range.minReps}-${range.maxReps} reps.
- ${injuriesLine}
${regenerationLine ? `- ${regenerationLine}\n` : ''}
Within those constraints, use your judgment like a trainer would: pick a sensible day split and exercise
selection for the user's goal and equipment, and adjust where in each range you land based on recovery
(lower in the range when recovery is Low, higher when High).`;
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const supabase = userClientFromRequest(req);
    const user = await requireUser(supabase);

    const body = await req.json().catch(() => ({}));
    const reason = typeof body?.reason === 'string' ? body.reason : null;

    const [{ data: profile }, { data: sleepLog }, { data: lastWorkout }, { data: recentWorkouts }, { data: latestWorkout }] =
      await Promise.all([
        supabase.from('profiles').select('personalization_profile, equipment, age, goal, experience_level').eq('id', user.id).maybeSingle(),
        supabase
          .from('sleep_logs')
          .select('hours, bedtime, wake_time, logged_at')
          .eq('user_id', user.id)
          .order('logged_at', { ascending: false })
          .limit(1)
          .maybeSingle(),
        supabase
          .from('workout_logs')
          .select('sets, reps_achieved, reps_prescribed, completed_at')
          .eq('user_id', user.id)
          .order('completed_at', { ascending: false })
          .limit(1)
          .maybeSingle(),
        supabase
          .from('workout_logs')
          .select('exercise_id, exercise_name, sets, reps_prescribed, reps_achieved, weight_prescribed, weight_achieved, completed_at')
          .eq('user_id', user.id)
          .order('completed_at', { ascending: false })
          .limit(10),
        supabase
          .from('workouts')
          .select('id, user_id, plan, created_at')
          .eq('user_id', user.id)
          .order('created_at', { ascending: false })
          .limit(1)
          .maybeSingle(),
      ]);

    const recovery = computeRecoveryScore(sleepLog, lastWorkout);

    // Cooldown: a double-tap or accidental repeat shouldn't burn another
    // Groq call — just hand back the plan that was just generated. Does NOT
    // apply when a regeneration reason was given: that's an explicit,
    // intentional request, and silently returning the plan the user is
    // complaining about would ignore their feedback outright.
    if (!reason && latestWorkout && Date.now() - new Date(latestWorkout.created_at).getTime() < GENERATION_COOLDOWN_MS) {
      return new Response(JSON.stringify({ recovery, workout: latestWorkout, cached: true }), { headers: jsonHeaders });
    }

    const personalizationProfile = (profile?.personalization_profile ?? null) as Record<string, unknown> | null;
    const preferredModalities = derivePreferredModalities(personalizationProfile);
    const allowedEquipment = deriveAllowedEquipment(profile?.equipment);
    const workoutDefaults = (personalizationProfile as { workoutDefaults?: { injuries?: string; activityLevel?: string } } | null)
      ?.workoutDefaults;
    const injuriesText = workoutDefaults?.injuries;

    const { data: rawExercises, error: exercisesError } = await supabase
      .from('exercises')
      .select('id, name, modality, muscle_group, equipment, met_value')
      .in('modality', preferredModalities)
      .in('equipment', allowedEquipment);

    if (exercisesError) {
      throw new Error(`Failed to load exercises: ${exercisesError.message}`);
    }

    const exercises = excludeInjuredExercises(rawExercises ?? [], injuriesText);
    const baseRepRange = computeRepRange(profile?.goal ?? null, profile?.experience_level ?? null, profile?.age ?? null);
    const adjustDirection = deriveAdjustDirection(reason, recentWorkouts ?? []);
    const repRange = applyAdjustDirection(baseRepRange, adjustDirection, reason !== null);
    if (adjustDirection !== 'hold') {
      console.log(
        `[generate-plan] Adjusting rep range ${adjustDirection} for user ${user.id} ` +
          `(reason: ${reason ?? 'performance trend'}) — ${baseRepRange.minReps}-${baseRepRange.maxReps} -> ${repRange.minReps}-${repRange.maxReps}`
      );
    }
    const dayCount = computeTrainingDays(profile?.experience_level ?? null, workoutDefaults?.activityLevel ?? null, profile?.age ?? null);
    const systemPrompt = buildSystemPrompt(repRange, dayCount, injuriesText, reason);

    let plan: Plan;
    // Distinguishes a real Groq-generated plan from any fallback path, in
    // both the log line below and the response body — so "is generation
    // actually working" is a direct read, not an inference from plan shape.
    let generated = false;

    try {
      const raw = await callGroqJSON([
        { role: 'system', content: systemPrompt },
        {
          role: 'user',
          content: JSON.stringify({
            recovery,
            personalizationProfile,
            recentWorkouts: recentWorkouts ?? [],
            availableExercises: exercises,
          }),
        },
      ]);

      const parseResult = PlanSchema.safeParse(JSON.parse(raw));
      if (!parseResult.success) {
        console.error('[generate-plan] FELL BACK: Groq response failed schema validation:', JSON.stringify(parseResult.error.flatten()));
      }
      plan = parseResult.success ? groundPlanInCatalog(parseResult.data, exercises) : DEFAULT_PLAN;
      if (plan.days.length === 0) {
        console.error('[generate-plan] FELL BACK: grounding filtered every exercise out of the plan.');
        plan = DEFAULT_PLAN;
      }
      generated = parseResult.success && plan.days.length > 0;
    } catch (groqError) {
      if (groqError instanceof GroqPermissionError) {
        // Not a normal fallback — this means EVERY generation request is
        // broken until someone enables the model at console.groq.com, not
        // just this one user's request. Log loudly and distinctly.
        console.error(
          `[generate-plan] 🚨 FELL BACK — GROQ MODEL BLOCKED for this org (status ${groqError.status}). ` +
            `Enable the model at console.groq.com/settings/limits. This will keep happening for every user until fixed. ${groqError.message}`
        );
      } else {
        console.error('[generate-plan] FELL BACK: Groq call failed:', (groqError as Error).message);
      }
      plan = DEFAULT_PLAN;
    }

    if (generated) {
      console.log(`[generate-plan] GENERATED a real plan for user ${user.id} (${plan.days.length} days).`);
    }

    // Hard-enforce the computed thresholds regardless of what the model
    // returned (or whether we fell back to DEFAULT_PLAN).
    plan = clampPlanToThresholds(plan, repRange, dayCount);

    const { data: savedWorkout, error: insertError } = await supabase
      .from('workouts')
      .insert({ user_id: user.id, plan })
      .select()
      .single();

    if (insertError) {
      throw new Error(`Failed to save workout plan: ${insertError.message}`);
    }

    return new Response(JSON.stringify({ recovery, workout: savedWorkout, generated }), { headers: jsonHeaders });
  } catch (error) {
    const status = error instanceof UnauthorizedError ? 401 : 500;
    return new Response(JSON.stringify({ error: (error as Error).message }), {
      status,
      headers: jsonHeaders,
    });
  }
});
