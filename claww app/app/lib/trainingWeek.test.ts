import { describe, expect, it } from 'vitest';
import {
  computeWeekdayStates,
  defaultWeekdays,
  isWeekdayPlan,
  localWeekday,
  missedDayLabels,
  sortWeekdays,
  suggestedWeekdayIndex,
  trainingDaysPerWeek,
  weekDates,
  weekdayIndex,
} from './trainingWeek';

// Thursday 9 October 2026, 18:05 local.
const THU = new Date(2026, 9, 8, 18, 5);
const ev = (dayLabel: string, status: 'completed' | 'skipped', y: number, m: number, d: number, h = 18) => ({
  dayLabel,
  status,
  createdAt: new Date(y, m, d, h, 20).toISOString(),
});

describe('weekdayIndex', () => {
  it('reads full and short names, any case, Monday as 0', () => {
    expect(weekdayIndex('Monday')).toBe(0);
    expect(weekdayIndex('thu')).toBe(3);
    expect(weekdayIndex('SUNDAY')).toBe(6);
  });
  it('is null for generic labels', () => {
    expect(weekdayIndex('Day 1')).toBeNull();
    expect(weekdayIndex('Push')).toBeNull();
    expect(weekdayIndex('')).toBeNull();
  });
});

describe('localWeekday and weekDates', () => {
  it('maps Date to a Monday-first index', () => {
    expect(localWeekday(THU)).toBe(3);
    expect(localWeekday(new Date(2026, 9, 11))).toBe(6); // Sunday
    expect(localWeekday(new Date(2026, 9, 5))).toBe(0); // Monday
  });
  it('gives this week Monday to Sunday', () => {
    const w = weekDates(THU);
    expect(w[0].getDate()).toBe(5);
    expect(w[6].getDate()).toBe(11);
  });
});

describe('defaultWeekdays and trainingDaysPerWeek', () => {
  it('spreads days across the week', () => {
    expect(defaultWeekdays(3)).toEqual(['Monday', 'Wednesday', 'Friday']);
    expect(defaultWeekdays(4)).toEqual(['Monday', 'Tuesday', 'Thursday', 'Friday']);
    expect(defaultWeekdays(5)).toHaveLength(5);
    expect(defaultWeekdays(0)).toHaveLength(1);
    expect(defaultWeekdays(99)).toHaveLength(7);
  });
  it('mirrors the generate-plan frequency table', () => {
    expect(trainingDaysPerWeek('beginner', 'sedentary', 30)).toBe(2);
    expect(trainingDaysPerWeek('advanced', 'active', 30)).toBe(5);
    expect(trainingDaysPerWeek('advanced', 'active', 60)).toBe(4);
    expect(trainingDaysPerWeek(null, null, null)).toBe(4);
  });
  it('sorts picked days into calendar order and drops junk', () => {
    expect(sortWeekdays(['Friday', 'monday', 'Friday', 'Funday'])).toEqual(['Monday', 'Friday']);
  });
});

describe('isWeekdayPlan', () => {
  it('needs every label to be a distinct weekday', () => {
    expect(isWeekdayPlan(['Monday', 'Wednesday'])).toBe(true);
    expect(isWeekdayPlan(['Day 1', 'Day 2'])).toBe(false);
    expect(isWeekdayPlan(['Monday', 'Monday'])).toBe(false);
    expect(isWeekdayPlan(['Monday', 'Push'])).toBe(false);
    expect(isWeekdayPlan([])).toBe(false);
  });
});

describe('computeWeekdayStates', () => {
  const labels = ['Monday', 'Tuesday', 'Thursday', 'Saturday'];
  it('returns null for plans without weekdays so the old states apply', () => {
    expect(computeWeekdayStates(['Day 1', 'Day 2'], [], THU)).toBeNull();
  });
  it('past days: completed, skipped or missed; today suggested; later upcoming', () => {
    const events = [ev('Tuesday', 'completed', 2026, 9, 6), ev('Monday', 'skipped', 2026, 9, 5)];
    const s = computeWeekdayStates(labels, events, THU)!;
    expect(s.map((x) => x.state)).toEqual(['skipped', 'completed', 'suggested', 'upcoming']);
  });
  it('a planned day in the past with nothing logged is missed', () => {
    const s = computeWeekdayStates(labels, [], THU)!;
    expect(s.map((x) => x.state)).toEqual(['missed', 'missed', 'suggested', 'upcoming']);
    expect(missedDayLabels(labels, [], THU)).toEqual(['Monday', 'Tuesday']);
  });
  it('doing a missed day later does not clear its missed state', () => {
    // Pull (Tuesday) done today instead: the event is on Thursday, so Tuesday stays missed.
    const events = [ev('Tuesday', 'completed', 2026, 9, 8)];
    const s = computeWeekdayStates(labels, events, THU)!;
    expect(s[1].state).toBe('missed');
  });
  it('an event from last week does not count for this week', () => {
    const lastTuesday = [ev('Tuesday', 'completed', 2026, 8, 29)]; // 29 Sep
    expect(computeWeekdayStates(labels, lastTuesday, THU)![1].state).toBe('missed');
  });
  it("today's completed session reads completed", () => {
    const events = [ev('Thursday', 'completed', 2026, 9, 8, 7)];
    expect(computeWeekdayStates(labels, events, THU)![2].state).toBe('completed');
  });
  it('carries the date for each pill', () => {
    const s = computeWeekdayStates(labels, [], THU)!;
    expect(s.map((x) => x.date.getDate())).toEqual([5, 6, 8, 10]);
  });
  it('Sunday still belongs to the week that started on Monday', () => {
    const sunday = new Date(2026, 9, 11, 10, 0);
    const s = computeWeekdayStates(['Monday', 'Sunday'], [], sunday)!;
    expect(s.map((x) => x.state)).toEqual(['missed', 'suggested']);
  });
});

describe('suggestedWeekdayIndex', () => {
  const labels = ['Monday', 'Tuesday', 'Thursday', 'Saturday'];
  it('is today when today is a training day', () => {
    expect(suggestedWeekdayIndex(labels, THU)).toBe(2);
  });
  it('is the next planned day on a rest day, wrapping the week', () => {
    expect(suggestedWeekdayIndex(labels, new Date(2026, 9, 9))).toBe(3); // Friday -> Saturday
    expect(suggestedWeekdayIndex(labels, new Date(2026, 9, 11))).toBe(0); // Sunday -> Monday
  });
  it('is null without weekday labels', () => {
    expect(suggestedWeekdayIndex(['Day 1'], THU)).toBeNull();
  });
});
