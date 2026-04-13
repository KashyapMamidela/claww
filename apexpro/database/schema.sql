-- ============================================================
-- ApexPro Database Schema
-- Supabase (PostgreSQL) compatible
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

-- ============================================================
-- TABLE: user_stats
-- Tracks XP, streaks, levels, and workout counts
-- ============================================================
CREATE TABLE IF NOT EXISTS user_stats (
  user_id         UUID PRIMARY KEY REFERENCES profiles(id) ON DELETE CASCADE,
  xp              INT NOT NULL DEFAULT 0,
  current_streak  INT NOT NULL DEFAULT 0,
  level           INT NOT NULL DEFAULT 1,
  total_workouts  INT NOT NULL DEFAULT 0
);

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
-- TABLE: community_posts
-- User-generated posts for the community feed
-- ============================================================
CREATE TABLE IF NOT EXISTS community_posts (
  id         UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id    UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  content    TEXT NOT NULL,
  image_url  TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- ROW LEVEL SECURITY (RLS) — Enable per-user access control
-- ============================================================

ALTER TABLE profiles        ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_stats      ENABLE ROW LEVEL SECURITY;
ALTER TABLE workouts        ENABLE ROW LEVEL SECURITY;
ALTER TABLE nutrition_logs  ENABLE ROW LEVEL SECURITY;
ALTER TABLE community_posts ENABLE ROW LEVEL SECURITY;

-- Profiles: users can only read/update their own row
CREATE POLICY "profiles_own" ON profiles
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

-- User stats: own row only
CREATE POLICY "user_stats_own" ON user_stats
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Workouts: own rows only
CREATE POLICY "workouts_own" ON workouts
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Nutrition logs: own rows only
CREATE POLICY "nutrition_logs_own" ON nutrition_logs
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Community posts: anyone can read, only owner can write
CREATE POLICY "community_posts_read_all" ON community_posts
  FOR SELECT USING (TRUE);

CREATE POLICY "community_posts_write_own" ON community_posts
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "community_posts_update_own" ON community_posts
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "community_posts_delete_own" ON community_posts
  FOR DELETE USING (auth.uid() = user_id);
