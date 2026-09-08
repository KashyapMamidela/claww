# CLAWW — Phased Claude Code Prompts

Based on the actual repo state at commit `adf7a18`. Run phases in order — each depends on the
previous one. Within a phase, run prompts one at a time and read the diff before accepting.

Before starting: make sure `CLAUDE.md` is at the repo root (not inside `backend/`) so every
session inherits the architecture rules.

---

## PHASE 1 — Close the adaptive loop
**This is the whole ballgame. Nothing else on this list matters as much.**

### 1.1 — Reps-achieved logging (schema)

> In `database/schema.sql`, update the `workout_logs` table to distinguish prescribed
> performance from actual performance. Rename the existing `reps` column to
> `reps_prescribed` and add a new nullable `reps_achieved INT` column, plus
> `weight_prescribed` / `weight_achieved` following the same pattern. Write it as an
> idempotent migration using `ALTER TABLE ... ADD COLUMN IF NOT EXISTS` and
> `ALTER TABLE ... RENAME COLUMN` guarded so the whole file stays safe to re-run against
> an existing database, matching the convention already used elsewhere in this file.
> Do not change any RLS policy — `workout_logs` already has the correct own-rows policy.

### 1.2 — Reps-achieved logging (data layer)

> Update `logWorkoutSet()` in `app/lib/data.ts` to accept and write both prescribed and
> achieved values. `WorkoutSetInput` should carry `repsPrescribed`, `repsAchieved`,
> `weightPrescribed`, `weightAchieved`. Keep the existing XP award behaviour unchanged.
> Then update the call site in `app/lib/workoutSession.tsx` so it passes the real achieved
> numbers rather than echoing the prescribed ones.

### 1.3 — Reps-achieved logging (UI)

> In `app/components/LiveWorkoutPlayer.tsx`, when a user completes a set, let them confirm
> or adjust the reps and weight they actually did before it's logged. Default the inputs to
> the prescribed values so the common case is a single tap to confirm — the interaction
> should not feel like data entry. Use the existing UI primitives in `app/components/ui/`
> rather than introducing new component patterns, and add haptic feedback on set completion
> via `expo-haptics`.

### 1.4 — Regeneration trigger

> Add a "Regenerate plan" action to the Workouts tab (`app/app/(tabs)/workouts.tsx`) that is
> available once a plan already exists. Tapping it opens an inline card asking why —
> three quick-tap options: "Too hard", "Too easy", "Wrong focus" — then calls `generate-plan`
> with that reason included, and re-renders with the new plan. Show a loading state while it
> runs; `generate-plan` measured ~3.8s, so the wait must be narrated, not silent.

### 1.5 — Feed real history into generation

> Update the `generate-plan` Edge Function so the deterministic compute step (step 1 of the
> pipeline) reads recent `workout_logs` rows and uses `reps_achieved` vs `reps_prescribed`
> to adjust the prescribed rep ranges and set counts for the next plan — for example, sets
> where achieved consistently fell short of prescribed should pull the next prescription down,
> and consistently meeting or exceeding it should push it up. Also incorporate the
> regeneration reason ("too hard" / "too easy" / "wrong focus") when one is passed.
> Keep this entirely in the deterministic math — do not widen what Groq is trusted to decide.
> The model's job stays exactly as it is: pick exercise names from the filtered catalog.

**Phase 1 is done when:** you can complete a workout logging real reps, tap regenerate, and
get a visibly different plan that reflects what you actually did.

---

## PHASE 2 — Make the plans worth generating

### 2.1 — Seed the exercise catalog

> Expand `database/seed_exercises.sql` to at least 40 exercises per modality (strength,
> cardio, mobility, yoga) — currently there are 24 total across all four. For each row fill
> in `name`, `modality`, `muscle_group`, `equipment` (`gym` / `home` / `none`), and a
> realistic `met_value`. Prioritise `equipment = 'none'` bodyweight and calisthenics
> movements — the target user often trains without gym access, and the equipment filter
> means bodyweight-only users can currently only draw from a very small pool.
> Keep the file idempotent (`ON CONFLICT DO NOTHING` or equivalent) so it can be re-run.

### 2.2 — Verify the equipment filter against the bigger catalog

> Write a test scenario that calls the exercise-filtering logic in `generate-plan` with
> `equipment: 'none'` and confirms every returned exercise is actually bodyweight-capable,
> now that the catalog is larger. This was a real bug once already — confirm the fix holds
> at scale.

---

## PHASE 3 — Protect what's load-bearing

### 3.1 — Test the pure functions

> Set up a test runner (Vitest is fine for a Deno/TS project — pick what fits and explain
> the choice). Write unit tests for `computeRecoveryScore` in
> `supabase/functions/_shared/recovery.ts` covering: full sleep with no prior session,
> zero sleep, a very recent high-intensity session, missing data on both inputs, and the
> band boundaries (39/40, 70/71). Use the worked values to assert exact expected scores,
> not just ranges.

