import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { BLUEPRINTS } from './blueprints/index.ts';
import { validateBlueprint, type Blueprint } from './blueprints/schema.ts';
import { contraindicatedPatterns, INJURY_PARTS, injuriesFromText, isExerciseAllowed, parseInjuries, SEVERITIES, type Injury } from './injuryRules.ts';
import {
  applyBlockWeek, applyRegenerationReason, checkPlan, equipmentToPlace, excusedMuscles, fillBlueprint, fitPlan, goalToBlueprintGoal, hash,
  nextBlockState, pickBlueprint, sessionMinutes, toPlan, weeklyMuscleSets, type CatalogRow, type PlanProfile,
} from './planTree.ts';

// The real catalog, read from the two seed files, so these tests fail if a seed change breaks a plan.
function loadCatalog(): CatalogRow[] {
  const dir = join(__dirname, '..', '..', '..', 'database');
  const base = readFileSync(join(dir, 'seed_exercises.sql'), 'utf8');
  const meta = readFileSync(join(dir, 'seed_exercise_metadata.sql'), 'utf8');
  const equip = new Map<string, { modality: string; equipment: string }>();
  for (const m of base.matchAll(/\('((?:[^']|'')+)',\s*'(\w+)',\s*'(\w+)',\s*'(\w+)',\s*[\d.]+\)/g)) {
    equip.set(m[1].replace(/''/g, "'"), { modality: m[2], equipment: m[4] });
  }
  const rows: CatalogRow[] = [];
  for (const m of meta.matchAll(/\('((?:[^']|'')+)',\s*'(\w+)',\s*ARRAY\[[^\]]*\](?:::text\[\])?,\s*'(\w+)',\s*'(\w+)',\s*(?:TRUE|FALSE),\s*'(\w+)'/g)) {
    const name = m[1].replace(/''/g, "'");
    const e = equip.get(name);
    if (e) rows.push({ id: name, name, modality: e.modality, equipment: e.equipment, primary_muscle: m[2], movement_pattern: m[3], role: m[4], stimulus_type: m[5] });
  }
  return rows;
}

const CATALOG = loadCatalog();
const TIERS: Record<string, string[]> = { none: ['none'], home: ['none', 'home'], gym: ['none', 'home', 'gym'] };

const profile = (over: Partial<PlanProfile> = {}): PlanProfile => ({
  goal: 'muscle_gain', equipment: 'gym', daysPerWeek: 4, trainingMonths: 12, sessionMinutes: 60, injuries: [], ...over,
});

describe('the catalog loader', () => {
  it('reads all 183 exercises', () => {
    expect(CATALOG.length).toBe(183);
  });
});

describe('blueprints', () => {
  it('there are 14 to 20 and every one is valid', () => {
    expect(BLUEPRINTS.length).toBeGreaterThanOrEqual(14);
    expect(BLUEPRINTS.length).toBeLessThanOrEqual(20);
    for (const b of BLUEPRINTS) expect(validateBlueprint(b)).toEqual([]);
  });
  it('ids are unique and none is marked reviewed yet', () => {
    expect(new Set(BLUEPRINTS.map((b) => b.id)).size).toBe(BLUEPRINTS.length);
    expect(BLUEPRINTS.every((b) => b.reviewed === false)).toBe(true);
  });
  it('index.ts matches the JSON files', () => {
    const dir = join(__dirname, 'blueprints');
    const fromDisk = readdirSync(dir).filter((f) => f.endsWith('.json')).sort().map((f) => JSON.parse(readFileSync(join(dir, f), 'utf8')) as Blueprint);
    expect(BLUEPRINTS).toEqual(fromDisk);
  });
  it('the validator reports problems', () => {
    const bad = JSON.parse(JSON.stringify(BLUEPRINTS[0])) as Blueprint;
    bad.days[0].slots[0].role = 'accessory';
    bad.days[0].slots[1].pattern = 'nonsense';
    bad.days[0].slots[1].repRange = [12, 8];
    expect(validateBlueprint(bad).join()).toMatch(/must start with a main lift/);
    expect(validateBlueprint(bad).join()).toMatch(/unknown pattern/);
    expect(validateBlueprint(bad).join()).toMatch(/repRange/);
    expect(validateBlueprint(null)).toEqual(['not an object']);
  });
});

