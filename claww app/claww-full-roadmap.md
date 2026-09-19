# CLAWW (apexpro) — Full Development Roadmap for Claude Code

This roadmap covers the **adaptive engine** (generation, feedback loops, multi-modality, trust layer, wearables, creator layer) — phases are labeled **Engine Phase N**. It's a separate roadmap from the UI/UX polish audit (typography, materials, animation — labeled **UI Phase N**, published separately as an Artifact). Don't confuse "start phase 2" between the two — always say which one.

This is the complete phase-by-phase build plan. **Do not hand all of this to Claude Code in one session.** Work through it phase by phase — point Claude Code at one phase section at a time (see the handoff process below). This document exists so every session has full context on where a phase sits in the overall plan, not so Claude Code attempts everything at once.

---

## Project context (applies to every phase)

CLAWW is an AI-adaptive fitness app. Stack:

- **`app/`** — Expo React Native frontend (expo-router, TypeScript, Supabase JS client)
- **`backend/`** — Next.js app. **Dead/legacy.** Its API routes (`generate-workout`, `generate-nutrition`) are untouched 501 stubs. Never build on it; if touched at all, it should be to delete it or clearly mark it dead.
- **`supabase/functions/`** — the real backend, as Deno Edge Functions: `generate-plan`, `parse-meal` / `parse-meal-photo`, `compute-recovery`, plus `_shared/groq.ts`, `_shared/recovery.ts`, `_shared/supabaseClient.ts`, `_shared/cors.ts`
- **`database/schema.sql`** — Postgres schema, RLS on every table, written to be re-runnable (`IF NOT EXISTS` / `ADD COLUMN IF NOT EXISTS` throughout). **Every schema change in every phase must follow this exact idempotent style.**

### Non-negotiable design principles, every phase

1. **The LLM never computes numbers.** Deterministic calculation first (rep ranges, volume, frequency, progression trends), LLM only selects/names within constraints already computed for it, output is Zod-validated and clamped before use, with a hard fallback on validation failure. This is the existing pattern in `generate-plan/index.ts` (`GOAL_REP_RANGES`, `computeRepRange`, `clampPlanToThresholds`, `PlanSchema`, `DEFAULT_PLAN`) — extend it, never bypass it.
2. **Never surface "AI-generated" as a label, badge, or disclaimer anywhere in the UI.** Generation is invisible infrastructure, same posture as Instagram's ML dubbing/moderation.
3. **RLS on everything.** Any new table needs `ENABLE ROW LEVEL SECURITY` plus an owner-scoped policy matching the existing style. Any new column on a `user_id`-scoped table must remain covered by that table's existing policy.
4. **Schema changes live in `database/schema.sql`**, idempotent, never a separate migration file.

---

## Engine Phase 0 — Unblock

**Goal:** confirm the app's core AI feature actually works before building anything on top of it.

- `supabase/functions/_shared/groq.ts` currently points at `GROQ_MODEL = 'openai/gpt-oss-120b'`, which per the existing code comment returns `403 model_permission_blocked_org` until enabled in the Groq console. Do not assume this is fixed.
- Add a check to `generate-plan`, `parse-meal`, and `parse-meal-photo` that fails loudly and distinguishably on a permission/auth error from Groq, rather than silently falling through to `DEFAULT_PLAN` in a way indistinguishable from a normal validation-failure fallback.
- Confirm directly whether Groq console model access has been enabled before treating generation as working end-to-end.
- Fix `.gitignore` in `app/` so plain `.env` (not just `.env*.local`) is ignored. Rotate the Supabase anon key if being cautious, since `app/.env` is currently committed.
- Delete `backend/`, or clearly mark it dead and rewrite `docs/setup.md` to describe the actual architecture (Edge Functions only, no Next.js backend involved in generation).

**Definition of done:** a fresh onboarding flow produces a real Groq-generated plan, not the fallback, and this is confirmed by log output distinguishing "generated" from "fell back."

