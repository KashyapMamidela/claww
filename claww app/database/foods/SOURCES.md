# Food data sources and licences

No food row is in the CSV files yet. Every row added must name its source in the `source` column and the
exact table or record in `source_ref`. If a source's licence is unclear, do not copy its values: leave the
row out or add it with `source = 'UNCLEAR LICENCE'` so it shows in `docs/food-review.md`.

Order of preference, as set in NG PHASE 4:

| Order | Source | Licence | Status |
| --- | --- | --- | --- |
| 1 | Values the nutritionist provides | Theirs to grant; get it in writing | Waiting on the user |
| 2 | Published Indian food composition tables (for example ICMR-NIN "Indian Food Composition Tables" 2017) | Not confirmed. Government publications are not automatically free to copy | Do not copy until the licence is confirmed in writing |
| 3 | USDA FoodData Central (SR Legacy and Foundation Foods) | Public domain (CC0 1.0) | Allowed for generic ingredients; not downloaded yet |

Dishes carry no nutrition of their own. Their values are the sum of their ingredients (oil and ghee are
separate items), so a dish can never disagree with its parts. Household units (katori, roti, glass, tsp)
are standard sizes written down in `units.csv`; each is a stated assumption, not a measurement.

## Files

- `ingredients.csv`: one row per ingredient, per 100 g, with `source` and `source_ref`.
- `dishes.csv`: name, aliases, cuisine, diet, `jain_ok`, optional `kcal_100g` to cross-check against a published figure (the build fails when it is more than 5 % from the items), `source`, `source_ref`.
- `dish_items.csv`: `dish,item,grams`.
- `units.csv`: `food,unit,grams,is_default`, exactly one default per food.
- `build_foods.mjs`: validates, then writes `database/seed_foods.sql`. Run `node database/foods/build_foods.mjs`.
