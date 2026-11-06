import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { BLUEPRINTS } from './blueprints/index.ts';
import { type CatalogRow, type PlanProfile } from './planTree.ts';
import { buildStyledPlan, cleanStyles, distributeStyleDays, needsStyledPlan, type TrainStyle } from './stylePlan.ts';

// The real catalog from the seed files, including the calisthenics progressions.
function loadCatalog(): CatalogRow[] {
  const dir = join(__dirname, '..', '..', '..', 'database');
  const base = readFileSync(join(dir, 'seed_exercises.sql'), 'utf8');
  const meta = readFileSync(join(dir, 'seed_exercise_metadata.sql'), 'utf8');
  const cali = readFileSync(join(dir, 'seed_calisthenics.sql'), 'utf8');
  const equip = new Map<string, { modality: string; equipment: string }>();
  for (const m of (base + cali).matchAll(/\('((?:[^']|'')+)',\s*'(\w+)',\s*'(\w+)',\s*'(\w+)',\s*[\d.]+\)/g)) equip.set(m[1].replace(/''/g, "'"), { modality: m[2], equipment: m[4] });
  const rows: CatalogRow[] = [];
  const re = /\('((?:[^']|'')+)',\s*'(\w+)',\s*ARRAY\[[^\]]*\](?:::text\[\])?,\s*'(\w+)',\s*'(\w+)',\s*(?:(?:TRUE|FALSE),\s*)?'(\w+)'/g;
  for (const m of (meta + cali).matchAll(re)) {
    const name = m[1].replace(/''/g, "'");
    const e = equip.get(name);
    if (e) rows.push({ id: name, name, modality: e.modality, equipment: e.equipment, primary_muscle: m[2], movement_pattern: m[3], role: m[4], stimulus_type: m[5] });
  }
  return rows;
}
const CATALOG = loadCatalog();

const profile = (over: Partial<PlanProfile> = {}): PlanProfile => ({ goal: 'muscle_gain', equipment: 'gym', daysPerWeek: 4, trainingMonths: 12, sessionMinutes: 45, injuries: [], ...over });
const build = (styles: TrainStyle[], over: Partial<PlanProfile> = {}, seed = 'user-1') =>
  buildStyledPlan({ profile: profile(over), styles, catalog: CATALOG, blueprints: BLUEPRINTS, seed, blockNumber: 1, blockWeek: 1 });

describe('the catalog with calisthenics progressions', () => {
  it('has the 10 new bodyweight rows on top of the 183', () => {
    expect(CATALOG.length).toBe(193);
    for (const n of ['Archer Push-Up', 'Negative Pull-Up', 'Shrimp Squat', 'Nordic Curl Negative']) expect(CATALOG.find((e) => e.name === n)?.equipment).toBe('none');
  });
});

describe('distributeStyleDays', () => {
  it('one style fills every day', () => {
    expect(distributeStyleDays(['yoga'], 3)).toEqual(['yoga', 'yoga', 'yoga']);
  });
  it('the main style gets most days and the others are spaced between', () => {
    expect(distributeStyleDays(['gym', 'yoga'], 3)).toEqual(['gym', 'yoga', 'gym']);
    expect(distributeStyleDays(['gym', 'yoga'], 4).filter((s) => s === 'yoga')).toHaveLength(1);
    expect(distributeStyleDays(['gym', 'yoga', 'mobility'], 5)).toEqual(['gym', 'yoga', 'gym', 'mobility', 'gym']);
  });
  it('always has the right length, and the main style has at least half the days', () => {
    const all: TrainStyle[] = ['gym', 'calisthenics', 'home', 'yoga', 'mobility'];
    for (let days = 2; days <= 6; days++) {
      for (let k = 1; k <= 5; k++) {
        const out = distributeStyleDays(all.slice(0, k), days);
        expect(out).toHaveLength(days);
        expect(out.filter((s) => s === all[0]).length).toBeGreaterThanOrEqual(Math.floor(days / 2));
      }
    }
  });
  it('cleans ids and knows when the styled builder is needed', () => {
    expect(cleanStyles(['yoga', 'x', 'yoga', 'gym'])).toEqual(['yoga', 'gym']);
    expect(needsStyledPlan(['gym'])).toBe(false);
    expect(needsStyledPlan(['home'])).toBe(false);
    expect(needsStyledPlan(['gym', 'yoga'])).toBe(true);
    expect(needsStyledPlan(['calisthenics'])).toBe(true);
  });
});

