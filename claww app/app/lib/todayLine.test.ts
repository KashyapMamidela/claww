import { describe, expect, it } from 'vitest';
import { doneCount, sessionTile, todayLine, type TodayMealInput } from './todayLine';

const meal = (slot: TodayMealInput['slot'], state: TodayMealInput['state'], plannedName: string | null = 'Plan', loggedLine: string | null = null): TodayMealInput => ({ slot, state, plannedName, loggedLine });
const session = { name: 'Upper body', minutes: 45, done: false, usualMinutes: 18 * 60, markLine: null };
const run = (nowMinutes: number, meals: TodayMealInput[], s: typeof session | null = session) => todayLine({ nowMinutes, meals, session: s, sleepTargetHours: 8 });
const states = (items: ReturnType<typeof run>) => items.map((i) => `${i.id}:${i.state}`);

describe('the Today line', () => {
  it('is in time order: breakfast, lunch, session, dinner, sleep', () => {
    expect(run(8 * 60, [meal('breakfast', 'up_next'), meal('lunch', 'later'), meal('dinner', 'later')]).map((i) => i.id)).toEqual(['meal-breakfast', 'meal-lunch', 'session', 'meal-dinner', 'sleep']);
  });
  it('morning: breakfast is current, the rest wait', () => {
    expect(states(run(8 * 60, [meal('breakfast', 'up_next'), meal('lunch', 'later'), meal('dinner', 'later')]))).toEqual([
      'meal-breakfast:current', 'meal-lunch:upcoming', 'session:upcoming', 'meal-dinner:upcoming', 'sleep:upcoming',
    ]);
  });
  it('a logged meal shrinks to done with its numbers; the next meal becomes current', () => {
    const items = run(14 * 60, [meal('breakfast', 'as_planned', 'Poha', '490 kcal, 26 g protein'), meal('lunch', 'up_next'), meal('dinner', 'later')]);
    expect(items[0]).toMatchObject({ state: 'done', line: 'Done · 490 kcal, 26 g protein' });
    expect(items[1].state).toBe('current');
  });
  it('a missed meal keeps its card and does not take the current spot from lunch', () => {
    const items = run(13 * 60 + 10, [meal('breakfast', 'missed', 'Poha'), meal('lunch', 'up_next'), meal('dinner', 'later')]);
    expect(states(items).slice(0, 2)).toEqual(['meal-breakfast:missed', 'meal-lunch:current']);
  });
  it('a skipped meal is done, not missed', () => {
    expect(run(13 * 60, [meal('breakfast', 'skipped'), meal('lunch', 'up_next'), meal('dinner', 'later')])[0]).toMatchObject({ state: 'done', line: 'Skipped' });
  });
  it('late afternoon with lunch done: the session is current, before dinner', () => {
    const items = run(17 * 60 + 30, [meal('breakfast', 'as_planned'), meal('lunch', 'as_planned'), meal('dinner', 'up_next')]);
    expect(items.find((i) => i.id === 'session')?.state).toBe('current');
    expect(items.find((i) => i.id === 'meal-dinner')?.state).toBe('upcoming');
  });
  it('a finished session is done; a rest day has no session item', () => {
    expect(run(19 * 60, [meal('breakfast', 'as_planned'), meal('lunch', 'as_planned'), meal('dinner', 'up_next')], { ...session, done: true }).find((i) => i.id === 'session')?.state).toBe('done');
    expect(run(9 * 60, [meal('breakfast', 'up_next'), meal('lunch', 'later'), meal('dinner', 'later')], null).some((i) => i.kind === 'session')).toBe(false);
  });
  it('a session long past its time reads as open (missed), not current', () => {
    const items = run(22 * 60, [meal('breakfast', 'as_planned'), meal('lunch', 'as_planned'), meal('dinner', 'as_planned')]);
    expect(items.find((i) => i.id === 'session')?.state).toBe('missed');
  });
  it('counts done items without the sleep line', () => {
    const items = run(14 * 60, [meal('breakfast', 'as_planned'), meal('lunch', 'up_next'), meal('dinner', 'later')]);
    expect(doneCount(items)).toEqual({ done: 1, total: 4 });
  });
});

describe('session tile', () => {
  it('shows the time, Done, or Rest', () => {
    expect(sessionTile({ planned: true, done: false, usualMinutes: 18 * 60, name: 'Upper body' })).toEqual({ value: '6 pm', sub: 'Upper body' });
    expect(sessionTile({ planned: true, done: false, usualMinutes: 6 * 60 + 30, name: 'Pull' })).toEqual({ value: '6:30 am', sub: 'Pull' });
    expect(sessionTile({ planned: true, done: true, usualMinutes: null, name: 'Push' })).toEqual({ value: 'Done', sub: 'Push' });
    expect(sessionTile({ planned: false, done: false, usualMinutes: null, name: 'x' })).toEqual({ value: 'Rest', sub: 'no session today' });
    expect(sessionTile({ planned: true, done: false, usualMinutes: null, name: 'Legs' }).value).toBe('6 pm');
  });
});
