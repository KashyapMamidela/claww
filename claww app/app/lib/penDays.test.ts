import { describe, expect, it } from 'vitest';
import { makeFreeWeekday, moveDayItemLabel, moveSessionDay } from './penDays';

const days = [
  { day: 'Monday', focus: 'Full Body' },
  { day: 'Tuesday', focus: 'Upper' },
  { day: 'Thursday', focus: 'Lower' },
];

describe('makeFreeWeekday', () => {
  it('skips weekdays the plan already trains on', () => {
    const free = makeFreeWeekday(['Monday', 'Tuesday', 'Thursday']);
    expect(free('Monday')).toBe('Wednesday'); // Tuesday is used
  });
  it('never hands out the same weekday twice in one run', () => {
    const free = makeFreeWeekday(['Monday', 'Tuesday', 'Thursday']);
    expect(free('Monday')).toBe('Wednesday');
    expect(free('Tuesday')).toBe('Friday'); // Wednesday was just taken
  });
  it('returns null when the week is full', () => {
    expect(makeFreeWeekday(['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'])('Monday')).toBeNull();
  });
  it('returns null for a label that is not a weekday', () => {
    expect(makeFreeWeekday(['Day 1'])('Day 1')).toBeNull();
  });
});

describe('moveSessionDay', () => {
  it('moves a session to a free weekday and keeps calendar order', () => {
    const out = moveSessionDay(days, 'Monday', 'Wednesday');
    expect(out?.map((d) => d.day)).toEqual(['Tuesday', 'Wednesday', 'Thursday']);
    expect(out?.find((d) => d.day === 'Wednesday')?.focus).toBe('Full Body');
  });
  it('refuses to land on a weekday that is already a training day (no duplicate)', () => {
    expect(moveSessionDay(days, 'Monday', 'Tuesday')).toBeNull();
  });
  it('refuses when there is no session on the source day, or the same day', () => {
    expect(moveSessionDay(days, 'Friday', 'Saturday')).toBeNull();
    expect(moveSessionDay(days, 'Monday', 'Monday')).toBeNull();
  });
  it('matches short weekday names', () => {
    expect(moveSessionDay([{ day: 'Mon', focus: 'Push' }], 'Monday', 'Wednesday')?.[0].day).toBe('Wednesday');
  });
});

describe('moveDayItemLabel', () => {
  it('names the session, not "Plan"', () => {
    expect(moveDayItemLabel(days, 'Monday', 'Wednesday')).toBe('Full Body day'); // before the move
    const moved = moveSessionDay(days, 'Monday', 'Wednesday')!;
    expect(moveDayItemLabel(moved, 'Monday', 'Wednesday')).toBe('Full Body day');
  });
  it('does not double the word day, and has a plain fallback', () => {
    expect(moveDayItemLabel([{ day: 'Monday', focus: 'Rest day' }], null, 'Monday')).toBe('Rest day');
    expect(moveDayItemLabel([], 'Monday', 'Wednesday')).toBe('Session day');
  });
});
