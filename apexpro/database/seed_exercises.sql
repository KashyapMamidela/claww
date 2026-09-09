-- ============================================================
-- Claww: exercises catalog
--
-- Run once, after schema.sql, in the Supabase SQL editor.
-- generate-plan can't produce a real personalized plan without
-- rows here — it filters this table by modality and equipment and
-- hands the result to Groq as the only exercises it's allowed to
-- choose from.
--
-- At least 40 rows per modality, weighted toward equipment='none'
-- (bodyweight/calisthenics) — that's the tier a bodyweight-only user
-- is restricted to (see EQUIPMENT_TIERS in generate-plan/index.ts),
-- and it used to be a very small pool.
--
-- Idempotent via ON CONFLICT (name) DO NOTHING, backed by the unique
-- index on exercises.name in schema.sql — safe to re-run after adding
-- more rows to this file, unlike a table-emptiness check.
-- ============================================================

INSERT INTO exercises (name, modality, muscle_group, equipment, met_value)
VALUES
  -- ── Strength — none (bodyweight/calisthenics) ──────────────
  ('Push-Up',                  'strength', 'chest',      'none', 3.8),
  ('Incline Push-Up',          'strength', 'chest',      'none', 3.5),
  ('Decline Push-Up',          'strength', 'chest',      'none', 4.2),
  ('Diamond Push-Up',          'strength', 'chest',      'none', 4.0),
  ('Pike Push-Up',             'strength', 'shoulders',  'none', 4.0),
  ('Bodyweight Squat',         'strength', 'legs',       'none', 3.5),
  ('Jump Squat',                'strength', 'legs',       'none', 6.0),
  ('Wall Sit',                  'strength', 'legs',       'none', 3.5),
  ('Bodyweight Lunge',          'strength', 'legs',       'none', 3.5),
  ('Reverse Lunge',             'strength', 'legs',       'none', 3.5),
  ('Bulgarian Split Squat',      'strength', 'legs',       'none', 4.0),
  ('Step-Up',                   'strength', 'legs',       'none', 4.0),
  ('Calf Raise',                'strength', 'calves',     'none', 2.5),
  ('Pull-Up',                   'strength', 'back',       'none', 3.8),
  ('Chin-Up',                   'strength', 'back',       'none', 3.8),
  ('Inverted Row',              'strength', 'back',       'none', 3.8),
  ('Superman',                  'strength', 'back',       'none', 2.8),
  ('Bodyweight Dip',            'strength', 'chest',      'none', 4.0),
  ('Bench Dip',                 'strength', 'triceps',    'none', 3.8),
  ('Plank',                     'strength', 'core',       'none', 3.0),
  ('Side Plank',                'strength', 'core',       'none', 3.2),
  ('Bird Dog',                  'strength', 'core',       'none', 2.5),
  ('Glute Bridge',              'strength', 'glutes',     'none', 3.0),
  ('Single-Leg Glute Bridge',    'strength', 'glutes',     'none', 3.2),
  ('Mountain Climbers',         'strength', 'core',       'none', 6.0),
  ('Burpee',                    'strength', 'full_body',  'none', 8.0),
  ('Bear Crawl',                'strength', 'full_body',  'none', 5.0),
  ('Hollow Body Hold',           'strength', 'core',       'none', 3.0),
  ('V-Up',                      'strength', 'core',       'none', 4.0),
  ('Pistol Squat',               'strength', 'legs',       'none', 5.0),

  -- ── Strength — home (dumbbells, bands, bench) ──────────────
  ('Dumbbell Lunge',            'strength', 'legs',       'home', 4.5),
  ('Dumbbell Goblet Squat',      'strength', 'legs',       'home', 4.5),
  ('Dumbbell Romanian Deadlift', 'strength', 'hamstrings', 'home', 4.5),
  ('Dumbbell Shoulder Press',    'strength', 'shoulders',  'home', 4.5),
  ('Dumbbell Bicep Curl',        'strength', 'biceps',     'home', 3.5),
  ('Dumbbell Tricep Extension',  'strength', 'triceps',    'home', 3.5),
  ('Dumbbell Bent-Over Row',     'strength', 'back',       'home', 4.5),
  ('Dumbbell Chest Press',       'strength', 'chest',      'home', 4.5),
  ('Dumbbell Step-Up',           'strength', 'legs',       'home', 4.5),
  ('Resistance Band Row',        'strength', 'back',       'home', 3.5),
  ('Resistance Band Squat',      'strength', 'legs',       'home', 3.5),
  ('Kettlebell Swing',           'strength', 'full_body',  'home', 6.5),
  ('Renegade Row',              'strength', 'back',       'home', 5.0),

  -- ── Strength — gym (barbell, machines) ──────────────────────
  ('Barbell Back Squat',        'strength', 'legs',       'gym',  5.0),
  ('Barbell Front Squat',        'strength', 'legs',       'gym',  5.2),
  ('Bench Press',                'strength', 'chest',      'gym',  5.0),
  ('Incline Bench Press',        'strength', 'chest',      'gym',  5.0),
  ('Deadlift',                   'strength', 'back',       'gym',  6.0),
  ('Romanian Deadlift',          'strength', 'hamstrings', 'gym',  5.5),
  ('Overhead Press',             'strength', 'shoulders',  'gym',  5.0),
  ('Bent-Over Row',              'strength', 'back',       'gym',  5.0),
  ('Lat Pulldown',                'strength', 'back',       'gym',  4.5),
  ('Cable Row',                  'strength', 'back',       'gym',  4.5),
  ('Leg Press',                  'strength', 'legs',       'gym',  5.0),
  ('Leg Curl Machine',           'strength', 'hamstrings', 'gym',  4.0),
  ('Leg Extension Machine',      'strength', 'quads',      'gym',  4.0),
  ('Seated Shoulder Press Machine', 'strength', 'shoulders', 'gym', 4.5),

  -- ── Cardio — none ────────────────────────────────────────────
  ('Running',                    'cardio', 'full_body', 'none', 9.8),
  ('Jogging',                    'cardio', 'full_body', 'none', 7.0),
  ('Brisk Walking',              'cardio', 'full_body', 'none', 3.5),
  ('Power Walking',              'cardio', 'full_body', 'none', 4.3),
  ('Sprint Intervals',           'cardio', 'full_body', 'none', 12.0),
  ('Hill Sprints',               'cardio', 'full_body', 'none', 13.0),
  ('Fartlek Running',            'cardio', 'full_body', 'none', 9.0),
  ('Jump Rope',                  'cardio', 'full_body', 'none', 11.0),
  ('High Knees',                 'cardio', 'full_body', 'none', 8.0),
  ('Butt Kicks',                 'cardio', 'full_body', 'none', 8.0),
  ('Jumping Jacks',               'cardio', 'full_body', 'none', 7.0),
  ('Skater Jumps',               'cardio', 'legs',      'none', 7.5),
  ('Broad Jumps',                'cardio', 'legs',      'none', 7.0),
  ('Tuck Jumps',                 'cardio', 'legs',      'none', 8.0),
  ('Shadow Boxing',              'cardio', 'full_body', 'none', 7.5),
  ('Burpee Cardio Circuit',      'cardio', 'full_body', 'none', 10.0),
  ('Stair Sprints',              'cardio', 'legs',      'none', 10.0),
  ('Walking Lunges Cardio',       'cardio', 'legs',      'none', 6.0),
  ('Sprint Shuttles',            'cardio', 'full_body', 'none', 11.0),
  ('Agility Ladder Drills',      'cardio', 'full_body', 'none', 8.0),
  ('Lateral Bounds',             'cardio', 'legs',      'none', 7.5),

  -- ── Cardio — home ────────────────────────────────────────────
  ('Stationary Bike',            'cardio', 'legs',      'home', 6.8),
  ('Treadmill Walk',              'cardio', 'full_body', 'home', 4.3),
  ('Treadmill Jog',               'cardio', 'full_body', 'home', 7.0),
  ('Home Elliptical',            'cardio', 'full_body', 'home', 5.5),
  ('Box Jump',                   'cardio', 'legs',      'home', 8.0),
  ('Battle Ropes',               'cardio', 'full_body', 'home', 8.5),
  ('Step Aerobics',              'cardio', 'full_body', 'home', 6.5),
  ('Dance Cardio',               'cardio', 'full_body', 'home', 6.0),
  ('Kickboxing Cardio',           'cardio', 'full_body', 'home', 8.5),
  ('Spin Bike Intervals',        'cardio', 'legs',      'home', 8.5),
  ('Home Cardio Circuit',        'cardio', 'full_body', 'home', 7.0),

  -- ── Cardio — gym ─────────────────────────────────────────────
  ('Cycling',                    'cardio', 'legs',      'gym', 7.5),
  ('Rowing Machine',             'cardio', 'full_body', 'gym', 7.0),
  ('Stair Climber',              'cardio', 'legs',      'gym', 8.0),
  ('Elliptical Machine',         'cardio', 'full_body', 'gym', 5.5),
  ('Treadmill Sprints',          'cardio', 'full_body', 'gym', 12.0),
  ('Swimming Laps',              'cardio', 'full_body', 'gym', 9.0),
  ('Sled Push',                  'cardio', 'full_body', 'gym', 10.0),
  ('Assault Bike',               'cardio', 'full_body', 'gym', 10.0),
  ('Ski Erg',                    'cardio', 'full_body', 'gym', 8.5),
  ('Versaclimber',               'cardio', 'full_body', 'gym', 9.5),

  -- ── Mobility — none ──────────────────────────────────────────
  ('Hip Flexor Stretch',         'mobility', 'hips',      'none', 2.3),
  ('Cat-Cow Stretch',            'mobility', 'spine',     'none', 2.0),
  ('World''s Greatest Stretch',   'mobility', 'full_body', 'none', 2.5),
  ('Ankle Mobility Drill',       'mobility', 'ankles',    'none', 2.0),
  ('Hamstring Stretch',          'mobility', 'hamstrings', 'none', 2.0),
  ('Quad Stretch',               'mobility', 'quads',     'none', 2.0),
  ('Calf Stretch',               'mobility', 'calves',    'none', 2.0),
  ('Shoulder Circles',           'mobility', 'shoulders', 'none', 2.0),
  ('Arm Circles',                'mobility', 'shoulders', 'none', 2.0),
  ('Neck Rolls',                 'mobility', 'neck',      'none', 1.8),
  ('Thoracic Spine Rotation',     'mobility', 'spine',     'none', 2.2),
  ('Hip Circles',                'mobility', 'hips',      'none', 2.2),
  ('Leg Swings',                 'mobility', 'hips',      'none', 2.5),
  ('Walking Knee Hugs',           'mobility', 'hips',      'none', 2.5),
  ('Walking Quad Stretch',        'mobility', 'quads',     'none', 2.5),
  ('Inchworm',                   'mobility', 'full_body', 'none', 3.0),
  ('Scorpion Stretch',           'mobility', 'spine',     'none', 2.3),
  ('Figure-Four Stretch',         'mobility', 'hips',      'none', 2.0),
  ('Butterfly Stretch',          'mobility', 'hips',      'none', 2.0),
  ('Seated Forward Fold',         'mobility', 'hamstrings', 'none', 2.0),
  ('Standing Side Bend',          'mobility', 'spine',     'none', 2.0),
  ('Wrist Mobility Drill',        'mobility', 'wrists',    'none', 1.8),
  ('90/90 Hip Stretch',           'mobility', 'hips',      'none', 2.2),
  ('Deep Squat Hold',            'mobility', 'hips',      'none', 2.5),
  ('Spiderman Lunge',            'mobility', 'hips',      'none', 3.0),
  ('Cossack Squat',              'mobility', 'legs',      'none', 3.2),
  ('Windmill Stretch',           'mobility', 'spine',     'none', 2.3),
  ('Lat Stretch',                'mobility', 'back',      'none', 2.0),
  ('Chest Opener Stretch',        'mobility', 'chest',     'none', 2.0),
  ('Groin Stretch',              'mobility', 'hips',      'none', 2.0),
  ('Piriformis Stretch',          'mobility', 'hips',      'none', 2.0),
  ('IT Band Stretch',            'mobility', 'legs',      'none', 2.0),

  -- ── Mobility — home ──────────────────────────────────────────
  ('Foam Rolling',               'mobility', 'full_body', 'home', 2.0),
  ('Resistance Band Shoulder Mobility', 'mobility', 'shoulders', 'home', 2.2),
  ('Yoga Strap Hamstring Stretch', 'mobility', 'hamstrings', 'home', 2.0),
  ('Foam Roller Thoracic Extension', 'mobility', 'spine',   'home', 2.0),
  ('Massage Ball Foot Rolling',   'mobility', 'ankles',    'home', 1.8),
  ('Band-Assisted Hip Opener',    'mobility', 'hips',      'home', 2.2),
  ('Foam Roller IT Band Release', 'mobility', 'legs',      'home', 2.0),
  ('Lacrosse Ball Glute Release', 'mobility', 'glutes',    'home', 1.8),

  -- ── Mobility — gym ───────────────────────────────────────────
  ('Assisted Stretch Machine',    'mobility', 'full_body', 'gym', 2.0),
  ('Pool Walking Mobility',       'mobility', 'full_body', 'gym', 2.5),

  -- ── Yoga — none ──────────────────────────────────────────────
  ('Sun Salutation Flow',        'yoga', 'full_body', 'none', 3.0),
  ('Downward Dog Flow',          'yoga', 'full_body', 'none', 2.5),
  ('Warrior Sequence',           'yoga', 'legs',      'none', 2.8),
  ('Child''s Pose Rest',          'yoga', 'back',      'none', 1.8),
  ('Pigeon Pose Hold',           'yoga', 'hips',      'none', 2.0),
  ('Cobra Pose',                 'yoga', 'back',      'none', 2.0),
  ('Cat-Cow Yoga Flow',           'yoga', 'spine',     'none', 2.0),
  ('Tree Pose',                  'yoga', 'legs',      'none', 2.2),
  ('Triangle Pose',              'yoga', 'full_body', 'none', 2.3),
  ('Chair Pose',                 'yoga', 'legs',      'none', 2.8),
  ('Bridge Pose',                'yoga', 'glutes',    'none', 2.2),
  ('Camel Pose',                 'yoga', 'back',      'none', 2.3),
  ('Seated Twist',               'yoga', 'spine',     'none', 2.0),
  ('Eagle Pose',                 'yoga', 'legs',      'none', 2.3),
  ('Half Moon Pose',             'yoga', 'full_body', 'none', 2.5),
  ('Crow Pose',                  'yoga', 'core',      'none', 2.8),
  ('Boat Pose',                  'yoga', 'core',      'none', 2.8),
  ('Fish Pose',                  'yoga', 'chest',     'none', 1.8),
  ('Locust Pose',                'yoga', 'back',      'none', 2.2),
  ('Bow Pose',                   'yoga', 'back',      'none', 2.3),
  ('Extended Side Angle',         'yoga', 'legs',      'none', 2.5),
  ('Reverse Warrior',            'yoga', 'legs',      'none', 2.5),
  ('Low Lunge Flow',             'yoga', 'legs',      'none', 2.6),
  ('High Lunge Flow',            'yoga', 'legs',      'none', 2.7),
  ('Standing Forward Fold',       'yoga', 'hamstrings', 'none', 2.0),
  ('Wide-Legged Forward Fold',    'yoga', 'hamstrings', 'none', 2.0),
  ('Plow Pose',                  'yoga', 'back',      'none', 2.0),
  ('Shoulder Stand',             'yoga', 'shoulders', 'none', 2.2),
  ('Happy Baby Pose',            'yoga', 'hips',      'none', 1.8),
  ('Reclined Twist',             'yoga', 'spine',     'none', 1.8),
  ('Legs-Up-The-Wall',            'yoga', 'legs',      'none', 1.5),
  ('Corpse Pose',                'yoga', 'full_body', 'none', 1.3),
  ('Sphinx Pose',                'yoga', 'back',      'none', 1.8),
  ('Dolphin Pose',               'yoga', 'shoulders', 'none', 2.3),
  ('Standing Split Pose',        'yoga', 'legs',      'none', 2.5),
  ('Revolved Triangle Pose',      'yoga', 'full_body', 'none', 2.5),

  -- ── Yoga — home ──────────────────────────────────────────────
  ('Yoga with Block Support Flow', 'yoga', 'full_body', 'home', 2.3),
  ('Restorative Yoga with Bolster', 'yoga', 'full_body', 'home', 1.5),
  ('Wall-Assisted Yoga Flow',      'yoga', 'full_body', 'home', 2.2),
  ('Yoga Strap Stretch Sequence',  'yoga', 'full_body', 'home', 2.0),

  -- ── Yoga — gym ───────────────────────────────────────────────
  ('Hot Yoga Studio Flow',        'yoga', 'full_body', 'gym', 4.0),
  ('Aerial Yoga Flow',            'yoga', 'full_body', 'gym', 3.0)
ON CONFLICT (name) DO NOTHING;
