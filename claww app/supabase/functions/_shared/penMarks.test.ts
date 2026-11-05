import { describe, expect, it } from 'vitest';
import { MAX_NEW_MARKS_PER_DAY, canCreate, createWithinLimits, decide, expireMarks, reviewCounts, undoPatch, activeFor, type NewMark, type PenMark } from './penMarks';
import { readTrends, type TrendInput, type Finding } from './trendReader';
import { CALORIE_FLOOR, applyRules, calorieStep, isAllowed, type RuleContext } from './penRules';
import { NOTE_MAX, chooseNote, validateReworded, wordsFor } from './penNotes';

const NOW = '2026-11-05T09:00:00';
let n = 0;
const id = () => `m${++n}`;

const cand = (key: string, over: Partial<NewMark> = {}): NewMark => ({
  area: 'nutrition',
  kind: 'swap_item',
  target: { key, field: 'meal', planDate: '2026-11-06', restore: { templateId: 'old' } },
  oldValue: 'Rajma',
  newValue: 'Soya pulao',
  note: 'rajma two days in a row',
  reason: 'Rajma was planned two days running.',
  evidence: null,
  ...over,
});

describe('limits', () => {
  it('allows at most 3 new marks a day and 1 per item', () => {
    const { created, refused } = createWithinLimits([], [cand('a'), cand('a'), cand('b'), cand('c'), cand('d')], NOW, id);
    expect(created.map((m) => m.target.key)).toEqual(['a', 'b', 'c']);
    expect(refused.map((r) => r.why)).toEqual(['item_has_active', 'daily_limit']);
    expect(created.length).toBe(MAX_NEW_MARKS_PER_DAY);
  });
  it('counts marks made earlier today whatever their status, but not yesterday\'s', () => {
    const old = createWithinLimits([], [cand('a'), cand('b'), cand('c')], '2026-11-04T09:00:00', id).created.map((m) => decide(m, 'kept', NOW));
    expect(canCreate(old, cand('d'), NOW)).toEqual({ ok: true });
    const today = createWithinLimits([], [cand('a'), cand('b'), cand('c')], NOW, id).created.map((m) => decide(m, 'undone', NOW));
    expect(canCreate(today, cand('d'), NOW)).toEqual({ ok: false, why: 'daily_limit' });
  });
  it('does not mark an item again on the day it was decided, and refuses long notes', () => {
    const [m] = createWithinLimits([], [cand('a')], NOW, id).created;
    expect(canCreate([decide(m, 'undone', NOW)], cand('a'), NOW)).toEqual({ ok: false, why: 'item_marked_today' });
    expect(canCreate([], cand('x', { note: 'x'.repeat(41) }), NOW)).toEqual({ ok: false, why: 'note_too_long' });
  });
});

describe('undo and expiry', () => {
  it('undo gives back the exact old value and the data to restore it', () => {
    const [m] = createWithinLimits([], [cand('meal:2026-11-06:dinner')], NOW, id).created;
    expect(undoPatch(m)).toMatchObject({ value: 'Rajma', restore: { templateId: 'old' } });
    const [c] = createWithinLimits([], [cand('calories', { kind: 'change_number', oldValue: '2150', newValue: '2250', target: { key: 'calories', restore: { calories: 2150 } } })], NOW, id).created;
    expect(undoPatch(c)?.value).toBe('2150');
  });
  it('a hold has nothing to restore', () => {
    const [h] = createWithinLimits([], [cand('week:weights', { kind: 'hold', area: 'workout', oldValue: null, newValue: 'Hold' })], NOW, id).created;
    expect(undoPatch(h)).toBeNull();
  });
  it('a decided mark does not change again', () => {
    const [m] = createWithinLimits([], [cand('a')], NOW, id).created;
    const kept = decide(m, 'kept', NOW);
    expect(decide(kept, 'undone', NOW).status).toBe('kept');
  });
  it('expires after its plan date or when the item is done, and only while active', () => {
    const marks = createWithinLimits([], [cand('a'), cand('b', { target: { key: 'b', planDate: '2026-11-05' } }), cand('c', { target: { key: 'c' } })], NOW, id).created;
    const next = expireMarks(marks, '2026-11-07', new Set(['c']), '2026-11-07T00:00:00');
    expect(next.map((m) => m.status)).toEqual(['expired', 'expired', 'expired']);
    const sameDay = expireMarks(marks, '2026-11-05', new Set(), NOW);
    expect(sameDay.map((m) => m.status)).toEqual(['active', 'active', 'active']);
    expect(expireMarks([decide(marks[0], 'kept', NOW)], '2026-12-01', new Set(), NOW)[0].status).toBe('kept');
  });
  it('lists active marks for a date and counts the review', () => {
    const marks = createWithinLimits([], [cand('a'), cand('b', { target: { key: 'b', planDate: '2026-11-07' } }), cand('c', { target: { key: 'c' } })], NOW, id).created;
    expect(activeFor(marks, '2026-11-06').map((m) => m.target.key)).toEqual(['a', 'c']);
    const decided = [decide(marks[0], 'kept', NOW), decide(marks[1], 'undone', NOW), marks[2]];
    expect(reviewCounts(decided)).toEqual({ kept: 1, undone: 1, active: 1 });
  });
});

