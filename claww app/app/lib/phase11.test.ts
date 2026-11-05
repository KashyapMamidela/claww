import { describe, expect, it } from 'vitest';
import { WEEK_REVIEW_HOUR, normalizeReminderSettings, planReminders, type TodayState } from './reminderPlan';
import { dateLine, isClimb, marksForReview, reviewLine, weekStart } from './weekReview';
import { createWithinLimits, reviewCounts, type NewMark, type PenMark } from './engine';

const state: TodayState = { sessionDoneOrSkippedToday: false, trainingWeekdays: null, todaysSession: 'Push', loggedMealTypes: [], sleepLoggedToday: true, waterMlToday: 0, waterTargetMl: 2000 };

describe('weekly review reminder', () => {
  const settings = normalizeReminderSettings({});
  // Friday 6 Nov 2026 07:00; Sunday is 8 Nov.
  const friday = new Date(2026, 10, 6, 7, 0);
  it('is scheduled Sunday at 18:00 and opens the review', () => {
    const p = planReminders(settings, state, friday, 7).filter((r) => r.routeType === 'review');
    expect(p).toHaveLength(1);
    expect(p[0].date.getDay()).toBe(0);
    expect(p[0].date.getHours()).toBe(WEEK_REVIEW_HOUR);
    expect(p[0].title).toBe('Your week, marked up');
  });
  it('counts toward the cap of 2 a day', () => {
    const all = normalizeReminderSettings({ water: { enabled: true, hour: 16, minute: 0 }, sleep: { enabled: true, hour: 9, minute: 0 }, meals: { enabled: true, hour: 8, minute: 30 } });
    const p = planReminders(all, { ...state, unansweredMeals: 2, sleepLoggedToday: false }, friday, 7);
    const sunday = p.filter((r) => r.date.getDay() === 0);
    expect(sunday.length).toBeLessThanOrEqual(2);
    expect(sunday.some((r) => r.routeType === 'review')).toBe(true);
  });
  it('can be turned off with the workout reminder, or by the state', () => {
    expect(planReminders(normalizeReminderSettings({ workout: { enabled: false } }), state, friday, 7).some((r) => r.routeType === 'review')).toBe(false);
    expect(planReminders(settings, { ...state, weekReview: false }, friday, 7).some((r) => r.routeType === 'review')).toBe(false);
  });
});

describe('week review words', () => {
  it('builds the one line from the week', () => {
    expect(reviewLine({ sessionsDone: 4, sessionsPlanned: 4, proteinDays: 5, mealDays: 7, climbs: 2 })).toBe('4 of 4 sessions, protein hit on 5 days. Next week climbs a little.');
    expect(reviewLine({ sessionsDone: 1, sessionsPlanned: 3, proteinDays: 1, mealDays: 2, climbs: 0 })).toBe('1 of 3 sessions, protein hit on 1 day. Next week holds steady.');
    expect(reviewLine({ sessionsDone: 0, sessionsPlanned: 0, proteinDays: 0, mealDays: 0, climbs: 0 })).toContain('quiet week');
  });
  it('finds Monday as the start of the week, including on a Sunday', () => {
    expect(weekStart(new Date(2026, 10, 8, 18, 0)).getDate()).toBe(2); // Sunday 8 Nov -> Monday 2 Nov
    expect(weekStart(new Date(2026, 10, 2, 0, 5)).getDate()).toBe(2);
  });
  it('labels the date and the block week', () => {
    expect(dateLine(new Date(2026, 10, 8), 3, 6)).toContain('week 3 of 6');
    expect(dateLine(new Date(2026, 10, 8), null, 6)).not.toContain('week');
  });
});

const mk = (over: Partial<NewMark>): NewMark => ({ area: 'workout', kind: 'change_number', target: { key: 'a' }, oldValue: '60', newValue: '62.5 kg', note: 'all reps clean twice', reason: 'r', evidence: null, ...over });

describe('review list', () => {
  const now = new Date('2026-11-08T18:00:00');
  const made = (list: NewMark[], at: string) => createWithinLimits([], list, at, (() => { let i = 0; return () => `id${++i}`; })()).created;
  it('lists the last 7 days, workouts first, and leaves out expired marks', () => {
    const recent = made([mk({ target: { key: 'ex:bench' } }), mk({ area: 'nutrition', kind: 'swap_item', target: { key: 'meal:x' }, oldValue: 'Rajma', newValue: 'Soya pulao' })], '2026-11-06T09:00:00');
    const old = made([mk({ target: { key: 'ex:old' } })], '2026-10-20T09:00:00');
    const expired: PenMark = { ...recent[0], id: 'e', status: 'expired' };
    const out = marksForReview([...recent.slice().reverse(), ...old, expired], now);
    expect(out.map((m) => m.area)).toEqual(['workout', 'nutrition']);
    expect(out).toHaveLength(2);
  });
  it('counts kept and undone, and knows a climb from a drop', () => {
    const [a, b, c] = made([mk({ target: { key: 'a' } }), mk({ target: { key: 'b' } }), mk({ target: { key: 'c' } })], '2026-11-06T09:00:00');
    expect(reviewCounts([{ ...a, status: 'kept' }, { ...b, status: 'undone' }, c])).toEqual({ kept: 1, undone: 1, active: 1 });
    expect(isClimb(a)).toBe(true);
    expect(isClimb({ ...a, oldValue: '62.5', newValue: '60 kg' })).toBe(false);
    expect(isClimb({ ...a, kind: 'hold', oldValue: null })).toBe(false);
  });
});
