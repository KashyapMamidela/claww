import { describe, expect, it } from 'vitest';
import { freezeCandidate, type StreakDayStatus, type StreakGridDay } from './planStreak';

const grid = (statuses: StreakDayStatus[], start = '2026-11-01'): StreakGridDay[] =>
  statuses.map((status, i) => {
    const d = new Date(`${start}T12:00:00`);
    d.setDate(d.getDate() + i);
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    return { date: d, key, status, counts: status === 'done' || status === 'rest' };
  });

describe('freezeCandidate', () => {
  it('offers the latest miss when followed days come before it', () => {
    const g = grid(['done', 'rest', 'done', 'missed', 'today']);
    expect(freezeCandidate(g, [])?.key).toBe(g[3].key);
  });
  it('offers nothing when the misses run back to back (no streak to save)', () => {
    expect(freezeCandidate(grid(['missed', 'missed', 'missed', 'missed', 'today']), [])).toBeNull();
  });
  it('offers nothing with no misses', () => {
    expect(freezeCandidate(grid(['done', 'rest', 'done', 'today']), [])).toBeNull();
  });
  it('offers nothing once the week has used its freeze', () => {
    const g = grid(['done', 'rest', 'done', 'missed', 'today']);
    expect(freezeCandidate(g, [g[3].key])).toBeNull();
  });
  it('offers nothing for a miss older than a week', () => {
    expect(freezeCandidate(grid(['done', 'missed', 'done', 'done', 'done', 'done', 'done', 'done', 'done', 'today']), [])).toBeNull();
  });
});
