import { describe, expect, it } from 'vitest';
import { setsLabel } from './plural';

describe('setsLabel', () => {
  it('uses the singular for exactly one', () => {
    expect(setsLabel(1)).toBe('1 set');
  });
  it('uses the plural for zero and for more than one', () => {
    expect(setsLabel(0)).toBe('0 sets');
    expect(setsLabel(2)).toBe('2 sets');
    expect(setsLabel(16)).toBe('16 sets');
  });
});
