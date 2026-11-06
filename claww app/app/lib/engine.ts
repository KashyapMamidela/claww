// One import point for the code shared with the Edge Functions. Metro finds
// these files through the watchFolders entry in metro.config.js.
export * from '../../supabase/functions/_shared/adaptive';
export { computeRepRange, startingPrescription, deriveAllowedEquipment, excludeInjuredExercises } from '../../supabase/functions/_shared/planning';
export type { RepRange, ExerciseRole, StartingPrescription } from '../../supabase/functions/_shared/planning';
export * from '../../supabase/functions/_shared/penMarks';
export * from '../../supabase/functions/_shared/trendReader';
export * from '../../supabase/functions/_shared/penRules';
export { wordsFor, chooseNote, validateReworded, NOTE_MAX } from '../../supabase/functions/_shared/penNotes';
export { computeRecoveryScore, proteinShare } from '../../supabase/functions/_shared/recovery';
export type { RecoveryResult } from '../../supabase/functions/_shared/recovery';
export { pickBlueprint, goalToBlueprintGoal, equipmentToPlace, fillBlueprint, fitPlan, checkPlan, sessionMinutes, blueprintDayMinutes, BLOCK_WEEKS, toPlan } from '../../supabase/functions/_shared/planTree';
export type { PlanProfile, PickResult } from '../../supabase/functions/_shared/planTree';
export { distributeStyleDays, needsStyledPlan, buildStyledPlan, cleanStyles as cleanTrainStyles } from '../../supabase/functions/_shared/stylePlan';
export type { TrainStyle } from '../../supabase/functions/_shared/stylePlan';
export { INJURY_PARTS, SEVERITIES, parseInjuries, injuriesFromText, contraindicatedPatterns, isExerciseAllowed } from '../../supabase/functions/_shared/injuryRules';
export type { Injury, InjuryPart, Severity } from '../../supabase/functions/_shared/injuryRules';
export { BLUEPRINTS } from '../../supabase/functions/_shared/blueprints';
export { planDay, swapOptions, DIET_ALLOWED, replanRemaining, scaleTemplate, cheapestFix, isEligible, stepFor, KCAL_TOLERANCE, PROTEIN_MIN } from '../../supabase/functions/_shared/mealPlanner';
export type { DayPlan, PlannedMeal, PlanInput, Resources, HistoryDay, Shortfall, Diet as PlanDiet } from '../../supabase/functions/_shared/mealPlanner';
export { MEAL_TEMPLATES, ADD_ONS } from '../../supabase/functions/_shared/mealTemplates';
export type { MealTemplate, AddOn } from '../../supabase/functions/_shared/mealTypes';
export { applyContext, candidateChips, DEFAULT_CONTEXT, gramsFor as scanGramsFor, itemNutrients, matchFood, resolveItems, roundQty, routeScan, setQuantity, stepFor as scanStepFor, switchUnit as scanSwitchUnit, unitChoices as scanUnitChoices, totalsOf, CONFIDENCE_MIN, OIL_FOOD, PORTION_FACTOR, OIL_TSP } from '../../supabase/functions/_shared/scanMath';
export type { ScanContext, ScanFood, ScanItem, Oil, Place, Portion, Nutrients as ScanNutrients } from '../../supabase/functions/_shared/scanMath';
