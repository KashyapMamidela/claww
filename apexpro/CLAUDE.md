# CLAWW — project rules

CLAWW is an AI-adaptive fitness app. Stack:

- **`app/`** — Expo React Native frontend (expo-router, TypeScript, Supabase JS client)
- **`supabase/functions/`** — the real backend, as Deno Edge Functions: `generate-plan`, `parse-meal` / `parse-meal-photo`, `compute-recovery`, plus `_shared/groq.ts`, `_shared/recovery.ts`, `_shared/planning.ts`, `_shared/usageCap.ts`, `_shared/supabaseClient.ts`, `_shared/cors.ts`
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
- [x] Phase 4 — Cleanup and cost control (deployed and verified)
  - [x] 4.1 Delete the dead backend — `backend/` (Next.js scaffold) removed entirely; confirmed zero references to it anywhere else in the repo before deleting. `backend/CLAUDE.md`/`AGENTS.md` had nothing worth porting — their content was Next.js-version-specific agent guidance, moot with no Next.js code left. `docs/setup.md` and root `CLAUDE.md` updated to drop the dead references
  - [x] 4.2 Stop committing `.env` — already fully satisfied from Phase 0: `.env` isn't tracked, `app/.gitignore` already ignores bare `.env` (not just `.env*.local`), and `app/.env.example` already exists. Verified directly (`git ls-files`), no change needed
  - [x] 4.3 Per-user generation cap — new `generation_usage` table (`user_id`, `usage_date`, `kind` — `'plan'` or `'meal'` — `count`), RLS'd own-rows-only, plus a `SECURITY DEFINER` Postgres function `check_and_increment_generation_usage(kind, cap)` that checks-and-increments atomically in one `INSERT ... ON CONFLICT DO UPDATE ... WHERE count < cap` statement (a select-then-insert from the Edge Function would race under concurrent/rapid requests). New `_shared/usageCap.ts` wraps the RPC call; defaults are 20 plan generations / 50 meal parses per day, both in `GENERATION_CAPS` — the one place to tune them. Wired into `generate-plan`, `parse-meal`, `parse-meal-photo`, each returning 429 with a clear message when hit. The check runs right before the real Groq call (after generate-plan's cache/cooldown short-circuit) so a cached or invalid-request response never burns a slot, and a cap hit is thrown outside generate-plan's DEFAULT_PLAN fallback path so it surfaces as a real 429 instead of silently degrading. Live-verified the RPC's exact cap behavior (1, 2, 3, then -1 on the 4th call) by simulating `auth.uid()` against the live DB. Frontend: `generateWorkoutPlan` and `logMealFromPhoto` now surface the Edge Function's real error message (previously supabase-js only exposed a generic "non-2xx" message; the actual body sits on `error.context` and had to be read explicitly) — the Workouts regenerate card and workout-setup's post-onboarding generation both show the real cap message instead of a generic one
- [~] Phase 5 — Polish before testers see it (in progress)
  - [x] 5.1 Stagger the workout-setup intake — `workout-setup.tsx` is now a thin `Redirect` to `screens/workout-setup/basics`, a 7-step flow (basics → equipment → modality → goal → experience → activity → review/injuries+generate), ordered per the prompt (equipment/modality/goal first, then experience/activity). Same data model (`WorkoutIntakeInput`) and options as before — presentation change only. Single-select steps (equipment/goal/experience/activity) auto-advance on tap via a new shared `SetupChipStep` component; the multi-select modality step keeps an explicit Continue. `OnboardingTopBar` generalized with a `totalSteps` prop (default 3, so the original onboarding flow is unaffected) instead of hardcoding 3 segments
  - [x] 5.2 Same for nutrition-setup — `nutrition-setup.tsx` is now a loader that fetches the existing profile once (this flow prefills/edits, unlike workout-setup's blank slate) then hands off to `screens/nutrition-setup/*`, a 5-step flow (details → goal → activity → dietary → review/calculate+save). Dietary restrictions kept as one multi-select step, as specified. Both flows live-tested end-to-end in the browser with a real throwaway test account (`claww.phase5.test@example.com`, dev Supabase project only): workout-setup produced a real Groq-generated plan correctly grounded to bodyweight-only exercises; nutrition-setup correctly prefilled height/weight/age/goal/activity from the profile the workout flow had just saved, computed the exact same 2827/150/379/79 the Phase 3 unit test asserts, and the saved targets showed up live on the Nutrition tab
  - [ ] 5.3 Empty, loading, and error states
  - [ ] 5.4 Live XP updates
- [ ] Phase 6 — Ship to testers
