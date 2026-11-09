import { describe, it, expect } from 'vitest';
import { effectiveAvailability, effectiveDiet } from './dietAvoid';

describe('effectiveDiet', () => {
  it('turns an eggetarian who avoids eggs into a vegetarian', () => {
    expect(effGIVEN()).toBe('veg');
  });
  function effGIVEN() {
    return effectiveDiet('egg', ['non vegetarian', 'egg']);
  }
  it('never widens a diet', () => {
    expect(effectiveDiet('veg', [])).toBe('veg');
    expect(effectiveDiet('vegan', ['egg'])).toBe('vegan');
    expect(effectiveDiet('egg', [])).toBe('egg');
  });
  it('narrows a meat eater who avoids meat', () => {
    expect(effectiveDiet('nonveg', ['chicken'])).toBe('egg');
    expect(effectiveDiet('nonveg', ['meat', 'eggs'])).toBe('veg');
    expect(effectiveDiet('nonveg', ['egg'])).toBe('nonveg');
  });
});

describe('effectiveAvailability', () => {
  it('turns eggs off for vegetarians and for anyone who avoids them', () => {
    const base = { eggs: 'yes', chicken: 'yes', paneer: 'yes' };
    expect(effectiveAvailability(base, [], 'veg')).toMatchObject({ eggs: 'no', chicken: 'no', paneer: 'yes' });
    expect(effectiveAvailability(base, ['egg'], 'nonveg')).toMatchObject({ eggs: 'no', chicken: 'yes' });
    expect(effectiveAvailability(base, [], 'egg')).toMatchObject({ eggs: 'yes', chicken: 'no' });
  });
});
