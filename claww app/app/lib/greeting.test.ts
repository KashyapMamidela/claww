import { describe, expect, it } from 'vitest';
import { greetingFor, greetingName } from './greeting';

function at(hour: number, minute: number): Date {
  return new Date(2026, 9, 10, hour, minute, 0);
}

describe('greetingFor', () => {
  it.each([
    [0, 0, 'Good night'],
    [4, 59, 'Good night'],
    [5, 0, 'Good morning'],
    [11, 59, 'Good morning'],
    [12, 0, 'Good afternoon'],
    [16, 59, 'Good afternoon'],
    [17, 0, 'Good evening'],
    [21, 59, 'Good evening'],
    [22, 0, 'Good night'],
    [23, 59, 'Good night'],
  ])('%i:%i → %s', (hour, minute, expected) => {
    expect(greetingFor(at(hour, minute))).toBe(expected);
  });
});

describe('greetingName', () => {
  it('capitalises each word and trims', () => {
    expect(greetingName('kashyap')).toBe('Kashyap');
    expect(greetingName('  kashyap  mamidela ')).toBe('Kashyap Mamidela');
    expect(greetingName('Priya')).toBe('Priya');
  });
  it('falls back to there when there is no name', () => {
    expect(greetingName('')).toBe('there');
    expect(greetingName('   ')).toBe('there');
    expect(greetingName(null)).toBe('there');
  });
});
