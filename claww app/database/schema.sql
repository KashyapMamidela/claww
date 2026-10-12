-- ============================================================
-- Claww Database Schema
-- Supabase (PostgreSQL) compatible
--
-- Safe to re-run: paste the whole file into the Supabase SQL
-- editor and run it, on a fresh project or an existing one.
-- ============================================================

-- Enable UUID generation
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================================
-- TABLE: profiles
-- Stores user profile and fitness information
-- ============================================================
CREATE TABLE IF NOT EXISTS profiles (
  id               UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name             TEXT,
  email            TEXT UNIQUE NOT NULL,
  age              INT,
  height           FLOAT,       -- in cm
  weight           FLOAT,       -- in kg
  goal             TEXT CHECK (goal IN ('muscle_gain', 'fat_loss', 'endurance', 'maintenance', 'flexibility')),
  experience_level TEXT CHECK (experience_level IN ('beginner', 'intermediate', 'advanced')),
  equipment        TEXT,        -- e.g. 'gym', 'home', 'none'
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Onboarding additions: gender + a JSON personalization profile that will
-- later inform workout/nutrition defaults (see generate-plan Edge Function).
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS gender TEXT CHECK (gender IN ('male', 'female', 'other'));
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS personalization_profile JSONB;

-- SHIP PHASE 7.4 — records when the user explicitly acknowledged the medical
-- disclaimer at the end of onboarding (screens/onboarding/reveal.tsx). A real
-- timestamp, not a boolean, so "when" is auditable and re-prompting after a
-- wording change is possible later without a schema change.
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS medical_disclaimer_acknowledged_at TIMESTAMPTZ;

-- SHIP PHASE 8.3 — local notification reminders. notification_prompt_shown_at
-- gates the one-time soft-ask card on workout-complete.tsx (contextual, per
-- the roadmap — never requested on cold start) so it's shown once, ever, not
-- once per session. notifications_enabled reflects whether the user actually
-- granted OS permission and turned reminders on, editable later from
-- Settings — independent of the prompt having been shown.
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS notifications_enabled BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS notification_prompt_shown_at TIMESTAMPTZ;

-- Item #31 — app-rating reminders. Same one-time-ever gate pattern as
-- notification_prompt_shown_at above: set the instant the native review
-- sheet is triggered (workout-complete.tsx, after a real milestone), never
-- re-shown regardless of whether the OS actually displayed a dialog (Apple/
-- Google throttle that on their end independently of this app).
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS rating_prompt_shown_at TIMESTAMPTZ;

-- profiles.id should always match a real auth.users.id (1:1 with Supabase
-- Auth), so tie it down with a proper FK instead of a bare UUID PK.
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = 'profiles_id_fkey' AND table_name = 'profiles'
  ) THEN
    ALTER TABLE profiles
      ADD CONSTRAINT profiles_id_fkey FOREIGN KEY (id) REFERENCES auth.users(id) ON DELETE CASCADE;
  END IF;
END $$;

-- ============================================================
-- Auto-create a profiles row whenever a new auth.users row appears, so
-- the app always has somewhere to write onboarding answers to. The app
-- also does a defensive upsert on sign-up/sign-in (lib/auth.ts
-- ensureProfileRow) in case this trigger isn't installed yet — either
-- path is safe to run since profiles.id is the primary key.
-- ============================================================
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, email)
  VALUES (NEW.id, NEW.email)
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ============================================================
-- TABLE: user_stats
-- Tracks streaks, levels, and workout counts.
-- XP is intentionally NOT stored here — see the `user_xp` view
-- below, which sums xp_events so XP stays auditable from the
-- event log instead of living in a single mutable integer.
-- ============================================================
CREATE TABLE IF NOT EXISTS user_stats (
  user_id         UUID PRIMARY KEY REFERENCES profiles(id) ON DELETE CASCADE,
  current_streak  INT NOT NULL DEFAULT 0,
  level           INT NOT NULL DEFAULT 1,
  total_workouts  INT NOT NULL DEFAULT 0
);

-- Drop the old mutable XP column if this is running against an existing DB.
ALTER TABLE user_stats DROP COLUMN IF EXISTS xp;

