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

- `claww-ship-roadmap.md` — **the active roadmap.** Everything between the current repo state and a published Play Store app: unblocking generation, legal/policy compliance, finishing the unfinished UI, observability, safety hardening, differentiation, and the closed-testing run. Phases labeled **SHIP PHASE N**. Standing rules are near the top of that file.
- `claww-phased-prompts.md` — the previous execution plan, **Phases 1–5 complete**. Its thin three-prompt `PHASE 6 — Ship to testers` is superseded by `claww-ship-roadmap.md`, which absorbs it as SHIP PHASE 9 and 12. Phases labeled **PHASE N**.
- `claww-full-roadmap.md` — the long-range **Engine Phase** roadmap (adaptive generation, multi-modality, trust layer, wearables, creator layer). Phases labeled **Engine Phase N**. Deferred until after launch.
- The UI/UX polish audit is a separate published Artifact, not a repo file. Phases labeled **UI Phase N**.

Don't confuse "phase 2" between these four without checking which one is meant.

## Completed phases (claww-phased-prompts.md)

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
- [x] Phase 5 — Polish before testers see it (deployed and verified)
  - [x] 5.1 Stagger the workout-setup intake — `workout-setup.tsx` is now a thin `Redirect` to `screens/workout-setup/basics`, a 7-step flow (basics → equipment → modality → goal → experience → activity → review/injuries+generate), ordered per the prompt (equipment/modality/goal first, then experience/activity). Same data model (`WorkoutIntakeInput`) and options as before — presentation change only. Single-select steps (equipment/goal/experience/activity) auto-advance on tap via a new shared `SetupChipStep` component; the multi-select modality step keeps an explicit Continue. `OnboardingTopBar` generalized with a `totalSteps` prop (default 3, so the original onboarding flow is unaffected) instead of hardcoding 3 segments
  - [x] 5.2 Same for nutrition-setup — `nutrition-setup.tsx` is now a loader that fetches the existing profile once (this flow prefills/edits, unlike workout-setup's blank slate) then hands off to `screens/nutrition-setup/*`, a 5-step flow (details → goal → activity → dietary → review/calculate+save). Dietary restrictions kept as one multi-select step, as specified. Both flows live-tested end-to-end in the browser with a real throwaway test account (`claww.phase5.test@example.com`, dev Supabase project only): workout-setup produced a real Groq-generated plan correctly grounded to bodyweight-only exercises; nutrition-setup correctly prefilled height/weight/age/goal/activity from the profile the workout flow had just saved, computed the exact same 2827/150/379/79 the Phase 3 unit test asserts, and the saved targets showed up live on the Nutrition tab
  - [x] 5.3 Empty, loading, and error states — two new primitives in `app/components/ui/`: `Skeleton` (pulsing placeholder block, not a spinner) and `ErrorCard` (message + optional retry action), both used throughout instead of ad hoc one-off styling. **Found and fixed a real bug along the way**: `appState.tsx`'s `isNewUser` was a session-only flag that only ever flipped true via `generatePlan()` — it was never re-derived from real data, so a returning user with an existing plan saw Home's "generate your first plan" empty state again on every app reopen until they regenerated. Replaced with `hasPlan` (derived from a real `getLatestWorkout` check) plus a genuine `loading` flag, so Home now shows a skeleton while that resolves instead of flashing the wrong state. Added matching loading skeletons to Workouts (was a blank screen) and Tracker (was flashing "0 of 3, locked" before real counts loaded), and gated Nutrition's "set up your targets" nudge + daily-target card behind its own load so it can't flash defaults over real saved targets. Consolidated 4 separate ad hoc red-text error renderings (`workouts.tsx` regenerate, `workout-setup/review.tsx`, `nutrition-setup/review.tsx`, `meal-log.tsx`) into `ErrorCard`, each wired with a real retry action that re-runs the failed call. Home/Workouts/Nutrition already had real first-run empty states from earlier phases (`HomeEmptyState`, `WorkoutsEmptyState`, the meal-timeline empty card) — audited and left alone, no changes needed there. Typecheck and all 20 tests still pass; live click-through of the loading-skeleton fix was blocked by the same intermittent "Browser pane hidden" limitation seen in earlier phases (stopped after 2 retries per the established pattern) — relying on the clean typecheck plus the fact that `getLatestWorkout` is the identical query already proven live during the Phase 5.1 test run
  - [x] 5.4 Live XP updates — `xp` and `streak` moved into `appState.tsx` as shared reactive state instead of each of 5 screens (Home, Workouts via the session, Tracker, More, Profile) independently fetching their own stale copy via `getUserXp`/`getActivityStreak` on focus. `bumpXp(amount)` optimistically increments the shared value the instant an XP-awarding action succeeds — wired at every call site that awards XP (matches `awardXp`'s amount in `data.ts` exactly, commented at each site): `logSleep`/`addMeal`/`addMealFromPhoto` in `appState.tsx` itself (+10 each), `workoutSession.tsx`'s `finishSet` (+5 per set — the actual "architecture notes" complaint this prompt names), and the two `generateWorkoutPlan` call sites in `workout-setup/review.tsx` and `workouts.tsx`'s regenerate (+50). `streak` is never fabricated client-side — its formula only depends on same-day `sleep_logs`/`meal_logs` rows, so `logSleep`/`addMeal`/`addMealFromPhoto` just re-run the real `getActivityStreak` query immediately after logging instead of leaving it stale until next focus. Live-verified in the browser: completing a set on the Workouts tab pushed Home's `✦ 50 CLAWW` badge to `✦ 55 CLAWW` instantly, with no navigation, reload, or tab switch — read directly via `get_page_text` right after tapping Confirm Set. The same sign-in also re-confirmed 5.3's `hasPlan` fix from a genuinely cold session (fresh login showed the populated Home immediately, not the empty state)
- [x] Phase 6 — Ship to testers — **superseded by `claww-ship-roadmap.md`** (absorbed as SHIP PHASE 9 and 12; the original three prompts named the right things but were not the whole list)

## Current phase (claww-ship-roadmap.md)

Full-repo review at `c6bfeca` scored the app **5/10 production-ready, 4/10 market**. Typecheck
clean and 27/27 tests passing; the schema, RLS and deterministic-generation architecture are
sound. SHIP PHASE 6 is now closed — generation is confirmed genuinely live in production, not
silently falling back. Next up is **SHIP PHASE 7** (legal/policy compliance), the longest
external-dependency phase, so start it before 8–12. Target on completion: 9/10 production-ready.

- [x] SHIP PHASE 6 — Prove the engine is alive (deployed and live-verified against project `vaweeztulqvkciuqytyi`, 2026-09-19/20). **Gated everything else** — it now gates nothing; the engine is confirmed real.
  - [x] 6.1 Confirmed live via `health-check`: `database/schema.sql` run against the live project, all 4 functions deployed (`health-check` with `--no-verify-jwt`, secret-guarded), `HEALTH_CHECK_SECRET` and `GROQ_API_KEY` set as project secrets. First real call surfaced two genuine production bugs, not the originally-documented 403: (1) both configured vision models (`qwen/qwen3.6-27b`, `llama-3.2-90b-vision-preview`) don't exist for this org — `qwen3.6-27b` isn't in this account's `/openai/v1/models` listing at all despite Groq's own docs naming it, and the Llama vision model is decommissioned; (2) the two text fallback candidates (`llama-3.3-70b-versatile`, `llama-3.1-8b-instant`) are likewise gone from the catalog. Fixed by querying `GET /openai/v1/models` directly against the live `GROQ_API_KEY` and rebuilding both chains from what's actually enabled for this org: text is now `[openai/gpt-oss-120b, openai/gpt-oss-20b]` (both confirmed real second options, same OSS family — not a downgrade guess), vision is `[qwen/qwen3.8-27b]`, the only image-capable model this account has access to at all. That one was still org-blocked (`model_permission_blocked_org`) until enabled at console.groq.com/settings/limits — final health-check after enabling it: `"healthy": true`, every model in both chains `ok`. **Vision currently has no real second fallback model** — Groq only offers one image-capable model on this account; re-run the `/models` check periodically as their catalog changes. `groq.test.ts`'s 3-model fallback test was rewritten to match the real 2-model text chain; all 27 tests pass, typecheck clean
  - [x] 6.2 `health-check` Edge Function — deployed, secret-guarded, confirmed working (see 6.1)
  - [x] 6.3 `generation_failures` table + logging — schema applied live, deployed with the other 3 functions
  - [x] 6.4 Ordered fallback chains — deployed with corrected, live-verified model lists (see 6.1)
- [ ] SHIP PHASE 7 — Legal and policy compliance (hard Play blockers; longest external dependencies, so start early)
  - [ ] 7.1 In-app account deletion + web deletion URL (service-role Edge Function, JWT-scoped to `user.id` only)
  - [ ] 7.2 Privacy policy and terms hosted at a real URL, naming Supabase and Groq as subprocessors
  - [ ] 7.3 `docs/legal/data-safety.md` — field-by-field Play Data Safety answers (Health and fitness + Photos categories both apply)
  - [ ] 7.4 Medical disclaimer + audit of "Science-Backed" / "100% Personalized" claims against what the code does
  - [ ] 7.5 Data export ("Download my data"), RLS-scoped
- [ ] SHIP PHASE 8 — Finish the unfinished UI (cheapest phase; do before any external tester)
  - [ ] 8.1 Resolve all 10 dead menu rows in `(tabs)/more.tsx` and `profile.tsx`; type the row shape so a handler-less row fails typecheck
  - [ ] 8.2 Real Settings screen (units, caps, notification prefs, sign-out)
  - [ ] 8.3 Notifications via `expo-notifications`, contextual permission request
  - [ ] 8.4 Password reset; finish or remove the non-functional `signInWithGoogle`
  - [ ] 8.5 Version string from `expo-constants` (currently hardcoded `3.4.1` vs `app.json`'s `1.0.0`)
- [ ] SHIP PHASE 9 — Observability, CI, release engineering
  - [ ] 9.1 Sentry (app + Edge Functions), PII scrubbed, release-tagged
  - [ ] 9.2 PostHog on the core loop, including real-vs-fallback generation (joins with 6.3)
  - [ ] 9.3 GitHub Actions CI — `tsc --noEmit` + `npm test` (no `.github/` exists today)
  - [ ] 9.4 `production` EAS profile → AAB, plus store-asset audit. **Unblocks the 12.2 clock**
  - [ ] 9.5 Git-history secret scan + rotate; work down 36 `npm audit` findings (all transitive dev tooling)
- [ ] SHIP PHASE 10 — Safety and correctness hardening (where the 9/10 is earned)
  - [ ] 10.1 Replace the six-regex injury filter with structured `movement_pattern` contraindications + regression tests
  - [ ] 10.2 Photo size ceiling + per-minute rate limit alongside the daily cap
  - [ ] 10.3 Offline resilience — queue set logs, flush on reconnect
  - [ ] 10.4 React Native Testing Library on data layer, auth transitions, delete/export flows
  - [ ] 10.5 Accessibility pass — labels, contrast, font scaling
- [ ] SHIP PHASE 11 — Differentiation (moves the market score)
  - [ ] 11.1 Health Connect / Apple Health sync — highest-leverage single addition
  - [ ] 11.2 Per-exercise form guidance, authored not generated
  - [ ] 11.3 Progress and insights screen from data already collected
  - [ ] 11.4 Onboarding conversion — instrument drop-off, defer nutrition setup
  - [ ] 11.5 Monetization via RevenueCat, gated on depth not access (`GENERATION_CAPS` is the natural seam)
- [ ] SHIP PHASE 12 — Beta, closed testing, launch
  - [ ] 12.1 Device QA matrix → `docs/qa-matrix.md`
  - [ ] 12.2 Closed test, 12 testers × 14 consecutive days. **Calendar-bound — start the moment 9.4 produces a build, run it in parallel with Phases 10 and 11**
  - [ ] 12.3 Store listing (avoid "AI-powered"; lead with bounded programming and real adaptation)
  - [ ] 12.4 Launch checklist + staged rollout
