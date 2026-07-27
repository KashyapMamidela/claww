import { z } from 'npm:zod@3';
import { corsHeaders, jsonHeaders } from '../_shared/cors.ts';
import { callGroqJSON } from '../_shared/groq.ts';
import { computeRecoveryScore } from '../_shared/recovery.ts';
import { UnauthorizedError, requireUser, userClientFromRequest } from '../_shared/supabaseClient.ts';

const MODALITIES = ['strength', 'cardio', 'mobility', 'yoga'] as const;

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

const SYSTEM_PROMPT = `You are a fitness coach generating a workout plan. You will be given the user's
recovery score/band, their personalization profile, recent workout history, and a filtered list of
available exercises. Build a plan using ONLY exercises from the provided list. Respond with ONLY a JSON
object matching this exact shape:
{"days": [{"day": string, "focus": string, "exercises": [{"exerciseId": string, "name": string, "sets": number, "reps": number}]}], "notes": string}
Adjust volume down when recovery is Low, and up when recovery is High.`;

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const supabase = userClientFromRequest(req);
    const user = await requireUser(supabase);

    const [{ data: profile }, { data: sleepLog }, { data: lastWorkout }, { data: recentWorkouts }] =
      await Promise.all([
        supabase.from('profiles').select('personalization_profile').eq('id', user.id).maybeSingle(),
        supabase
          .from('sleep_logs')
          .select('hours, bedtime, wake_time, logged_at')
          .eq('user_id', user.id)
          .order('logged_at', { ascending: false })
          .limit(1)
          .maybeSingle(),
        supabase
          .from('workout_logs')
          .select('sets, reps, weight, completed_at')
          .eq('user_id', user.id)
          .order('completed_at', { ascending: false })
          .limit(1)
          .maybeSingle(),
        supabase
          .from('workout_logs')
          .select('exercise_id, sets, reps, weight, completed_at')
          .eq('user_id', user.id)
          .order('completed_at', { ascending: false })
          .limit(10),
      ]);

    const recovery = computeRecoveryScore(sleepLog, lastWorkout);
    const personalizationProfile = (profile?.personalization_profile ?? null) as Record<string, unknown> | null;
    const preferredModalities = derivePreferredModalities(personalizationProfile);

    const { data: exercises, error: exercisesError } = await supabase
      .from('exercises')
      .select('id, name, modality, muscle_group, equipment, met_value')
      .in('modality', preferredModalities);

    if (exercisesError) {
      throw new Error(`Failed to load exercises: ${exercisesError.message}`);
    }

    let plan: Plan;

    try {
      const raw = await callGroqJSON([
        { role: 'system', content: SYSTEM_PROMPT },
        {
          role: 'user',
          content: JSON.stringify({
            recovery,
            personalizationProfile,
            recentWorkouts: recentWorkouts ?? [],
            availableExercises: exercises ?? [],
          }),
        },
      ]);

      const parseResult = PlanSchema.safeParse(JSON.parse(raw));
      plan = parseResult.success ? parseResult.data : DEFAULT_PLAN;
    } catch (_groqError) {
      plan = DEFAULT_PLAN;
    }

    const { data: savedWorkout, error: insertError } = await supabase
      .from('workouts')
      .insert({ user_id: user.id, plan })
      .select()
      .single();

    if (insertError) {
      throw new Error(`Failed to save workout plan: ${insertError.message}`);
    }

    return new Response(JSON.stringify({ recovery, workout: savedWorkout }), { headers: jsonHeaders });
  } catch (error) {
    const status = error instanceof UnauthorizedError ? 401 : 500;
    return new Response(JSON.stringify({ error: (error as Error).message }), {
      status,
      headers: jsonHeaders,
    });
  }
});
