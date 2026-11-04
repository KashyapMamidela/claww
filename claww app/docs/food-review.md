# Food database review list

Every row in `database/foods/` has `reviewed_by = NULL` until the nutritionist signs it off. The app shows nothing
different for unreviewed rows (decided in NG PHASE 4); this list is what is still open.

## Where things stand

- Tables, validator, search and unit maths are built and tested (NG PHASE 4).
- **No food rows yet.** Nothing was invented. The first rows arrive when the user supplies the nutritionist's values
  or gives the go-ahead to import USDA FoodData Central for generic ingredients.

## For the nutritionist

1. Check each row's per-100 g values against the source named in `source` / `source_ref`.
2. Check every household unit in `units.csv` (katori 150 ml, roti 40 g, idli 40 g, dosa 80 g, tsp oil 5 g, glass 250 ml): are these the sizes your clients use?
3. Check `diet` and `jain_ok` (Jain excludes onion, garlic and root vegetables).
4. Check each dish's items and grams: oil and ghee must be separate rows.

## How to record a review

Set the two columns in the live database (the seed never overwrites them):

```sql
UPDATE foods SET reviewed_by = 'Name', reviewed_at = now() WHERE name IN ('...');
```

Open rows: `SELECT name, source FROM foods WHERE reviewed_by IS NULL ORDER BY source, name;`
