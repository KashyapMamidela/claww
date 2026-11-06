import { describe, expect, it } from 'vitest';
import type { PenMark } from './engine';
import { changeLine, letterChanges, letterFileName, letterNumbers } from './letter';

const mark = (over: Partial<PenMark>): PenMark => ({
  id: 'm', area: 'workout', kind: 'change_number', target: { key: 'x', field: 'weight', exercise: 'Bench press' }, oldValue: '60', newValue: '62.5', note: 'n', reason: 'r', evidence: null, status: 'active', createdAt: '2026-11-04T10:00:00Z', decidedAt: null, ...over,
} as PenMark);

describe('the Sunday letter', () => {
  it('has three numbers, and leaves out one with no data', () => {
    const full = letterNumbers({ sessionsDone: 4, sessionsPlanned: 4, proteinDays: 5, mealDays: 7, climbs: 2 });
    expect(full).toEqual([
      { value: '4 of 4', label: 'sessions done' },
      { value: '5', label: 'days protein was hit' },
      { value: '2', label: 'things climbed' },
    ]);
    const noMeals = letterNumbers({ sessionsDone: 1, sessionsPlanned: 3, proteinDays: 0, mealDays: 0, climbs: 1 });
    expect(noMeals.map((n) => n.label)).toEqual(['sessions done', 'thing climbed']);
  });
  it('writes a change as a short line', () => {
    expect(changeLine(mark({}))).toBe('Bench press: 60 to 62.5');
    expect(changeLine(mark({ target: { key: 'calories', field: 'calories' } as PenMark['target'], oldValue: '2400', newValue: '2300' }))).toBe('Calories: 2400 to 2300');
  });
  it('lists climbs first, skips undone and holds, and stops at the limit', () => {
    const marks = [
      mark({ id: 'a', target: { key: 'c', field: 'calories' } as PenMark['target'], oldValue: '2400', newValue: '2300' }),
      mark({ id: 'b', status: 'undone' }),
      mark({ id: 'c', kind: 'hold', oldValue: null, newValue: 'hold' }),
      mark({ id: 'd' }),
    ];
    expect(letterChanges(marks, 3)).toEqual(['Bench press: 60 to 62.5', 'Calories: 2400 to 2300']);
    expect(letterChanges(marks, 1)).toHaveLength(1);
  });
  it('names the file by date', () => {
    expect(letterFileName(new Date(2026, 10, 8))).toBe('claww-week-2026-11-08.png');
  });
});
