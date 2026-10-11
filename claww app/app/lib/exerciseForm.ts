// Form-guide content for an exercise (V2 PHASE 2.6 / 6.2 / 8). Pure helpers;
// data.ts does the querying.

export interface ExerciseForm {
  primaryMuscle: string | null;
  secondaryMuscles: string[];
  formSteps: string[];
  commonMistake: string | null;
}

export interface ExerciseFormRow {
  primary_muscle?: string | null;
  secondary_muscles?: string[] | null;
  form_steps?: string[] | null;
  common_mistake?: string | null;
}

/** Normalises a catalog row; null when there's nothing to show. */
export function toExerciseForm(row: ExerciseFormRow | null | undefined): ExerciseForm | null {
  if (!row) return null;
  const formSteps = (row.form_steps ?? []).map((s) => s?.trim()).filter((s): s is string => !!s);
  const form: ExerciseForm = {
    primaryMuscle: row.primary_muscle?.trim() || null,
    secondaryMuscles: (row.secondary_muscles ?? []).map((s) => s?.trim()).filter((s): s is string => !!s),
    formSteps,
    commonMistake: row.common_mistake?.trim() || null,
  };
  return hasFormContent(form) ? form : null;
}

/** The strip only renders with at least one cue to show — never an empty strip. */
export function hasFormContent(form: ExerciseForm | null | undefined): form is ExerciseForm {
  return !!form && form.formSteps.length > 0;
}

/** The cue for a set: steps advance one per set and wrap. Returns the 0-based index. */
export function cueIndexForSet(stepCount: number, setIndex: number): number {
  if (stepCount <= 0) return 0;
  return ((Math.max(0, setIndex) % stepCount) + stepCount) % stepCount;
}
