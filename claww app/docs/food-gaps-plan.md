# Foods the database does not have: how they get added and verified

Written 2026-11-11, after the first live scan (a salad bowl: five of seven items had no match).

## Where the database stands

291 foods: 136 ingredients and 155 dishes (South Indian, North Indian, Andhra/Telangana, Indo-Chinese, a few
continental and drinks). Every row says its source and is **unreviewed** until the nutritionist signs it off
(`docs/food-review.md`). Dishes are never typed: their nutrition is computed from authored recipe grams, so a dish
is only as good as its recipe.

## How a missing food is caught (built)

- Search with no result shows **Ask us to add it**; one tap stores the name.
- In the scanner, removing an item the database did not know stores its name too.
- Names land in `food_requests` (one row per user and name, name only, no photo). **The table is in `schema.sql`
  but not applied to the live database yet**; until it is, the app does nothing visible and loses nothing.
- Interim for the user: unknown scanned items can be removed, or replaced with the closest food (search opens
  with the name typed).

## How a request is resolved (weekly, about 30 minutes)

1. Sort `food_requests` by how many users asked for the same name. Work from the top.
2. Find the values in the first source below that has them.
3. Add the food to `database/foods/*.csv` (or `tools/add_more_foods.py`), run `node database/foods/build_foods.mjs`,
   apply the delta, set the request to `added` and fill `resolved_food_id`. A name that is not a food or has no
   reliable value gets `declined`.
4. A dish is added as a recipe of existing ingredients (grams per serving) so its numbers are computed, never typed.

## Sources, in order of trust

| Need | Source | Licence | Notes |
| --- | --- | --- | --- |
| Raw and generic ingredients | USDA FoodData Central (SR Legacy, Foundation) | Public domain (CC0) | Already used. Keep the FDC id in `source_ref`. Many rows added on 2026-11-11 still need their FDC id checked |
| Indian ingredients USDA lacks (paneer, jaggery, millets, greens) | The nutritionist's own values, or ICMR-NIN IFCT 2017 with **written permission** from NIN | IFCT reuse terms unconfirmed, so nothing is copied from it | Paneer, jaggery, curry leaves, ragi and methi are currently typical published values, marked as such |
| Packaged products | Open Food Facts, by barcode | ODbL: attribution is required, and a database built from it must stay open under the same licence | Use it live for a scanned barcode (look up, show, log). Do not bulk-copy it into our own table without a licence check |
| Restaurant and chain dishes | The brand's published nutrition sheet | Facts from a public page; keep the link in `source_ref` | Good for biryani, pizza, burgers and thalis served by chains |
| Home and mess dishes | Authored recipe grams, cross-checked | Ours | Compare the computed kcal with at least two published references; if they differ by more than 15 %, fix the recipe |

## Quality gate before a row can be called reviewed

1. A named person (the nutritionist) checks the values and the unit sizes against their own client data.
2. `reviewed_by` and `reviewed_at` are set (the seed never overwrites them).
3. Until then the app already says "Values are from the food database and are still being reviewed".

## What the user does not see

No "AI" wording anywhere: the scanner names what is on the plate, and every number still comes from this database.

## Next steps that need people

- Apply the `food_requests` block at the end of `database/schema.sql` (a production change, so it needs your go-ahead).
- Send the nutritionist the `needs review` list: `source` is `Typical published values (not USDA)` or
  `Computed from ingredients` (about 220 rows).
- Ask NIN in writing whether IFCT 2017 values may be used in the app; if yes, the Indian ingredient gaps close fast.
- Decide whether to look up Open Food Facts live for barcodes (already how the barcode flow behaves) and how to credit it.