const day = (offset: number) => {
  const d = new Date(2026, 10, 5 + offset);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};
const base: TrendInput = { today: day(0), goal: 'muscle_gain', lifts: [], meals: [], proteinTarget: 120, sleep: [], weights: [], plannedDays: [] };

describe('trend reader', () => {
  it('finds a stall: no gain in 3 sessions', () => {
    const f = readTrends({ ...base, lifts: [{ name: 'Bench press', sessions: [60, 62, 64, 64, 63, 64].map((e1rm, i) => ({ date: day(-30 + i * 5), e1rm })) }] });
    expect(f).toContainEqual({ type: 'stalled_lift', name: 'Bench press', sessions: 3, e1rm: 64 });
  });
  it('needs 4 sessions, and a gain in the last 3 is not a stall', () => {
    expect(readTrends({ ...base, lifts: [{ name: 'Squat', sessions: [60, 60, 60].map((e1rm, i) => ({ date: day(-i), e1rm })) }] })).toEqual([]);
    expect(readTrends({ ...base, lifts: [{ name: 'Squat', sessions: [60, 61, 60, 62].map((e1rm, i) => ({ date: day(-i), e1rm })) }] }).some((f) => f.type === 'stalled_lift')).toBe(false);
  });
  it('finds a progress streak', () => {
    const f = readTrends({ ...base, lifts: [{ name: 'Row', sessions: [50, 52, 54, 56].map((e1rm, i) => ({ date: day(-20 + i * 5), e1rm })) }] });
    expect(f).toContainEqual({ type: 'progress_streak', name: 'Row', count: 3, fromE1rm: 50, toE1rm: 56 });
  });
  it('finds protein misses by meal: 3 days under 70 % of the meal share', () => {
    const meals = [0, -1, -2, -3].map((o) => ({ date: day(o), slot: 'dinner' as const, protein: 20, skipped: false }));
    const f = readTrends({ ...base, meals });
    expect(f).toContainEqual({ type: 'protein_miss', slot: 'dinner', days: 4, avgG: 20, targetG: 48 });
    expect(readTrends({ ...base, meals: meals.slice(0, 2) }).some((x) => x.type === 'protein_miss')).toBe(false);
    expect(readTrends({ ...base, proteinTarget: null, meals }).some((x) => x.type === 'protein_miss')).toBe(false);
  });
  it('finds short sleep only for two consecutive nights under 6.5 h', () => {
    expect(readTrends({ ...base, sleep: [{ date: day(0), hours: 6 }, { date: day(-1), hours: 5.5 }] })).toContainEqual({ type: 'short_sleep', nights: 2, avgHours: 5.8 });
    expect(readTrends({ ...base, sleep: [{ date: day(0), hours: 6 }, { date: day(-2), hours: 5.5 }] })).toEqual([]);
    expect(readTrends({ ...base, sleep: [{ date: day(0), hours: 6.5 }, { date: day(-1), hours: 5.5 }] })).toEqual([]);
  });
  it('finds skipped meals, missed days and flat weight', () => {
    expect(readTrends({ ...base, meals: [0, -2].map((o) => ({ date: day(o), slot: 'breakfast' as const, protein: 0, skipped: true })) })).toContainEqual({ type: 'skipped_meals', slot: 'breakfast', count: 2 });
    const missed = readTrends({ ...base, plannedDays: [{ date: day(-6), weekday: 'Thursday', done: false }, { date: day(-13), weekday: 'Thursday', done: false }, { date: day(-3), weekday: 'Monday', done: true }] });
    expect(missed).toContainEqual({ type: 'missed_days', weekday: 'Thursday', count: 2, dates: [day(-13), day(-6)] });
    const flat = readTrends({ ...base, weights: [{ date: day(-21), kg: 70 }, { date: day(-14), kg: 70.1 }, { date: day(-7), kg: 69.9 }, { date: day(0), kg: 70 }] });
    expect(flat.find((f) => f.type === 'flat_weight')).toMatchObject({ goal: 'muscle_gain', weeks: 3 });
    expect(readTrends({ ...base, goal: 'maintain', weights: [{ date: day(-21), kg: 70 }, { date: day(-7), kg: 70 }, { date: day(0), kg: 70 }] })).toEqual([]);
    expect(readTrends({ ...base, weights: [{ date: day(-21), kg: 70 }, { date: day(-10), kg: 71 }, { date: day(0), kg: 72 }] })).toEqual([]);
  });
});

