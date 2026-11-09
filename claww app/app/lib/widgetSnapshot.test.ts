import { describe, it, expect } from 'vitest';
import { EMPTY_SNAPSHOT, sameSnapshot, widgetLines } from './widgetSnapshot';

describe('widget lines', () => {
  it('reads a normal day', () => {
    const l = widgetLines({ kcal: 609, kcalTarget: 2461, proteinLeft: 107.4, session: 'Push', sessionDone: false, streak: 1, updatedAt: 1 });
    expect(l.big).toBe('609');
    expect(l.bigUnit).toContain('2,461');
    expect(l.protein).toBe('107 g protein left');
    expect(l.session).toBe('Push today');
    expect(l.streak).toBe('1 day streak');
    expect(l.fill).toBeCloseTo(0.2475, 3);
  });
  it('says done, rest and no target in plain words', () => {
    const l = widgetLines({ ...EMPTY_SNAPSHOT, session: 'Pull', sessionDone: true, proteinLeft: 0, streak: 5 });
    expect(l.session).toBe('Pull · done');
    expect(l.protein).toBe('Protein done for today');
    expect(l.streak).toBe('5 day streak');
    expect(l.fill).toBe(0);
    expect(widgetLines(EMPTY_SNAPSHOT).session).toBe('Rest day');
    expect(widgetLines(EMPTY_SNAPSHOT).protein).toContain('targets');
  });
  it('caps the bar at full', () => {
    expect(widgetLines({ ...EMPTY_SNAPSHOT, kcal: 4000, kcalTarget: 2000 }).fill).toBe(1);
  });
  it('treats rounding-only changes as the same', () => {
    const a = { ...EMPTY_SNAPSHOT, kcal: 609.2, proteinLeft: 107.1 };
    expect(sameSnapshot(a, { ...a, kcal: 609.4, proteinLeft: 106.8, updatedAt: 99 })).toBe(true);
    expect(sameSnapshot(a, { ...a, kcal: 640 })).toBe(false);
  });
});
