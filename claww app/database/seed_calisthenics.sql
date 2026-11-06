-- ============================================================
-- Claww: calisthenics progressions (polish step 3)
--
-- NEEDS REVIEW BY THE TRAINER. Ten bodyweight progressions the
-- calisthenics plans reach for: the steps between push-ups and
-- dips, rows and pull-ups, squats and pistol work. Names, muscles,
-- movement patterns and the form text were drafted, not sourced
-- from a coach; change any value and re-run.
--
-- Run after schema.sql, seed_exercises.sql and
-- seed_exercise_metadata.sql. Safe to run any number of times:
-- rows are inserted by name and then updated in place.
--
-- Everything here is equipment = 'none' (a floor, a wall and a bar
-- are enough, the same assumption the existing Pull-Up row makes).
-- ============================================================

INSERT INTO exercises (name, modality, muscle_group, equipment, met_value) VALUES
  ('Negative Pull-Up',        'strength', 'back',      'none', 3.8),
  ('Archer Push-Up',          'strength', 'chest',     'none', 3.8),
  ('Pseudo Planche Push-Up',  'strength', 'chest',     'none', 3.8),
  ('Wall Handstand Hold',     'strength', 'shoulders', 'none', 3.5),
  ('Hanging Knee Raise',      'strength', 'core',      'none', 3.5),
  ('Hanging Leg Raise',       'strength', 'core',      'none', 3.8),
  ('L-Sit Hold',              'strength', 'core',      'none', 3.5),
  ('Shrimp Squat',            'strength', 'quads',     'none', 4.0),
  ('Cossack Squat',           'strength', 'quads',     'none', 3.8),
  ('Nordic Curl Negative',    'strength', 'hamstrings','none', 4.0)
ON CONFLICT (name) DO NOTHING;

-- Metadata and form text, by name.
UPDATE exercises e SET
  primary_muscle     = v.primary_muscle,
  secondary_muscles  = v.secondary_muscles,
  movement_pattern   = v.movement_pattern,
  role               = v.role,
  loadable           = FALSE,
  stimulus_type      = v.stimulus_type,
  load_increment_kg  = NULL,
  form_steps         = v.form_steps,
  common_mistake     = v.common_mistake
