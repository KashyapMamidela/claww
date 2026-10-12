// One import point for the code shared with the Edge Functions. Metro finds
// these files through the watchFolders entry in metro.config.js.
export * from '../../supabase/functions/_shared/adaptive';
export { computeRepRange, startingPrescription, deriveAllowedEquipment } from '../../supabase/functions/_shared/planning';
export type { RepRange, ExerciseRole, StartingPrescription } from '../../supabase/functions/_shared/planning';
export { computeRecoveryScore, proteinShare } from '../../supabase/functions/_shared/recovery';
export type { RecoveryResult } from '../../supabase/functions/_shared/recovery';
