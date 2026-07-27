import { z } from 'npm:zod@3';
import { corsHeaders, jsonHeaders } from '../_shared/cors.ts';
import { callGroqJSON } from '../_shared/groq.ts';
import { UnauthorizedError, requireUser, userClientFromRequest } from '../_shared/supabaseClient.ts';

const RequestSchema = z.object({
  text: z.string().min(1, 'text is required'),
});

const ParsedMealSchema = z.object({
  description: z.string(),
  calories: z.number(),
  protein_g: z.number(),
  carbs_g: z.number(),
  fats_g: z.number(),
});

const SYSTEM_PROMPT = `You are a nutrition estimation assistant. Given a free-text description of a meal,
estimate its nutritional content. Respond with ONLY a JSON object matching this exact shape:
{"description": string, "calories": number, "protein_g": number, "carbs_g": number, "fats_g": number}
Use your best estimate when exact values aren't knowable — never omit a field.`;

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const supabase = userClientFromRequest(req);
    const user = await requireUser(supabase);

    const body = RequestSchema.parse(await req.json());

    const raw = await callGroqJSON([
      { role: 'system', content: SYSTEM_PROMPT },
      { role: 'user', content: body.text },
    ]);

    const parseResult = ParsedMealSchema.safeParse(JSON.parse(raw));
    if (!parseResult.success) {
      return new Response(
        JSON.stringify({ error: 'Groq response failed validation', details: parseResult.error.flatten() }),
        { status: 422, headers: jsonHeaders }
      );
    }

    const meal = parseResult.data;

    const { data: inserted, error: insertError } = await supabase
      .from('meal_logs')
      .insert({
        user_id: user.id,
        description: meal.description,
        calories: meal.calories,
        protein_g: meal.protein_g,
        carbs_g: meal.carbs_g,
        fats_g: meal.fats_g,
        estimated: true,
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
    const status = error instanceof UnauthorizedError ? 401 : 500;
    return new Response(JSON.stringify({ error: (error as Error).message }), {
      status,
      headers: jsonHeaders,
    });
  }
});
