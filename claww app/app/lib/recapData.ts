// NG PHASE 12: pure reductions of past sets into the recap numbers (kept apart from the Supabase file so Vitest can run them).

import type { PastSet } from './adaptiveData';
import type { BestRecord } from './sessionRecap';

const dayKey = (iso: string) => {
  const d = new Date(iso);
  return `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
};

/** Volume of the most recent earlier session (the latest calendar day with sets), or null with no history. */
export function previousVolume(past: PastSet[]): number | null {
  if (past.length === 0) return null;
  const latest = dayKey([...past].sort((a, b) => b.completedAt.localeCompare(a.completedAt))[0].completedAt);
  const sets = past.filter((s) => dayKey(s.completedAt) === latest);
  const volume = sets.reduce((sum, s) => sum + (s.weightKg > 0 ? s.weightKg * s.reps : 0), 0);
  return volume > 0 ? Math.round(volume) : null;
}

/** Heaviest weight ever lifted per exercise and the most reps at that weight. */
export function bestRecords(past: PastSet[]): BestRecord[] {
  const byName = new Map<string, BestRecord>();
  for (const s of past) {
    if (s.weightKg <= 0) continue;
    const key = s.name.trim().toLowerCase();
    const cur = byName.get(key);
    if (!cur || s.weightKg > cur.maxWeightKg) byName.set(key, { name: s.name, maxWeightKg: s.weightKg, repsAtMax: s.reps });
    else if (s.weightKg === cur.maxWeightKg && s.reps > cur.repsAtMax) cur.repsAtMax = s.reps;
  }
  return [...byName.values()];
}