FROM (VALUES
  ('Negative Pull-Up', 'back', ARRAY['biceps','core']::text[], 'vertical_pull', 'accessory', 'compound',
    ARRAY['Start at the top with your chin over the bar, using a box or a jump, and hold that position for a second.', 'Lower yourself as slowly as you can, counting at least four seconds, with your shoulders staying down.', 'Reach a full hang, reset at the top, and repeat. Stop when you can no longer control the lowering.']::text[],
    'Dropping the last half of the way instead of lowering under control, so the slow part that builds strength is lost.'),
  ('Archer Push-Up', 'chest', ARRAY['triceps','shoulders']::text[], 'horizontal_push', 'accessory', 'compound',
    ARRAY['Start in a wide push-up position, hands about twice shoulder width, body in one straight line.', 'Lower toward one hand while the other arm stays straight and the elbow of the working side bends.', 'Push back to the middle and switch sides. The straight arm only helps a little.']::text[],
    'Letting the hips sag or twist as you shift sideways, instead of keeping the body straight.'),
  ('Pseudo Planche Push-Up', 'chest', ARRAY['shoulders','triceps']::text[], 'horizontal_push', 'accessory', 'compound',
    ARRAY['Get into a push-up position with your hands turned slightly out and by your lower ribs, not under your shoulders.', 'Lean your shoulders forward past your hands until your wrists and shoulders feel the load, keeping your body straight.', 'Lower and press up while holding the lean. Start with a small lean and add more over weeks.']::text[],
    'Leaning too far too soon, which puts the load on the wrists. Add lean a little at a time.'),
  ('Wall Handstand Hold', 'shoulders', ARRAY['triceps','core']::text[], 'vertical_push', 'accessory', 'isometric',
    ARRAY['Place your hands about a hand length from a wall and kick up one leg at a time until your heels rest on the wall.', 'Push the floor away so your shoulders stay up by your ears, and squeeze your legs and stomach to keep your body straight.', 'Hold for the time in your plan and come down one leg at a time. Stop if your wrists hurt.']::text[],
    'Arching the lower back so the ribs flare. Tuck your ribs in and keep a straight line from hands to feet.'),
  ('Hanging Knee Raise', 'core', ARRAY['shoulders']::text[], 'core_flexion', 'accessory', 'isolation',
    ARRAY['Hang from a bar with your arms straight and your shoulders pulled down.', 'Bring your knees up toward your chest by curling your pelvis up, not just lifting the legs.', 'Lower slowly without swinging, and stop the swing before the next rep.']::text[],
    'Swinging the body to get the legs up, so the stomach does very little of the work.'),
  ('Hanging Leg Raise', 'core', ARRAY['shoulders']::text[], 'core_flexion', 'accessory', 'isolation',
    ARRAY['Hang from a bar with your arms straight and your shoulders pulled down, legs together.', 'Raise your straight legs until they are level with your hips or higher, curling your pelvis up at the top.', 'Lower under control and pause at the bottom so you do not swing.']::text[],
    'Bending the knees and swinging the legs up, which turns it into a much easier move.'),
  ('L-Sit Hold', 'core', ARRAY['shoulders','triceps']::text[], 'core_anti_extension', 'accessory', 'isometric',
    ARRAY['Sit on the floor with your hands flat beside your hips, or hold on to two sturdy supports, and push down so your seat lifts.', 'Keep your arms straight and your shoulders pressed down, and hold your legs straight out in front of you.', 'Hold for the time in your plan. If straight legs are too hard, hold one knee bent.']::text[],
    'Letting the shoulders shrug up to the ears. Press down hard to keep them low.'),
  ('Shrimp Squat', 'quads', ARRAY['glutes','core']::text[], 'squat', 'accessory', 'compound',
    ARRAY['Stand on one leg and hold the other foot behind you with the same-side hand.', 'Lower slowly until the back knee gently touches the floor, keeping your chest tall.', 'Press through the front foot to stand. Hold a wall or a post at first if you need balance.']::text[],
    'Dropping onto the back knee instead of lowering it down under control.'),
  ('Cossack Squat', 'quads', ARRAY['glutes','hamstrings']::text[], 'lunge', 'accessory', 'compound',
    ARRAY['Stand with your feet wide apart and your toes turned slightly out.', 'Shift your weight to one side and sit down into that leg while the other leg stays straight with the toes up.', 'Push back to the middle and switch sides, keeping the bent leg''s heel on the floor.']::text[],
    'Lifting the heel of the bent leg, which twists the knee. Keep the whole foot down and go only as low as you can control.'),
  ('Nordic Curl Negative', 'hamstrings', ARRAY['glutes']::text[], 'knee_flexion', 'accessory', 'compound',
    ARRAY['Kneel on a soft surface with your feet held down under something heavy or by a partner, body straight from knees to head.', 'Lower your body forward as slowly as you can, keeping your hips extended, and catch yourself with your hands at the bottom.', 'Push back up with your hands to the start. Build up to more control over several weeks.']::text[],
    'Folding at the hips. Keep a straight line from knees to head and lower as one piece.')
) AS v(name, primary_muscle, secondary_muscles, movement_pattern, role, stimulus_type, form_steps, common_mistake)
WHERE e.name = v.name;

-- Progressions: harder and easier variations by name.
UPDATE exercises e SET harder_variation_id = (SELECT id FROM exercises WHERE name = 'Pull-Up')
WHERE e.name = 'Negative Pull-Up';
UPDATE exercises e SET easier_variation_id = (SELECT id FROM exercises WHERE name = 'Negative Pull-Up')
WHERE e.name = 'Pull-Up' AND e.easier_variation_id IS NULL;
UPDATE exercises e SET easier_variation_id = (SELECT id FROM exercises WHERE name = 'Push-Up')
WHERE e.name IN ('Archer Push-Up', 'Pseudo Planche Push-Up');
UPDATE exercises e SET easier_variation_id = (SELECT id FROM exercises WHERE name = 'Hanging Knee Raise')
WHERE e.name = 'Hanging Leg Raise';
UPDATE exercises e SET harder_variation_id = (SELECT id FROM exercises WHERE name = 'Hanging Leg Raise')
WHERE e.name = 'Hanging Knee Raise';
UPDATE exercises e SET easier_variation_id = (SELECT id FROM exercises WHERE name = 'Bulgarian Split Squat')
WHERE e.name = 'Shrimp Squat';
UPDATE exercises e SET harder_variation_id = (SELECT id FROM exercises WHERE name = 'Shrimp Squat')
WHERE e.name = 'Bulgarian Split Squat' AND e.harder_variation_id IS NULL;
