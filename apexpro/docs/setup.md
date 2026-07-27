# CLAWW — Setup Guide

## Project Structure

```
apexpromobile/
└── apexpro/
    ├── app/        ← Expo React Native frontend
    ├── backend/    ← Next.js API backend
    ├── database/   ← Supabase SQL schema
    └── docs/       ← Documentation (this directory)
```

---

## Prerequisites

- Node.js v18+
- npm v9+
- [Expo Go](https://expo.dev/go) app on your phone (for testing on device)
- A [Supabase](https://supabase.com) project with URL and anon key

---

## Environment Variables

### Frontend (`apexpro/app/.env`)

| Variable | Description |
|---|---|
| `EXPO_PUBLIC_SUPABASE_URL` | Your Supabase project URL |
| `EXPO_PUBLIC_SUPABASE_ANON_KEY` | Your Supabase project anon/public key |

### Backend (`apexpro/backend/.env.local`)

| Variable | Description |
|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | Your Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Your Supabase project anon/public key |
| `GROQ_API_KEY` | GROQ API key for AI workout/nutrition generation |

---

## Running the Frontend (Expo)

```bash
cd apexpro/app
# Start the Expo dev server
npm start
```

- Scan the QR code in **Expo Go** (Android/iOS) to open the app on your device.
- For Android emulator: `npm run android`
- For iOS simulator (macOS only): `npm run ios`
- For browser: `npm run web`

---

## Running the Backend (Next.js)

```bash
cd apexpro/backend
# Start the Next.js development server
npm run dev
```

The backend will be available at **http://localhost:3000**.

### Test the health endpoint

```bash
curl http://localhost:3000/api/health
# Expected: { "status": "ok" }
```

---

## Database Setup (Supabase)

1. Create a new project on [supabase.com](https://supabase.com).
2. Navigate to **SQL Editor** in the Supabase dashboard.
3. Open `apexpro/database/schema.sql`.
4. Paste the entire contents and click **Run**.

This will create all required tables with Row Level Security policies applied.

---

## API Routes

| Route | Method | Status | Description |
|---|---|---|---|
| `/api/health` | GET | ✅ Live | Health check |
| `/api/generate-workout` | POST | 🔜 Stub | AI workout generation |
| `/api/generate-nutrition` | POST | 🔜 Stub | AI nutrition generation |

---

## Auth Flow

The frontend uses Supabase Auth with:
- **Email/password** sign up and sign in
- **Google OAuth** (configure Google provider in Supabase dashboard)
- **Expo SecureStore** for secure session token persistence on device

Helper functions are available in `apexpro/app/lib/auth.ts`:
- `signUp(email, password)`
- `signIn(email, password)`
- `signInWithGoogle()`
- `getCurrentUser()`
- `signOut()`