const ctx = (over: Partial<RuleContext> = {}): RuleContext => ({
  today: day(0),
  tomorrow: day(1),
  calorieTarget: 2150,
  lastCalorieMarkDate: null,
  enginePushing: new Set(),
  engineLowering: new Set(),
  proteinFix: { food: 'soya', text: '+ 1 katori soya chunks', proteinG: 16, kcal: 120 },
  availableFoods: new Set(['soya', 'eggs']),
  swapFor: (slot) => ({ fromId: 'old', fromName: 'Rajma rice', fromKcal: 600, toId: 'new', toName: `Light ${slot}`, toKcal: 570 }),
  freeWeekday: () => 'Saturday',
  ...over,
});

describe('rules', () => {
  const all: Finding[] = [
    { type: 'stalled_lift', name: 'Bench press', sessions: 3, e1rm: 64 },
    { type: 'short_sleep', nights: 2, avgHours: 5.8 },
    { type: 'protein_miss', slot: 'dinner', days: 4, avgG: 20, targetG: 48 },
    { type: 'skipped_meals', slot: 'breakfast', count: 3 },
    { type: 'missed_days', weekday: 'Thursday', count: 2, dates: [day(-7), day(-14)] },
    { type: 'flat_weight', weeks: 3, deltaKg: 0, kg: 70, goal: 'muscle_gain' },
  ];
  it('maps each finding to one allowed change', () => {
    const c = applyRules(all, ctx());
    expect(c.map((x) => x.kind)).toEqual(['hold', 'hold', 'add_item', 'swap_item', 'move_day', 'change_number']);
    for (const x of c) expect(isAllowed(x, ctx())).toBe(true);
    expect(c.find((x) => x.target.key === 'calories')).toMatchObject({ oldValue: '2150', newValue: '2250' });
  });
  it('fat loss lowers calories and a progress streak makes no mark', () => {
    const c = applyRules([{ type: 'flat_weight', weeks: 3, deltaKg: 0, kg: 80, goal: 'fat_loss' }, { type: 'progress_streak', name: 'Row', count: 3, fromE1rm: 50, toE1rm: 56 }], ctx());
    expect(c).toHaveLength(1);
    expect(c[0].newValue).toBe('2050');
  });
  it('never holds a lift the engine is raising', () => {
    const c = applyRules([all[0], all[1]], ctx({ enginePushing: new Set(['bench press']) }));
    expect(c).toEqual([]);
  });
  it('never adds a food the user cannot get, swaps outside 10 %, or goes under the calorie floor', () => {
    expect(applyRules([all[2]], ctx({ availableFoods: new Set(['eggs']) }))).toEqual([]);
    expect(applyRules([all[3]], ctx({ swapFor: () => ({ fromId: 'a', fromName: 'A', fromKcal: 600, toId: 'b', toName: 'B', toKcal: 450 }) }))).toEqual([]);
    expect(applyRules([{ type: 'flat_weight', weeks: 3, deltaKg: 0, kg: 60, goal: 'fat_loss' }], ctx({ calorieTarget: CALORIE_FLOOR + 30 }))).toEqual([]);
  });
  it('changes calories at most once in 14 days and by at most 5 %', () => {
    expect(applyRules([all[5]], ctx({ lastCalorieMarkDate: day(-10) }))).toEqual([]);
    expect(applyRules([all[5]], ctx({ lastCalorieMarkDate: day(-14) }))).toHaveLength(1);
    expect(calorieStep(1500)).toBe(50);
    expect(calorieStep(3000)).toBe(100);
  });
  it('property: over random histories no candidate is outside the allowed set, and every note fits', () => {
    let seed = 7;
    const rnd = () => ((seed = (seed * 1664525 + 1013904223) >>> 0) / 2 ** 32);
    for (let t = 0; t < 300; t++) {
      const slots = ['breakfast', 'lunch', 'dinner'] as const;
      const input: TrendInput = {
        today: day(0),
        goal: (['muscle_gain', 'fat_loss', 'maintain', 'other'] as const)[Math.floor(rnd() * 4)],
        proteinTarget: rnd() < 0.2 ? null : 60 + Math.floor(rnd() * 120),
        lifts: ['Bench press', 'Squat', 'Row'].map((name) => ({ name, sessions: Array.from({ length: Math.floor(rnd() * 8) }, (_, i) => ({ date: day(-28 + i * 3), e1rm: 40 + Math.floor(rnd() * 30) })) })),
        meals: Array.from({ length: Math.floor(rnd() * 25) }, () => ({ date: day(-Math.floor(rnd() * 10)), slot: slots[Math.floor(rnd() * 3)], protein: Math.floor(rnd() * 50), skipped: rnd() < 0.2 })),
        sleep: Array.from({ length: Math.floor(rnd() * 6) }, (_, i) => ({ date: day(-i), hours: 4 + rnd() * 5 })),
        weights: Array.from({ length: Math.floor(rnd() * 6) }, (_, i) => ({ date: day(-i * 6), kg: 60 + Math.floor(rnd() * 3) })),
        plannedDays: Array.from({ length: Math.floor(rnd() * 8) }, (_, i) => ({ date: day(-1 - i * 2), weekday: ['Monday', 'Tuesday', 'Thursday'][Math.floor(rnd() * 3)], done: rnd() < 0.5 })),
      };
      const c = ctx({
        calorieTarget: rnd() < 0.1 ? null : 1100 + Math.floor(rnd() * 2500),
        enginePushing: new Set(rnd() < 0.5 ? ['bench press'] : []),
        proteinFix: rnd() < 0.3 ? null : ctx().proteinFix,
        availableFoods: new Set(rnd() < 0.3 ? [] : ['soya']),
      });
      for (const cand of applyRules(readTrends(input), c)) {
        expect(isAllowed(cand, c)).toBe(true);
        expect(cand.note.length).toBeLessThanOrEqual(NOTE_MAX);
      }
    }
  });
});

