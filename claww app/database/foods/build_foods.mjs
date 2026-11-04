// Builds database/seed_foods.sql from database/foods/*.csv (NG PHASE 4).
//
// The CSV files are the source of truth. Run from the "claww app" folder:
//
//   node database/foods/build_foods.mjs
//
// It validates first and writes nothing if a check fails. The SQL is idempotent: foods are upserted by
// name, units and dish items by their keys, and reviewed_by / reviewed_at are never touched, so a
// nutritionist's sign-off survives a re-run.
//
// Dishes carry no nutrition of their own: their per-100 g values are the sum of their items (oil and
// ghee are separate items), so a dish can never disagree with its ingredients. A dish may state its own
// kcal_100g in dishes.csv to cross-check against a published figure; the build fails if the two differ by more than 5 %.

import { readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));

export const DIETS = ['veg', 'egg', 'nonveg', 'vegan'];
export const NUTRIENTS = [
  'kcal_100g', 'protein_100g', 'carbs_100g', 'fat_100g', 'fibre_100g', 'iron_mg_100g',
  'calcium_mg_100g', 'vitc_mg_100g', 'b12_ug_100g', 'sodium_mg_100g', 'sugar_100g', 'cost_inr_100g',
];
const REQUIRED_NUTRIENTS = ['kcal_100g', 'protein_100g', 'carbs_100g', 'fat_100g'];
export const DISH_TOLERANCE = 0.05;

/** Minimal CSV: commas, double-quoted fields with "" escapes, no multi-line fields. Blank lines are skipped. */
export function parseCsv(text) {
  const rows = [];
  for (const line of text.replace(/^﻿/, '').split(/\r?\n/)) {
    if (!line.trim()) continue;
    const cells = [];
    let cur = '';
    let quoted = false;
    for (let i = 0; i < line.length; i++) {
      const c = line[i];
      if (quoted) {
        if (c === '"' && line[i + 1] === '"') { cur += '"'; i++; }
        else if (c === '"') quoted = false;
        else cur += c;
      } else if (c === '"') quoted = true;
      else if (c === ',') { cells.push(cur); cur = ''; }
      else cur += c;
    }
    cells.push(cur);
    rows.push(cells);
  }
  if (rows.length === 0) return [];
  const [head, ...body] = rows;
  return body.map((cells) => Object.fromEntries(head.map((h, i) => [h.trim(), (cells[i] ?? '').trim()])));
}

const num = (v) => (v === '' || v === undefined ? null : Number(v));
const bool = (v) => String(v).toLowerCase() === 'true';
const list = (v) => (v ? v.split('|').map((s) => s.trim()).filter(Boolean) : []);

export function loadFoods(dir = here) {
  const read = (f) => parseCsv(readFileSync(join(dir, f), 'utf8'));
  return {
    ingredients: read('ingredients.csv'),
    dishes: read('dishes.csv'),
    items: read('dish_items.csv'),
    units: read('units.csv'),
  };
}

/** Per-100 g nutrients of a dish: the sum of its items' contribution, scaled to 100 g of the dish. */
export function dishPer100g(itemRows, ingredientByName) {
  const total = Object.fromEntries(NUTRIENTS.map((n) => [n, 0]));
  const seen = Object.fromEntries(NUTRIENTS.map((n) => [n, true]));
  let grams = 0;
  for (const it of itemRows) {
    const ing = ingredientByName.get(it.item);
    const g = Number(it.grams);
    grams += g;
    for (const n of NUTRIENTS) {
      const v = ing ? num(ing[n]) : null;
      if (v === null) { seen[n] = false; continue; }
      total[n] += (v * g) / 100;
    }
  }
  const out = {};
  for (const n of NUTRIENTS) out[n] = grams > 0 && seen[n] ? (total[n] * 100) / grams : null;
  return { per100g: out, grams };
}

