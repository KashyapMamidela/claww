import { z } from 'npm:zod@3';
import { corsHeaders, jsonHeaders } from '../_shared/cors.ts';
import { callGroqVisionJSON, GROQ_MODEL_CHAINS } from '../_shared/groq.ts';
import { logGenerationFailure } from '../_shared/generationFailures.ts';
import { UnauthorizedError, requireUser, userClientFromRequest } from '../_shared/supabaseClient.ts';
import { enforceGenerationCap, GenerationCapExceededError } from '../_shared/usageCap.ts';
import { reportEdgeError } from '../_shared/sentry.ts';
import { AllVisionProvidersFailed, callVisionProviders, openAiCompatibleProvider, type VisionProvider } from '../_shared/vision.ts';
import { candidateChips, OIL_FOOD, parseModelOutput, resolveItems, routeScan, type ScanFood } from '../_shared/scanMath.ts';

// NG PHASE 9: the scanner. The model only names the items on the plate, guesses a household quantity for each and says
// how sure it is. Every number comes from the food database: this function maps the names to `foods` rows and returns
// the items in household units; the app applies "how oily?" and the portion and does the arithmetic, so the steppers
// recalculate instantly. Providers: Groq first, then a backup (any OpenAI-compatible vision endpoint, set by secrets).

const RequestSchema = z.object({
  image: z.string().startsWith('data:image/', 'image must be a data URI'),
});

const SYSTEM_PROMPT = `You look at a photo of a meal, mostly Indian food, and list what is on the plate. You do NOT estimate calories.
Respond with ONLY a JSON object of this exact shape:
{"isFood": boolean, "isAppropriate": boolean, "dish": string, "confidence": number, "candidates": string[], "items": [{"name": string, "quantity": number, "unit": string}]}

Rules:
- isFood is true only if the photo clearly shows food or a drink for people. isAppropriate is false for nudity, violence, weapons, illegal activity, hate symbols or anything unsafe.
- dish: the plate in a few words ("Chicken fried rice", "Idli sambar", "Dal rice thali").
- items: every separate food you can see. Use plain common names ("fried rice", "chicken pieces", "egg", "sambar", "roti", "curd"). Do NOT list cooking oil.
- quantity and unit: a HOUSEHOLD guess. Units: katori (a small bowl, 150 ml), roti, idli, dosa, piece, egg, tsp, tbsp, glass, cup, plate, handful, slice, g. Rice or curry in a bowl is katori; bread and idli are counted; use g only if nothing else fits.
- Small scattered things (chickpeas, peas, nuts, seeds, sprouts, chopped vegetables, salad leaves) are a handful or tsp, never a count of pieces. Pieces are for whole items you can count (an egg, a whole fruit, a cutlet).
- Name each ingredient on its own with its plain name ("red bell pepper", "avocado", "chickpeas"), not the whole salad as one item.
- confidence: 0 to 1, how sure you are of the dish and items. Be honest: a blurry or unusual plate is below 0.5.
- candidates: up to 4 other dishes it could be.
If isFood is false or isAppropriate is false, return empty items, confidence 0 and dish "".`;

interface FoodRow {
  id: number;
  name: string;
  aliases: string[] | null;
  kind: 'ingredient' | 'dish';
  kcal_100g: number;
  protein_100g: number;
  carbs_100g: number;
  fat_100g: number;
  fibre_100g: number | null;
  iron_mg_100g: number | null;
  calcium_mg_100g: number | null;
  vitc_mg_100g: number | null;
  b12_ug_100g: number | null;
  sodium_mg_100g: number | null;
  food_units: { unit: string; grams: number; is_default: boolean | null }[] | null;
}

const n = (v: number | null) => (v === null || v === undefined ? null : Number(v));

function toScanFood(r: FoodRow): ScanFood {
  return {
    id: r.id,
    name: r.name,
    aliases: r.aliases ?? [],
    kind: r.kind,
    kcal100g: Number(r.kcal_100g),
    protein100g: Number(r.protein_100g),
    carbs100g: Number(r.carbs_100g),
    fat100g: Number(r.fat_100g),
    fibre100g: n(r.fibre_100g),
    ironMg100g: n(r.iron_mg_100g),
    calciumMg100g: n(r.calcium_mg_100g),
    vitcMg100g: n(r.vitc_mg_100g),
    b12Ug100g: n(r.b12_ug_100g),
    sodiumMg100g: n(r.sodium_mg_100g),
    units: (r.food_units ?? []).map((u) => ({ unit: u.unit, grams: Number(u.grams), isDefault: !!u.is_default })),
  };
}

