import type { Command } from './engine';
import { commandPill } from './sessionPrescription';

// "Next time" on a completed day, drawn as Coach's Pen marks: what this session did, struck, and what the engine set
// for next time, underlined, with a short handwritten note. The reason (the engine's own sentence) shows on tap.

export interface NextTimeInput {
  exerciseName: string;
  commands: Command[];
  reason: string;
  weightKg: number | null;
  reps: number | null;
  sets: number | null;
}

export interface DoneSet {
  reps: number;
  weight: number;
}

export interface NextTimeMark {
  item: string;
  oldValue: string | null;
  newValue: string;
  note: string;
  reason: string;
}

const NOTES: Record<string, string> = {
  'Find your weight': 'find your weight next time',
  'Weight up': 'add weight next time',
  'Weight down': 'lighter next time',
  'Sets up': 'one more set next time',
  'Sets down': 'one set fewer next time',
  'Reps up': 'more reps next time',
  'Reps down': 'fewer reps next time',
  'Try harder': 'try a harder version',
  Hold: 'same plan next time',
};

function kg(n: number): string {
  return `${Number.isInteger(n) ? n : n.toFixed(1)} kg`;
}

function bySets(commands: Command[]): boolean {
  return commands.some((c) => c === 'INCREASE_SETS' || c === 'DECREASE_SETS' || c === 'REDUCE_SETS_TODAY');
}

/** One pen mark per engine decision; `done` is this session's sets for that exercise (empty if none were found). */
export function nextTimeMark(d: NextTimeInput, done: DoneSet[]): NextTimeMark | null {
  const reps = d.reps ?? 0;
  const top = done.reduce<DoneSet | null>((best, s) => (!best || s.weight > best.weight || (s.weight === best.weight && s.reps > best.reps) ? s : best), null);
  const sets = bySets(d.commands);
  let newValue: string;
  let oldValue: string | null = null;
  if (sets && d.sets) {
    newValue = `${d.sets} × ${reps}`;
    if (done.length > 0) oldValue = `${done.length} × ${top?.reps ?? reps}`;
  } else if (d.weightKg && d.weightKg > 0) {
    newValue = `${kg(d.weightKg)} × ${reps}`;
    if (top && top.weight > 0) oldValue = `${kg(top.weight)} × ${top.reps}`;
  } else if (reps > 0) {
    newValue = `${d.sets ?? done.length ?? 1} × ${reps}`;
    if (top) oldValue = `${done.length} × ${top.reps}`;
  } else {
    return null;
  }
  const label = commandPill(d.commands).label;
  // A hold keeps the plan as written: striking this session's numbers would read as a change.
  if (oldValue === newValue || label === 'Hold') oldValue = null;
  return { item: d.exerciseName, oldValue, newValue, note: NOTES[label] ?? 'next time', reason: d.reason };
}
