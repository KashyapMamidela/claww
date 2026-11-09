import { describe, it, expect } from 'vitest';
import { EMPTY_SNAPSHOT, activityView, dayKey, forToday, nutritionView, sameSnapshot, sizeClass, staleLabel, waterView, type WidgetSnapshot } from './widgetSnapshot';
import { ringsSvg } from './widgetSvg';

const NOW = new Date(2026, 10, 9, 13, 47);
const day: WidgetSnapshot = {
  ...EMPTY_SNAPSHOT,
  userId: 'u',
  day: dayKey(NOW),
  kcal: 609,
  kcalTarget: 2461,
  protein: 15,
  proteinTarget: 122,
  carbs: 100,
  carbsTarget: 340,
  fat: 16,
  fatTarget: 68,
  mealsLogged: 2,
  nextMeal: { slot: 'Lunch', name: 'Soya chunks curry' },
  session: 'Push',
  sessionTime: '6 pm',
  streak: 1,
  nutritionPct: 25,
  recoveryPct: 78,
  recoveryScore: 78,
  dailyPct: 34,
  steps: 1851,
  stepsGoal: 10000,
  waterMl: 750,
  updatedAt: NOW.getTime(),
};

describe('activity view', () => {
  it('reads like Home', () => {
    const v = activityView(day);
    expect(v.daily).toBe('34%');
    expect(v.rows.map((r) => r.value)).toEqual(['Push · 6 pm', '609 / 2,461 kcal', '78 / 100']);
    expect(v.steps).toBe('1,851');
    expect(v.stepsGoal).toBe('10,000');
    expect(v.stepsPct).toBeCloseTo(0.1851, 4);
  });
  it('says rest day, done and missing sleep in words', () => {
    expect(activityView({ ...day, session: null }).rows[0].value).toBe('Rest day');
    expect(activityView({ ...day, sessionDone: true }).rows[0].value).toBe('Push done');
    expect(activityView({ ...day, recoveryScore: null }).rows[2].value).toBe('Log your sleep');
    expect(activityView({ ...day, userId: null }).signedOut).toBe(true);
  });
});

describe('nutrition view', () => {
  it('leads with calories left and the three macros', () => {
    const v = nutritionView(day);
    expect(v.hero).toBe('1,852');
    expect(v.heroLabel).toBe('kcal left');
    expect(v.over).toBe(false);
    expect(v.macros.map((m) => m.value)).toEqual(['15 / 122 g', '100 / 340 g', '16 / 68 g']);
    expect(v.next).toBe('Lunch · Soya chunks curry');
    expect(v.meals).toBe('2 meals logged');
  });
  it('says over when past the target, and eaten without one', () => {
    const over = nutritionView({ ...day, kcal: 2600 });
    expect(over.hero).toBe('139');
    expect(over.heroLabel).toBe('kcal over');
    expect(over.over).toBe(true);
    expect(over.ringPct).toBe(1);
    const none = nutritionView({ ...day, kcalTarget: null, proteinTarget: null });
    expect(none.heroLabel).toBe('kcal eaten');
    expect(none.macros[0].value).toBe('15 g');
  });
});

describe('water view', () => {
  it('counts glasses and what is left', () => {
    const v = waterView(day);
    expect(v.amount).toBe('0.75');
    expect(v.goal).toBe('2 L');
    expect(v.glassesDone).toBe(3);
    expect(v.glassesGoal).toBe(8);
    expect(v.line).toBe('5 more glasses to go');
    expect(waterView({ ...day, waterMl: 1750 }).line).toBe('1 more glass to go');
    expect(waterView({ ...day, waterMl: 2500 }).done).toBe(true);
    expect(waterView({ ...day, waterMl: 2500 }).glassesDone).toBe(8);
  });
});

describe('a new day', () => {
  it('shows yesterday as a fresh day, keeping goals and the streak', () => {
    const tomorrow = new Date(2026, 10, 10, 7, 0);
    const s = forToday(day, tomorrow);
    expect(s.day).toBe('2026-11-10');
    expect(s.kcal).toBe(0);
    expect(s.waterMl).toBe(0);
    expect(s.steps).toBe(0);
    expect(s.session).toBe(null);
    expect(s.kcalTarget).toBe(2461);
    expect(s.streak).toBe(1);
    expect(forToday(day, NOW)).toBe(day);
  });
  it('says when the numbers are old', () => {
    expect(staleLabel(day, NOW)).toBe(null);
    expect(staleLabel(day, new Date(NOW.getTime() + 4 * 3_600_000))).toBe('4h ago');
    expect(staleLabel(day, new Date(NOW.getTime() + 30 * 3_600_000))).toBe('Open to refresh');
  });
});

describe('sizes and change detection', () => {
  it('picks a layout from the size', () => {
    expect(sizeClass(160, 160)).toBe('small');
    expect(sizeClass(330, 180)).toBe('medium');
    expect(sizeClass(330, 300)).toBe('large');
  });
  it('treats rounding-only changes as the same', () => {
    expect(sameSnapshot(day, { ...day, kcal: 609.4, updatedAt: 99 })).toBe(true);
    expect(sameSnapshot(day, { ...day, waterMl: 1000 })).toBe(false);
    expect(sameSnapshot(day, { ...day, nextMeal: { slot: 'Dinner', name: null } })).toBe(false);
  });
});

describe('rings svg', () => {
  it('draws a track per ring and a bar only when there is progress', () => {
    const svg = ringsSvg([{ pct: 50, color: '#3B82F6' }, { pct: 0, color: '#22C55E' }, { pct: 100, color: '#2DD4BF' }]);
    // a dimmed track in every ring's own colour, plus a bar where there is progress
    expect((svg.match(/stroke="#3B82F6"/g) ?? []).length).toBe(2);
    expect((svg.match(/stroke="#22C55E"/g) ?? []).length).toBe(1);
    expect(svg).toContain('stroke="#2DD4BF"');
    expect(svg).toContain('rotate(-90 50 50)');
  });
  it('clamps bad numbers', () => {
    expect(() => ringsSvg([{ pct: NaN, color: '#fff' }, { pct: 400, color: '#000' }])).not.toThrow();
  });
});
