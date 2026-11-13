import { describe, expect, it } from 'vitest';
import { sessionName } from './format';

describe('sessionName', () => {
  it('turns numbered repeat days into letters', () => {
    expect(sessionName('Push (2)')).toBe('Push B');
    expect(sessionName('Legs (3)')).toBe('Legs C');
  });
  it('leaves ordinary names alone', () => {
    expect(sessionName('Push')).toBe('Push');
    expect(sessionName('Upper (strength)')).toBe('Upper (strength)');
    expect(sessionName(null)).toBe('');
  });
});