---

## Engine Phase 1 — Close the feedback loop

**Goal:** make the next generated plan depend on what the user actually did, not just their onboarding form. `workout_logs` and `workout_day_events` are already written to but never read back — this phase closes that loop.

1. **Per-exercise progression signal.** In `generate-plan/index.ts`, before calling the LLM, query the user's last 2–3 sessions per exercise from `workout_logs` (join on `exercise_name`, since `exercise_id` is nullable). If they consistently hit the top of their computed rep range at a given weight, mark that exercise for progression within `computeRepRange`'s bounds. If they consistently missed the bottom of the range, or the exercise appears in a `workout_day_events` row marked `skipped`, mark it for regression/hold. Pass this as structured input to the LLM call, the same way `deriveAllowedEquipment` and `excludeInjuredExercises` already narrow the pool — never let the LLM infer trends itself from raw logs.
2. **Recovery-adjusted volume.** Wire `compute-recovery`'s output into `generate-plan`: fetch the current recovery score before computing `RepRange`/training days, and reduce `maxSets` and/or trailing training-day count on low recovery, using the same clamping style as the existing age-based adjustments.
3. **Adherence-based frequency adjustment.** Query `workout_day_events` for the trailing 2–4 weeks. If a specific `day_focus` is skipped repeatedly (2+ times), reduce frequency for that focus or restructure the split rather than repeating a day type that keeps getting skipped.
4. **Rest vs. skip distinction.** Add `'rest_planned'` as a third allowed value on `workout_day_events.status` (currently `'completed' | 'skipped'`), via a re-runnable `DROP CONSTRAINT` / `ADD CONSTRAINT` pair matching the existing pattern (see the `profiles_id_fkey` block for style). Update whatever streak logic reads `status` (check `app/lib/data.ts` and any `user_stats` update paths) so `'rest_planned'` preserves a streak while `'skipped'` still breaks it. Add the UI affordance to `app/components/WorkoutCalendar.tsx` to mark a day as planned rest, distinct from marking it skipped.
5. **Single post-workout effort question.** Add `perceived_effort INT CHECK (perceived_effort BETWEEN 1 AND 10)`, nullable, on `workout_day_events`. Add a minimal one-tap prompt near `app/app/workout-complete.tsx` right after a session ends — one number, one screen, dismissible, not a survey.
6. **Nutrition target reacts to training load.** Instead of a static target from onboarding, recompute the week's nutrition target from actual completed training volume (`workout_logs` / `workout_day_events`) for that week. Keep the onboarding-derived number as fallback when there isn't enough logged history yet (e.g. first week).

**Definition of done:** a user who trains consistently for two weeks gets a visibly different plan on week 3 than one who trained inconsistently — driven entirely by logged data, no new manual input beyond the single effort tap.

---

## Engine Phase 2 — Multi-modality, done properly

**Goal:** calisthenics and mobility get real interaction models, not the strength UI with fewer numbers.

1. **Calisthenics progression trees.** New schema: a `progressions` table (movement pattern → ordered skill stages, e.g. wall pushup → incline pushup → full pushup → archer pushup) and a per-user `progression_state` table tracking current stage per pattern. Calisthenics-modality exercises in `generate-plan` should read/write this instead of `weight FLOAT` — weight-based tracking doesn't apply to this modality.
2. **Mobility session type.** Distinct screen flow: time/range-based, ambient guidance (hold timers, gentle audio cues), no rep counter. Reuse existing components (`ProgressRing`, `SectionLabel`) but this needs its own screen, not a re-skinned strength screen.
3. **Cross-modality "Flow" sessions.** A single generated session blending a short mobility warm-up, a strength or calisthenics block, and a cooldown, presented as one continuous flow rather than three separate workouts. This extends `generate-plan`'s output shape (`PlanSchema`) to support mixed-modality days.

**Definition of done:** a calisthenics user progresses through skill stages without ever seeing a weight field; a mobility session feels distinct in pacing and UI, not just filtered exercise names.

