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
- A [Groq](https://console.groq.com) API key, with the model in `supabase/functions/_shared/groq.ts` (`GROQ_MODEL`) enabled for your org at console.groq.com/settings/limits — Groq blocks unapproved models per-org with a `403 model_permission_blocked_org`, regardless of key validity

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
```

Or deploy all at once: `npx supabase functions deploy`.

### Real generation endpoints

| Function | Description |
|---|---|
| `generate-plan` | Builds a personalized workout plan — deterministic thresholds (rep ranges, volume, frequency) computed server-side, Groq only selects/names exercises within those constraints, output is Zod-validated and clamped, with a hard fallback (`DEFAULT_PLAN`) on validation or Groq failure |
| `parse-meal` | Estimates macros from a text meal description |
| `parse-meal-photo` | Estimates macros from a meal photo, with moderation |
| `compute-recovery` | Computes a recovery score from sleep + last workout intensity |

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
