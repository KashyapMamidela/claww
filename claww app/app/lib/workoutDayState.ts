// Pure helpers for the Workouts tab's per-day states and the completed-day
// summary. Dependency-free (no Supabase/React Native import) so Vitest can
// run them directly; data.ts does the querying and passes rows in.

export type DayEventStatus = 'completed' | 'skipped';

export interface DayEventLike {
  dayLabel: string;
  status: DayEventStatus;
  /** ISO timestamp of the event. */
  createdAt: string;
}

export type DayState = 'completed' | 'skipped' | 'suggested' | 'upcoming';

export interface DayStateResult<E extends DayEventLike> {
  state: DayState;
  /** The most recent event for this day, if any — even for the suggested day. */
  event: E | null;
}

/** Most recent event for a plan day. `eventsDesc` must be newest first,
 * which is how getWorkoutDayEvents returns them. */
export function latestEventForDay<E extends DayEventLike>(dayLabel: string, eventsDesc: E[]): E | null {
  return eventsDesc.find((e) => e.dayLabel === dayLabel) ?? null;
}

/**
 * One state per plan day. A plan's days repeat, so after a full cycle the
 * suggested day is one that was already completed once. The suggested day
 * therefore always reads as "suggested" (startable) regardless of its last
 * event — otherwise a repeating split would hide Begin Workout on the very
 * day it's asking the user to do. Every other day takes its state from its
 * most recent event, or "upcoming" with none.
 */
export function computeDayStates<E extends DayEventLike>(
  dayLabels: string[],
  eventsDesc: E[],
  suggestedIndex: number
): DayStateResult<E>[] {
  return dayLabels.map((label, i) => {
    const event = latestEventForDay(label, eventsDesc);
    if (i === suggestedIndex) return { state: 'suggested', event };
    if (event) return { state: event.status, event };
    return { state: 'upcoming', event: null };
  });
}

export interface LoggedSetRow {
  exercise_name: string;
  sets: number | null; // the set NUMBER within the exercise, not a count (see schema.sql)
  reps_achieved: number | null;
  reps_prescribed: number | null;
  weight_achieved: number | null;
  weight_prescribed: number | null;
  completed_at: string;
}

export interface SessionExerciseSummary {
  name: string;
  sets: { setNumber: number | null; reps: number; weight: number }[];
}

export interface SessionSummary {
  /** First logged set of the session. */
  startedAt: string | null;
  /** Last logged set of the session. */
  endedAt: string | null;
  /** Minutes from the first to the last logged set; null with fewer than 2 sets, since one set has no measurable span. */
  durationMinutes: number | null;
  setsDone: number;
  totalVolumeKg: number;
  exercises: SessionExerciseSummary[];
}

/**
 * Summarizes the sets logged for one completed day. Uses achieved values
 * where logged, prescribed otherwise — the same convention as
 * getTotalVolume. Exercises keep the order they were first logged in.
 */
export function summarizeSession(rows: LoggedSetRow[]): SessionSummary {
  const sorted = [...rows].sort((a, b) => new Date(a.completed_at).getTime() - new Date(b.completed_at).getTime());
  const byExercise = new Map<string, SessionExerciseSummary>();
  let totalVolumeKg = 0;

  for (const row of sorted) {
    const reps = row.reps_achieved ?? row.reps_prescribed ?? 0;
    const weight = row.weight_achieved ?? row.weight_prescribed ?? 0;
    totalVolumeKg += reps * weight;
    const entry = byExercise.get(row.exercise_name) ?? { name: row.exercise_name, sets: [] };
    entry.sets.push({ setNumber: row.sets, reps, weight });
    byExercise.set(row.exercise_name, entry);
  }

  const startedAt = sorted[0]?.completed_at ?? null;
  const endedAt = sorted[sorted.length - 1]?.completed_at ?? null;
  const durationMinutes =
    sorted.length >= 2 && startedAt && endedAt
      ? Math.round((new Date(endedAt).getTime() - new Date(startedAt).getTime()) / 60000)
      : null;

  return {
    startedAt,
    endedAt,
    durationMinutes,
    setsDone: sorted.length,
    totalVolumeKg,
    exercises: [...byExercise.values()],
  };
}
