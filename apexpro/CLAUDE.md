# CLAWW — project rules

CLAWW is an AI-adaptive fitness app. Stack:

- **`app/`** — Expo React Native frontend (expo-router, TypeScript, Supabase JS client)
- **`backend/`** — Next.js app. **Dead/legacy.** Its API routes (`generate-workout`, `generate-nutrition`) are untouched 501 stubs. Never build on it; if touched at all, it should be to delete it or clearly mark it dead.
- **`supabase/functions/`** — the real backend, as Deno Edge Functions: `generate-plan`, `parse-meal` / `parse-meal-photo`, `compute-recovery`, plus `_shared/groq.ts`, `_shared/recovery.ts`, `_shared/supabaseClient.ts`, `_shared/cors.ts`
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

- [ ] Phase 1 — Close the adaptive loop
  - [ ] 1.1 Reps-achieved logging (schema)
  - [ ] 1.2 Reps-achieved logging (data layer)
  - [ ] 1.3 Reps-achieved logging (UI)
  - [ ] 1.4 Regeneration trigger
  - [ ] 1.5 Feed real history into generation
- [ ] Phase 2 — Make the plans worth generating
- [ ] Phase 3 — Protect what's load-bearing
- [ ] Phase 4 — Cleanup and cost control
- [ ] Phase 5 — Polish before testers see it
- [ ] Phase 6 — Ship to testers
