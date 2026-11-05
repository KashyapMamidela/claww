// Dumps everything the trainer and nutritionist review into one JSON file (used by make_review_pdf.py).
// Run from the "claww app" folder:  node database/review/dump_review_data.mjs <out.json>
// Every number comes from the same builders the app uses; nothing is typed here.

import { readFileSync, readdirSync, writeFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { loadFoods, dishPer100g } from '../foods/build_foods.mjs';
import { compile, loadTemplates } from '../meal_templates/build_meal_templates.mjs';

const root = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
const out = process.argv[2];
if (!out) throw new Error('usage: node dump_review_data.mjs <out.json>');

const bpDir = join(root, 'supabase', 'functions', '_shared', 'blueprints');
const blueprints = readdirSync(bpDir)
  .filter((f) => f.endsWith('.json'))
  .map((f) => JSON.parse(readFileSync(join(bpDir, f), 'utf8')));

const foods = loadFoods();
const templates = compile(loadTemplates(), foods);

const ing = new Map(foods.ingredients.map((r) => [r.name, r]));
const units = new Map();
for (const u of foods.units) if (u.is_default === 'true') units.set(u.food, `${u.unit} = ${u.grams} g`);
const dishes = foods.dishes.map((d) => {
  const items = foods.items.filter((i) => i.dish === d.name);
  const { per100g } = dishPer100g(items, ing);
  return {
    name: d.name, cuisine: d.cuisine, diet: d.diet, jain: d.jain_ok === 'true', serving: units.get(d.name) ?? '',
    items: items.map((i) => `${i.item} ${i.grams} g`),
    kcal100: per100g.kcal_100g, protein100: per100g.protein_100g,
  };
});
const ingredients = foods.ingredients.map((r) => ({
  name: r.name, diet: r.diet, jain: r.jain_ok === 'true', kcal: r.kcal_100g, protein: r.protein_100g, carbs: r.carbs_100g,
  fat: r.fat_100g, source: r.source, ref: r.source_ref,
}));

writeFileSync(out, JSON.stringify({ blueprints, templates, dishes, ingredients }, null, 1));
console.log(`blueprints ${blueprints.length}, templates ${templates.length}, dishes ${dishes.length}, ingredients ${ingredients.length}`);
