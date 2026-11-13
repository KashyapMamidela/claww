import { describe, expect, it } from 'vitest';
import { DEFAULT_PREFS, needsOil, parsePrefs, rowsFor } from './scanQuestions';
import type { ScanItem } from './engine';

const food = (name: string, kind: 'dish' | 'ingredient') => ({ name, kind } as unknown as ScanItem['food']);
const item = (key: string, name: string, kind: 'dish' | 'ingredient'): ScanItem => ({ key, heard: name, food: food(name, kind), qty: 1, unit: 'g', grams: 100 });
const unknown = (heard: string): ScanItem => ({ key: heard, heard, food: null, qty: 1, unit: 'g', grams: 0 });

describe('needsOil', () => {
  it('a salad of raw foods needs no oil question', () => {
    expect(needsOil([item('a', 'Tofu, firm', 'ingredient'), item('b', 'Avocado', 'ingredient'), item('c', 'Chickpeas, boiled', 'ingredient')])).toBe(false);
  });
  it('a cooked dish does', () => {
    expect(needsOil([item('a', 'Chicken curry', 'dish'), item('b', 'Roti', 'dish')])).toBe(true);
    expect(needsOil([item('a', 'Masala dosa', 'dish')])).toBe(true);
  });
  it('drinks, curd, fruit, plain bread and rice do not', () => {
    for (const n of ['Chai with sugar', 'Sweet lassi', 'Fruit bowl', 'Roti', 'Rice, cooked', 'Idli', 'Boiled eggs', 'Raita']) {
      expect(needsOil([item('a', n, 'dish')])).toBe(false);
    }
  });
  it('an unknown name that sounds cooked counts, a plain one does not', () => {
    expect(needsOil([unknown('fried chicken pieces')])).toBe(true);
    expect(needsOil([unknown('microgreens')])).toBe(false);
  });
  it('the hidden oil line is ignored and an empty plate asks', () => {
    expect(needsOil([{ ...item('o', 'Oil, sunflower', 'ingredient'), hidden: true }, item('a', 'Avocado', 'ingredient')])).toBe(false);
    expect(needsOil([])).toBe(true);
  });
});

describe('rowsFor and prefs', () => {
  it('shows what is switched on, and hides oil when the plate needs none', () => {
    expect(rowsFor(DEFAULT_PREFS, true, false)).toEqual({ place: true, oil: true, portion: true });
    expect(rowsFor(DEFAULT_PREFS, false, false)).toEqual({ place: true, oil: false, portion: true });
    expect(rowsFor({ place: false, oil: true, portion: false }, true, false)).toEqual({ place: false, oil: true, portion: false });
  });
  it('Change brings every row back for that scan', () => {
    expect(rowsFor({ place: false, oil: false, portion: false }, false, true)).toEqual({ place: true, oil: true, portion: true });
  });
  it('reads saved choices and falls back to asking everything', () => {
    expect(parsePrefs(null)).toEqual(DEFAULT_PREFS);
    expect(parsePrefs('not json')).toEqual(DEFAULT_PREFS);
    expect(parsePrefs('{"oil":false}')).toEqual({ place: true, oil: false, portion: true });
  });
});
