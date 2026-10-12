// The History tab of the exercise guide (V2 PHASE 8): the user's last sessions
// of one exercise, grouped by local calendar day. Pure; adaptiveData.ts does
// the querying.

export interface HistoryRow {
  /** Set number within the exercise (workout_logs.sets). */
  sets: number | null;
  reps_achieved: number | null;
  reps_prescribed: number | null;
  weight_achieved: number | null;
  weight_prescribed: number | null;
  completed_at: string;
}

export interface HistorySet {
  setNumber: number | null;
  reps: number;
  weight: number;
}

export interface HistorySession {
  /** Local calendar day, YYYY-MM-DD. */
  day: string;
  /** Time of the first logged set. */
  startedAt: string;
  sets: HistorySet[];
  topWeight: number;
  totalReps: number;
  volumeKg: number;
}

function dayKey(iso: string): string {
  const d = new Date(iso);
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${d.getFullYear()}-${m}-${day}`;
}

/** Newest session first, at most `limit` sessions. Achieved values win; prescribed ones fill gaps. */
export function groupSessions(rows: HistoryRow[], limit = 5): HistorySession[] {
  const byDay = new Map<string, HistoryRow[]>();
  for (const r of rows) {
    const k = dayKey(r.completed_at);
    const list = byDay.get(k) ?? [];
    list.push(r);
    byDay.set(k, list);
  }
  const sessions: HistorySession[] = [];
  for (const [day, list] of byDay) {
    list.sort((a, b) => (a.sets ?? 0) - (b.sets ?? 0) || new Date(a.completed_at).getTime() - new Date(b.completed_at).getTime());
    const sets: HistorySet[] = list.map((r) => ({
      setNumber: r.sets,
      reps: r.reps_achieved ?? r.reps_prescribed ?? 0,
      weight: r.weight_achieved ?? r.weight_prescribed ?? 0,
    }));
    const earliest = list.reduce((a, b) => (new Date(a.completed_at) <= new Date(b.completed_at) ? a : b));
    sessions.push({
      day,
      startedAt: earliest.completed_at,
      sets,
      topWeight: sets.reduce((m, s) => Math.max(m, s.weight), 0),
      totalReps: sets.reduce((n, s) => n + s.reps, 0),
      volumeKg: sets.reduce((n, s) => n + s.reps * s.weight, 0),
    });
  }
  return sessions.sort((a, b) => b.day.localeCompare(a.day)).slice(0, limit);
}

/** "8 x 60, 8 x 60, 7 x 60" or "12, 10, 9" for bodyweight sets. */
export function formatSets(sets: HistorySet[]): string {
  return sets.map((s) => (s.weight > 0 ? `${s.reps} × ${Math.round(s.weight * 100) / 100}` : `${s.reps}`)).join(', ');
}