---

## Engine Phase 3 — Trust layer for serious users

**Goal:** let advanced users see and override the math, in parallel with Engine Phase 2.

1. **"Show your work" toggle.** Surface the actual numbers driving a suggestion — last session's top set, the computed rep range, why volume moved — plus a manual override control on the workout screen.
2. **Lifter-facing depth.** Estimated 1RM (computed from logged weight/reps, standard formula), PR history, visible progression over time. This is a display layer over data already logged in `workout_logs` — no new backend logic beyond aggregation queries.

**Definition of done:** an advanced user can see why a number changed and manually override it without fighting the app.

---

## Engine Phase 4 — Apple-level UX pass

**Goal:** motion, haptics, and hierarchy as house rules, applied across existing screens — budget a dedicated pass rather than scattering this across other phases.

1. **Motion/haptics.** `ProgressRing` fills with effort-weighted easing on set completion. Distinct haptic pattern per event: rep counted, set completed, PR hit, recovery-day nudge.
2. **Readiness Glance.** One glanceable morning screen/icon fusing recovery score + sleep + adherence into a single signal, tappable for detail — this is primarily an assembly layer over data already computed in `compute-recovery` and Engine Phase 1's adherence logic.
3. **Typography/hierarchy audit.** Enforce "one primary action per screen" across existing flows (`workout-setup`, `nutrition-setup`, onboarding screens) rather than adding new screens.

**Definition of done:** opening the app in the morning shows one clear, glanceable readiness signal before anything else; every existing screen has a single unambiguous primary action.

---

## Engine Phase 5 — Wearable signal (post-launch)

**Goal:** enrich the adaptive engine with real physiological data instead of only self-reported logs.

1. HealthKit (iOS) / Google Fit (Android) read integration: steps, resting heart rate, active energy, sleep.
2. Feed this into `compute-recovery` and the Engine Phase 1 recovery-adjusted volume logic as an additional signal alongside manually logged `sleep_logs`.

**Definition of done:** recovery score reflects real wearable data when available, manual entry remains the fallback for users without a connected device.

---

## Engine Phase 6 — Creator layer (post-launch, only once Engine Phases 0–4 are proven)

**Goal:** turn the single-user schema into a one-to-many platform with minimal structural change.

1. Add `coach_id` (nullable, FK to `profiles`) on `workouts`, plus an "assigned by" flag.
2. A creator builds a plan once; it clones into each follower's `workouts` row on assignment.
3. Creator gets a read-only adherence dashboard sourced from followers' existing `workout_day_events` — no new tracking infrastructure needed, just an aggregation view scoped by `coach_id`.

**Definition of done:** a creator can author one plan, assign it to multiple users, and see completion rates across them, without any per-user manual re-entry.

---

## Deliberately deferred — do not start without a dedicated prompt

- GPS/route tracking (large scope: background location, distance/pace calculation, mapping)
- Public social feed / follower graph (if any social layer is added, keep it to small private circles sharing streaks — not a public feed)
- Live camera-based pose correction (needs a real CV pipeline, not yet in scope)
- Movement-assessment onboarding via on-device pose estimation (MediaPipe/TF Lite — real and buildable without training a model, but scoped as its own project once the core loop is proven)
- Post-set form glance via the existing vision model (lower-cost version of the above — worth revisiting once Engine Phase 2 ships, still not part of this roadmap yet)

---

## Sequencing reminder

Engine Phase 0 unblocks everything. Engine Phase 1 is the highest-leverage phase in the whole roadmap — it's the difference between "generates a plan" and "adapts to you," and it's built entirely on tables that already exist. Engine Phases 2–4 can run roughly in parallel once Engine Phase 1 is solid. Engine Phases 5–6 are explicitly post-launch — don't pull them forward because they sound exciting; they add real value but teach you less about whether the core loop works than getting Engine Phases 0–4 in front of real users does.
