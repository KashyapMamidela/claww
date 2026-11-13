# Meal scanning: the plan to make it the best it can be

Written 2026-11-11 from the first live scans and the Google AI Studio and Groq limits checks.

## 1. How scanning works now

1. The phone sends one photo to the `scan-plate` function.
2. A vision model **only names what is on the plate and guesses a household amount** (katori, roti, handful...). It never gives calories.
3. The function matches each name to the food database (291 foods) and converts the amount to grams.
4. The app adds the hidden oil from the "how oily?" answer, scales by the portion answer, and does all arithmetic.
5. The user checks the items on **Check your plate**, fixes them with - and +, then logs.

Every number comes from the database, so accuracy has three parts: **recognition** (right foods), **portion** (right amount) and **data** (right values per 100 g, oil, recipe).

## 2. Which model

Models on the Google AI Studio account (free tier today, checked 2026-11-11):

| Model | Req/min | Tokens/min | Req/day | Notes |
| --- | --- | --- | --- | --- |
| Gemini 3.8 Flash (`gemini-3.8-flash`) | 5 | 250K | 20 | Newest full Flash. Expected best accuracy on the free tier |
| Gemma 4 31B IT (`gemma-4-31b-it`) | 30 | 16K | 14,400 | Largest Gemma. "IT" = instruction-tuned. Image input from vendor docs, to confirm |
| Gemma 4 26B | 30 | 16K | 14,400 | Smaller Gemma |
| Gemini 3.5 Flash-Lite (`gemini-3.5-flash-lite`) | 15 | 250K | 500 | Lite tier: fastest and cheapest |
| Groq `qwen/qwen3.8-27b` | 30 | 8K | 1,000 | Proven on a real plate. 200K tokens a day |

Free limits are not the deciding factor: **at launch the API is paid** (Google AI Pro, the subscription, does not raise API limits; billing is set up separately in AI Studio). So choose on accuracy, then speed, then cost.

**Proposed order, to be confirmed by the test below:** the most accurate model first (expected: Gemini 3.8 Flash), a cheaper and faster one second (Gemma 4 31B IT or Gemini 3.5 Flash-Lite), Groq last as the safety net.

Things that can break a bigger model:
- **Time:** each model gets 8 seconds. A model set to "thinking: High" can exceed that. Turn thinking down for scanning, or give the first model more time.
- **JSON mode:** Google's OpenAI-compatible endpoint does not document `json_object`; the backup provider retries without it and strips code fences.

## 3. How to raise accuracy, in this order

1. **Measure.** Build the weighed set first (section 4). Nothing else can be judged without it.
2. **Give the model our vocabulary.** Put the list of food names into the prompt so it answers with names we know. Fewer "not in the database" lines.
3. **Learn names from corrections.** When users map a heard name ("mixed greens") to a food, add it as an alias. Review before adding.
4. **Calibrate portions.** From corrections, learn per-food ratios (final amount divided by guessed amount) and per place (mess, restaurant, home). Apply the median, not the mean.
5. **Better photos.** Top-down, whole plate in frame, good light, the bowl visible. Hint on the camera screen. A second side photo for height. A spoon or coin as a size reference.
6. **Two-step reading** if single-pass is weak: first name the items, then estimate each amount with the item list as context.
7. **Hidden oil and recipe.** Keep the "how oily?" question; ask it per dish type once the dish is known.
8. **Confidence routing.** Below 50 % confidence the app asks instead of guessing (already built). Tune the threshold from data.
9. **Only then fine-tuning.** Needs thousands of labelled Indian plates and a model we can host. Not before steps 1 to 8 are exhausted.

## 4. The test that picks the models (build next)

