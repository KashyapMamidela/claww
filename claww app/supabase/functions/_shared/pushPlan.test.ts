import { describe, expect, it } from 'vitest';
import {
  DEFAULT_REMINDER_SETTINGS,
  EVENING_HOUR,
  MORNING_HOUR,
  decidePush,
  localDayStartUtc,
  localParts,
  localRemindersToday,
  normalizeReminderSettings,
  previousDate,
  streakThroughYesterday,
  type PushUserState,
} from './pushPlan';

const base: PushUserState = {
  notificationsEnabled: true,
  settings: DEFAULT_REMINDER_SETTINGS,
  localHour: MORNING_HOUR,
  hasPlan: true,
  trainedYesterday: false,
  skippedYesterday: false,
  trainedInPriorWeek: true,
  streakThroughYesterday: 3,
  loggedAnythingToday: false,
  localRemindersToday: 0,
  sentToday: [],
};

describe('decidePush — missed workout (morning)', () => {
  it('nudges an engaged user who missed yesterday', () => {
    expect(decidePush(base)?.kind).toBe('missed_workout');
  });

  it('stays quiet if they trained, chose to skip, aren’t engaged, or have no plan', () => {
    expect(decidePush({ ...base, trainedYesterday: true })).toBeNull();
    expect(decidePush({ ...base, skippedYesterday: true })).toBeNull();
    expect(decidePush({ ...base, trainedInPriorWeek: false })).toBeNull();
    expect(decidePush({ ...base, hasPlan: false })).toBeNull();
  });

  it('respects the workout switch and the master switch', () => {
    expect(decidePush({ ...base, settings: { ...DEFAULT_REMINDER_SETTINGS, workout: { enabled: false, hour: 18, minute: 0 } } })).toBeNull();
    expect(decidePush({ ...base, notificationsEnabled: false })).toBeNull();
  });

  it('never sends the same kind twice a day', () => {
    expect(decidePush({ ...base, sentToday: ['missed_workout'] })).toBeNull();
  });
});

describe('decidePush — streak (evening)', () => {
  const evening = { ...base, localHour: EVENING_HOUR };

  it('nudges a streak of 2+ with nothing logged today', () => {
    const msg = decidePush(evening);
    expect(msg?.kind).toBe('streak');
    expect(msg?.title).toContain('3-day');
  });

  it('stays quiet for short streaks or once something is logged', () => {
    expect(decidePush({ ...evening, streakThroughYesterday: 1 })).toBeNull();
    expect(decidePush({ ...evening, loggedAnythingToday: true })).toBeNull();
  });

  it('stays quiet when every reminder type is off', () => {
    const allOff = normalizeReminderSettings({ workout: { enabled: false }, meals: { enabled: false }, sleep: { enabled: false }, water: { enabled: false } });
    expect(decidePush({ ...evening, settings: allOff })).toBeNull();
  });
});

describe('decidePush — timing and cap', () => {
  it('only sends at the morning or evening hour', () => {
    expect(decidePush({ ...base, localHour: 10 })).toBeNull();
    expect(decidePush({ ...base, localHour: 3 })).toBeNull();
  });

  it('counts local reminders toward the 2-a-day cap', () => {
    expect(decidePush({ ...base, localRemindersToday: 1 })?.kind).toBe('missed_workout');
    expect(decidePush({ ...base, localRemindersToday: 2 })).toBeNull();
    expect(decidePush({ ...base, localHour: EVENING_HOUR, localRemindersToday: 1, sentToday: ['missed_workout'] })).toBeNull();
  });
});

describe('localRemindersToday', () => {
  const none = { sessionEventAt: null, mealLoggedAt: {}, sleepLoggedAt: null, waterTargetReachedAt: null };

  it('counts enabled reminders that weren’t pre-empted, capped at 2', () => {
    expect(localRemindersToday(DEFAULT_REMINDER_SETTINGS, none)).toBe(2);
  });

  it('does not count a reminder whose thing was done before its time', () => {
    // sleep logged 07:00 (< 08:30) and lunch logged 12:00 (< 13:30): only the workout reminder fires.
    expect(localRemindersToday(DEFAULT_REMINDER_SETTINGS, { ...none, sleepLoggedAt: 7 * 60, mealLoggedAt: { Lunch: 12 * 60 } })).toBe(1);
  });

  it('still counts a reminder whose thing was done after it fired', () => {
    expect(localRemindersToday(DEFAULT_REMINDER_SETTINGS, { ...none, sleepLoggedAt: 10 * 60, mealLoggedAt: { Lunch: 12 * 60 }, sessionEventAt: 7 * 60 })).toBe(1);
  });
});

describe('local day helpers', () => {
  it('finds local midnight in UTC for a zone ahead of UTC', () => {
    const now = new Date('2026-10-11T03:45:00Z'); // 09:15 IST on the 11th
    expect(localDayStartUtc('Asia/Kolkata', now).toISOString()).toBe('2026-10-10T18:30:00.000Z');
    expect(localDayStartUtc('Asia/Kolkata', now, -1).toISOString()).toBe('2026-10-09T18:30:00.000Z');
  });

  it('works across the date line from UTC (late evening UTC is next day in IST)', () => {
    const now = new Date('2026-10-11T20:00:00Z'); // 01:30 IST on the 12th
    expect(localDayStartUtc('Asia/Kolkata', now).toISOString()).toBe('2026-10-11T18:30:00.000Z');
  });

  it('steps dates back across month ends', () => {
    expect(previousDate('2026-11-01')).toBe('2026-10-31');
    expect(previousDate('2026-03-01', 2)).toBe('2026-02-27');
  });

  it('counts the streak ending yesterday', () => {
    const active = new Set(['2026-10-10', '2026-10-09', '2026-10-08', '2026-10-06']);
    expect(streakThroughYesterday(active, '2026-10-11')).toBe(3);
    expect(streakThroughYesterday(active, '2026-10-12')).toBe(0);
  });
});

describe('localParts', () => {
  it('converts to the user’s local date and hour', () => {
    const instant = new Date('2026-10-11T03:45:00Z'); // 09:15 IST
    expect(localParts('Asia/Kolkata', instant)).toEqual({ date: '2026-10-11', hour: 9, minutes: 9 * 60 + 15 });
  });

  it('falls back to UTC for a missing or bad zone', () => {
    const instant = new Date('2026-10-11T23:30:00Z');
    expect(localParts(null, instant).hour).toBe(23);
    expect(localParts('Not/AZone', instant).date).toBe('2026-10-11');
  });
});