describe('buildStyledPlan', () => {
  it('is deterministic', () => {
    expect(build(['gym', 'yoga'])).toEqual(build(['gym', 'yoga']));
  });
  it('gym + yoga: strength days plus a yoga flow made of timed blocks', () => {
    const { plan } = build(['gym', 'yoga']);
    expect(plan.days).toHaveLength(4);
    const yoga = plan.days.filter((d) => /^Yoga flow/.test(d.focus));
    expect(yoga).toHaveLength(1);
    for (const ex of yoga[0].exercises) {
      expect(CATALOG.find((e) => e.name === ex.name)?.modality).toBe('yoga');
      expect(ex.sets).toBe(1);
      expect(ex.reps).toBeGreaterThanOrEqual(5);
    }
    expect(plan.days.filter((d) => !/^Yoga/.test(d.focus)).every((d) => d.exercises.length >= 3)).toBe(true);
  });
  it('calisthenics uses only bodyweight exercises and reaches for progressions', () => {
    const { plan } = build(['calisthenics'], { equipment: 'none', daysPerWeek: 3 });
    const names = plan.days.flatMap((d) => d.exercises.map((e) => e.name));
    for (const n of names) expect(CATALOG.find((e) => e.name === n)?.equipment).toBe('none');
    expect(plan.days.every((d) => d.focus.startsWith('Calisthenics'))).toBe(true);
    expect(names.some((n) => ['Pull-Up', 'Chin-Up', 'Archer Push-Up', 'Pistol Squat', 'Shrimp Squat', 'Negative Pull-Up', 'Hanging Knee Raise', 'Hanging Leg Raise', 'Hollow Body Hold', 'L-Sit Hold', 'Diamond Push-Up', 'Bodyweight Dip'].includes(n))).toBe(true);
  });
  it('a yoga + mobility week has no strength exercises and no repeats within a session', () => {
    const { plan, blueprintId } = build(['yoga', 'mobility'], { daysPerWeek: 4 });
    expect(blueprintId).toBeNull();
    expect(plan.days).toHaveLength(4);
    for (const d of plan.days) {
      const names = d.exercises.map((e) => e.name);
      expect(new Set(names).size).toBe(names.length);
      for (const n of names) expect(['yoga', 'mobility']).toContain(CATALOG.find((e) => e.name === n)?.modality);
    }
  });
  it('mobility sessions are named for the body area and rotate', () => {
    const { plan } = build(['mobility'], { daysPerWeek: 3 });
    expect(plan.days.map((d) => d.focus)).toEqual(['Mobility, lower body', 'Mobility, upper body', 'Mobility, whole body']);
  });
  it('yoga length follows the time available', () => {
    const total = (m: number) => build(['yoga'], { daysPerWeek: 2, sessionMinutes: m }).plan.days[0].exercises.reduce((s, e) => s + e.reps, 0);
    expect(total(60)).toBeGreaterThan(total(30));
  });
  it('strength days in a mixed week still fit the session time', () => {
    const { plan } = build(['gym', 'yoga'], { sessionMinutes: 30 });
    for (const d of plan.days.filter((x) => !/^Yoga/.test(x.focus))) {
      const minutes = Math.round(d.exercises.reduce((s, e) => s + e.sets * (40 + e.restSec), 0) / 60 + 5);
      expect(minutes).toBeLessThanOrEqual(30);
    }
  });
  it('works for every combination of styles, days and goals without an empty session', () => {
    const all: TrainStyle[] = ['gym', 'calisthenics', 'home', 'yoga', 'mobility'];
    const failures: string[] = [];
    for (let mask = 1; mask < 32; mask++) {
      const styles = all.filter((_, i) => mask & (1 << i));
      for (const daysPerWeek of [2, 3, 4, 5, 6]) for (const goal of ['muscle_gain', 'fat_loss', 'strength', 'maintenance']) {
        const { plan } = build(styles, { daysPerWeek, goal, equipment: styles.includes('gym') ? 'gym' : styles.includes('home') ? 'home' : 'none' });
        if (plan.days.length !== daysPerWeek) failures.push(`${styles.join('+')}/${daysPerWeek}/${goal}: ${plan.days.length} days`);
        for (const d of plan.days) if (d.exercises.length === 0) failures.push(`${styles.join('+')}/${daysPerWeek}/${goal}: ${d.focus} empty`);
      }
    }
    expect(failures.slice(0, 10)).toEqual([]);
  });
});
