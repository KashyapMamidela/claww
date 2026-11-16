import { describe, expect, it } from 'vitest';
import { lastNightSleep, sleepRingPct } from './sleepTarget';

describe('sleepRingPct', () => {
  it('is 0 when no sleep is logged', () => {
    expect(sleepRingPct(null)).toBe(0);
    expect(sleepRingPct(undefined)).toBe(0);
  });

  it('is 0 for zero or invalid hours', () => {
    expect(sleepRingPct(0)).toBe(0);
    expect(sleepRingPct(-1)).toBe(0);
    expect(sleepRingPct(Number.NaN)).toBe(0);
  });

  it('scales against the 8-hour target', () => {
    expect(sleepRingPct(4)).toBe(50);
    expect(sleepRingPct(6)).toBe(75);
    expect(sleepRingPct(8)).toBe(100);
  });

  it('caps at 100', () => {
    expect(sleepRingPct(9.5)).toBe(100);
    expect(sleepRingPct(12)).toBe(100);
  });
});

import { lastSevenNights, sleepQuality } from './sleepTarget';

describe('sleepQuality', () => {
  it('uses 7 / 6 boundaries', () => {
    expect(sleepQuality(7)).toBe('Good');
    expect(sleepQuality(6.9)).toBe('Fair');
    expect(sleepQuality(6)).toBe('Fair');
    expect(sleepQuality(5.9)).toBe('Short');
  });
});

describe('lastSevenNights', () => {
  const now = new Date(2026, 9, 12, 10, 0);
  it('places logs by local day, oldest first, null for gaps', () => {
    const r = lastSevenNights(
      [
        { hours: 7.5, logged_at: new Date(2026, 9, 12, 7, 0).toISOString() },
        { hours: 6, logged_at: new Date(2026, 9, 10, 7, 0).toISOString() },
        { hours: 5, logged_at: new Date(2026, 9, 10, 9, 0).toISOString() },
      ],
      now
    );
    expect(r).toEqual([null, null, null, null, 5, null, 7.5]);
  });
});

// Polish step 1: one definition of last night's sleep.
describe('lastNightSleep', () => {
  const at = (d: number, h: number, m = 0) => new Date(2026, 10, d, h, m).toISOString();
  const night = (hours: number, bed: string, wake: string, logged: string) => ({ hours, bedtime: bed, wake_time: wake, logged_at: logged });
  const now = new Date(2026, 10, 6, 9, 0);

  it('counts a night logged the evening before, because it woke up today', () => {
    const l = night(7, at(5, 23), at(6, 6, 30), at(5, 23, 50));
    expect(lastNightSleep([l], now)).toBe(l);
  });
  it('counts a night logged this morning', () => {
    const l = night(6.5, at(5, 23, 30), at(6, 6), at(6, 7));
    expect(lastNightSleep([l], now)).toBe(l);
  });
  it('prefers the log that woke today over an older one', () => {
    const older = night(8, at(4, 23), at(5, 7), at(5, 8));
    const today = night(5.5, at(5, 23, 30), at(6, 5), at(6, 5, 10));
    expect(lastNightSleep([older, today], now)).toBe(today);
  });
  it('falls back to the most recent wake within 18 hours (an evening check)', () => {
    const l = night(7, at(5, 23), at(6, 6), at(6, 6, 5));
    expect(lastNightSleep([l], new Date(2026, 10, 6, 23, 50))).toBe(l); // evening: woke 17 h 50 min ago, still within 18 h
  });
  it('falls back across midnight for a late nap that woke less than 18 hours ago', () => {
    const l = night(4, at(6, 19), at(6, 23), at(6, 23, 5));
    expect(lastNightSleep([l], new Date(2026, 10, 7, 8))).toBe(l);
  });
  it('returns null when the newest wake is older than 18 hours, or there is nothing', () => {
    const l = night(7, at(4, 23), at(5, 6), at(5, 7));
    expect(lastNightSleep([l], now)).toBeNull();
    expect(lastNightSleep([], now)).toBeNull();
  });
});

import { sleepWindow } from './sleepTarget';

describe('lastNightSleep: entering a night again replaces it', () => {
  it('a corrected entry with an earlier wake time wins over the one it corrects', () => {
    const now = new Date(2026, 10, 14, 15, 4);
    const old = { hours: 10, wake_time: new Date(2026, 10, 14, 9, 30).toISOString(), logged_at: new Date(2026, 10, 14, 15, 1).toISOString() };
    const fixed = { hours: 6.5, wake_time: new Date(2026, 10, 14, 7, 0).toISOString(), logged_at: new Date(2026, 10, 14, 15, 4).toISOString() };
    expect(lastNightSleep([old, fixed], now)).toBe(fixed);
    expect(lastNightSleep([fixed, old], now)).toBe(fixed);
  });
});

describe('sleepWindow: different timings', () => {
  const t = (hour: number, minute: number, period: 'AM' | 'PM') => ({ hour, minute, period });
  const hm = (d: Date) => `${d.getDate()} ${d.getHours()}:${String(d.getMinutes()).padStart(2, '0')}`;
  const at = (h: number, m = 0, day = 14) => new Date(2026, 10, day, h, m);

  it('after midnight: 12:30 AM to 7:00 AM is 6.5 h, both on today', () => {
    const w = sleepWindow(t(12, 30, 'AM'), t(7, 0, 'AM'), at(15, 4));
    expect(w.hours).toBe(6.5);
    expect(hm(w.bedtime)).toBe('14 0:30');
    expect(hm(w.wakeTime)).toBe('14 7:00');
  });
  it('before midnight: 10:30 PM to 6:00 AM is 7.5 h, bed on the day before', () => {
    const w = sleepWindow(t(10, 30, 'PM'), t(6, 0, 'AM'), at(8));
    expect(w.hours).toBe(7.5);
    expect(hm(w.bedtime)).toBe('13 22:30');
  });
  it('late: 2:00 AM to 10:00 AM is 8 h', () => {
    expect(sleepWindow(t(2, 0, 'AM'), t(10, 0, 'AM'), at(15)).hours).toBe(8);
  });
  it('across midnight by minutes: 11:55 PM to 12:05 AM is 10 minutes', () => {
    expect(sleepWindow(t(11, 55, 'PM'), t(12, 5, 'AM'), at(8)).hours).toBeCloseTo(10 / 60, 5);
  });
  it('early evening: 9:00 PM to 5:30 AM is 8.5 h', () => {
    expect(sleepWindow(t(9, 0, 'PM'), t(5, 30, 'AM'), at(9)).hours).toBe(8.5);
  });
  it('12 PM and 12 AM are noon and midnight: 12:00 AM to 12:00 PM is 12 h', () => {
    expect(sleepWindow(t(12, 0, 'AM'), t(12, 0, 'PM'), at(15)).hours).toBe(12);
  });
  it('a wake time still ahead of now means yesterday: logging at 1 AM about a 9 AM wake', () => {
    const w = sleepWindow(t(1, 0, 'AM'), t(9, 0, 'AM'), at(1, 0));
    expect(w.hours).toBe(8);
    expect(hm(w.wakeTime)).toBe('13 9:00');
    expect(hm(w.bedtime)).toBe('13 1:00');
  });
  it('the same bed and wake time is a full 24 h, never 0', () => {
    expect(sleepWindow(t(10, 0, 'PM'), t(10, 0, 'PM'), at(23)).hours).toBe(24);
  });
});
