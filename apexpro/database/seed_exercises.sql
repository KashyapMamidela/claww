-- ============================================================
-- Claww: starter exercises catalog
--
-- Run once, after schema.sql, in the Supabase SQL editor.
-- generate-plan can't produce a real personalized plan without
-- rows here — it filters this table by modality and hands the
-- result to Groq as the only exercises it's allowed to choose from.
--
-- Idempotent: only inserts if the table is currently empty, so
-- re-running this file is harmless.
-- ============================================================

INSERT INTO exercises (name, modality, muscle_group, equipment, met_value)
SELECT * FROM (VALUES
  -- Strength
  ('Barbell Back Squat',  'strength', 'legs',      'gym',        5.0),
  ('Bench Press',         'strength', 'chest',     'gym',        5.0),
  ('Deadlift',            'strength', 'back',      'gym',        6.0),
  ('Overhead Press',      'strength', 'shoulders', 'gym',        5.0),
  ('Bent-Over Row',       'strength', 'back',      'gym',        5.0),
  ('Dumbbell Lunge',      'strength', 'legs',      'home',       4.5),
  ('Push-Up',             'strength', 'chest',     'none',       3.8),
  ('Bodyweight Squat',    'strength', 'legs',      'none',       3.5),
  ('Plank',               'strength', 'core',      'none',       3.0),

  -- Cardio
  ('Running',             'cardio',   'full_body', 'none',       9.8),
  ('Brisk Walking',       'cardio',   'full_body', 'none',       3.5),
  ('Cycling',             'cardio',   'legs',      'gym',        7.5),
  ('Rowing Machine',      'cardio',   'full_body', 'gym',        7.0),
  ('Jump Rope',           'cardio',   'full_body', 'none',       11.0),
  ('Stair Climber',       'cardio',   'legs',      'gym',        8.0),

  -- Mobility
  ('Hip Flexor Stretch',  'mobility', 'hips',      'none',       2.3),
  ('Foam Rolling',        'mobility', 'full_body', 'home',       2.0),
  ('Cat-Cow Stretch',     'mobility', 'spine',     'none',       2.0),
  ('World''s Greatest Stretch', 'mobility', 'full_body', 'none', 2.5),
  ('Ankle Mobility Drill','mobility', 'ankles',    'none',       2.0),

  -- Yoga
  ('Sun Salutation Flow', 'yoga',     'full_body', 'none',       3.0),
  ('Downward Dog Flow',   'yoga',     'full_body', 'none',       2.5),
  ('Warrior Sequence',    'yoga',     'legs',      'none',       2.8),
  ('Child''s Pose Rest',  'yoga',     'back',      'none',       1.8),
  ('Pigeon Pose Hold',    'yoga',     'hips',      'none',       2.0)
) AS seed(name, modality, muscle_group, equipment, met_value)
WHERE NOT EXISTS (SELECT 1 FROM exercises LIMIT 1);
