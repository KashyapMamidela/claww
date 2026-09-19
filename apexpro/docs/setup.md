# CLAWW — Setup Guide

## Project Structure

```
apexpromobile/
└── apexpro/
    ├── app/                  ← Expo React Native frontend (the real client)
    ├── supabase/functions/   ← the real backend: Deno Edge Functions
    ├── database/             ← Supabase SQL schema
    └── docs/                 ← Documentation (this directory)
```

All real generation logic lives in `supabase/functions/`. (An earlier Next.js scaffold at `backend/` was removed in Phase 4 — it was never called by the app.)

---

## Prerequisites

- Node.js v18+
- npm v9+
- [Expo Go](https://expo.dev/go) app on your phone (for testing on device), or an EAS dev-client build if native modules require it
- A [Supabase](https://supabase.com) project with URL and anon key
- [Supabase CLI](https://supabase.com/docs/guides/cli) (`npx supabase`) for deploying Edge Functions and running SQL against the linked project
- A [Groq](https://console.groq.com) API key, with at least the *primary* model in each fallback chain in `supabase/functions/_shared/groq.ts` (`GROQ_MODEL_CHAINS.text[0]` / `.vision[0]`) enabled for your org at console.groq.com/settings/limits — Groq blocks unapproved models per-org with a `403 model_permission_blocked_org`, regardless of key validity. Since SHIP PHASE 6.4, a blocked or removed model falls through to the next candidate in its chain automatically rather than degrading straight to the static fallback plan — but don't rely on that as a substitute for actually enabling the model you intend to use. Verify with the health check below, not by inference.

---

## Environment Variables

### Frontend (`apexpro/app/.env`)

Copy `apexpro/app/.env.example` to `apexpro/app/.env` and fill in:

| Variable | Description |
|---|---|
| `EXPO_PUBLIC_SUPABASE_URL` | Your Supabase project URL |
| `EXPO_PUBLIC_SUPABASE_ANON_KEY` | Your Supabase project anon/public key |

The anon key is meant to be public — it's protected by Row Level Security policies and ships inside the compiled app binary regardless. Never put the service role key here.

### Backend (Supabase Edge Functions)

Edge Functions read secrets from the Supabase project itself, not a local `.env` file:

```bash
npx supabase secrets set GROQ_API_KEY=your-key-here --project-ref <your-project-ref>
```

Check what's currently set (values are masked) with `npx supabase secrets list --project-ref <your-project-ref>`.

Also set a secret for the health-check function (SHIP PHASE 6.2) — pick your own random value, it's a shared secret, not an API key from anywhere:

```bash
npx supabase secrets set HEALTH_CHECK_SECRET=<a-random-value> --project-ref <your-project-ref>
```

---

## Running the Frontend (Expo)

```bash
cd apexpro/app
npm start
```

- Scan the QR code in **Expo Go** (Android/iOS) to open the app on your device.
- For Android emulator: `npm run android`
- For iOS simulator (macOS only): `npm run ios`
- For browser: `npm run web`

---

## Deploying the Backend (Supabase Edge Functions)

```bash
cd apexpro
npx supabase link --project-ref <your-project-ref>
npx supabase functions deploy generate-plan
npx supabase functions deploy parse-meal
npx supabase functions deploy parse-meal-photo
npx supabase functions deploy compute-recovery
npx supabase functions deploy health-check --no-verify-jwt
```

Or deploy all at once: `npx supabase functions deploy`. `health-check` needs `--no-verify-jwt` specifically — it authenticates via `HEALTH_CHECK_SECRET`, not a user JWT, because there's no user calling it.

### Real generation endpoints

| Function | Description |
|---|---|
| `generate-plan` | Builds a personalized workout plan — deterministic thresholds (rep ranges, volume, frequency) computed server-side, Groq only selects/names exercises within those constraints, output is Zod-validated and clamped, with a hard fallback (`DEFAULT_PLAN`) on validation or every model in the Groq fallback chain failing |
| `parse-meal` | Estimates macros from a text meal description |
| `parse-meal-photo` | Estimates macros from a meal photo, with moderation |
| `compute-recovery` | Computes a recovery score from sleep + last workout intensity |
| `health-check` | **Not user-facing.** Probes every model in both Groq fallback chains directly and reports per-model status — the direct answer to "is generation actually working", see below |

### Verifying generation actually works (SHIP PHASE 6.1)

Don't infer this from the app — call the health check directly:

```bash
curl -H "x-health-secret: <your HEALTH_CHECK_SECRET>" \
  https://<your-project-ref>.supabase.co/functions/v1/health-check
```

A `"healthy": true` response means at least one model in both the text and vision chains is reachable. If it's `false`, the per-model `results` array says exactly which candidates are blocked, missing, or rate-limited — check that against `supabase/functions/_shared/groq.ts`'s `GROQ_TEXT_MODELS`/`GROQ_VISION_MODELS` lists and Groq's current catalog before assuming the code is wrong.

For a second, independent signal, query `generation_failures` (SHIP PHASE 6.3) for the real fallback rate over time — the Edge Function logs also carry a distinct `[generate-plan] GENERATED` vs `FELL BACK` line per request.

---

## Database Setup (Supabase)

1. Create a new project on [supabase.com](https://supabase.com).
2. Navigate to **SQL Editor** in the Supabase dashboard.
3. Open `apexpro/database/schema.sql`, paste, and run — it's idempotent (`IF NOT EXISTS` throughout), safe to re-run.
4. Run `apexpro/database/seed_exercises.sql` — `generate-plan` can't produce a real personalized plan without rows in the `exercises` catalog; it filters this table and hands the result to Groq as the only exercises it's allowed to choose from.

This creates all required tables with Row Level Security policies applied.

---

## Auth Flow

The frontend uses Supabase Auth with:
- **Email/password** sign up and sign in
- **Expo SecureStore** for secure session token persistence on device (falls back to `localStorage` on web)

Helper functions are available in `apexpro/app/lib/auth.ts`:
- `signUp(email, password)`
- `signIn(email, password)`
- `ensureProfileRow(user)`
- `isOnboardingComplete(userId)`
- `signOut()`
