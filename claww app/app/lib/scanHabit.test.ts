import { describe, expect, it } from 'vitest';
import { contextText, habitContext, lastTimeFor, type PastScan } from './scanHabit';

const scan = (description: string, day: number, place: string, oil: string, portion: string): PastScan => ({
  description,
  logged_at: new Date(2026, 10, day).toISOString(),
  context: { place, oil, portion } as PastScan['context'],
});

describe('scanner habit', () => {
  const past = [
    scan('Chicken fried rice', 3, 'restaurant', 'heavy', 'regular'),
    scan('Idli sambar', 2, 'mess', 'light', 'regular'),
    scan('Chicken fried rice', 1, 'street', 'heavy', 'large'),
    { description: 'No context', logged_at: new Date(2026, 10, 4).toISOString(), context: null },
  ];
  it('the answers given most often', () => {
    expect(habitContext(past)).toEqual({ place: 'restaurant', oil: 'heavy', portion: 'regular' });
    expect(habitContext([])).toEqual({ place: 'home', oil: 'normal', portion: 'regular' });
    expect(habitContext([past[3]])).toEqual({ place: 'home', oil: 'normal', portion: 'regular' });
  });
  it('last time with the same dish is the most recent one', () => {
    const last = lastTimeFor('chicken fried rice', past)!;
    expect(last.context).toEqual({ place: 'restaurant', oil: 'heavy', portion: 'regular' });
    expect(lastTimeFor('Fried rice', past)).not.toBeNull();
    expect(lastTimeFor('Pizza', past)).toBeNull();
    expect(lastTimeFor('', past)).toBeNull();
  });
  it('words for the card', () => {
    expect(contextText({ place: 'restaurant', oil: 'heavy', portion: 'regular' })).toBe('Restaurant · heavy oil · regular');
  });
});
