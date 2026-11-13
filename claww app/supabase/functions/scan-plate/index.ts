import { z } from 'npm:zod@3';
import { corsHeaders, jsonHeaders } from '../_shared/cors.ts';
import { callGroqVisionJSON, GROQ_MODEL_CHAINS } from '../_shared/groq.ts';
import { logGenerationFailure } from '../_shared/generationFailures.ts';
import { UnauthorizedError, requireUser, userClientFromRequest } from '../_shared/supabaseClient.ts';
import { enforceGenerationCap, GenerationCapExceededError } from '../_shared/usageCap.ts';
import { reportEdgeError } from '../_shared/sentry.ts';
import { AllVisionProvidersFailed, callVisionProviders, openAiCompatibleProvider, PROVIDER_TIMEOUT_MS, TOTAL_DEADLINE_MS, type VisionProvider } from '../_shared/vision.ts';
import { candidateChips, OIL_FOOD, parseModelOutput, resolveItems, routeScan, type ScanFood } from '../_shared/scanMath.ts';

// NG PHASE 9: the scanner. The model only names the items on the plate, guesses a household quantity for each and says
// how sure it is. Every number comes from the food database: this function maps the names to `foods` rows and returns
// the items in household units; the app applies "how oily?" and the portion and does the arithmetic, so the steppers
// recalculate instantly. Providers: Groq first, then a backup (any OpenAI-compatible vision endpoint, set by secrets).

const RequestSchema = z.object({
  image: z.string().startsWith('data:image/', 'image must be a data URI'),
  /** Scanner lab only (secret SCANNER_LAB=on): run this one model, report its time, skip the daily cap. */
  only: z.string().optional(),
});