/** Returns a list of human-readable problems; empty means the data is valid. */
export function validate({ ingredients, dishes, items, units }) {
  const errors = [];
  const names = new Map(); // name -> kind
  const ingredientByName = new Map();

  const addName = (name, kind, where) => {
    if (!name) errors.push(`${where}: empty name`);
    else if (names.has(name)) errors.push(`${where}: duplicate name "${name}" (also a ${names.get(name)})`);
    else names.set(name, kind);
  };

  for (const r of ingredients) {
    const where = `ingredients.csv "${r.name}"`;
    addName(r.name, 'ingredient', where);
    ingredientByName.set(r.name, r);
    if (!DIETS.includes(r.diet)) errors.push(`${where}: diet must be one of ${DIETS.join(', ')}`);
    if (!r.source) errors.push(`${where}: source is required`);
    for (const n of NUTRIENTS) {
      const raw = r[n];
      if (REQUIRED_NUTRIENTS.includes(n) && (raw === '' || raw === undefined)) errors.push(`${where}: ${n} is required`);
      if (raw !== '' && raw !== undefined) {
        const v = Number(raw);
        if (!Number.isFinite(v)) errors.push(`${where}: ${n} is not a number ("${raw}")`);
        else if (v < 0) errors.push(`${where}: ${n} is negative`);
      }
    }
    if (num(r.kcal_100g) > 900) errors.push(`${where}: kcal_100g above 900 is not possible`);
    const macroGrams = num(r.protein_100g) + num(r.carbs_100g) + num(r.fat_100g);
    if (macroGrams > 100.5) errors.push(`${where}: protein + carbs + fat is ${macroGrams} g per 100 g`);
  }

  const itemsByDish = new Map();
  for (const it of items) {
    if (!itemsByDish.has(it.dish)) itemsByDish.set(it.dish, []);
    itemsByDish.get(it.dish).push(it);
  }

  for (const d of dishes) {
    const where = `dishes.csv "${d.name}"`;
    addName(d.name, 'dish', where);
    if (!DIETS.includes(d.diet)) errors.push(`${where}: diet must be one of ${DIETS.join(', ')}`);
    if (!d.source) errors.push(`${where}: source is required`);
    const rows = itemsByDish.get(d.name) ?? [];
    if (rows.length === 0) { errors.push(`${where}: has no rows in dish_items.csv`); continue; }
    const dup = new Set();
    for (const it of rows) {
      if (dup.has(it.item)) errors.push(`${where}: item "${it.item}" listed twice`);
      dup.add(it.item);
      if (!ingredientByName.has(it.item)) errors.push(`${where}: item "${it.item}" is not in ingredients.csv`);
      const g = Number(it.grams);
      if (!Number.isFinite(g) || g <= 0) errors.push(`${where}: item "${it.item}" needs grams above 0`);
    }
    const { per100g } = dishPer100g(rows, ingredientByName);
    if (per100g.kcal_100g === null) errors.push(`${where}: cannot total calories (an item is missing)`);
    const stated = num(d.kcal_100g);
    if (stated !== null && per100g.kcal_100g !== null) {
      const diff = Math.abs(per100g.kcal_100g - stated) / Math.max(stated, 1);
      if (diff > DISH_TOLERANCE) {
        errors.push(`${where}: items total ${per100g.kcal_100g.toFixed(0)} kcal/100 g but the stated value is ${stated} (more than ${DISH_TOLERANCE * 100} % apart)`);
      }
    }
    // A dish's diet can't be more permissive than its items.
    const order = { vegan: 0, veg: 1, egg: 2, nonveg: 3 };
    for (const it of rows) {
      const ing = ingredientByName.get(it.item);
      if (ing && DIETS.includes(ing.diet) && DIETS.includes(d.diet) && order[ing.diet] > order[d.diet]) {
        errors.push(`${where}: marked ${d.diet} but contains "${it.item}" (${ing.diet})`);
      }
    }
  }
  for (const dishName of itemsByDish.keys()) {
    if (!dishes.some((d) => d.name === dishName)) errors.push(`dish_items.csv: "${dishName}" is not in dishes.csv`);
  }

  const defaults = new Map();
  const unitKeys = new Set();
  for (const u of units) {
    const where = `units.csv "${u.food}" / "${u.unit}"`;
    if (!names.has(u.food)) errors.push(`${where}: food is in neither ingredients.csv nor dishes.csv`);
    const g = Number(u.grams);
    if (!Number.isFinite(g) || g <= 0) errors.push(`${where}: grams must be above 0`);
    const key = `${u.food}|${u.unit}`;
    if (unitKeys.has(key)) errors.push(`${where}: listed twice`);
    unitKeys.add(key);
    if (bool(u.is_default)) defaults.set(u.food, (defaults.get(u.food) ?? 0) + 1);
  }
  for (const name of names.keys()) {
    const n = defaults.get(name) ?? 0;
    if (n === 0) errors.push(`"${name}": no default unit in units.csv`);
    if (n > 1) errors.push(`"${name}": more than one default unit`);
  }
  return errors;
}

const q = (t) => `'${String(t).replace(/'/g, "''")}'`;
const n = (v) => (v === null || v === undefined ? 'NULL' : String(v));
const round = (v) => (v === null ? null : Math.round(v * 100) / 100);
const arr = (a) => `ARRAY[${a.map(q).join(', ')}]::text[]`;