-- ============================================================
-- TABLE: workouts
-- AI-generated workout plans stored as JSONB
-- ============================================================
CREATE TABLE IF NOT EXISTS workouts (
  id         UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id    UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  plan       JSONB NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- TABLE: nutrition_logs
-- Daily nutrition tracking per user
-- ============================================================
CREATE TABLE IF NOT EXISTS nutrition_logs (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id         UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  total_calories  FLOAT,
  protein         FLOAT,   -- in grams
  carbs           FLOAT,   -- in grams
  fats            FLOAT,   -- in grams
  date            DATE NOT NULL DEFAULT CURRENT_DATE
);

-- ============================================================
-- Community feed removed — replaced by the fitness-tracking
-- tables below.
-- ============================================================
DROP TABLE IF EXISTS community_posts CASCADE;

-- ============================================================
-- TABLE: exercises
-- Shared exercise catalog (not user-owned) queried by the
-- generate-plan Edge Function, filtered by modality.
-- ============================================================
CREATE TABLE IF NOT EXISTS exercises (
  id           UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name         TEXT NOT NULL,
  modality     TEXT NOT NULL CHECK (modality IN ('strength', 'cardio', 'mobility', 'yoga')),
  muscle_group TEXT,
  equipment    TEXT,
  met_value    FLOAT
);

-- Lets seed_exercises.sql use real per-row `ON CONFLICT (name) DO NOTHING`
-- instead of only guarding against a fully-empty table, so re-running it
-- after adding new rows to the seed file actually inserts the new ones.
CREATE UNIQUE INDEX IF NOT EXISTS exercises_name_unique_idx ON exercises (name);

-- ============================================================
-- TABLE: sleep_logs
-- ============================================================
CREATE TABLE IF NOT EXISTS sleep_logs (
  id         UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id    UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  hours      FLOAT,
  bedtime    TIMESTAMPTZ,
  wake_time  TIMESTAMPTZ,
  logged_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- TABLE: workout_logs
-- Completed sets against the exercises catalog
-- ============================================================
-- One row per completed SET (not per exercise) — `sets` holds the set
-- number within that exercise (1, 2, 3...). exercise_id is nullable because
-- AI-generated/fallback plans aren't always grounded to a real catalog row;
-- exercise_name is always populated so a log never depends on the catalog.
-- reps/weight are split prescribed vs achieved: the plan says what to do,
-- *_achieved is what the user actually confirmed in the live player —
-- without this split there's no real signal to adapt the next plan from.
CREATE TABLE IF NOT EXISTS workout_logs (
  id                 UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id            UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  exercise_id        UUID REFERENCES exercises(id) ON DELETE SET NULL,
  exercise_name      TEXT NOT NULL DEFAULT '',
  sets               INT,
  reps_prescribed    INT,
  reps_achieved      INT,
  weight_prescribed  FLOAT,
  weight_achieved    FLOAT,
  completed_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Migration for an already-created table from before this column existed.
ALTER TABLE workout_logs ALTER COLUMN exercise_id DROP NOT NULL;
ALTER TABLE workout_logs ADD COLUMN IF NOT EXISTS exercise_name TEXT NOT NULL DEFAULT '';

-- Migration: split prescribed vs achieved performance (was: reps/weight held
-- only the prescribed number, actual performance was never captured).
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'workout_logs' AND column_name = 'reps'
  ) THEN
    ALTER TABLE workout_logs RENAME COLUMN reps TO reps_prescribed;
  END IF;
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'workout_logs' AND column_name = 'weight'
  ) THEN
    ALTER TABLE workout_logs RENAME COLUMN weight TO weight_prescribed;
  END IF;
END $$;
ALTER TABLE workout_logs ADD COLUMN IF NOT EXISTS reps_prescribed INT;
ALTER TABLE workout_logs ADD COLUMN IF NOT EXISTS reps_achieved INT;
ALTER TABLE workout_logs ADD COLUMN IF NOT EXISTS weight_prescribed FLOAT;
ALTER TABLE workout_logs ADD COLUMN IF NOT EXISTS weight_achieved FLOAT;

-- Ad-hoc sessions logged outside the generated plan (e.g. a cardio run) —
-- sets/reps/weight don't naturally fit those, so a nullable duration
-- covers them instead. NULL for ordinary strength sets, exactly as before.
ALTER TABLE workout_logs ADD COLUMN IF NOT EXISTS duration_minutes FLOAT;

-- V2 PHASE 2.5 — offline set queue. The app writes every set to an on-device
-- queue and sends it from there, retrying until it lands. Each set carries a
-- client-generated id; the insert is ON CONFLICT (client_id) DO NOTHING, so
-- a retry after a lost response can never log the same set twice. NULL for
-- rows written before this (NULLs don't collide in a unique index).
ALTER TABLE workout_logs ADD COLUMN IF NOT EXISTS client_id UUID;
CREATE UNIQUE INDEX IF NOT EXISTS workout_logs_client_id_key ON workout_logs (client_id);

-- ============================================================
-- TABLE: workout_day_events
-- One row per plan-day the user completed or explicitly skipped —
-- powers the "what should I do today" recommendation and the
-- completed/skipped calendar. Distinct from workout_logs (which is
-- per-set): this is per-day, and skips never touch workout_logs since
-- nothing was actually performed.
-- ============================================================
CREATE TABLE IF NOT EXISTS workout_day_events (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id     UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  workout_id  UUID REFERENCES workouts(id) ON DELETE SET NULL,
  day_label   TEXT NOT NULL,
  day_focus   TEXT,
  status      TEXT NOT NULL CHECK (status IN ('completed', 'skipped')),
  event_date  DATE NOT NULL DEFAULT CURRENT_DATE,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- TABLE: meal_logs
-- ============================================================
CREATE TABLE IF NOT EXISTS meal_logs (
  id           UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id      UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  description  TEXT NOT NULL,
  calories     FLOAT,
  protein_g    FLOAT,
  carbs_g      FLOAT,
  fats_g       FLOAT,
  estimated    BOOLEAN NOT NULL DEFAULT TRUE,
  logged_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Which meal of the day this was (drives the Nutrition tab's timeline icon
-- and "next meal to log" prompt) — added after the initial table, so it's
-- an ALTER rather than part of the CREATE TABLE above.
ALTER TABLE meal_logs ADD COLUMN IF NOT EXISTS meal_type TEXT CHECK (meal_type IN ('Breakfast', 'Lunch', 'Snack', 'Dinner'));

-- Item #22 — a meal photo was sent to Groq for estimation and then
-- discarded; never stored, so "you ate this before" suggestions had
-- nothing to draw on. Stores a path into the meal-photos Storage bucket
-- below, not the image itself — NULL for text-only logs, unchanged.
ALTER TABLE meal_logs ADD COLUMN IF NOT EXISTS photo_url TEXT;

-- ============================================================
-- STORAGE: meal-photos bucket
-- Private (not public) — meal photos are a Play-sensitive category per
-- docs/legal/data-safety.md, so access goes through RLS + signed URLs
-- (lib/data.ts's getSignedMealPhotoUrl), never a public bucket URL.
-- Objects are stored at "<user_id>/<filename>" so the RLS policy below
-- can scope access to the owning user's own folder via storage.foldername.
-- ============================================================
INSERT INTO storage.buckets (id, name, public)
VALUES ('meal-photos', 'meal-photos', false)
ON CONFLICT (id) DO NOTHING;

DROP POLICY IF EXISTS "meal_photos_own" ON storage.objects;
CREATE POLICY "meal_photos_own" ON storage.objects
  FOR ALL
  USING (bucket_id = 'meal-photos' AND auth.uid()::text = (storage.foldername(name))[1])
  WITH CHECK (bucket_id = 'meal-photos' AND auth.uid()::text = (storage.foldername(name))[1]);

-- ============================================================
-- TABLE: water_logs
-- Each tap of a water glass on the Nutrition tab is one row —
-- replaces what used to be a session-only local counter.
-- ============================================================
CREATE TABLE IF NOT EXISTS water_logs (
  id         UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id    UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  ml         INT NOT NULL,
  logged_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- TABLE: xp_events
-- Append-only XP ledger. `user_xp` (below) sums this table
-- instead of user_stats storing a raw mutable integer.
-- ============================================================
CREATE TABLE IF NOT EXISTS xp_events (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id     UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  amount      INT NOT NULL,
  reason      TEXT,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- VIEW: user_xp
-- Auditable XP total, derived from xp_events. security_invoker
-- makes the view respect the caller's RLS on xp_events rather
-- than running as the view owner.
-- ============================================================
CREATE OR REPLACE VIEW user_xp WITH (security_invoker = true) AS
  SELECT user_id, COALESCE(SUM(amount), 0) AS xp
  FROM xp_events
  GROUP BY user_id;

-- ============================================================
-- TABLE: generation_usage
-- Per-user, per-day counters for AI-calling Edge Functions
-- (generate-plan, parse-meal, parse-meal-photo). The existing
-- 30s cooldown in generate-plan only catches a double-tap, not
-- a retry loop or a compromised client hammering a paid API —
-- this is the real daily ceiling. `kind` groups generate-plan
-- under 'plan' and both meal-parsing functions under 'meal'
-- since they're the same cost category.
-- ============================================================
CREATE TABLE IF NOT EXISTS generation_usage (
  user_id     UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  usage_date  DATE NOT NULL DEFAULT CURRENT_DATE,
  kind        TEXT NOT NULL CHECK (kind IN ('plan', 'meal')),
  count       INT NOT NULL DEFAULT 0,
  PRIMARY KEY (user_id, usage_date, kind)
);

-- Atomically checks today's count against the cap and increments it in the
-- same statement, so concurrent or rapid-fire requests can't race past the
-- limit (a plain select-then-insert from the Edge Function would allow
-- exactly that). Returns the new count on success, or -1 if the cap was
-- already reached. SECURITY DEFINER because RLS alone can't express
-- "insert-or-conditionally-update"; safe because it only ever operates on
-- auth.uid() itself — there's no caller-supplied user id to spoof.
CREATE OR REPLACE FUNCTION public.check_and_increment_generation_usage(p_kind TEXT, p_cap INT)
RETURNS INT
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  new_count INT;
BEGIN
  INSERT INTO generation_usage (user_id, usage_date, kind, count)
  VALUES (auth.uid(), CURRENT_DATE, p_kind, 1)
  ON CONFLICT (user_id, usage_date, kind)
  DO UPDATE SET count = generation_usage.count + 1
  WHERE generation_usage.count < p_cap
  RETURNING count INTO new_count;

  RETURN COALESCE(new_count, -1);
END;
$$;

REVOKE ALL ON FUNCTION public.check_and_increment_generation_usage(TEXT, INT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.check_and_increment_generation_usage(TEXT, INT) TO authenticated;

-- ============================================================
-- TABLE: generation_failures
-- SHIP PHASE 6.3 — operator-facing record of every time an
-- AI-calling Edge Function (generate-plan, parse-meal,
-- parse-meal-photo) degraded to a fallback instead of serving a
-- real Groq response: permission-blocked model, model not found,
-- rate limited, a request error, schema-validation failure, or
-- grounding filtering every exercise out of a plan. Written from
-- the calling user's own JWT-scoped client (RLS covers it like
-- any other own-rows table) but read by operators via the
-- service role to answer "is generation actually working" as a
-- query instead of a guess. Never surfaced in the app UI.
-- ============================================================
CREATE TABLE IF NOT EXISTS generation_failures (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id       UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  function_name TEXT NOT NULL,
  failure_kind  TEXT NOT NULL CHECK (failure_kind IN (
    'permission_blocked', 'model_not_found', 'rate_limited',
    'request_error', 'validation_failed', 'grounding_emptied', 'unknown'
  )),
  detail        TEXT,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- ROW LEVEL SECURITY (RLS) — Enable per-user access control
-- ============================================================

ALTER TABLE profiles      ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_stats    ENABLE ROW LEVEL SECURITY;
ALTER TABLE workouts      ENABLE ROW LEVEL SECURITY;
ALTER TABLE nutrition_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE exercises     ENABLE ROW LEVEL SECURITY;
ALTER TABLE sleep_logs    ENABLE ROW LEVEL SECURITY;
ALTER TABLE workout_logs  ENABLE ROW LEVEL SECURITY;
ALTER TABLE workout_day_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE meal_logs     ENABLE ROW LEVEL SECURITY;
ALTER TABLE generation_failures ENABLE ROW LEVEL SECURITY;
ALTER TABLE water_logs    ENABLE ROW LEVEL SECURITY;
ALTER TABLE xp_events     ENABLE ROW LEVEL SECURITY;
ALTER TABLE generation_usage ENABLE ROW LEVEL SECURITY;

-- Profiles: users can only read/update their own row
DROP POLICY IF EXISTS "profiles_own" ON profiles;
CREATE POLICY "profiles_own" ON profiles
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

-- User stats: own row only
DROP POLICY IF EXISTS "user_stats_own" ON user_stats;
CREATE POLICY "user_stats_own" ON user_stats
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Workouts: own rows only
DROP POLICY IF EXISTS "workouts_own" ON workouts;
CREATE POLICY "workouts_own" ON workouts
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Nutrition logs: own rows only
DROP POLICY IF EXISTS "nutrition_logs_own" ON nutrition_logs;
CREATE POLICY "nutrition_logs_own" ON nutrition_logs
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Exercises: shared catalog, readable by any authenticated user.
-- No client write policy — rows are seeded/managed via the
-- service role, which bypasses RLS.
DROP POLICY IF EXISTS "exercises_read_all" ON exercises;
CREATE POLICY "exercises_read_all" ON exercises
  FOR SELECT USING (auth.role() = 'authenticated');

-- Sleep logs: own rows only
DROP POLICY IF EXISTS "sleep_logs_own" ON sleep_logs;
CREATE POLICY "sleep_logs_own" ON sleep_logs
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Workout logs: own rows only
DROP POLICY IF EXISTS "workout_logs_own" ON workout_logs;
CREATE POLICY "workout_logs_own" ON workout_logs
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Workout day events: own rows only
DROP POLICY IF EXISTS "workout_day_events_own" ON workout_day_events;
CREATE POLICY "workout_day_events_own" ON workout_day_events
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Meal logs: own rows only
DROP POLICY IF EXISTS "meal_logs_own" ON meal_logs;
CREATE POLICY "meal_logs_own" ON meal_logs
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Water logs: own rows only
DROP POLICY IF EXISTS "water_logs_own" ON water_logs;
CREATE POLICY "water_logs_own" ON water_logs
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- XP events: own rows only (append-only in practice; service-role
-- writes from Edge Functions bypass RLS entirely)
DROP POLICY IF EXISTS "xp_events_own" ON xp_events;
CREATE POLICY "xp_events_own" ON xp_events
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Generation usage: own rows only. Writes normally go through
-- check_and_increment_generation_usage (SECURITY DEFINER) rather than a
-- direct insert/update, but this policy still gates any direct read.
DROP POLICY IF EXISTS "generation_usage_own" ON generation_usage;
CREATE POLICY "generation_usage_own" ON generation_usage
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Generation failures: a user can insert/read their own rows (same shape as
-- every other own-rows table); the service role used for operator monitoring
-- bypasses RLS entirely, same as every other table in this schema.
DROP POLICY IF EXISTS "generation_failures_own" ON generation_failures;
CREATE POLICY "generation_failures_own" ON generation_failures
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- ============================================================
-- V2 PHASE 3.4 — server push for things the phone can't know (a missed
-- workout, a streak about to break). The app registers its Expo push token
-- after notification permission is granted and deletes it on sign-out;
-- account deletion removes both tables' rows through the profiles cascade.
-- ============================================================

-- TABLE: push_tokens — one row per device the user is signed in on.
CREATE TABLE IF NOT EXISTS push_tokens (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id     UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  token       TEXT NOT NULL,
  platform    TEXT NOT NULL CHECK (platform IN ('ios', 'android')),
  -- IANA zone from the device (e.g. 'Asia/Kolkata'), so the scheduled
  -- send-reminders function can pick each user's local morning/evening.
  timezone    TEXT,
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE UNIQUE INDEX IF NOT EXISTS push_tokens_token_key ON push_tokens (token);
CREATE INDEX IF NOT EXISTS push_tokens_user_idx ON push_tokens (user_id);

-- TABLE: push_sends — what send-reminders has already sent, one row per
-- user per kind per local day. The unique key makes a re-run (or two
-- overlapping cron runs) unable to send the same nudge twice, and the
-- function counts these toward the 2-a-day cap together with local
-- reminders. Written only by the service role.
CREATE TABLE IF NOT EXISTS push_sends (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id     UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  kind        TEXT NOT NULL,
  local_date  DATE NOT NULL,
  sent_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (user_id, kind, local_date)
);

ALTER TABLE push_tokens ENABLE ROW LEVEL SECURITY;
ALTER TABLE push_sends  ENABLE ROW LEVEL SECURITY;

-- Push tokens: own rows only (the app inserts/updates/deletes its own).
DROP POLICY IF EXISTS "push_tokens_own" ON push_tokens;
CREATE POLICY "push_tokens_own" ON push_tokens
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Push sends: a user can read their own history; only the service role
-- (send-reminders) writes, and it bypasses RLS.
DROP POLICY IF EXISTS "push_sends_read_own" ON push_sends;
CREATE POLICY "push_sends_read_own" ON push_sends
  FOR SELECT USING (auth.uid() = user_id);

-- ============================================================
-- V2 PHASE 6 — real weekdays and the adaptive engine foundation.
-- Everything below is idempotent. Run after seed_exercises.sql, then run
-- seed_exercise_metadata.sql to fill the new exercises columns.
-- ============================================================

-- 6.2 Catalog enrichment (D12). Filled by database/seed_exercise_metadata.sql.
ALTER TABLE exercises ADD COLUMN IF NOT EXISTS primary_muscle        TEXT;
ALTER TABLE exercises ADD COLUMN IF NOT EXISTS secondary_muscles     TEXT[];
ALTER TABLE exercises ADD COLUMN IF NOT EXISTS movement_pattern      TEXT;
ALTER TABLE exercises ADD COLUMN IF NOT EXISTS role                  TEXT;
ALTER TABLE exercises ADD COLUMN IF NOT EXISTS loadable              BOOLEAN;
ALTER TABLE exercises ADD COLUMN IF NOT EXISTS stimulus_type         TEXT;
ALTER TABLE exercises ADD COLUMN IF NOT EXISTS load_increment_kg     NUMERIC;
ALTER TABLE exercises ADD COLUMN IF NOT EXISTS harder_variation_id   UUID REFERENCES exercises(id) ON DELETE SET NULL;
ALTER TABLE exercises ADD COLUMN IF NOT EXISTS easier_variation_id   UUID REFERENCES exercises(id) ON DELETE SET NULL;
ALTER TABLE exercises ADD COLUMN IF NOT EXISTS form_steps            TEXT[];
ALTER TABLE exercises ADD COLUMN IF NOT EXISTS common_mistake        TEXT;
ALTER TABLE exercises DROP CONSTRAINT IF EXISTS exercises_role_check;
ALTER TABLE exercises ADD CONSTRAINT exercises_role_check CHECK (role IS NULL OR role IN ('main', 'accessory'));

-- 6.3 Per-set logging: which set, how many reps were left in the tank
-- (0-3, where 3 means "3 or more"), and which session the set belongs to.
ALTER TABLE workout_logs ADD COLUMN IF NOT EXISTS set_number INT;
ALTER TABLE workout_logs ADD COLUMN IF NOT EXISTS rir SMALLINT;
ALTER TABLE workout_logs ADD COLUMN IF NOT EXISTS session_id UUID;
ALTER TABLE workout_logs DROP CONSTRAINT IF EXISTS workout_logs_rir_check;
ALTER TABLE workout_logs ADD CONSTRAINT workout_logs_rir_check CHECK (rir IS NULL OR (rir >= 0 AND rir <= 3));
CREATE INDEX IF NOT EXISTS workout_logs_session_idx ON workout_logs (session_id);

-- 6.1 Training weekdays live in profiles.personalization_profile
-- (workoutDefaults.trainingDays, usualTrainingTime) — JSON, no column needed.

-- TABLE: exercise_progress — one row per user per exercise: the engine's
-- current state (rep target inside the range, working weight, sets and the
-- success / failure counters it needs for "two in a row" rules).
CREATE TABLE IF NOT EXISTS exercise_progress (
  id                  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id             UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  exercise_name       TEXT NOT NULL,
  exercise_id         UUID REFERENCES exercises(id) ON DELETE SET NULL,
  rep_min             INT NOT NULL,
  rep_max             INT NOT NULL,
  rep_target          INT NOT NULL,
  working_weight_kg   NUMERIC,
  sets                INT NOT NULL DEFAULT 3,
  top_streak          INT NOT NULL DEFAULT 0,
  failure_streak      INT NOT NULL DEFAULT 0,
  success_cycles      INT NOT NULL DEFAULT 0,
  decline_cycles      INT NOT NULL DEFAULT 0,
  stagnant_sessions   INT NOT NULL DEFAULT 0,
  -- What the user actually did last session, and what the engine decided
  -- for next time (prescribe() falls back to the "last" numbers when
  -- recovery blocks progression for the day).
  last_weight_kg      NUMERIC,
  last_rep_target     INT,
  last_sets           INT,
  pending_commands    TEXT[] NOT NULL DEFAULT '{}',
  pending_reason      TEXT NOT NULL DEFAULT '',
  last_session_date   DATE,
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (user_id, exercise_name)
);
-- Columns added after the first draft of the table (safe on a fresh or an existing project).
ALTER TABLE exercise_progress ADD COLUMN IF NOT EXISTS stagnant_sessions INT NOT NULL DEFAULT 0;
ALTER TABLE exercise_progress ADD COLUMN IF NOT EXISTS last_weight_kg NUMERIC;
ALTER TABLE exercise_progress ADD COLUMN IF NOT EXISTS last_rep_target INT;
ALTER TABLE exercise_progress ADD COLUMN IF NOT EXISTS last_sets INT;
ALTER TABLE exercise_progress ADD COLUMN IF NOT EXISTS pending_commands TEXT[] NOT NULL DEFAULT '{}';
ALTER TABLE exercise_progress ADD COLUMN IF NOT EXISTS pending_reason TEXT NOT NULL DEFAULT '';

-- TABLE: muscle_checkins — the optional pre-session soreness / readiness
-- answers, one row per muscle per session.
CREATE TABLE IF NOT EXISTS muscle_checkins (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id     UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  session_id  UUID NOT NULL,
  muscle      TEXT NOT NULL,
  soreness    SMALLINT CHECK (soreness IS NULL OR (soreness >= 0 AND soreness <= 5)),
  readiness   TEXT CHECK (readiness IS NULL OR readiness IN ('strong', 'normal', 'slightly_weak', 'weak', 'very_weak')),
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS muscle_checkins_user_idx ON muscle_checkins (user_id, created_at DESC);

-- TABLE: prescription_decisions — every prescription the engine made, with
-- its commands and the one-line reason shown in the app.
CREATE TABLE IF NOT EXISTS prescription_decisions (
  id                  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id             UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  session_id          UUID NOT NULL,
  exercise_name       TEXT NOT NULL,
  prescribed_weight   NUMERIC,
  prescribed_reps     INT,
  prescribed_sets     INT,
  commands            TEXT[] NOT NULL DEFAULT '{}',
  reason              TEXT NOT NULL DEFAULT '',
  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS prescription_decisions_user_idx ON prescription_decisions (user_id, created_at DESC);

ALTER TABLE exercise_progress       ENABLE ROW LEVEL SECURITY;
ALTER TABLE muscle_checkins         ENABLE ROW LEVEL SECURITY;
ALTER TABLE prescription_decisions  ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "exercise_progress_own" ON exercise_progress;
CREATE POLICY "exercise_progress_own" ON exercise_progress
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "muscle_checkins_own" ON muscle_checkins;
CREATE POLICY "muscle_checkins_own" ON muscle_checkins
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "prescription_decisions_own" ON prescription_decisions;
CREATE POLICY "prescription_decisions_own" ON prescription_decisions
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);