const SYSTEM_PROMPT = `You look at a photo of a meal, mostly Indian food, and list what is on the plate. You do NOT estimate calories.
Respond with ONLY a JSON object of this exact shape:
{"isFood": boolean, "isAppropriate": boolean, "dish": string, "confidence": number, "candidates": string[], "items": [{"name": string, "quantity": number, "unit": string, "grams": number}]}

Rules:
- isFood is true only if the photo clearly shows food or a drink for people. isAppropriate is false for nudity, violence, weapons, illegal activity, hate symbols or anything unsafe.
- dish: the plate in a few words ("Chicken fried rice", "Idli sambar", "Dal rice thali").
- items: every separate food you can see. Use plain common names ("fried rice", "chicken pieces", "egg", "sambar", "roti", "curd"). Do NOT list cooking oil.
- Estimate what is ACTUALLY VISIBLE on this plate, not a standard serving: a small portion is small, a big heap is big.
- quantity and unit: a HOUSEHOLD guess of that visible amount. grams: your best estimate of that item's weight in grams as it appears on the plate (a number). Units: katori (a small bowl, 150 ml), roti, idli, dosa, piece, egg, tsp, tbsp, glass, cup, plate, handful, slice, g. Rice or curry in a bowl is katori; bread and idli are counted; use g only if nothing else fits.
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

// The order the scanner tries models in: Groq first, then Gemini 3.6 Flash. Each failure (error, rate limit, timeout, an
// answer that does not validate) moves straight to the next. VISION_MODELS (comma separated, "model" or
// "model:milliseconds") replaces the Google part without a deploy.
// If the model being tried has not answered after this long, the next one starts too and the first valid answer wins.
const HEDGE_MS = 4000;

// Thinking level per Google model: the lowest each one allows (3.8 Flash cannot go below low), to keep answers quick.
const EFFORT: Record<string, string | undefined> = {
  'gemini-3.8-flash': 'low',
  'gemini-3.6-flash': 'minimal',
  'gemini-3.5-flash-lite': 'minimal',
  'gemini-3.1-flash-lite': 'minimal',
  'gemma-4-31b-it': undefined,
};

// The models the Scanner lab may run on their own. Anything else is refused.
const LAB_MODELS = ['groq', 'gemini-3.8-flash', 'gemini-3.6-flash', 'gemini-3.5-flash-lite', 'gemini-3.1-flash-lite', 'gemma-4-31b-it'];

// Two models, from the first Scanner lab run: Groq Qwen first (about 1.4 s inside the model, found 8 of 9 foods) and
// Gemini 3.6 Flash as the backup (about 4 s, 8 of 9, and it found what Groq missed). 3.8 Flash, Gemma and the Flash-Lite
// models stay in the lab only until they are reliable.
const GOOGLE_MODELS: { model: string; timeoutMs: number }[] = [{ model: 'gemini-3.6-flash', timeoutMs: 12000 }];

function buildProviders(): VisionProvider[] {
  // Groq first.
  const providers: VisionProvider[] = [
    {
      name: `groq:${GROQ_MODEL_CHAINS.vision[0]}`,
      timeoutMs: 10000,
      // callGroqVisionJSON has its own fetch and chain; the time limit around it is enforced by callVisionProviders.
      call: async (system, user, image) => (await callGroqVisionJSON(system, user, image)).content,
    },
  ];
  const url = Deno.env.get('VISION_BACKUP_URL');
  const key = Deno.env.get('VISION_BACKUP_KEY');
  if (url && key) {
    const override = (Deno.env.get('VISION_MODELS') ?? '')
      .split(',')
      .map((e) => e.trim())
      .filter(Boolean)
      .map((e) => {
        const [model, ms] = e.split(':');
        return { model: model.trim(), timeoutMs: Number(ms) > 0 ? Number(ms) : 12000 };
      });
    const list = override.length > 0 ? override : GOOGLE_MODELS;
    for (const m of list) {
      providers.push(openAiCompatibleProvider({ name: `google:${m.model}`, url, key, model: m.model, timeoutMs: m.timeoutMs, reasoningEffort: EFFORT[m.model] ?? 'low' }));
    }
  }
  return providers;
}

/** One named model, for the Scanner lab. */
function buildOne(only: string): VisionProvider | null {
  if (!LAB_MODELS.includes(only)) return null;
  if (only === 'groq') {
    return { name: `groq:${GROQ_MODEL_CHAINS.vision[0]}`, timeoutMs: 30000, call: async (system, user, image) => (await callGroqVisionJSON(system, user, image)).content };
  }
  const url = Deno.env.get('VISION_BACKUP_URL');
  const key = Deno.env.get('VISION_BACKUP_KEY');
  if (!url || !key) return null;
  return openAiCompatibleProvider({ name: `google:${only}`, url, key, model: only, timeoutMs: 30000, reasoningEffort: EFFORT[only] });
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

    const lab = !!body.only && Deno.env.get('SCANNER_LAB') === 'on';
    if (body.only && !lab) {
      return new Response(JSON.stringify({ error: 'The scanner lab is off.' }), { status: 403, headers: jsonHeaders });
    }
    if (!lab) await enforceGenerationCap(supabase, 'meal');

    const { data: rows, error: foodsError } = await supabase
      .from('foods')
      .select('id, name, aliases, kind, kcal_100g, protein_100g, carbs_100g, fat_100g, fibre_100g, iron_mg_100g, calcium_mg_100g, vitc_mg_100g, b12_ug_100g, sodium_mg_100g, food_units(unit, grams, is_default)')
      .limit(2000);
    if (foodsError) throw new Error(`Failed to load foods: ${foodsError.message}`);
    const foods = (rows as unknown as FoodRow[]).map(toScanFood);

    const single = lab ? buildOne(body.only!) : null;
    if (lab && !single) {
      return new Response(JSON.stringify({ lab: true, ok: false, model: body.only, error: 'That model is not available.' }), { headers: jsonHeaders });
    }
    let result;
    try {
      result = lab
        ? await callVisionProviders([single!], SYSTEM_PROMPT, 'List what is on this plate.', body.image, (text) => parseModelOutput(JSON.parse(text)), 30000, 30000, 0)
        : await callVisionProviders(
      buildProviders(),
      SYSTEM_PROMPT,
      'List what is on this plate.',
      body.image,
      (text) => parseModelOutput(JSON.parse(text)),
      PROVIDER_TIMEOUT_MS,
      TOTAL_DEADLINE_MS,
      HEDGE_MS
    );
    } catch (e) {
      // In the lab a failure is a result, with the reason, not an error.
      if (lab && e instanceof AllVisionProvidersFailed) {
        return new Response(JSON.stringify({ lab: true, ok: false, model: body.only, error: e.attempts.map((a) => a.error ?? 'failed').join('; ') }), { headers: jsonHeaders });
      }
      throw e;
    }
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
        ...(lab ? { lab: true, ok: true, ms: result.attempts[result.attempts.length - 1]?.ms ?? null } : {}),
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
