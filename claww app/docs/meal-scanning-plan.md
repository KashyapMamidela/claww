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

## 7. Build order

1. Model list and order in `scan-plate` (several models behind one key), with a per-model time limit and low thinking.
2. Food names in the prompt.
3. The scoring script and the folder format for the weighed plates.
4. Alias learning and portion calibration from the corrections table.
5. Camera hints and the second-photo option.
