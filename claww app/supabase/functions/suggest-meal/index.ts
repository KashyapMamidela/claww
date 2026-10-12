import { z } from 'npm:zod@3';
import { corsHeaders, jsonHeaders } from '../_shared/cors.ts';
import { callGroqJSON } from '../_shared/groq.ts';
import { classifyGroqFailure, logGenerationFailure } from '../_shared/generationFailures.ts';
import { UnauthorizedError, requireUser, userClientFromRequest } from '../_shared/supabaseClient.ts';
import { enforceGenerationCap, GenerationCapExceededError } from '../_shared/usageCap.ts';
import { reportEdgeError } from '../_shared/sentry.ts';
import { rankOptions } from '../_shared/mealSuggestions.ts';

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
  goal: z.string().max(40).optional().default(''),
  cuisines: z.array(z.string().max(40)).max(8).optional().default([]),
  avoid: z.string().max(120).optional().default(''),
  eatenToday: z.array(z.string().max(120)).max(20).optional().default([]),
  trainedToday: z.boolean().optional().default(false),
  refine: z.enum(['more_protein', 'quicker', 'something_else']).optional(),
  remaining: z
    .object({ calories: z.number(), protein_g: z.number(), carbs_g: z.number(), fats_g: z.number() })
    .optional(),
});

const OptionSchema = z.object({
  description: z.string().min(1),
  calories: z.number(),
  protein_g: z.number(),
  carbs_g: z.number(),
  fats_g: z.number(),
  prep_minutes: z.number(),
});
const ModelOutputSchema = z.object({ options: z.array(OptionSchema).min(1).max(8) });

function buildPrompt(input: z.infer<typeof RequestSchema>): string {
  const lines: string[] = [];
  lines.push(`You are suggesting 5 different real meals for ${input.mealType}, then estimating each one's nutrition. Another step picks the best three, so give varied options.`);
  lines.push(
    input.dietaryRestrictions.length
      ? `Hard dietary restrictions, never violate: ${input.dietaryRestrictions.join(', ')}.`
      : 'No dietary restrictions given.'
  );
  if (input.avoid.trim()) lines.push(`Never include these foods: ${input.avoid.trim()}.`);
  if (input.cuisines.length && !input.cuisines.includes('anything')) lines.push(`Prefer these cuisines: ${input.cuisines.join(', ')}.`);
  if (input.goal) lines.push(`The user's goal is ${input.goal}.`);
  if (input.trainedToday) lines.push('The user trained today.');
  if (input.eatenToday.length) lines.push(`Already eaten today, do not repeat: ${input.eatenToday.join('; ')}.`);
  if (input.remaining) {
    const r = input.remaining;
    lines.push(
      `Left in today's targets: about ${Math.round(r.calories)} kcal, ${Math.round(r.protein_g)} g protein, ${Math.round(r.carbs_g)} g carbs, ${Math.round(r.fats_g)} g fat. A single meal should be a sensible share of that, not all of it.`
    );
  }
  if (input.preference.trim()) lines.push(`The user specifically said: "${input.preference.trim()}". Honor this.`);
  if (input.refine === 'more_protein') lines.push('Make every option high in protein.');
  if (input.refine === 'quicker') lines.push('Make every option quick to prepare (under 15 minutes).');
  if (input.refine === 'something_else') lines.push('Offer clearly different ideas from the usual choices.');
  lines.push('Respond with ONLY a JSON object of this exact shape:');
  lines.push('{"options": [{"description": string, "calories": number, "protein_g": number, "carbs_g": number, "fats_g": number, "prep_minutes": number}]}');
  lines.push('Each "description" must name a specific, real, recognizable dish (e.g. "Grilled chicken with rice and broccoli"), not a category.');
  return lines.join(String.fromCharCode(10));
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

    const parseResult = ModelOutputSchema.safeParse(JSON.parse(raw));
    if (!parseResult.success) {
      const detail = JSON.stringify(parseResult.error.flatten());
      await logGenerationFailure(supabase, userId, 'suggest-meal', 'validation_failed', detail);
      return new Response(
        JSON.stringify({ error: 'Groq response failed validation', details: parseResult.error.flatten() }),
        { status: 422, headers: jsonHeaders }
      );
    }

    // The model only named meals and estimated macros. Restrictions and the
    // avoid list are checked again here, the numbers are clamped, and the
    // order and the "why it fits" line come from deterministic code.
    const remaining = body.remaining ?? { calories: 700, protein_g: 40, carbs_g: 80, fats_g: 25 };
    const options = rankOptions(parseResult.data.options, {
      mealType: body.mealType,
      restrictions: body.dietaryRestrictions,
      avoid: body.avoid,
      eatenToday: body.eatenToday,
      remaining,
      refine: body.refine,
    });
    if (options.length === 0) {
      await logGenerationFailure(supabase, userId, 'suggest-meal', 'validation_failed', 'no option survived restriction checks');
      return new Response(JSON.stringify({ error: 'No suitable suggestions this time.' }), { status: 422, headers: jsonHeaders });
    }

    // Estimate-only, same as parse-meal: the client reviews/edits before
    // anything is written to meal_logs (see meal-log.tsx's review step).
    return new Response(JSON.stringify({ options }), { headers: jsonHeaders });
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