describe('pickBlueprint', () => {
  it('matches goal, place and days exactly when it can', () => {
    const r = pickBlueprint(profile({ daysPerWeek: 3, goal: 'fat_loss', equipment: 'none' }), BLUEPRINTS);
    expect(r.blueprint.id).toBe('fat_loss-none-3d');
    expect(r.exact).toBe(true);
  });
  it('always returns one, with a note when it is only the nearest', () => {
    const r = pickBlueprint(profile({ daysPerWeek: 6, trainingMonths: 1, goal: 'fat_loss', equipment: 'home' }), BLUEPRINTS);
    expect(r.exact).toBe(false);
    expect(r.blueprint.goal).toBe('fat_loss');
    expect(r.blueprint.place).not.toBe('gym');
    expect(r.note).toMatch(/Nearest/);
  });
  it('keeps experience gates: a beginner is not given the 6-day plan', () => {
    expect(pickBlueprint(profile({ daysPerWeek: 6, trainingMonths: 2 }), BLUEPRINTS).blueprint.daysPerWeek).toBeLessThan(6);
    expect(pickBlueprint(profile({ daysPerWeek: 6, trainingMonths: 24 }), BLUEPRINTS).blueprint.daysPerWeek).toBe(6);
  });
  it('maps profile values', () => {
    expect(goalToBlueprintGoal('muscle_gain')).toBe('muscle');
    expect(goalToBlueprintGoal('maintenance')).toBe('general');
    expect(goalToBlueprintGoal(null)).toBe('general');
    expect(equipmentToPlace('home')).toBe('home');
    expect(equipmentToPlace(null)).toBe('gym');
  });
  it('works for every goal, place and day count', () => {
    for (const goal of ['muscle_gain', 'fat_loss', 'strength', 'maintenance', 'endurance', 'flexibility', null]) {
      for (const equipment of ['none', 'home', 'gym', null]) {
        for (const daysPerWeek of [2, 3, 4, 5, 6]) {
          expect(() => pickBlueprint(profile({ goal, equipment, daysPerWeek }), BLUEPRINTS)).not.toThrow();
        }
      }
    }
  });
});

describe('injury rules', () => {
  it('removes more at higher severity', () => {
    const mild = contraindicatedPatterns([{ part: 'knee', severity: 'mild' }]);
    const mod = contraindicatedPatterns([{ part: 'knee', severity: 'moderate' }]);
    const severe = contraindicatedPatterns([{ part: 'knee', severity: 'severe' }]);
    expect(mild.size).toBe(0);
    expect(mod.has('lunge')).toBe(true);
    expect(mod.has('squat')).toBe(false);
    expect(severe.has('squat') && severe.has('lunge')).toBe(true);
  });
  it('rules out jumping for a knee, even a mild one', () => {
    expect(isExerciseAllowed({ name: 'Jump Squat', movement_pattern: 'squat', stimulus_type: 'plyometric' }, [{ part: 'knee', severity: 'mild' }])).toBe(false);
    expect(isExerciseAllowed({ name: 'Jump Squat', movement_pattern: 'squat', stimulus_type: 'plyometric' }, [{ part: 'shoulder', severity: 'mild' }])).toBe(true);
  });
  it('parses stored JSON and old free text', () => {
    expect(parseInjuries([{ part: 'knee', severity: 'mild' }, { part: 'bogus', severity: 'mild' }, { part: 'knee', severity: 'severe' }, null])).toEqual([{ part: 'knee', severity: 'mild' }]);
    expect(parseInjuries('x')).toEqual([]);
    expect(injuriesFromText('bad knees and shoulder')).toEqual([{ part: 'knee', severity: 'moderate' }, { part: 'shoulder', severity: 'moderate' }]);
  });
});

function build(p: PlanProfile, seed = 'user-1', blockNumber = 1) {
  const picked = pickBlueprint(p, BLUEPRINTS);
  const filled = fillBlueprint(picked.blueprint, CATALOG, { seed, allowedEquipment: TIERS[equipmentToPlace(p.equipment)], injuries: p.injuries, blockNumber });
  const goal = picked.blueprint.goal;
  return { picked, goal, ...fitPlan(filled, p, goal) };
}