- **Data:** 100 to 200 plates, each weighed item by item on a kitchen scale, photographed once. Cover South Indian, North Indian, mess thalis, restaurant food, snacks, salads, drinks.
- **Script:** sends each photo to each model through the same function code and scores the result.
- **Metrics per model:** item recall (what was on the plate and found), item precision (what was found that was on the plate), match rate (named items found in the database), grams error per item, total-calorie error, time, failures.
- **Targets to aim for:** items found on 85 % of plates; calories within 20 % on 70 % of plates; answer in under 6 seconds.
- **Free-tier note:** 3.8 Flash allows 20 requests a day, so 100 plates take about 5 days there; use the paid tier for the final run.
- **Split by user:** the plates used to improve the prompt and aliases are never the plates used to score.

## 5. Data, consent and privacy

- Training data comes only from users who switch on **Help improve the scanner** (default off).
- Photos stay in a private bucket; the table keeps the model's guess, the answers and the final items.
- Every model provider is a subprocessor and is named in the privacy policy (currently Groq; add Google). Check each provider's terms on whether free-tier inputs may be used to improve its products; paid tiers normally do not.

## 6. Launch checklist

- Turn on billing for the Gemini API and set a spend cap and alerts.
- Keep a second provider configured so one outage does not stop scanning.
- Watch `generation_failures` and the function log (it names the model that answered).
- Review the weekly list of foods users asked for (`food_requests`, see `docs/food-gaps-plan.md`).
- Nutritionist review of the database values (see `docs/food-review.md`).

## 6b. What the research and our own logs say (2026-11-11)

Our logs (4 scans of one salad plate): Groq Qwen answered in 1.4 to 1.6 s and found the most items (9, portions of about 25 g per vegetable);
Gemini 3.5 Flash-Lite answered in 3.9 s but found 6 and read lettuce as 400 g; Gemini 3.8 Flash failed 3 of 3 (one 503, two timeouts at
12 s); Gemma 4 31B timed out once and returned a 500 once. Same photo logged as 342 kcal and 273 kcal depending on which model answered.

Published findings (see the sources in the chat reply):
- Benchmark of ten VLMs on Nutrition5k (bioRxiv, July 2026): Gemini 3.0 Flash best on calories (CCC 0.767, MAE 80.7 kcal); GPT-5 Mini 0.760
  but 6.6 % unparseable answers; Gemini 3.1 Flash Lite 0.754 (MAE 82.5) with the best ingredient recognition (Jaccard 0.655) at $0.59 per 1,000
  images; GPT-4o 0.752 at $2.00; Gemini 2.0 Flash 0.742 at $0.10; Claude Haiku 4.5 weakest on ingredients (0.386). Nutrition5k is mostly Western
  cafeteria food, not Indian.
- Prompt: asking for the **actual visible portion**, not a standard serving, lifted calorie CCC from 0.693 to 0.744 and the share within 25 % from
  30.8 % to 42.0 %. A second self-critique pass did not help. Photos cannot show hidden oil, dressing or seasoning.
- Independent 2026 review: photo calorie apps tend to underestimate by about a third, mostly from portion size.
- The authors recommend pairing the model with a nutrient database (what we do) and measuring parse failures as well as accuracy.
- Speed (Google docs): Gemini 3.x thinking is ON by default. 3.8 Flash defaults to medium and cannot go below low; 3.5 and 3.1 Flash-Lite default
  to minimal. Lower the thinking level to cut latency. An image costs 258 tokens up to 384 px and 258 per 768 px tile above that, so a phone photo
  is roughly 1,000 tokens: the model-side cost is modest, and the slow part on mobile data is uploading a full-size photo.
- Hedging (starting a backup when the first is slow) cuts tail latency at the cost of some duplicate calls; track p50 and p95 per provider.

Conclusions for us: keep the model-names-items, database-gives-numbers design; change the prompt to "visible portion" and ask for grams as well as
a household unit; shrink the photo before upload; keep thinking minimal; choose the model order from measured scores on weighed plates, not
reputation; track per-model time and failure rate in the log (already logged).

## 7. Build order

1. Model list and order in `scan-plate` (several models behind one key), with a per-model time limit and low thinking.
2. Food names in the prompt.
3. The scoring script and the folder format for the weighed plates.
4. Alias learning and portion calibration from the corrections table.
5. Camera hints and the second-photo option.
