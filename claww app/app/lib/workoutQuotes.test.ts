import { beforeEach, describe, expect, it } from 'vitest';
import { QUOTES, pickQuote, quoteKind, resetQuoteMemory } from './workoutQuotes';

describe('quoteKind', () => {
  it('reads the kind from the session name', () => {
    expect(quoteKind('Push B')).toBe('push');
    expect(quoteKind('Pull day')).toBe('pull');
    expect(quoteKind('Legs (2)')).toBe('legs');
    expect(quoteKind('Yoga flow')).toBe('mobility');
    expect(quoteKind('Cardio')).toBe('cardio');
    expect(quoteKind('Core')).toBe('core');
    expect(quoteKind('Full body strength')).toBe('any');
    expect(quoteKind('')).toBe('any');
  });
});

describe('pickQuote', () => {
  beforeEach(resetQuoteMemory);

  it('always returns one of the written lines', () => {
    const all = Object.values(QUOTES).flat();
    for (let i = 0; i < 60; i++) expect(all).toContain(pickQuote(['Push', 'Legs', 'Yoga', 'Full body'][i % 4]));
  });

  it('never repeats the previous pick', () => {
    let prev = pickQuote('Push B');
    for (let i = 0; i < 80; i++) {
      const next = pickQuote('Push B');
      expect(next).not.toBe(prev);
      prev = next;
    }
  });

  it('uses the matching pool most of the time', () => {
    let hits = 0;
    for (let i = 0; i < 200; i++) if (QUOTES.legs.includes(pickQuote('Legs B'))) hits += 1;
    expect(hits).toBeGreaterThan(90);
  });

  it('keeps every line short enough for the screen', () => {
    for (const q of Object.values(QUOTES).flat()) expect(q.length).toBeLessThanOrEqual(72);
  });
});