export function buildSql(data) {
  const ingredientByName = new Map(data.ingredients.map((r) => [r.name, r]));
  const itemsByDish = new Map();
  for (const it of data.items) {
    if (!itemsByDish.has(it.dish)) itemsByDish.set(it.dish, []);
    itemsByDish.get(it.dish).push(it);
  }

  const foodRows = [];
  for (const r of data.ingredients) {
    foodRows.push(
      `  (${q(r.name)}, ${arr(list(r.aliases))}, 'ingredient', ${r.cuisine ? q(r.cuisine) : 'NULL'}, ${q(r.diet)}, ${bool(r.jain_ok)}, ` +
        `${NUTRIENTS.map((k) => n(num(r[k]))).join(', ')}, ${q(r.source)}, ${r.source_ref ? q(r.source_ref) : 'NULL'})`
    );
  }
  for (const d of data.dishes) {
    const { per100g } = dishPer100g(itemsByDish.get(d.name) ?? [], ingredientByName);
    foodRows.push(
      `  (${q(d.name)}, ${arr(list(d.aliases))}, 'dish', ${d.cuisine ? q(d.cuisine) : 'NULL'}, ${q(d.diet)}, ${bool(d.jain_ok)}, ` +
        `${NUTRIENTS.map((k) => n(round(per100g[k]))).join(', ')}, ${q(d.source)}, ${d.source_ref ? q(d.source_ref) : 'NULL'})`
    );
  }

  const cols = `name, aliases, kind, cuisine, diet, jain_ok, ${NUTRIENTS.join(', ')}, source, source_ref`;
  const updates = ['aliases', 'kind', 'cuisine', 'diet', 'jain_ok', ...NUTRIENTS, 'source', 'source_ref']
    .map((c) => `${c} = EXCLUDED.${c}`).join(',\n  ');

  const unitRows = data.units.map((u) => `  (${q(u.food)}, ${q(u.unit)}, ${Number(u.grams)}, ${bool(u.is_default)})`);
  const itemRows = data.items.map((i) => `  (${q(i.dish)}, ${q(i.item)}, ${Number(i.grams)})`);

  const block = (title, sql) => `${title}\n${sql}\n`;
  return `-- ============================================================
-- Claww: food database (NG PHASE 4)
--
-- GENERATED from database/foods/*.csv by database/foods/build_foods.mjs.
-- Edit the CSV files and re-run the script, not this file. Every row is
-- unreviewed (reviewed_by stays NULL) until the nutritionist signs off; see
-- docs/food-review.md. Sources and licences: database/foods/SOURCES.md.
--
-- Run after schema.sql. Safe to run any number of times: foods are upserted
-- by name and reviewed_by / reviewed_at are never overwritten.
-- ============================================================
${foodRows.length === 0 ? '\n-- No food rows yet.\n' : '\n' + block(
    '',
    `INSERT INTO foods (${cols}) VALUES\n${foodRows.join(',\n')}\nON CONFLICT (name) DO UPDATE SET\n  ${updates};`
  )}${unitRows.length === 0 ? '' : '\n' + block(
    '',
    `INSERT INTO food_units (food_id, unit, grams, is_default)\nSELECT f.id, v.unit, v.grams, v.is_default FROM (VALUES\n${unitRows.join(',\n')}\n) AS v(food, unit, grams, is_default)\nJOIN foods f ON f.name = v.food\nON CONFLICT (food_id, unit) DO UPDATE SET grams = EXCLUDED.grams, is_default = EXCLUDED.is_default;`
  )}${itemRows.length === 0 ? '' : '\n' + block(
    '',
    `INSERT INTO dish_items (dish_id, item_id, grams)\nSELECT d.id, i.id, v.grams FROM (VALUES\n${itemRows.join(',\n')}\n) AS v(dish, item, grams)\nJOIN foods d ON d.name = v.dish\nJOIN foods i ON i.name = v.item\nON CONFLICT (dish_id, item_id) DO UPDATE SET grams = EXCLUDED.grams;`
  )}`;
}

/** Rows that still need the nutritionist: everything with reviewed_by NULL, grouped by source. */
export function reviewSummary(data) {
  const bySource = {};
  for (const r of [...data.ingredients, ...data.dishes]) bySource[r.source] = (bySource[r.source] ?? 0) + 1;
  return bySource;
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  const data = loadFoods();
  const errors = validate(data);
  if (errors.length > 0) {
    console.error(`${errors.length} problem(s) in database/foods:\n- ${errors.join('\n- ')}`);
    process.exit(1);
  }
  writeFileSync(join(here, '..', 'seed_foods.sql'), buildSql(data), 'utf8');
  console.log(`Wrote ${data.ingredients.length} ingredients, ${data.dishes.length} dishes, ${data.units.length} units.`);
}