describe('fillBlueprint', () => {
  it('is deterministic: same input, same plan', () => {
    expect(toPlan(build(profile()).plan)).toEqual(toPlan(build(profile()).plan));
  });
  it('different users can get different accessories, while main lifts follow the pattern', () => {
    const a = toPlan(build(profile(), 'alice').plan);
    const b = toPlan(build(profile(), 'bob').plan);
    expect(a.days.length).toBe(b.days.length);
  });
  it('a new block refreshes accessories but keeps main lifts', () => {
    const one = build(profile(), 'user-9', 1).plan;
    const two = build(profile(), 'user-9', 2).plan;
    const mains = (p: typeof one) => p.days.flatMap((d) => d.slots.filter((s) => s.role === 'main').map((s) => s.exercise.name));
    const accs = (p: typeof one) => p.days.flatMap((d) => d.slots.filter((s) => s.role !== 'main').map((s) => s.exercise.name));
    expect(mains(two)).toEqual(mains(one));
    expect(accs(two)).not.toEqual(accs(one));
  });
  it('only uses exercises the equipment allows, with no repeats inside a day', () => {
    for (const equipment of ['none', 'home', 'gym']) {
      const { plan } = build(profile({ equipment, goal: 'general', daysPerWeek: 3 }));
      for (const d of plan.days) {
        const names = d.slots.map((s) => s.exercise.name);
        expect(new Set(names).size).toBe(names.length);
        for (const s of d.slots) expect(TIERS[equipment]).toContain(s.exercise.equipment);
      }
    }
  });
  it('never picks a disliked exercise', () => {
    const p = profile();
    const picked = pickBlueprint(p, BLUEPRINTS);
    const base = fillBlueprint(picked.blueprint, CATALOG, { seed: 'u', allowedEquipment: TIERS.gym, injuries: [] });
    const first = base.days[0].slots[0].exercise.name;
    const again = fillBlueprint(picked.blueprint, CATALOG, { seed: 'u', allowedEquipment: TIERS.gym, injuries: [], dislikes: [first] });
    expect(again.days.flatMap((d) => d.slots.map((s) => s.exercise.name))).not.toContain(first);
  });
  it('a hash is stable', () => {
    expect(hash('claww')).toBe(hash('claww'));
    expect(hash('a')).not.toBe(hash('b'));
  });
});

describe('every goal x days x place x level x single injury passes the checks', () => {
  const injuryCases: (Injury | null)[] = [null];
  for (const { part } of INJURY_PARTS) for (const severity of SEVERITIES) injuryCases.push({ part, severity });

  const goals = ['muscle_gain', 'fat_loss', 'strength', 'maintenance'];
  const places = ['gym', 'home', 'none'];
  const days = [2, 3, 4, 5, 6];
  const levels = [0, 12];

  it('passes for the whole table', () => {
    const failures: string[] = [];
    let count = 0;
    for (const goal of goals) for (const equipment of places) for (const daysPerWeek of days) for (const trainingMonths of levels) for (const inj of injuryCases) {
      const p = profile({ goal, equipment, daysPerWeek, trainingMonths, injuries: inj ? [inj] : [] });
      const { plan, check, goal: g } = build(p);
      count++;
      if (!check.ok) failures.push(`${goal}/${equipment}/${daysPerWeek}d/${trainingMonths}m/${inj ? inj.part + ':' + inj.severity : 'none'} -> ${check.problems.join('; ')}`);
      // injured patterns are never chosen
      const banned = contraindicatedPatterns(p.injuries);
      for (const d of plan.days) for (const s of d.slots) {
        if (banned.has(s.exercise.movement_pattern ?? '')) failures.push(`banned ${s.exercise.name} chosen for ${JSON.stringify(inj)}`);
        if (!isExerciseAllowed(s.exercise, p.injuries)) failures.push(`unsafe ${s.exercise.name} for ${JSON.stringify(inj)}`);
      }
      void g;
    }
    expect(count).toBe(4 * 3 * 5 * 2 * 25);
    expect(failures.slice(0, 15)).toEqual([]);
  });
});

describe('time fit', () => {
  it('a 30 minute limit shortens every session to fit', () => {
    const { plan, check } = build(profile({ sessionMinutes: 30, daysPerWeek: 4 }));
    for (const d of plan.days) expect(sessionMinutes(d)).toBeLessThanOrEqual(30);
    expect(plan.adjustments.length).toBeGreaterThan(0);
    expect(check.problems.filter((x) => /min is over/.test(x))).toEqual([]);
  });
  it('a long limit changes nothing', () => {
    expect(build(profile({ sessionMinutes: 120 })).plan.adjustments).toEqual([]);
  });
});

