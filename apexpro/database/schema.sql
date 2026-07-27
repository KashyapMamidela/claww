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
CREATE TABLE IF NOT EXISTS workout_logs (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id       UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  exercise_id   UUID NOT NULL REFERENCES exercises(id) ON DELETE CASCADE,
  sets          INT,
  reps          INT,
  weight        FLOAT,
  completed_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
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
-- ROW LEVEL SECURITY (RLS) — Enable per-user access control
-- ============================================================

ALTER TABLE profiles      ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_stats    ENABLE ROW LEVEL SECURITY;
ALTER TABLE workouts      ENABLE ROW LEVEL SECURITY;
ALTER TABLE nutrition_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE exercises     ENABLE ROW LEVEL SECURITY;
ALTER TABLE sleep_logs    ENABLE ROW LEVEL SECURITY;
ALTER TABLE workout_logs  ENABLE ROW LEVEL SECURITY;
ALTER TABLE meal_logs     ENABLE ROW LEVEL SECURITY;
ALTER TABLE xp_events     ENABLE ROW LEVEL SECURITY;

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

-- Meal logs: own rows only
DROP POLICY IF EXISTS "meal_logs_own" ON meal_logs;
CREATE POLICY "meal_logs_own" ON meal_logs
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- XP events: own rows only (append-only in practice; service-role
-- writes from Edge Functions bypass RLS entirely)
DROP POLICY IF EXISTS "xp_events_own" ON xp_events;
CREATE POLICY "xp_events_own" ON xp_events
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);
