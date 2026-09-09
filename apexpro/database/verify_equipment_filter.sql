-- ============================================================
-- Verifies the equipment filter holds at the expanded catalog size.
--
-- generate-plan's deriveAllowedEquipment('none') resolves to exactly
-- ['none'] (see EQUIPMENT_TIERS in supabase/functions/generate-plan/
-- index.ts) — a bodyweight-only user is served ONLY rows where
-- equipment = 'none'. This was a real bug once already (a gym-only
-- movement slipped into the 'none' tier); this script re-checks it
-- by name-pattern rather than trusting the tagging, now that the
-- catalog is 183 rows instead of 25.
--
-- Run: npx supabase db query --linked --file database/verify_equipment_filter.sql
-- Expected: zero rows from both queries. Any row returned is a
-- mistagged exercise to fix in seed_exercises.sql (fix there, not
-- with an UPDATE here — the seed file is the source of truth).
--
-- Phase 3.2 folds this same check into a real test once a runner
-- exists; this stays as a fast, no-framework-needed way to re-run it
-- any time the catalog changes before then.
-- ============================================================

-- 1. Nothing tagged equipment='none' should reference equipment by name.
SELECT id, name, modality, equipment
FROM exercises
WHERE equipment = 'none'
  AND name ~* '(barbell|dumbbell|kettlebell|\ymachine\y|cable|treadmill|stationary bike|spin bike|elliptical|rowing machine|assault bike|ski erg|versaclimber|leg press|smith machine|resistance band|foam roll|yoga strap|yoga block|bolster|lacrosse ball|massage ball|\ysled\y|battle rope|studio|aerial)';

-- 2. Sanity check the reverse doesn't hold either — every exercise whose
--    name clearly requires a barbell/machine should NOT be tagged 'none'.
SELECT id, name, modality, equipment
FROM exercises
WHERE equipment != 'none'
  AND name ~* '^(bodyweight |push-up|pull-up|chin-up|plank|burpee|jumping jack)';