function buildProviders(): VisionProvider[] {
  const providers: VisionProvider[] = [
    {
      name: `groq:${GROQ_MODEL_CHAINS.vision[0]}`,
      // callGroqVisionJSON has its own fetch and chain; the 8 s timeout around it is enforced by callVisionProviders.
      call: async (system, user, image) => (await callGroqVisionJSON(system, user, image)).content,
    },
  ];
  const url = Deno.env.get('VISION_BACKUP_URL');
  const key = Deno.env.get('VISION_BACKUP_KEY');
  const model = Deno.env.get('VISION_BACKUP_MODEL');
  if (url && key && model) providers.push(openAiCompatibleProvider({ name: `backup:${model}`, url, key, model }));
  return providers;
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

    const { data: rows, error: foodsError } = await supabase
      .from('foods')
      .select('id, name, aliases, kind, kcal_100g, protein_100g, carbs_100g, fat_100g, fibre_100g, iron_mg_100g, calcium_mg_100g, vitc_mg_100g, b12_ug_100g, sodium_mg_100g, food_units(unit, grams, is_default)')
      .limit(2000);
    if (foodsError) throw new Error(`Failed to load foods: ${foodsError.message}`);
    const foods = (rows as unknown as FoodRow[]).map(toScanFood);

    const result = await callVisionProviders(
      buildProviders(),
      SYSTEM_PROMPT,
      'List what is on this plate.',
      body.image,
      (text) => parseModelOutput(JSON.parse(text))
    );
    const out = result.value;
    console.log(`[scan-plate] answered by ${result.provider} in ${result.attempts.map((a) => `${a.provider}:${a.ok ? 'ok' : a.error}:${a.ms}ms`).join(', ')}`);

    const items = out.isFood && out.isAppropriate ? resolveItems(out.items, foods) : [];
    const route = routeScan(out, items.filter((i) => i.food !== null).length);

    if (route === 'blocked_not_food') {
      return new Response(JSON.stringify({ blocked: true, reason: "That doesn't look like food. Try a clearer photo, or log it by name." }), { headers: jsonHeaders });
    }
    if (route === 'blocked_inappropriate') {
      return new Response(JSON.stringify({ blocked: true, reason: "That image can't be processed. Please use a clear photo of your meal." }), { headers: jsonHeaders });
    }

    return new Response(
      JSON.stringify({
        route,
        dish: out.dish,
        confidence: out.confidence,
        candidates: candidateChips(out),
        items,
        oilFood: foods.find((f) => f.name === OIL_FOOD) ?? null,
        model: result.provider,
      }),
      { headers: jsonHeaders }
    );
  } catch (error) {
    if (error instanceof z.ZodError) {
      return new Response(JSON.stringify({ error: 'Invalid request', details: error.flatten() }), { status: 400, headers: jsonHeaders });
    }
    if (error instanceof GenerationCapExceededError) {
      return new Response(JSON.stringify({ error: "You've hit today's meal-logging limit. Try again tomorrow." }), { status: 429, headers: jsonHeaders });
    }
    if (error instanceof AllVisionProvidersFailed) {
      console.error(`[scan-plate] ${error.message}`);
      if (supabase && userId) await logGenerationFailure(supabase, userId, 'scan-plate', 'unknown', error.message);
      return new Response(
        JSON.stringify({ error: 'The scanner is not available right now. Try again shortly, or log the meal by name.' }),
        { status: 503, headers: jsonHeaders }
      );
    }
    if (!(error instanceof UnauthorizedError)) await reportEdgeError('scan-plate', error);
    const status = error instanceof UnauthorizedError ? 401 : 500;
    return new Response(JSON.stringify({ error: (error as Error).message }), { status, headers: jsonHeaders });
  }
});
