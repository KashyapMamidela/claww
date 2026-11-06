import { describe, expect, it } from 'vitest';
import type { PlanDay } from './data';
import { dayMinutes, firstSession, kindOf, storyWeek, summaryLine, WATCH_LINES } from './planStory';

const ex = (name: string, sets: number, reps: number) => ({ name, sets, reps });
const strength = (day: string, focus: string, n = 5): PlanDay => ({ day, focus, exercises: Array.from({ length: n }, (_, i) => ex(`E${i}`, 3, 10)) } as PlanDay);
const yoga = (day: string): PlanDay => ({ day, focus: 'Yoga flow A', exercises: [ex('Sun Salutation Flow', 1, 10), ex('Warrior Sequence', 1, 10)] } as PlanDay);

describe('plan story', () => {
  it('lays the week out Monday to Sunday with Rest between', () => {
    const w = storyWeek([strength('Monday', 'Upper body'), yoga('Tuesday'), strength('Wednesday', 'Lower body')]);
    expect(w.map((d) => d.day)).toEqual(['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']);
    expect(w.map((d) => d.kind)).toEqual(['gym', 'yoga', 'gym', 'rest', 'rest', 'rest', 'rest']);
    expect(w[3]).toMatchObject({ what: 'Rest', minutes: null });
  });
  it('minutes: strength from sets, yoga from its timed blocks', () => {
    expect(dayMinutes(strength('Monday', 'Upper', 5))).toBe(Math.round((15 * 130) / 60 + 5));
    expect(dayMinutes(yoga('Tuesday'))).toBe(20);
  });
  it('knows yoga and mobility sessions by name', () => {
    expect(kindOf('Yoga flow B')).toBe('yoga');
    expect(kindOf('Mobility, lower body')).toBe('mobility');
    expect(kindOf('Full body A')).toBe('gym');
    expect(kindOf('Calisthenics, full body a')).toBe('gym');
  });
  it('a Day 1 / Day 2 plan lists its sessions in order', () => {
    expect(storyWeek([strength('Day 1', 'Push'), strength('Day 2', 'Pull')]).map((d) => d.day)).toEqual(['Day 1', 'Day 2']);
  });
  it('the first session is today if it trains today, else the next one', () => {
    const days = [strength('Monday', 'Upper'), strength('Wednesday', 'Lower')];
    expect(firstSession(days, new Date(2026, 10, 4, 9))?.day).toBe('Wednesday'); // Wednesday
    expect(firstSession(days, new Date(2026, 10, 5, 9))?.day).toBe('Monday'); // Thursday, next is Monday
    expect(firstSession([], new Date())).toBeNull();
  });
  it('summarises and has four things it watches', () => {
    expect(summaryLine([strength('Monday', 'Upper')])).toMatch(/^1 session a week, about \d+ minutes in all$/);
    expect(WATCH_LINES).toHaveLength(4);
  });
});
