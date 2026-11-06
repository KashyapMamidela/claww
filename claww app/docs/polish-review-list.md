# Things a trainer or nutritionist must read before testers see them

Kept up to date by the polish build. Nothing here is marked reviewed in the app.

## Trainer

| What | Where | Notes |
| --- | --- | --- |
| 10 calisthenics progressions (Negative Pull-Up, Archer Push-Up, Pseudo Planche Push-Up, Wall Handstand Hold, Hanging Knee Raise, Hanging Leg Raise, L-Sit Hold, Shrimp Squat, Cossack Squat, Nordic Curl Negative) | `database/seed_calisthenics.sql` | Muscles, movement pattern, progressions, three form steps and the common mistake were drafted, not sourced. |
| How a mixed week is split | `supabase/functions/_shared/stylePlan.ts` (`distributeStyleDays`) | One style: every day. Several: the first style picked gets about two thirds of the days, the others share the rest. |
| Yoga flows | `buildFlowDay` in `stylePlan.ts` | 2 to 5 timed blocks from the yoga rows, longest first the "flow" and "sequence" entries, total follows the session time (15 to 60 min). **No level or injury filtering yet**: the catalog has no difficulty column and the injury rules only cover strength patterns. |
| Mobility routines | `buildFlowDay` in `stylePlan.ts` | 3 to 6 blocks of 5 min or more, rotating lower body, upper body, whole body; total is half the session time (10 to 30 min). Same limits as yoga. |
| Calisthenics sessions | `CALISTHENICS_PREFERRED` in `stylePlan.ts` | Bodyweight blueprints with these exercises chosen first when a slot has several fits. |
| The 19 strength blueprints and the injury table | `supabase/functions/_shared/blueprints/`, `injuryRules.ts` | Unchanged since NG 5, still `reviewed: false`. |

## Nutritionist

See `docs/food-review.md` (food data, recipe grams, meal templates, micronutrient targets). Polish step 6b adds portion units per food (katori, bowl, spoon, pieces): the grams per unit are listed there when built.
