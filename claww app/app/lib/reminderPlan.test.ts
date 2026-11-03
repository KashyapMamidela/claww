import { describe, expect, it } from 'vitest';
import {
  DEFAULT_REMINDER_SETTINGS,
  MAX_REMINDERS_PER_DAY,
  mealForHour,
  normalizeReminderSettings,
  planReminders,
  type ReminderSettings,
  type TodayState,
} from './reminderPlan';

const fresh: TodayState = {
  sessionDoneOrSkippedToday: false,
  todaysSession: 'Push',
  loggedMealTypes: [],
  sleepLoggedToday: false,
  waterMlToday: 500,
  waterTargetMl: 2000,
};

const allOn: ReminderSettings = {
  workout: { enabled: true, hour: 18, minute: 0 },
  meals: { enabled: true, hour: 13, minute: 30 },
  sleep: { enabled: true, hour: 8, minute: 30 },
  water: { enabled: true, hour: 16, minute: 0 },
};

// Saturday 11 Oct 2026, 07:00 local.
const morning = new Date(2026, 9, 11, 7, 0);

const todays = (plan: ReturnType<typeof planReminders>, now = morning) =>
  plan.filter((r) => r.date.toDateString() === now.toDateString());

describe('planReminders', () => {
  it('never schedules more than 2 a day, keeping the highest-priority ones in time order', () => {
    const plan = planReminders(allOn, fresh, morning);
    const t = todays(plan);
    expect(t.map((r) => r.kind)).toEqual(['meals', 'workout']);
    for (let d = 0; d < 7; d++) {
      const day = new Date(2026, 9, 11 + d).toDateString();
      expect(plan.filter((r) => r.date.toDateString() === day).length).toBeLessThanOrEqual(MAX_REMINDERS_PER_DAY);
    }
  });

  it('covers today and the next 6 days', () => {
    const plan = planReminders(DEFAULT_REMINDER_SETTINGS, fresh, morning);
    const days = new Set(plan.map((r) => r.date.toDateString()));
    expect(days.size).toBe(7);
  });

  it('names today’s session in the workout reminder, generic on later days', () => {
    const plan = planReminders({ ...allOn, meals: { ...allOn.meals, enabled: false } }, fresh, morning);
    const [today, tomorrow] = plan.filter((r) => r.kind === 'workout');
    expect(today.title).toBe('Push day');
    expect(today.body).toContain('Push');
    expect(tomorrow.title).toBe('Time to train');
  });

  it('drops today’s workout reminder once a session is completed or skipped', () => {
    const t = todays(planReminders(allOn, { ...fresh, sessionDoneOrSkippedToday: true }, morning));
    expect(t.some((r) => r.kind === 'workout')).toBe(false);
  });

  it('drops today’s meal reminder when that meal is already logged', () => {
    const t = todays(planReminders(allOn, { ...fresh, loggedMealTypes: ['Lunch'] }, morning));
    expect(t.some((r) => r.kind === 'meals')).toBe(false);
  });

  it('drops today’s sleep reminder once last night is logged', () => {
    const settings = { ...allOn, workout: { ...allOn.workout, enabled: false }, meals: { ...allOn.meals, enabled: false } };
    expect(todays(planReminders(settings, fresh, morning)).map((r) => r.kind)).toEqual(['sleep', 'water']);
    expect(todays(planReminders(settings, { ...fresh, sleepLoggedToday: true }, morning)).map((r) => r.kind)).toEqual(['water']);
  });

  it('drops today’s water reminder at or over target', () => {
    const settings = { ...allOn, workout: { ...allOn.workout, enabled: false }, meals: { ...allOn.meals, enabled: false } };
    expect(todays(planReminders(settings, { ...fresh, waterMlToday: 2000 }, morning)).some((r) => r.kind === 'water')).toBe(false);
  });

  it('skips reminders whose time has already passed today', () => {
    const evening = new Date(2026, 9, 11, 19, 0);
    expect(todays(planReminders(allOn, fresh, evening), evening)).toEqual([]);
  });

  it('respects disabled reminders', () => {
    const none = normalizeReminderSettings({ workout: { enabled: false }, meals: { enabled: false }, sleep: { enabled: false }, water: { enabled: false } });
    expect(planReminders(none, fresh, morning)).toEqual([]);
  });

  it('gives each reminder a stable per-day id', () => {
    const t = todays(planReminders(allOn, fresh, morning));
    expect(t.map((r) => r.id)).toEqual(['claww-r-meals-2026-10-11', 'claww-r-workout-2026-10-11']);
  });
});

describe('mealForHour', () => {
  it('maps a reminder time to the meal it is about', () => {
    expect([8, 10, 11, 13, 15, 16, 20].map(mealForHour)).toEqual(['Breakfast', 'Breakfast', 'Lunch', 'Lunch', 'Lunch', 'Dinner', 'Dinner']);
  });
});

describe('normalizeReminderSettings', () => {
  it('fills missing kinds and fields with defaults and rejects bad times', () => {
    const s = normalizeReminderSettings({ workout: { enabled: false, hour: 25, minute: 10 }, water: { enabled: true } });
    expect(s.workout).toEqual({ enabled: false, hour: 18, minute: 10 });
    expect(s.water).toEqual({ enabled: true, hour: 16, minute: 0 });
    expect(s.meals).toEqual(DEFAULT_REMINDER_SETTINGS.meals);
  });

  it('returns defaults for nothing stored', () => {
    expect(normalizeReminderSettings(undefined)).toEqual(DEFAULT_REMINDER_SETTINGS);
  });
});

describe('workout reminders on training weekdays (V2 PHASE 6.1)', () => {
  // Sunday 11 Oct 2026, 07:00 local; the next 6 days are Mon 12 ... Sat 17.
  const days = (plan: { id: string }[]) => plan.filter((p) => p.id.includes('workout')).map((p) => p.id.slice(-10));
  it('only schedules the workout reminder on the plan weekdays', () => {
    const plan = planReminders(allOn, { ...fresh, trainingWeekdays: [0, 2, 4], focusByWeekday: { 0: 'Push', 2: 'Pull', 4: 'Legs' } }, morning);
    expect(days(plan)).toEqual(['2026-10-12', '2026-10-14', '2026-10-16']);
  });
  it('names the session for later days from the plan', () => {
    const plan = planReminders(allOn, { ...fresh, trainingWeekdays: [0, 2], focusByWeekday: { 0: 'Push', 2: 'Pull' } }, morning);
    const monday = plan.find((p) => p.id.endsWith('workout-2026-10-12'));
    expect(monday?.title).toBe('Push day');
  });
  it('a plan without weekdays still reminds every day', () => {
    const plan = planReminders(allOn, { ...fresh, trainingWeekdays: null }, morning);
    expect(days(plan).length).toBeGreaterThanOrEqual(6);
  });
  it("today's reminder is dropped on a rest day", () => {
    const plan = planReminders(allOn, { ...fresh, trainingWeekdays: [0] }, morning); // today is Sunday
    expect(days(plan)).not.toContain('2026-10-11');
  });
});
