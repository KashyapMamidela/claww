import { describe, it, expect } from 'vitest';
import { EMPTY_SNAPSHOT, sameSnapshot, widgetLines, type WidgetSnapshot } from './widgetSnapshot';
import { ringsSvg } from './widgetSvg';

const day: WidgetSnapshot = { ...EMPTY_SNAPSHOT, userId: 'u', kcal: 609, kcalTarget: 2461, proteinLeft: 107.4, session: 'Push', streak: 1, workoutPct: 0, nutritionPct: 25, recoveryPct: 78, dailyPct: 34, steps: 1851, stepsGoal: 8000, waterMl: 750, waterGoalMl: 2000, updatedAt: 1 };

describe('widget lines', () => {
  it('reads a normal day', () => {
    const l = widgetLines(day);
    expect(l.kcal).toBe('609 / 2,461 kcal');
    expect(l.protein).toBe('107 g protein left');
    expect(l.steps).toBe('1,851 / 8,000 steps');
    expect(l.session).toBe('Push today');
    expect(l.streak).toBe('1 day streak');
    expect(l.daily).toBe('34%');
    expect(l.water).toBe('0.75');
    expect(l.waterOf).toBe('of 2 L');
    expect(l.glasses).toBe('3 of 8 glasses');
    expect(l.waterPct).toBeCloseTo(0.375, 3);
  });
  it('says done, rest and no target in plain words', () => {
    const l = widgetLines({ ...EMPTY_SNAPSHOT, session: 'Pull', sessionDone: true, proteinLeft: 0, streak: 5 });
    expect(l.session).toBe('Pull · done');
    expect(l.protein).toBe('Protein done');
    expect(l.streak).toBe('5 day streak');
    expect(widgetLines(EMPTY_SNAPSHOT).session).toBe('Rest day');
    expect(widgetLines(EMPTY_SNAPSHOT).protein).toContain('targets');
    expect(widgetLines(EMPTY_SNAPSHOT).kcal).toBe('0 kcal');
  });
  it('caps water and the daily number', () => {
    expect(widgetLines({ ...day, waterMl: 5000 }).waterPct).toBe(1);
    expect(widgetLines({ ...day, dailyPct: 140 }).daily).toBe('100%');
  });
  it('treats rounding-only changes as the same', () => {
    expect(sameSnapshot(day, { ...day, kcal: 609.4, proteinLeft: 106.8, updatedAt: 99 })).toBe(true);
    expect(sameSnapshot(day, { ...day, waterMl: 1000 })).toBe(false);
    expect(sameSnapshot(day, { ...day, steps: 2000 })).toBe(false);
  });
});

describe('rings svg', () => {
  it('draws a track per ring and a bar only when there is progress', () => {
    const svg = ringsSvg([{ pct: 50, color: '#3B82F6' }, { pct: 0, color: '#22C55E' }, { pct: 100, color: '#2DD4BF' }]);
    expect((svg.match(/stroke="#26262B"/g) ?? []).length).toBe(3);
    expect(svg).toContain('stroke="#3B82F6"');
    expect(svg).not.toContain('stroke="#22C55E"');
    expect(svg).toContain('stroke="#2DD4BF"');
    expect(svg).toContain('rotate(-90 50 50)');
  });
  it('clamps bad numbers', () => {
    expect(() => ringsSvg([{ pct: NaN, color: '#fff' }, { pct: 400, color: '#000' }])).not.toThrow();
  });
});