describe('note wording', () => {
  it('has a template within 40 characters for every finding', () => {
    const f: Finding[] = [
      { type: 'stalled_lift', name: 'Bench press', sessions: 3, e1rm: 64 },
      { type: 'progress_streak', name: 'Row', count: 3, fromE1rm: 50, toE1rm: 56 },
      { type: 'protein_miss', slot: 'breakfast', days: 4, avgG: 12, targetG: 30 },
      { type: 'short_sleep', nights: 2, avgHours: 5.8 },
      { type: 'skipped_meals', slot: 'breakfast', count: 3 },
      { type: 'missed_days', weekday: 'Wednesday', count: 2, dates: [day(-14), day(-7)] },
      { type: 'flat_weight', weeks: 3, deltaKg: 0, kg: 70, goal: 'fat_loss' },
    ];
    for (const x of f) {
      const w = wordsFor(x);
      expect(w.note.length).toBeGreaterThan(0);
      expect(w.note.length).toBeLessThanOrEqual(NOTE_MAX);
      expect(w.reason).not.toMatch(/\bAI\b/);
    }
  });
  const finding: Finding = { type: 'protein_miss', slot: 'dinner', days: 4, avgG: 20, targetG: 48 };
  it('accepts a re-wording that keeps the numbers, rejects changed numbers, long, medical and AI notes', () => {
    expect(validateReworded('dinner short on protein 4 days', wordsFor(finding), finding)).toEqual({ ok: true, note: 'dinner short on protein 4 days' });
    expect(validateReworded('dinner protein low 5 days', wordsFor(finding), finding)).toMatchObject({ ok: false, why: 'changed_number' });
    expect(validateReworded('x'.repeat(41), wordsFor(finding), finding)).toMatchObject({ ok: false, why: 'too_long' });
    expect(validateReworded('this helps your condition', wordsFor(finding), finding)).toMatchObject({ ok: false, why: 'medical' });
    expect(validateReworded('our model says add protein', wordsFor(finding), finding)).toMatchObject({ ok: false, why: 'mentions_ai' });
    expect(validateReworded('  ', wordsFor(finding), finding)).toMatchObject({ ok: false, why: 'empty' });
  });
  it('falls back to the template on any failure', () => {
    expect(chooseNote(finding, 'dinner protein low 9 days').note).toBe(wordsFor(finding).note);
    expect(chooseNote(finding, null).note).toBe(wordsFor(finding).note);
  });
});
