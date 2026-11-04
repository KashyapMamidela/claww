// NG PHASE 5.2: structured injuries -> the movement patterns to avoid. Replaces the six-regex keyword filter
// (SHIP 10.1). The rules are a conservative, best-effort screen written for the trainer to review, not
// physiotherapy: a "mild" niggle only removes impact work, "moderate" also removes the loaded patterns that
// stress the area most, "severe" removes every pattern that loads it. The app tells the user to see a professional.
// Dependency-free so Vitest and the Edge Function run the same file.

export type InjuryPart = 'knee' | 'lower_back' | 'shoulder' | 'wrist' | 'ankle' | 'hip' | 'elbow' | 'neck';
export type Severity = 'mild' | 'moderate' | 'severe';

export interface Injury {
  part: InjuryPart;
  severity: Severity;
}

export const INJURY_PARTS: { part: InjuryPart; label: string }[] = [
  { part: 'knee', label: 'Knee' },
  { part: 'lower_back', label: 'Lower back' },
  { part: 'shoulder', label: 'Shoulder' },
  { part: 'wrist', label: 'Wrist' },
  { part: 'ankle', label: 'Ankle or foot' },
  { part: 'hip', label: 'Hip' },
  { part: 'elbow', label: 'Elbow' },
  { part: 'neck', label: 'Neck' },
];

export const SEVERITIES: Severity[] = ['mild', 'moderate', 'severe'];

/** Patterns to remove at each severity (cumulative: a severe injury also removes the moderate list). */
const BY_SEVERITY: Record<InjuryPart, Record<Severity, string[]>> = {
  knee: { mild: [], moderate: ['lunge', 'knee_extension'], severe: ['squat'] },
  lower_back: { mild: ['back_extension'], moderate: ['hinge'], severe: ['squat'] },
  shoulder: { mild: [], moderate: ['vertical_push'], severe: ['horizontal_push', 'vertical_pull'] },
  wrist: { mild: [], moderate: ['core_anti_extension'], severe: ['horizontal_push', 'vertical_push'] },
  ankle: { mild: [], moderate: ['calf_raise'], severe: ['lunge', 'squat'] },
  hip: { mild: [], moderate: ['lunge'], severe: ['hinge', 'squat'] },
  elbow: { mild: [], moderate: ['elbow_extension', 'elbow_flexion'], severe: ['horizontal_push', 'horizontal_pull', 'vertical_pull'] },
  neck: { mild: [], moderate: ['vertical_push'], severe: ['vertical_pull'] },
};

/** Parts where even a mild injury rules out jumping and other impact work. */
const IMPACT_PARTS: InjuryPart[] = ['knee', 'ankle', 'hip', 'lower_back'];

const ORDER: Severity[] = ['mild', 'moderate', 'severe'];

export function contraindicatedPatterns(injuries: Injury[]): Set<string> {
  const out = new Set<string>();
  for (const inj of injuries) {
    const rules = BY_SEVERITY[inj.part];
    if (!rules) continue;
    const upTo = ORDER.indexOf(inj.severity);
    for (let i = 0; i <= upTo; i++) for (const p of rules[ORDER[i]]) out.add(p);
  }
  return out;
}

export function avoidsImpact(injuries: Injury[]): boolean {
  return injuries.some((i) => IMPACT_PARTS.includes(i.part));
}

export interface ExerciseLike {
  name: string;
  movement_pattern?: string | null;
  stimulus_type?: string | null;
}

export function isExerciseAllowed(ex: ExerciseLike, injuries: Injury[]): boolean {
  if (injuries.length === 0) return true;
  if (ex.movement_pattern && contraindicatedPatterns(injuries).has(ex.movement_pattern)) return false;
  if (ex.stimulus_type === 'plyometric' && avoidsImpact(injuries)) return false;
  return true;
}

/** Reads the JSON stored in profiles.injuries; ignores anything malformed. */
export function parseInjuries(value: unknown): Injury[] {
  if (!Array.isArray(value)) return [];
  const out: Injury[] = [];
  for (const v of value) {
    const part = (v as { part?: string })?.part;
    const severity = (v as { severity?: string })?.severity;
    if (INJURY_PARTS.some((p) => p.part === part) && SEVERITIES.includes(severity as Severity)) {
      if (!out.some((o) => o.part === part)) out.push({ part: part as InjuryPart, severity: severity as Severity });
    }
  }
  return out;
}

const TEXT_HINTS: { part: InjuryPart; keywords: string[] }[] = [
  { part: 'knee', keywords: ['knee'] },
  { part: 'lower_back', keywords: ['back', 'spine', 'spinal'] },
  { part: 'shoulder', keywords: ['shoulder'] },
  { part: 'wrist', keywords: ['wrist'] },
  { part: 'ankle', keywords: ['ankle', 'foot'] },
  { part: 'hip', keywords: ['hip'] },
  { part: 'elbow', keywords: ['elbow'] },
  { part: 'neck', keywords: ['neck'] },
];

/** Old free-text injuries ("bad knees") become moderate structured ones, so existing users keep their filter. */
export function injuriesFromText(text: string | null | undefined): Injury[] {
  if (!text?.trim()) return [];
  const lowered = text.toLowerCase();
  return TEXT_HINTS.filter((h) => h.keywords.some((k) => lowered.includes(k))).map((h) => ({ part: h.part, severity: 'moderate' as Severity }));
}
