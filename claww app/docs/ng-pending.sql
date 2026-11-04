-- Everything NG PHASES 3 to 6 need on the live database, in one paste. Safe to run any number of times.
-- Supabase dashboard > SQL editor > paste > Run.

-- NG 3.4: allow swap records
ALTER TABLE prescription_decisions DROP CONSTRAINT IF EXISTS prescription_decisions_phase_check;
ALTER TABLE prescription_decisions ADD CONSTRAINT prescription_decisions_phase_check CHECK (phase IN ('prescribed','result','swapped'));
-- NG 3.6: cardio distance
ALTER TABLE workout_logs ADD COLUMN IF NOT EXISTS distance_km FLOAT;
-- NG 5: which blueprint a plan came from, and the 6-week block
ALTER TABLE workouts ADD COLUMN IF NOT EXISTS blueprint_id TEXT;
ALTER TABLE workouts ADD COLUMN IF NOT EXISTS block_number INT DEFAULT 1;
ALTER TABLE workouts ADD COLUMN IF NOT EXISTS block_week INT DEFAULT 1;

-- NG 4: food database (empty until food values are supplied)
CREATE TABLE IF NOT EXISTS foods (
  id BIGSERIAL PRIMARY KEY, name TEXT NOT NULL UNIQUE, aliases TEXT[] DEFAULT '{}',
  kind TEXT NOT NULL CHECK (kind IN ('ingredient','dish')), cuisine TEXT,
  diet TEXT CHECK (diet IN ('veg','egg','nonveg','vegan')), jain_ok BOOLEAN DEFAULT false,
  kcal_100g NUMERIC NOT NULL CHECK (kcal_100g >= 0), protein_100g NUMERIC NOT NULL CHECK (protein_100g >= 0),
  carbs_100g NUMERIC NOT NULL CHECK (carbs_100g >= 0), fat_100g NUMERIC NOT NULL CHECK (fat_100g >= 0),
  fibre_100g NUMERIC, iron_mg_100g NUMERIC, calcium_mg_100g NUMERIC, vitc_mg_100g NUMERIC,
  b12_ug_100g NUMERIC, sodium_mg_100g NUMERIC, sugar_100g NUMERIC, cost_inr_100g NUMERIC,
  source TEXT NOT NULL, source_ref TEXT, reviewed_by TEXT, reviewed_at TIMESTAMPTZ
);
CREATE TABLE IF NOT EXISTS food_units (
  food_id BIGINT NOT NULL REFERENCES foods(id) ON DELETE CASCADE, unit TEXT NOT NULL,
  grams NUMERIC NOT NULL CHECK (grams > 0), is_default BOOLEAN DEFAULT false, PRIMARY KEY (food_id, unit)
);
CREATE TABLE IF NOT EXISTS dish_items (
  dish_id BIGINT NOT NULL REFERENCES foods(id) ON DELETE CASCADE, item_id BIGINT NOT NULL REFERENCES foods(id),
  grams NUMERIC NOT NULL CHECK (grams > 0), PRIMARY KEY (dish_id, item_id)
);
CREATE INDEX IF NOT EXISTS foods_kind_idx ON foods (kind);
ALTER TABLE foods ENABLE ROW LEVEL SECURITY;
ALTER TABLE food_units ENABLE ROW LEVEL SECURITY;
ALTER TABLE dish_items ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "foods readable by signed-in users" ON foods;
CREATE POLICY "foods readable by signed-in users" ON foods FOR SELECT TO authenticated USING (true);
DROP POLICY IF EXISTS "food_units readable by signed-in users" ON food_units;
CREATE POLICY "food_units readable by signed-in users" ON food_units FOR SELECT TO authenticated USING (true);
DROP POLICY IF EXISTS "dish_items readable by signed-in users" ON dish_items;
CREATE POLICY "dish_items readable by signed-in users" ON dish_items FOR SELECT TO authenticated USING (true);

-- NG 6: what the user can get
CREATE TABLE IF NOT EXISTS user_resources (
  user_id UUID PRIMARY KEY REFERENCES profiles(id) ON DELETE CASCADE,
  sources TEXT[] NOT NULL DEFAULT '{}', cook_with TEXT[] NOT NULL DEFAULT '{}',
  diet TEXT NOT NULL CHECK (diet IN ('veg','egg','nonveg','vegan','jain')),
  budget_inr_day INT, plan_style TEXT NOT NULL DEFAULT 'same' CHECK (plan_style IN ('same','varied')),
  availability JSONB NOT NULL DEFAULT '{}'::jsonb, avoid TEXT[] NOT NULL DEFAULT '{}',
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE user_resources ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "user_resources_own" ON user_resources;
CREATE POLICY "user_resources_own" ON user_resources USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
