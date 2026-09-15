# CLAWW — project rules

CLAWW is an AI-adaptive fitness app. Stack:

- **`app/`** — Expo React Native frontend (expo-router, TypeScript, Supabase JS client)
- **`supabase/functions/`** — the real backend, as Deno Edge Functions: `generate-plan`, `parse-meal` / `parse-meal-photo`, `compute-recovery`, plus `_shared/groq.ts`, `_shared/recovery.ts`, `_shared/planning.ts`, `_shared/supabaseClient.ts`, `_shared/cors.ts`
- **`database/schema.sql`** — Postgres schema, RLS on every table, written to be re-runnable (`IF NOT EXISTS` / `ADD COLUMN IF NOT EXISTS` throughout). **Every schema change in every phase must follow this exact idempotent style.**

Full setup instructions: `docs/setup.md`.

## Non-negotiable design principles

1. **The LLM never computes numbers.** Deterministic calculation first (rep ranges, volume, frequency, progression trends), LLM only selects/names within constraints already computed for it, output is Zod-validated and clamped before use, with a hard fallback on validation failure. This is the existing pattern in `generate-plan/index.ts` (`GOAL_REP_RANGES`, `computeRepRange`, `clampPlanToThresholds`, `PlanSchema`, `DEFAULT_PLAN`) — extend it, never bypass it.
2. **Never surface "AI-generated" as a label, badge, or disclaimer anywhere in the UI.** Generation is invisible infrastructure, same posture as Instagram's ML dubbing/moderation.
3. **RLS on everything.** Any new table needs `ENABLE ROW LEVEL SECURITY` plus an owner-scoped policy matching the existing style. Any new column on a `user_id`-scoped table must remain covered by that table's existing policy.
4. **Schema changes live in `database/schema.sql`**, idempotent, never a separate migration file.

## Roadmaps

- `claww-full-roadmap.md` — the long-range **Engine Phase** roadmap (adaptive generation, multi-modality, trust layer, wearables, creator layer). Phases labeled **Engine Phase N**.
- `claww-phased-prompts.md` — the near-term, prompt-by-prompt execution plan actually being worked right now. Phases labeled **PHASE N** (no "Engine"/"UI" prefix — this is the active one). Standing rules for running it are at the bottom of that file.
- The UI/UX polish audit is a separate published Artifact, not a repo file. Phases labeled **UI Phase N**.

Don't confuse "phase 2" between these three without checking which one is meant.

## Current phase (claww-phased-prompts.md)

- [x] Phase 1 — Close the adaptive loop (deployed and live-verified)
  - [x] 1.1 Reps-achieved logging (schema) — migration run against the live DB, confirmed via `information_schema`
  - [x] 1.2 Reps-achieved logging (data layer) — `app/lib/data.ts`, `app/lib/workoutSession.tsx`
  - [x] 1.3 Reps-achieved logging (UI) — confirm-before-log step + haptics, live-tested: confirm card defaults to prescribed reps/weight, logged row came back with correct prescribed/achieved values
  - [x] 1.4 Regeneration trigger — `app/app/(tabs)/workouts.tsx`, code-reviewed + typechecked, not independently live-clicked
  - [x] 1.5 Feed real history into generation — deployed; live-tested plan generation is real Groq output, not `DEFAULT_PLAN` fallback
  - All 4 Edge Functions redeployed (generate-plan, compute-recovery, parse-meal, parse-meal-photo — all share the changed `_shared/` files)
- [x] Phase 2 — Make the plans worth generating (deployed and verified)
  - [x] 2.1 Seed the exercise catalog — `database/seed_exercises.sql` expanded from 25 to 183 rows (42+ per modality), weighted toward `equipment='none'`; added a unique index on `exercises.name` in `schema.sql` so the seed file uses real `ON CONFLICT (name) DO NOTHING` instead of only guarding an empty table
  - [x] 2.2 Verify the equipment filter at scale — `database/verify_equipment_filter.sql`, a no-framework SQL check (Phase 3.2 will fold it into a real test): zero mistagged rows in either direction. A bodyweight-only user now sees 119 exercises across all 4 modalities (was ~14)
- [x] Phase 3 — Protect what's load-bearing (deployed and verified)
  - [x] 3.1 Test runner + `computeRecoveryScore` tests — Vitest, chosen over `deno test` because Deno isn't installed in this dev environment and the functions under test have zero Deno-specific imports; config lives in `app/vitest.config.mts` (the only real npm project) and reaches into `supabase/functions/**/*.test.ts` via a relative include. 8 tests in `supabase/functions/_shared/recovery.test.ts`: full sleep/no session, zero sleep, a very recent high-intensity session, missing data both inputs, and all 4 band-boundary values (39/40/70/71) — every expected score hand-derived from the formula, not copied from anywhere
  - [x] 3.2 Grounding + equipment filter tests — extracted both into a new dependency-free `supabase/functions/_shared/planning.ts` (generate-plan/index.ts now imports from it; redeployed, confirmed working). 9 tests in `planning.test.ts`: hallucinated exercise name dropped, a fully-hallucinated day dropped, exerciseId rewritten from the real catalog id, an entirely fake plan grounds to zero days, and equipment tiers (`none`→only none, `home`→none+home, `gym`→all three, unknown defaults to gym) including a mixed-pool filter confirming no gym-only exercise leaks into a `none` result
  - [x] 3.3 Nutrition formula test — extracted `computeNutritionSample` into `app/lib/nutrition.ts` (same reason: importing it via `data.ts` pulls in the Supabase client → react-native → Flow syntax Vite can't parse); `data.ts` re-exports for existing call sites, typechecked clean. **Found and fixed a stale reference in this very doc**: the "already-verified" 178/75/25/male/muscle_gain/moderate case here says 135g protein/394g carbs — the code actually computes 150g/379g (muscle_gain protein is 2.0g/kg here, not the 1.8g/kg that number implies). Tests assert what the code actually does today, plus a female case and a low-weight case that hits the 1200 kcal floor
  - All 20 tests pass (`cd app && npm test`)
- [ ] Phase 4 — Cleanup and cost control
- [ ] Phase 5 — Polish before testers see it
- [ ] Phase 6 — Ship to testers