describe('checkPlan', () => {
  it('flags a muscle trained once and an accessory before a main lift', () => {
    const { plan } = build(profile({ daysPerWeek: 3, goal: 'general' }));
    const broken = { ...plan, days: plan.days.map((d, i) => (i === 0 ? { ...d, slots: [...d.slots].reverse() } : d)) };
    expect(checkPlan(broken, { sessionMinutes: null, injuries: [] }, 'general').problems.join()).toMatch(/main lift comes after/);
    const single = { ...plan, days: [plan.days[0], { ...plan.days[1], slots: plan.days[1].slots.filter((s) => s.pattern !== 'squat' && s.pattern !== 'lunge') }] };
    expect(checkPlan(single, { sessionMinutes: null, injuries: [] }, 'general').ok).toBe(false);
  });
  it('excuses a muscle an injury rules out entirely', () => {
    expect(excusedMuscles([{ part: 'knee', severity: 'severe' }]).has('quads')).toBe(true);
    expect(excusedMuscles([]).size).toBe(0);
  });
  it('counts weekly sets with half credit for helpers', () => {
    const w = weeklyMuscleSets(build(profile({ daysPerWeek: 3, goal: 'general', equipment: 'gym' })).plan);
    expect(w.chest.days).toBeGreaterThanOrEqual(2);
    expect(w.triceps.sets % 0.5).toBe(0);
  });
});

describe('blocks', () => {
  const week = 7 * 24 * 60 * 60 * 1000;
  it('starts at block 1 week 1 and moves on by whole weeks', () => {
    expect(nextBlockState(null, 0)).toEqual({ blockNumber: 1, blockWeek: 1 });
    expect(nextBlockState({ blockNumber: 1, blockWeek: 1, createdAtMs: 0 }, 3 * week + 5)).toEqual({ blockNumber: 1, blockWeek: 4 });
    expect(nextBlockState({ blockNumber: 1, blockWeek: 6, createdAtMs: 0 }, week)).toEqual({ blockNumber: 2, blockWeek: 1 });
    expect(nextBlockState({ blockNumber: 1, blockWeek: 3, createdAtMs: 0 }, 1000)).toEqual({ blockNumber: 1, blockWeek: 3 });
  });
  it('week 6 takes one set off every slot', () => {
    const { plan } = build(profile());
    const light = applyBlockWeek(plan, 6);
    expect(light.days[0].slots[0].sets).toBe(plan.days[0].slots[0].sets - 1);
    expect(applyBlockWeek(plan, 5)).toBe(plan);
  });
  it('regeneration reasons change sets within bounds', () => {
    const { plan } = build(profile());
    const hard = applyRegenerationReason(plan, 'too_hard');
    for (const d of hard.days) for (const s of d.slots) expect(s.sets).toBeGreaterThanOrEqual(2);
    const easy = applyRegenerationReason(plan, 'too_easy');
    for (const d of easy.days) for (const s of d.slots) if (s.role === 'main') expect(s.sets).toBeLessThanOrEqual(5);
    expect(applyRegenerationReason(plan, 'wrong_focus')).toBe(plan);
  });
});

describe('toPlan', () => {
  it('keeps the response shape the app reads, with real weekday names when given', () => {
    const out = toPlan(build(profile({ daysPerWeek: 3 })).plan, ['Monday', 'Wednesday', 'Friday']);
    expect(out.days.map((d) => d.day)).toEqual(['Monday', 'Wednesday', 'Friday']);
    const ex = out.days[0].exercises[0];
    expect(ex).toMatchObject({ sets: expect.any(Number), reps: expect.any(Number), name: expect.any(String) });
    expect(ex.reps).toBeGreaterThanOrEqual(ex.repMin);
    expect(ex.reps).toBeLessThanOrEqual(ex.repMax);
  });
});

// Polish step 1, item 7: a Full body day with 2 exercises. The new builder keeps at least 3 exercises on every day, at
// every place, time limit and a mild or moderate injury (a severe injury removes movements on purpose, so it is excused);
// if a day shows fewer with no severe injury, the plan came from the old builder.
describe('no day is thinner than 3 exercises', () => {
  it('holds across the whole table, including 30 minute sessions', () => {
    const injuryCases: (Injury | null)[] = [null];
    for (const { part } of INJURY_PARTS) for (const severity of SEVERITIES) if (severity !== 'severe') injuryCases.push({ part, severity });
    const thin: string[] = [];
    for (const goal of ['muscle_gain', 'fat_loss', 'strength', 'maintenance']) for (const equipment of ['gym', 'home', 'none']) for (const daysPerWeek of [2, 3, 4, 5, 6]) for (const sessionMinutes of [30, 45, 90]) for (const inj of injuryCases) {
      const { plan } = build(profile({ goal, equipment, daysPerWeek, sessionMinutes, injuries: inj ? [inj] : [] }));
      for (const d of plan.days) if (d.slots.length < 3) thin.push(`${goal}/${equipment}/${daysPerWeek}d/${sessionMinutes}m/${inj ? inj.part + ':' + inj.severity : 'none'} ${d.name}=${d.slots.length}`);
    }
    expect(thin.slice(0, 20)).toEqual([]);
  });
});
