// Builds the meal templates the planner uses (NG PHASE 7).
//
// Sources of truth: database/meal_templates/{breakfast,lunch,dinner}.json (authored combinations of dishes) and
// database/foods/*.csv (the reviewed-pending food database). Run from the "claww app" folder:
//
//   node database/meal_templates/build_meal_templates.mjs
//
// It validates, computes EVERY number from the foods (nothing is typed), and writes
//   database/seed_meal_templates.sql                         (the meal_templates table, idempotent)
//   supabase/functions/_shared/mealTemplates/index.ts       (the same data for the planner, in the app and the functions)

import { readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { dishPer100g, loadFoods, NUTRIENTS } from '../foods/build_foods.mjs';

const here = dirname(fileURLToPath(import.meta.url));
const root = join(here, '..', '..');

const DIET_ORDER = { vegan: 0, veg: 1, egg: 2, nonveg: 3 };
const SOURCES = ['home', 'mess', 'pg_tiffin', 'canteen', 'outside', 'self_cook'];
const COOK = ['full_kitchen', 'stove', 'kettle', 'microwave', 'rice_cooker', 'none'];

/** Which "can you get these?" row each top-level food stands for. Meat and fish count as the Chicken row. */
export const TAGS = [
  ['eggs', /^(Boiled eggs|Egg |Omelette|Bread omelette)/],
  ['chicken', /(^Chicken|^Mutton|^Fish|^Prawn|^Grilled chicken)/],
  ['dal', /^(Dal |Moong dal|Masoor dal|Palak dal|Rajma|Chole|Lobia|Sundal)/],
  ['soya', /^Soya chunks/],
  ['paneer', /^Tofu/],
  ['curd', /^(Curd|Raita|Kadhi|Masala buttermilk|Sweet lassi)/],
  ['milk', /^(Milk|Oats porridge|Banana shake|Chai|Coffee|Whey protein shake with milk)/],
  ['peanuts', /(^Roasted peanuts|^Peanut )/],
  ['banana', /^(Banana)/],
  ['sprouts', /^Sprouts salad/],
  ['oats', /^Oats porridge/],
  ['whey', /^Whey protein/],
];

const round = (v, d = 1) => (v === null || v === undefined ? null : Math.round(v * 10 ** d) / 10 ** d);

export function loadTemplates() {
  return ['breakfast', 'lunch', 'dinner'].flatMap((m) => JSON.parse(readFileSync(join(here, `${m}.json`), 'utf8')));
}

function foodIndex(foods) {
  const ing = new Map(foods.ingredients.map((r) => [r.name, r]));
  const dishes = new Map(foods.dishes.map((r) => [r.name, r]));
  const units = new Map();
  for (const u of foods.units) if (u.is_default === 'true') units.set(u.food, { unit: u.unit, grams: Number(u.grams) });
  const per100 = new Map();
  for (const [name, r] of ing) per100.set(name, { diet: r.diet, jain: r.jain_ok === 'true', n: Object.fromEntries(NUTRIENTS.map((k) => [k, r[k] === '' ? null : Number(r[k])])) });
  for (const [name, d] of dishes) {
    const items = foods.items.filter((i) => i.dish === name);
    const { per100g } = dishPer100g(items, ing);
    per100.set(name, { diet: d.diet, jain: d.jain_ok === 'true', n: per100g });
  }
  return { per100, units };
}

/** One template item with every number computed from its food. */
export function computeItem(idx, food, qty) {
  const p = idx.per100.get(food);
  const u = idx.units.get(food);
  if (!p || !u) throw new Error(`unknown food or no default unit: ${food}`);
  const grams = qty * u.grams;
  const f = (k, d) => round(p.n[k] === null || p.n[k] === undefined ? null : (p.n[k] * grams) / 100, d);
  return {
    food, unit: u.unit, qty, grams: round(grams, 0),
    kcal: f('kcal_100g', 0), protein: f('protein_100g', 1), carbs: f('carbs_100g', 1), fat: f('fat_100g', 1),
    fibreG: f('fibre_100g', 1), ironMg: f('iron_mg_100g', 2), calciumMg: f('calcium_mg_100g', 0), vitcMg: f('vitc_mg_100g', 1),
    b12Ug: f('b12_ug_100g', 2), sodiumMg: f('sodium_mg_100g', 0),
  };
}

export function validate(templates, foods) {
  const errors = [];
  const idx = foodIndex(foods);
  const ids = new Set();
  for (const t of templates) {
    const w = `template ${t.id}`;
    if (!t.id || ids.has(t.id)) errors.push(`${w}: id missing or duplicated`);
    ids.add(t.id);
    if (!['breakfast', 'lunch', 'dinner'].includes(t.meal)) errors.push(`${w}: bad meal`);
    for (const s of t.needsSources ?? []) if (!SOURCES.includes(s)) errors.push(`${w}: unknown source ${s}`);
    for (const c of t.needsCook ?? []) if (!COOK.includes(c)) errors.push(`${w}: unknown cook ${c}`);
    if (!Array.isArray(t.items) || t.items.length === 0) errors.push(`${w}: no items`);
    for (const i of t.items ?? []) {
      if (!idx.per100.has(i.food)) errors.push(`${w}: "${i.food}" is not in the food database`);
      else if (!idx.units.has(i.food)) errors.push(`${w}: "${i.food}" has no default unit`);
      if (!(i.qty > 0)) errors.push(`${w}: "${i.food}" needs a quantity above 0`);
    }
  }
  return errors;
}

/** The templates with computed items, totals, diet, Jain flag and the foods they use. */
export function compile(templates, foods) {
  const idx = foodIndex(foods);
  return templates.map((t) => {
    const items = t.items.map((i) => computeItem(idx, i.food, i.qty));
    const total = (k) => items.reduce((s, i) => s + (i[k] ?? 0), 0);
    let diet = 'vegan';
    let jainOk = true;
    for (const i of t.items) {
      const p = idx.per100.get(i.food);
      if (DIET_ORDER[p.diet] > DIET_ORDER[diet]) diet = p.diet;
      jainOk = jainOk && p.jain;
    }
    const uses = [...new Set(t.items.flatMap((i) => TAGS.filter(([, re]) => re.test(i.food)).map(([k]) => k)))];
    return {
      id: t.id, meal: t.meal, name: t.name, cuisine: t.cuisine ?? null,
      needsSources: t.needsSources ?? [], needsCook: t.needsCook ?? [], diet, jainOk, uses, items,
      kcal: Math.round(total('kcal')), protein: round(total('protein')), carbs: round(total('carbs')), fat: round(total('fat')),
      costInr: null, reviewed: false,
    };
  });
}

/** Foods the planner can add to close a shortfall, with their numbers computed from the database. */
export const ADD_ON_SPECS = [
  { key: 'soya', food: 'Soya chunks, dry', qty: 1, label: 'soya chunks' },
  { key: 'eggs', food: 'Boiled eggs', qty: 2, label: 'boiled eggs' },
  { key: 'curd', food: 'Curd, plain', qty: 1, label: 'curd' },
  { key: 'peanuts', food: 'Roasted peanuts', qty: 1, label: 'peanuts' },
  { key: 'whey', food: 'Whey protein isolate', qty: 1, label: 'whey' },
  { key: 'dal', food: 'Moong dal', qty: 1, label: 'dal' },
  { key: 'milk', food: 'Milk, whole', qty: 1, label: 'milk' },
  { key: 'paneer', food: 'Tofu, firm', qty: 1, label: 'tofu' },
];

export function compileAddOns(foods) {
  const idx = foodIndex(foods);
  return ADD_ON_SPECS.map((s) => {
    const i = computeItem(idx, s.food, s.qty);
    return { key: s.key, label: s.label, food: s.food, unit: i.unit, qty: s.qty, grams: i.grams, kcal: i.kcal, protein: i.protein, carbs: i.carbs, fat: i.fat };
  });
}

const q = (t) => `'${String(t).replace(/'/g, "''")}'`;

export function buildSql(compiled) {
  const rows = compiled.map(
    (t) =>
      `  (${q(t.id)}, ${q(t.meal)}, ${q(t.name)}, ARRAY[${t.needsSources.map(q).join(', ')}]::text[], ARRAY[${t.needsCook.map(q).join(', ')}]::text[], ` +
      `${q(t.diet === 'vegan' ? 'vegan' : t.diet)}, ${t.cuisine ? q(t.cuisine) : 'NULL'}, ${q(JSON.stringify(t.items.map(({ food, unit, qty }) => ({ food, unit, qty }))))}::jsonb, ${t.kcal}, ${t.protein}, NULL)`
  );
  return `-- ============================================================
-- Claww: meal templates (NG PHASE 7)
--
-- GENERATED from database/meal_templates/*.json and database/foods/*.csv by
-- database/meal_templates/build_meal_templates.mjs. Edit the JSON and re-run the script, not this file.
-- Every number comes from the food database; every template is unreviewed (reviewed_by stays NULL) until the
-- nutritionist signs it off. Run after schema.sql. Safe to run any number of times.
-- ============================================================

INSERT INTO meal_templates (id, meal, name, needs_sources, needs_cook, diet, cuisine, items, kcal, protein, cost_inr) VALUES
${rows.join(',\n')}
ON CONFLICT (id) DO UPDATE SET
  meal = EXCLUDED.meal, name = EXCLUDED.name, needs_sources = EXCLUDED.needs_sources, needs_cook = EXCLUDED.needs_cook,
  diet = EXCLUDED.diet, cuisine = EXCLUDED.cuisine, items = EXCLUDED.items, kcal = EXCLUDED.kcal, protein = EXCLUDED.protein;
`;
}

export function buildTs(compiled, addOns) {
  return `// GENERATED by database/meal_templates/build_meal_templates.mjs from the template JSON and the food database. Do not edit.
// Every number is computed from the foods; nothing here is typed by hand. All templates are unreviewed.

import type { MealTemplate, AddOn } from '../mealTypes.ts';

export const MEAL_TEMPLATES: MealTemplate[] = ${JSON.stringify(compiled, null, 1)};

export const ADD_ONS: AddOn[] = ${JSON.stringify(addOns, null, 1)};
`;
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  const foods = loadFoods();
  const templates = loadTemplates();
  const errors = validate(templates, foods);
  if (errors.length > 0) {
    console.error(`${errors.length} problem(s):\n- ${errors.join('\n- ')}`);
    process.exit(1);
  }
  const compiled = compile(templates, foods);
  const addOns = compileAddOns(foods);
  writeFileSync(join(root, 'database', 'seed_meal_templates.sql'), buildSql(compiled), 'utf8');
  const dir = join(root, 'supabase', 'functions', '_shared', 'mealTemplates');
  writeFileSync(join(dir, 'index.ts'), buildTs(compiled, addOns), 'utf8');
  console.log(`Wrote ${compiled.length} templates and ${addOns.length} add-ons.`);
}
