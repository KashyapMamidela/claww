import { describe, expect, it } from 'vitest';
import { formatSets, groupSessions, type HistoryRow } from './exerciseHistory';

const row = (day: number, hour: number, setNo: number, reps: number | null, weight: number | null, over: Partial<HistoryRow> = {}): HistoryRow => ({
  sets: setNo,
  reps_achieved: reps,
  reps_prescribed: 8,
  weight_achieved: weight,
  weight_prescribed: 50,
  completed_at: new Date(2026, 9, day, hour, 0).toISOString(),
  ...over,
});

describe('groupSessions', () => {
  it('groups sets by local day, newest session first', () => {
    const s = groupSessions([row(5, 18, 1, 8, 60), row(9, 18, 2, 8, 62.5), row(5, 18, 2, 7, 60), row(9, 18, 1, 8, 62.5)]);
    expect(s.map((x) => x.day)).toEqual(['2026-10-09', '2026-10-05']);
    expect(s[0].sets.map((x) => x.setNumber)).toEqual([1, 2]);
  });
  it('totals the top weight, reps and volume', () => {
    const [s] = groupSessions([row(9, 18, 1, 8, 60), row(9, 18, 2, 6, 65)]);
    expect(s.topWeight).toBe(65);
    expect(s.totalReps).toBe(14);
    expect(s.volumeKg).toBe(8 * 60 + 6 * 65);
  });
  it('falls back to prescribed values when nothing was achieved', () => {
    const [s] = groupSessions([row(9, 18, 1, null, null)]);
    expect(s.sets[0]).toEqual({ setNumber: 1, reps: 8, weight: 50 });
  });
  it('keeps only the most recent sessions', () => {
    const rows = [1, 2, 3, 4, 5, 6, 7].map((d) => row(d, 18, 1, 8, 60));
    expect(groupSessions(rows)).toHaveLength(5);
    expect(groupSessions(rows, 2).map((x) => x.day)).toEqual(['2026-10-07', '2026-10-06']);
  });
  it('is empty without logs', () => {
    expect(groupSessions([])).toEqual([]);
  });
  it('records when the session started', () => {
    const [s] = groupSessions([row(9, 19, 2, 8, 60), row(9, 18, 1, 8, 60)]);
    expect(new Date(s.startedAt).getHours()).toBe(18);
  });
});

describe('formatSets', () => {
  it('writes loaded and bodyweight sets', () => {
    expect(formatSets([{ setNumber: 1, reps: 8, weight: 60 }, { setNumber: 2, reps: 7, weight: 62.5 }])).toBe('8 × 60, 7 × 62.5');
    expect(formatSets([{ setNumber: 1, reps: 12, weight: 0 }, { setNumber: 2, reps: 10, weight: 0 }])).toBe('12, 10');
  });
});
