import { z } from 'npm:zod@3';
import { corsHeaders, jsonHeaders } from '../_shared/cors.ts';
import { callGroqJSON } from '../_shared/groq.ts';
import { classifyGroqFailure, logGenerationFailure } from '../_shared/generationFailures.ts';
import { UnauthorizedError, requireUser, userClientFromRequest } from '../_shared/supabaseClient.ts';
import { enforceGenerationCap, GenerationCapExceededError } from '../_shared/usageCap.ts';
import { reportEdgeError } from '../_shared/sentry.ts';

// Item #24 — "Suggest Breakfast" used to be a fixed chip list with no way
// to say what you actually want ("something light", "no dairy, high
// protein", "I only have eggs and rice"). This is a real suggestion
// engine, not a relabeled version of parse-meal: it picks a meal NAME,
// parse-meal only ever estimates macros for a name the user already gave
// it. To keep this grounded rather than purely freeform, the remaining
// macro budget for today is passed in as a hard constraint the model must
// respect — same "don't trust the model, ground it" posture as
// generate-plan's rep ranges, just without an exact numeric range to clamp
// into afterward (there's no equivalent of Zod-clamping a meal
// suggestion's calories to a threshold the way sets/reps get clamped).

const RequestSchema = z.object({
  mealType: z.enum(['Breakfast', 'Lunch', 'Snack', 'Dinner']),
  preference: z.string().max(300).optional().default(''),
  dietaryRestrictions: z.array(z.string()).optional().default([]),
  remainingCalories: z.number().optional(),
  remainingProteinG: z.number().optional(),
});

const SuggestedMealSchema = z.object({
  description: z.string(),
  calories: z.number(),
  protein_g: z.number(),
  carbs_g: z.number(),
  fats_g: z.number(),
});

function buildPrompt(input: z.infer<typeof RequestSchema>): string {
  const restrictionsLine = input.dietaryRestrictions.length
    ? `Hard dietary restrictions, never violate: ${input.dietaryRestrictions.join(', ')}.`
    : 'No dietary restrictions given.';
  const preferenceLine = input.preference.trim()
    ? `The user specifically said: "${input.preference.trim()}" — honor this over any generic suggestion.`
    : 'No specific preference given — suggest something reasonable for this meal type.';
  const budgetLine =
    input.remainingCalories !== undefined
      ? `The user has roughly ${Math.round(input.remainingCalories)} kcal and ${Math.round(input.remainingProteinG ?? 0)}g protein left in their daily target — suggest something that fits within that budget, not something that blows past it.`
      : 'No remaining daily budget data available — suggest a normal single-meal portion.';

  return `You are suggesting ONE specific real meal for ${input.mealType}, then estimating its nutrition.
${restrictionsLine}
${preferenceLine}
${budgetLine}
Respond with ONLY a JSON object matching this exact shape:
{"description": string, "calories": number, "protein_g": number, "carbs_g": number, "fats_g": number}
"description" must name a specific, real, recognizable meal or dish (e.g. "Grilled chicken with rice and broccoli"), not a category or the meal type itself.`;
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  let supabase: ReturnType<typeof userClientFromRequest> | null = null;
  let userId: string | null = null;

  try {
    supabase = userClientFromRequest(req);
    const user = await requireUser(supabase);
    userId = user.id;

    const body = RequestSchema.parse(await req.json());

    await enforceGenerationCap(supabase, 'meal');

    const { content: raw } = await callGroqJSON([{ role: 'system', content: buildPrompt(body) }]);

    const parseResult = SuggestedMealSchema.safeParse(JSON.parse(raw));
    if (!parseResult.success) {
      const detail = JSON.stringify(parseResult.error.flatten());
      await logGenerationFailure(supabase, userId, 'suggest-meal', 'validation_failed', detail);
      return new Response(
        JSON.stringify({ error: 'Groq response failed validation', details: parseResult.error.flatten() }),
        { status: 422, headers: jsonHeaders }
      );
    }

    // Estimate-only, same as parse-meal — the client reviews/edits before
    // ever writing to meal_logs (see meal-log.tsx's review step).
    return new Response(JSON.stringify(parseResult.data), { headers: jsonHeaders });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return new Response(JSON.stringify({ error: 'Invalid request', details: error.flatten() }), {
        status: 400,
        headers: jsonHeaders,
      });
    }
    if (error instanceof GenerationCapExceededError) {
      return new Response(
        JSON.stringify({ error: "You've hit today's meal-logging limit — try again tomorrow." }),
        { status: 429, headers: jsonHeaders }
      );
    }
    if ((error as { name?: string })?.name?.startsWith('Groq')) {
      const { kind, detail } = classifyGroqFailure(error);
      if (kind === 'permission_blocked') {
        console.error(`[suggest-meal] 🚨 ALL GROQ MODELS BLOCKED for this org. ${detail}`);
      } else {
        console.error(`[suggest-meal] Groq call failed: ${detail}`);
      }
      if (supabase && userId) await logGenerationFailure(supabase, userId, 'suggest-meal', kind, detail);
      return new Response(
        JSON.stringify({ error: 'Meal suggestions are temporarily unavailable — try again shortly.' }),
        { status: 503, headers: jsonHeaders }
      );
    }
    if (!(error instanceof UnauthorizedError)) await reportEdgeError('suggest-meal', error);
    const status = error instanceof UnauthorizedError ? 401 : 500;
    return new Response(JSON.stringify({ error: (error as Error).message }), {
      status,
      headers: jsonHeaders,
    });
  }
});
