// NG PHASE 12: "marks" are where today's numbers differ from the plan's, drawn with the Coach's Pen on Home
// ("Marked on your plan today") and in the Workouts exercise list. Pure; fed by prescribeDay's output.

import type { PrescribedExercise } from './sessionPrescription';

export interface PlanMark {
  name: string;
  kind: 'weight' | 'sets' | 'reps';
  /** Struck-through old value, e.g. "62.5" or "3 sets". */
  oldText: string;
  /** The new value in bold, e.g. "60 kg" or "4 sets". */
  newText: string;
  /** Handwritten note, 42 characters at most, lower case. */
  note: string;
  direction: 'up' | 'down';
}

const NOTE_MAX = 42;

/** The engine's reason is a sentence; the pen note is its first clause, lower case, at most 42 characters. */
export function shortNote(reason: string): string {
  const first = reason.split(/[.;,]/)[0].trim();
  if (!first) return '';
  const lowered = first.charAt(0).toLowerCase() + first.slice(1);
  if (lowered.length <= NOTE_MAX) return lowered;
  const cut = lowered.slice(0, NOTE_MAX);
  const space = cut.lastIndexOf(' ');
  return (space > 12 ? cut.slice(0, space) : cut).trim();
}

const kgText = (n: number) => `${Math.round(n * 100) / 100}`;

export function marksFor(prescribed: PrescribedExercise[]): PlanMark[] {
  const marks: PlanMark[] = [];
  for (const p of prescribed) {
    if (!p.managed || p.isNew) continue;
    const plan = p.state.next;
    const today = p.prescription;
    const note = shortNote(today.reason);
    if (plan.weightKg !== null && today.weightKg !== null && Math.abs(plan.weightKg - today.weightKg) > 0.001) {
      marks.push({ name: p.name, kind: 'weight', oldText: kgText(plan.weightKg), newText: `${kgText(today.weightKg)} kg`, note, direction: today.weightKg > plan.weightKg ? 'up' : 'down' });
    } else if (today.sets !== plan.sets) {
      marks.push({ name: p.name, kind: 'sets', oldText: `${plan.sets} sets`, newText: `${today.sets} sets`, note, direction: today.sets > plan.sets ? 'up' : 'down' });
    } else if (today.reps !== plan.repTarget) {
      marks.push({ name: p.name, kind: 'reps', oldText: `${plan.repTarget}`, newText: `${today.reps} reps`, note, direction: today.reps > plan.repTarget ? 'up' : 'down' });
    }
  }
  return marks;
}
