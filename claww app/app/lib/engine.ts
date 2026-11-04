// One import point for the code shared with the Edge Functions. Metro finds
// these files through the watchFolders entry in metro.config.js.
export * from '../../supabase/functions/_shared/adaptive';
export { computeRepRange, startingPrescription, deriveAllowedEquipment, excludeInjuredExercises } from '../../supabase/functions/_shared/planning';
export type { RepRange, ExerciseRole, StartingPrescription } from '../../supabase/functions/_shared/planning';
export { computeRecoveryScore, proteinShare } from '../../supabase/functions/_shared/recovery';
export type { RecoveryResult } from '../../supabase/functions/_shared/recovery';
export { pickBlueprint, goalToBlueprintGoal, equipmentToPlace, fillBlueprint, fitPlan, checkPlan, sessionMinutes, blueprintDayMinutes, BLOCK_WEEKS, toPlan } from '../../supabase/functions/_shared/planTree';
export type { PlanProfile, PickResult } from '../../supabase/functions/_shared/planTree';
export { INJURY_PARTS, SEVERITIES, parseInjuries, injuriesFromText, contraindicatedPatterns, isExerciseAllowed } from '../../supabase/functions/_shared/injuryRules';
export type { Injury, InjuryPart, Severity } from '../../supabase/functions/_shared/injuryRules';
export { BLUEPRINTS } from '../../supabase/functions/_shared/blueprints';
