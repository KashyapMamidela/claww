import { describe, expect, it } from 'vitest';
import { parseOffProduct, portion } from './barcode';

const json = { status: 1, product: { product_name: 'Peanut Butter', brands: 'Pintola, Other', serving_quantity: '32', nutriments: { 'energy-kcal_100g': 620, proteins_100g: 28, carbohydrates_100g: 14, fat_100g: 50 } } };

describe('barcode (Premium F9)', () => {
  it('reads a product', () => {
    const p = parseOffProduct('8906', json)!;
    expect(p.name).toBe('Peanut Butter');
    expect(p.brand).toBe('Pintola');
    expect(p.per100).toEqual({ kcal: 620, protein: 28, carbs: 14, fat: 50 });
    expect(p.servingG).toBe(32);
  });
  it('falls back to kJ and rejects products with no nutrition or name', () => {
    expect(parseOffProduct('1', { status: 1, product: { product_name: 'X', nutriments: { energy_100g: 1000 } } })!.per100.kcal).toBe(239);
    expect(parseOffProduct('1', { status: 1, product: { product_name: 'X', nutriments: {} } })).toBeNull();
    expect(parseOffProduct('1', { status: 0 })).toBeNull();
    expect(parseOffProduct('1', { status: 1, product: { nutriments: { 'energy-kcal_100g': 100 } } })).toBeNull();
  });
  it('scales a portion', () => {
    const p = parseOffProduct('8906', json)!;
    expect(portion(p, 32)).toEqual({ calories: 198, protein_g: 9, carbs_g: 4.5, fats_g: 16 });
  });
});
