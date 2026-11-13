import { describe, expect, it } from 'vitest';
import { requestName } from './foodRequestName';

describe('requestName', () => {
  it('tidies spacing and keeps the name', () => {
    expect(requestName('  chicken   lollipop ')).toBe('chicken lollipop');
  });
  it('rejects empty or one-letter names', () => {
    expect(requestName('')).toBeNull();
    expect(requestName(' a ')).toBeNull();
  });
  it('cuts very long names at 80 characters', () => {
    expect(requestName('x'.repeat(200))!.length).toBe(80);
  });
});