### 3.2 — Test the grounding and equipment filters

> Write unit tests for the grounding filter and equipment filter in `generate-plan`.
> The grounding filter must drop any exercise name the model returns that wasn't in the
> list sent to it — test with a deliberately hallucinated name. The equipment filter must
> exclude gym-only movements when equipment is `none`. Both are pure functions with no I/O,
> so they should test without mocking Supabase or Groq.

### 3.3 — Nutrition formula test

> Write a unit test for the Mifflin-St Jeor nutrition target calculation using the
> already-verified case: 178cm / 75kg / age 25 / male / muscle_gain / moderate activity →
> 2827 kcal, 135g protein, 394g carbs, 79g fat. Add a female case and an edge case at the
> low end of the weight range.

---

## PHASE 4 — Cleanup and cost control

### 4.1 — Delete the dead backend

> Delete the `apexpro/backend/` folder entirely. Its `generate-workout` and
> `generate-nutrition` routes are unimplemented placeholders superseded by the
> `generate-plan` and `parse-meal` Edge Functions, and the architecture doc confirms
> nothing in the app points at it. Move `backend/CLAUDE.md` and `backend/AGENTS.md` to the
> repo root first if they contain anything not already in the root `CLAUDE.md`. Remove any
> remaining references to the Next.js backend in `docs/setup.md`.

### 4.2 — Stop committing .env

> Remove `apexpro/app/.env` from git tracking with `git rm --cached`, add `.env` (not just
> `.env*.local`) to `apexpro/app/.gitignore`, and commit an `app/.env.example` with the same
> variable names but placeholder values. The committed anon key is low-severity since RLS is
> the real protection layer, but the pattern risks a genuine secret being committed the same
> way later.

### 4.3 — Per-user generation cap

> Add a per-user daily cap on AI-calling Edge Functions (`generate-plan`, `parse-meal`,
> `parse-meal-photo`). Track invocations per user per day in a small table with RLS, and
> return a clear 429-style response with a user-friendly message when the cap is hit. The
> existing 30-second cooldown only protects against double-taps, not a retry loop or a
> compromised client hammering a paid API. Pick a generous default (e.g. 20 plan generations
> and 50 meal parses per day) and put the numbers in one place so they're easy to tune.

---

## PHASE 5 — Polish before testers see it

### 5.1 — Stagger the intake screens

> Split `app/app/workout-setup.tsx` into a multi-step flow — one question per screen with a
> progress indicator, matching the pattern already used in
> `app/app/screens/onboarding/name|age|gender`. Keep the same data model and options; this is
> a presentation change only. Order the steps so the ones that most change today's output
> come first: equipment, modality, goal, then experience and activity level.

### 5.2 — Same for nutrition intake

> Apply the same multi-step split to `app/app/nutrition-setup.tsx`. Keep the dietary
> restrictions and allergy selections as a single multi-select step — that one genuinely
> belongs together.

### 5.3 — Empty, loading, and error states

> Audit every screen for missing states and fill the gaps: a first-run empty state on Home,
> Workouts, Tracker and Nutrition for users with no data yet; skeleton loading placeholders
> (not spinners) for anything waiting on an Edge Function; and one reusable error card for
> API failures with a retry action. Use the existing design system in
> `app/components/ui/` throughout.

### 5.4 — Live XP updates

> The architecture notes say XP UI updates need a full re-render to reflect. Make XP and
> streak values update reactively after an XP event fires, so completing a set visibly
> increments the total without restarting the app.

---

## PHASE 6 — Ship to testers

### 6.1 — Production build profile

> Add a `production` profile to `app/eas.json` alongside the existing development and
> preview profiles, configured for a Play Store AAB build. Also verify app icons and splash
> assets meet both stores' size requirements and flag anything missing.

### 6.2 — Observability

> Add Sentry for crash reporting and PostHog for basic usage analytics, both on free tiers.
> Instrument the core loop specifically: plan generated, workout started, set logged,
> workout completed, meal logged. Keep keys in environment variables, not committed.

### 6.3 — Build and distribute

> Run an EAS preview build for Android and give me the install link plus a short summary of
> what a tester should try first.

**Then stop coding.** Get it to 12 testers for 14 consecutive days — this satisfies Google's
closed-testing requirement for personal developer accounts and, more importantly, tells you
whether the loop actually retains someone who isn't you.

---

## Standing rules for every prompt

- One prompt at a time; read the diff before accepting.
- After each working change: commit with a message describing what now works.
- If a prompt would require widening what Groq decides, stop — that's a signal the constraint
  belongs in the query or the deterministic math instead.
- Update the "Current phase" checklist in `CLAUDE.md` as phases complete.
