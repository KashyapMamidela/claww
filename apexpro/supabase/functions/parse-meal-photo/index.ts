import { z } from 'npm:zod@3';
import { corsHeaders, jsonHeaders } from '../_shared/cors.ts';
import { callGroqVisionJSON, GroqPermissionError } from '../_shared/groq.ts';
import { UnauthorizedError, requireUser, userClientFromRequest } from '../_shared/supabaseClient.ts';

const RequestSchema = z.object({
  image: z.string().startsWith('data:image/', 'image must be a data URI'),
  mealType: z.enum(['Breakfast', 'Lunch', 'Snack', 'Dinner']).optional(),
  portion: z.enum(['small', 'regular', 'large']).optional().default('regular'),
});

// Same convention as parse-meal: "regular" is the AI's base read of the
// photo, small/large scale it by a fixed ratio.
const PORTION_MULTIPLIERS: Record<string, number> = { small: 0.7, regular: 1, large: 1.4 };

const ParsedMealSchema = z.object({
  isFood: z.boolean(),
  isAppropriate: z.boolean(),
  description: z.string(),
  calories: z.number(),
  protein_g: z.number(),
  carbs_g: z.number(),
  fats_g: z.number(),
});

const SYSTEM_PROMPT = `You are a nutrition estimation assistant with a content-moderation responsibility.
You will be shown a photo that a user submitted claiming it's a meal. Respond with ONLY a JSON object
matching this exact shape:
{"isFood": boolean, "isAppropriate": boolean, "description": string, "calories": number, "protein_g": number, "carbs_g": number, "fats_g": number}

First decide:
- isFood: true only if the photo clearly shows food or a meal/drink meant for human consumption.
- isAppropriate: false if the image contains nudity, sexual content, violence, gore, weapons, illegal
  activity, hate symbols, or anything unsafe or unrelated to a meal photo — even if isFood is true.

If isFood is false or isAppropriate is false, set calories/protein_g/carbs_g/fats_g to 0 and briefly
explain why in description (e.g. "No food detected" or "Image flagged as inappropriate"). Otherwise,
identify what's in the photo and estimate its nutritional content for the portion shown — the
description should briefly name what you see (e.g. "Grilled chicken breast with rice and broccoli").
Use your best visual estimate when exact values aren't knowable — never omit a field.`;

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const supabase = userClientFromRequest(req);
    const user = await requireUser(supabase);

    const body = RequestSchema.parse(await req.json());

    const raw = await callGroqVisionJSON(SYSTEM_PROMPT, 'Estimate the nutrition for the meal in this photo.', body.image);

    const parseResult = ParsedMealSchema.safeParse(JSON.parse(raw));
    if (!parseResult.success) {
      return new Response(
        JSON.stringify({ error: 'Groq response failed validation', details: parseResult.error.flatten() }),
        { status: 422, headers: jsonHeaders }
      );
    }

    const meal = parseResult.data;

    if (!meal.isFood) {
      return new Response(
        JSON.stringify({ blocked: true, reason: "That doesn't look like food — try a clearer photo, or describe the meal in words instead." }),
        { headers: jsonHeaders }
      );
    }
    if (!meal.isAppropriate) {
      return new Response(
        JSON.stringify({ blocked: true, reason: "That image can't be processed. Please upload a clear photo of your meal." }),
        { headers: jsonHeaders }
      );
    }

    const multiplier = PORTION_MULTIPLIERS[body.portion];

    const { data: inserted, error: insertError } = await supabase
      .from('meal_logs')
      .insert({
        user_id: user.id,
        description: meal.description,
        calories: Math.round(meal.calories * multiplier),
        protein_g: Math.round(meal.protein_g * multiplier),
        carbs_g: Math.round(meal.carbs_g * multiplier),
        fats_g: Math.round(meal.fats_g * multiplier),
        estimated: true,
        meal_type: body.mealType ?? null,
      })
      .select()
      .single();

    if (insertError) {
      throw new Error(`Failed to save meal log: ${insertError.message}`);
    }

    return new Response(JSON.stringify(inserted), { headers: jsonHeaders });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return new Response(JSON.stringify({ error: 'Invalid request', details: error.flatten() }), {
        status: 400,
        headers: jsonHeaders,
      });
    }
    if (error instanceof GroqPermissionError) {
      // Not a normal failure — every request is broken until the model is
      // enabled at console.groq.com/settings/limits, not just this one.
      console.error(`[parse-meal-photo] 🚨 GROQ MODEL BLOCKED for this org (status ${error.status}). ${error.message}`);
      return new Response(
        JSON.stringify({ error: 'Photo estimation is temporarily unavailable — try again shortly, or describe the meal in words instead.' }),
        { status: 503, headers: jsonHeaders }
      );
    }
    const status = error instanceof UnauthorizedError ? 401 : 500;
    return new Response(JSON.stringify({ error: (error as Error).message }), {
      status,
      headers: jsonHeaders,
    });
  }
});
