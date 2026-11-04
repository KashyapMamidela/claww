-- NG PHASE 8 and 13 database changes. Idempotent: safe to run any number of times.
-- Supabase dashboard > SQL editor > paste > Run.
-- The app works without them (it retries the meal insert and read without the new columns, and the weight card
-- shows "log your weight" until the table exists), so applying them is not urgent.

-- ============================================================
-- NG PHASE 8: how a meal was logged, what it was made of, and its micronutrients (for the food diary).
-- ============================================================
ALTER TABLE meal_logs ADD COLUMN IF NOT EXISTS plan_status TEXT;
ALTER TABLE meal_logs DROP CONSTRAINT IF EXISTS meal_logs_plan_status_check;
ALTER TABLE meal_logs ADD CONSTRAINT meal_logs_plan_status_check CHECK (plan_status IS NULL OR plan_status IN ('as_planned','swapped','extra','skipped'));
ALTER TABLE meal_logs ADD COLUMN IF NOT EXISTS items JSONB;       -- [{food, unit, qty, grams}] when it came from the food database
ALTER TABLE meal_logs ADD COLUMN IF NOT EXISTS nutrients JSONB;   -- {fibreG, ironMg, calciumMg, vitcMg, b12Ug, sodiumMg}

-- ============================================================
-- NG PHASE 13: body weight over time (the Tracker's weight card and its 4-week trend). Owner-only.
-- ============================================================
CREATE TABLE IF NOT EXISTS weight_logs (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id     UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  weight_kg   NUMERIC NOT NULL CHECK (weight_kg > 20 AND weight_kg < 400),
  logged_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS weight_logs_user_idx ON weight_logs (user_id, logged_at DESC);
ALTER TABLE weight_logs ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "weight_logs_own" ON weight_logs;
CREATE POLICY "weight_logs_own" ON weight_logs
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);
