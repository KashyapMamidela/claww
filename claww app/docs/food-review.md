# Food database review list

Every row has `reviewed_by = NULL` until the nutritionist signs it off. The app shows nothing different for
unreviewed rows (decided in NG PHASE 4); this is what is open.

## Where things stand (2026-11-04)

- 113 ingredients (112 from USDA FoodData Central SR Legacy, public domain, plus Water at zero) and 86 dishes are
  seeded in the live database. Dish nutrition is computed from ingredient grams, with oil and ghee as separate items.
- **Short of the plan's 300 ingredients and 150 dishes.** The rest needs the nutritionist's values or a licensed Indian
  table; nothing was invented to fill the count.
- Acceptance holds: "chicken fried rice", "2 roti", "1 katori dal" and "chai" resolve with units and micronutrients
  (`lib/foodsBuild.test.ts`), and the seed ran twice with no change (199 foods both times).

## For the nutritionist, in order of importance

1. **Recipe grams** of the 86 dishes (`RECIPES` in `database/foods/tools/import_usda.py`): are these typical home and
   mess servings? Oil per serving is the biggest swing in calories.
2. **Proxy ingredients** (source contains PROXY): poha (raw rice), soya chunks (soy protein concentrate), brown sugar
   for jaggery-like sweetness, curry powder for garam masala and sambar powder, long-grain rice for basmati and sona
   masuri, cheddar for processed cheese, carp for rohu and catla, chicken thigh with skin for curry-cut chicken.
3. **Missing foods** with no usable USDA record: paneer, jaggery, curry leaves, ragi, idli and dosa batter, ghee-based
   sweets, pickles, most Indian leafy greens (methi, gongura, amaranth), coconut oil dishes, regional breads. Please supply
   values (and the licence to use them) or point to the table you trust.
4. **Household units** (see `database/foods/SOURCES.md`).
5. **Diet and Jain flags**: Jain here excludes onion, garlic, ginger, potato, carrot, beetroot, radish, sweet potato,
   mushrooms, eggs, meat, fish and honey. Please confirm.
6. **Costs** (`cost_inr_100g`) are empty for every row; they are needed for the budget-aware meal plans (NG PHASE 7).

## How to record a review

The seed never overwrites these two columns:

```sql
UPDATE foods SET reviewed_by = 'Name', reviewed_at = now() WHERE name IN ('...');
```

Open rows: `SELECT name, source FROM foods WHERE reviewed_by IS NULL ORDER BY source, name;`
