import { describe, expect, it } from 'vitest';
import {
  WEEKLY_SETS_TARGET,
  averageCalories,
  bucketIndex,
  bucketsForRange,
  buildInsight,
  consistencyGrid,
  epley1RM,
  formatHours,
  makeBuckets,
  nutritionByBucket,
  proteinPerDay,
  sleepByBucket,
  totalSetsByBucket,
  personalRecords,
  pickMainLifts,
  proteinHitDays,
  setsPerMuscle,
  strengthSeries,
  summarizeSleep,
  toTrainLogs,
  type TrainLog,
} from './trackerMath';
import { catalogKey, type Catalog, type CatalogEntry } from './muscleRecovery';

// Thursday 8 October 2026, 18:00 local.
const NOW = new Date(2026, 9, 8, 18, 0);
const at = (m: number, d: number, h = 10) => new Date(2026, m, d, h, 0).toISOString();

const entry = (name: string, primary: string, secondary: string[] = [], over: Partial<CatalogEntry> = {}): CatalogEntry => ({
  id: name,
  name,
  modality: 'strength',
  equipment: 'gym',
  primaryMuscle: primary,
  secondaryMuscles: secondary,
  movementPattern: 'horizontal_push',
  role: 'main',
  loadable: true,
  stimulusType: 'compound',
  loadIncrementKg: 2.5,
  harderVariationName: null,
  easierVariationName: null,
  ...over,
});
const catalog: Catalog = Object.fromEntries(
  [
    entry('Bench Press', 'chest', ['triceps', 'shoulders']),
    entry('Barbell Back Squat', 'quads', ['glutes']),
    entry('Deadlift', 'back', ['glutes', 'hamstrings']),
    entry('Dumbbell Bicep Curl', 'biceps', [], { role: 'accessory' }),
    entry('Push-Up', 'chest', ['triceps'], { loadable: false }),
  ].map((e) => [catalogKey(e.name), e])
);
const log = (exerciseName: string, completedAt: string, reps: number, weight: number): TrainLog => ({ exerciseName, completedAt, reps, weight });

describe('epley1RM', () => {
  it('is weight x (1 + reps / 30), and the weight itself for one rep', () => {
    expect(epley1RM(60, 10)).toBe(80);
    expect(epley1RM(100, 5)).toBe(116.7);
    expect(epley1RM(100, 1)).toBe(100);
  });
  it('is 0 when it cannot be estimated', () => {
    expect(epley1RM(0, 8)).toBe(0);
    expect(epley1RM(60, 0)).toBe(0);
    expect(epley1RM(-5, 8)).toBe(0);
  });
});

describe('toTrainLogs', () => {
  it('prefers achieved over prescribed values', () => {
    const [a, b] = toTrainLogs([
      { exercise_name: 'x', reps_achieved: 8, reps_prescribed: 10, weight_achieved: 60, weight_prescribed: 50, completed_at: 'a' },
      { exercise_name: 'y', reps_achieved: null, reps_prescribed: 10, weight_achieved: null, weight_prescribed: 50, completed_at: 'b' },
    ]);
    expect(a).toMatchObject({ reps: 8, weight: 60 });
    expect(b).toMatchObject({ reps: 10, weight: 50 });
  });
});

describe('buckets', () => {
  it('week range: the last 7 days, oldest first, ending today', () => {
    const b = bucketsForRange('week', NOW);
    expect(b).toHaveLength(7);
    expect(b[6].start.getDate()).toBe(8);
    expect(b[0].start.getDate()).toBe(2);
  });
  it('month range: the last 5 Monday-starting weeks', () => {
    const b = bucketsForRange('month', NOW);
    expect(b).toHaveLength(5);
    expect(b[4].start.getDate()).toBe(5); // Monday 5 Oct
    expect(b[3].start.getDate()).toBe(28); // Monday 28 Sep
  });
  it('all range: the last 12 months', () => {
    const b = bucketsForRange('all', NOW);
    expect(b).toHaveLength(12);
    expect(b[11].start.getMonth()).toBe(9);
    expect(b[0].start.getMonth()).toBe(10);
  });
  it('finds the bucket a time falls into, or -1', () => {
    const b = makeBuckets('week', 8, NOW);
    expect(bucketIndex(at(9, 6), b)).toBe(7);
    expect(bucketIndex(at(9, 4), b)).toBe(6); // Sunday 4 Oct belongs to the week of 28 Sep
    expect(bucketIndex(at(0, 1), b)).toBe(-1);
  });
});

describe('strength trend', () => {
  const logs = [
    log('Bench Press', at(8, 15), 8, 60), // week of 14 Sep
    log('Bench Press', at(8, 17), 10, 60), // same week, better set: 80
    log('Bench Press', at(9, 6), 6, 65), // week of 5 Oct: 78
    log('Barbell Back Squat', at(9, 7), 5, 100),
    log('Dumbbell Bicep Curl', at(9, 7), 12, 12),
    log('Push-Up', at(9, 7), 20, 0),
  ];
  it('picks the most trained main loadable lifts', () => {
    expect(pickMainLifts(logs, catalog)).toEqual(['Bench Press', 'Barbell Back Squat']);
    expect(pickMainLifts(logs, catalog, 1)).toEqual(['Bench Press']);
    expect(pickMainLifts([], catalog)).toEqual([]);
  });
  it('takes the best estimated 1RM per week and the change over the window', () => {
    const [bench] = strengthSeries(logs, ['Bench Press'], makeBuckets('week', 8, NOW));
    expect(bench.values[4]).toBe(80); // week of 14 Sep
    expect(bench.values[7]).toBe(78); // week of 5 Oct
    expect(bench.values.filter((v) => v === null)).toHaveLength(6);
    expect(bench.first).toBe(80);
    expect(bench.last).toBe(78);
    expect(bench.delta).toBe(-2);
  });
  it('has no delta with a single point', () => {
    const [sq] = strengthSeries(logs, ['Barbell Back Squat'], makeBuckets('week', 8, NOW));
    expect(sq.delta).toBeNull();
    expect(sq.last).toBe(116.7);
  });
});

describe('setsPerMuscle', () => {
  it('counts primary sets in full and secondary sets at half', () => {
    const logs = [log('Bench Press', at(9, 6), 8, 60), log('Bench Press', at(9, 6), 8, 60), log('Barbell Back Squat', at(9, 7), 5, 100), log('Bench Press', at(8, 1), 8, 60)];
    const r = setsPerMuscle(logs, catalog, new Date(2026, 9, 5), new Date(2026, 9, 12));
    expect(r.chest).toBe(2);
    expect(r.triceps).toBe(1);
    expect(r.shoulders).toBe(1);
    expect(r.quads).toBe(1);
    expect(r.glutes).toBe(0.5);
    expect(r.calves).toBe(0);
  });
  it('ignores exercises without catalog data', () => {
    expect(setsPerMuscle([log('Mystery', at(9, 6), 8, 10)], catalog, new Date(2026, 9, 5), new Date(2026, 9, 12)).chest).toBe(0);
  });
});

describe('consistencyGrid', () => {
  it('marks trained days, untrained days and the future, Monday first', () => {
    const logs = [log('Bench Press', at(9, 5), 8, 60), log('Bench Press', at(9, 5, 11), 8, 60), log('Bench Press', at(9, 7), 8, 60), log('Bench Press', at(8, 29), 8, 60)];
    const g = consistencyGrid(logs, NOW, 2);
    expect(g.weeks).toHaveLength(2);
    expect(g.weeks[1]).toEqual([true, false, true, false, null, null, null]); // this week: Mon 5 Oct trained, Wed 7 trained
    expect(g.weeks[0][1]).toBe(true); // Tue 29 Sep
    expect(g.sessions).toBe(3); // two sets on the same day are one session
  });
  it('is all empty without logs', () => {
    const g = consistencyGrid([], NOW, 12);
    expect(g.weeks).toHaveLength(12);
    expect(g.sessions).toBe(0);
  });
});

describe('personalRecords', () => {
  it('keeps each exercise best set, most recent record first', () => {
    const logs = [
      log('Bench Press', at(8, 1), 5, 60),
      log('Bench Press', at(9, 3), 6, 65), // best: 78
      log('Barbell Back Squat', at(8, 30), 5, 90),
      log('Push-Up', at(9, 7), 20, 0),
      log('Push-Up', at(9, 1), 25, 0), // best by reps
    ];
    const r = personalRecords(logs);
    expect(r.map((x) => x.exerciseName)).toEqual(['Bench Press', 'Push-Up', 'Barbell Back Squat']);
    expect(r[0]).toMatchObject({ weight: 65, reps: 6, score: 78 });
    expect(r[1]).toMatchObject({ reps: 25, weight: 0, score: 25 });
  });
  it('limits the list and skips empty sets', () => {
    expect(personalRecords([log('a', at(9, 1), 0, 10)])).toEqual([]);
    expect(personalRecords([log('a', at(9, 1), 5, 10), log('b', at(9, 2), 5, 10), log('c', at(9, 3), 5, 10)], 2)).toHaveLength(2);
  });
});

describe('nutrition and sleep', () => {
  const days = makeBuckets('day', 7, NOW);
  const meals = [
    { calories: 600, protein_g: 40, logged_at: at(9, 8, 8) },
    { calories: 900, protein_g: 60, logged_at: at(9, 8, 13) },
    { calories: 700, protein_g: 20, logged_at: at(9, 7, 13) },
  ];
  it('sums calories and protein per day', () => {
    const n = nutritionByBucket(meals, days);
    expect(n[6]).toEqual({ calories: 1500, proteinG: 100, logged: true, loggedDays: 1 });
    expect(n[5]).toEqual({ calories: 700, proteinG: 20, logged: true, loggedDays: 1 });
    expect(n[0].logged).toBe(false);
  });
  it('counts protein-target days at 90% of the target and averages logged days only', () => {
    const n = nutritionByBucket(meals, days);
    expect(proteinHitDays(n, 100)).toBe(1);
    expect(proteinHitDays(n, 120)).toBe(0);
    expect(proteinHitDays(n, null)).toBeNull();
    expect(averageCalories(n)).toBe(1100);
    expect(averageCalories(nutritionByBucket([], days))).toBeNull();
  });
  it('summarises sleep', () => {
    expect(summarizeSleep([7, 6, null, 8, 6.4])).toEqual({ averageHours: 6.9, nightsLogged: 4, nightsUnder: 2 });
    expect(summarizeSleep([null, null])).toEqual({ averageHours: null, nightsLogged: 0, nightsUnder: 0 });
  });
  it('formats hours', () => {
    expect(formatHours(7.2)).toBe('7h 12m');
    expect(formatHours(7)).toBe('7h 00m');
    expect(formatHours(6.999)).toBe('7h 00m');
    expect(formatHours(6.99)).toBe('6h 59m');
  });
});

describe('buildInsight', () => {
  const none = { averageHours: 7.5, nightsLogged: 5, nightsUnder: 0 };
  const base = {
    thisWeekSets: { chest: 12, quads: 12 },
    lastWeekSets: { chest: 12, quads: 12 },
    lowestMuscle: null,
    proteinHits: 5,
    nutritionDaysLogged: 6,
    sleep: none,
    sessionsLast4Weeks: 10,
  };
  const evenlyTrained = Object.fromEntries(['chest', 'back', 'shoulders', 'biceps', 'triceps', 'quads', 'hamstrings', 'glutes', 'calves', 'core'].map((m) => [m, 12]));
  it('flags a muscle under half the target two weeks running, with its recovery score', () => {
    const t = buildInsight({
      ...base,
      thisWeekSets: { ...evenlyTrained, quads: 3 },
      lastWeekSets: { ...evenlyTrained, quads: 4 },
      lowestMuscle: { muscle: 'quads', score: 44 },
    }).text;
    expect(t).toBe(`Quads is under target for the second week: 3 sets this week and 4 last week, against ${WEEKLY_SETS_TARGET}. Its recovery score is 44.`);
  });
  it('needs a few weeks of training before calling a muscle low', () => {
    const t = buildInsight({ ...base, thisWeekSets: { ...evenlyTrained, quads: 0 }, lastWeekSets: { ...evenlyTrained, quads: 0 }, sessionsLast4Weeks: 2 }).text;
    expect(t).not.toMatch(/under target/);
  });
  it('falls through to protein, then sleep, then consistency', () => {
    const ok = { ...base, thisWeekSets: evenlyTrained, lastWeekSets: evenlyTrained };
    expect(buildInsight({ ...ok, proteinHits: 2 }).text).toBe('Protein target hit on 2 of the 6 days you logged meals. A protein-first meal each day would close the gap.');
    expect(buildInsight({ ...ok, sleep: { averageHours: 6.1, nightsLogged: 5, nightsUnder: 4 } }).text).toMatch(/4 of 5 logged nights were under 6.5 hours, averaging 6h 06m/);
    expect(buildInsight(ok).text).toBe('10 training days in the last 4 weeks. Keep the rhythm and the numbers will follow.');
    expect(buildInsight({ ...ok, sessionsLast4Weeks: 0 }).text).toMatch(/Log a few sessions/);
    expect(buildInsight({ ...ok, sessionsLast4Weeks: 1 }).text).toMatch(/1 training day in/);
  });
  it('never invents numbers it was not given', () => {
    const t = buildInsight({ ...base, thisWeekSets: evenlyTrained, lastWeekSets: evenlyTrained, proteinHits: null }).text;
    expect(t).not.toMatch(/Protein/);
  });
});

describe('per-bucket helpers', () => {
  it('averages protein per logged day across a week bucket', () => {
    const weeks = makeBuckets('week', 2, NOW);
    const meals = [
      { calories: 500, protein_g: 40, logged_at: at(9, 5, 9) },
      { calories: 500, protein_g: 60, logged_at: at(9, 5, 14) },
      { calories: 500, protein_g: 80, logged_at: at(9, 7, 9) },
    ];
    const n = nutritionByBucket(meals, weeks);
    expect(n[1].loggedDays).toBe(2);
    expect(proteinPerDay(n)).toEqual([null, 90]); // 180 g over 2 logged days
  });
  it('averages sleep per bucket and ignores empty or missing nights', () => {
    const days = makeBuckets('day', 3, NOW);
    const rows = [
      { hours: 7, logged_at: at(9, 8, 7) },
      { hours: 8, logged_at: at(9, 8, 9) },
      { hours: 6.5, logged_at: at(9, 6, 7) },
      { hours: null, logged_at: at(9, 7, 7) },
      { hours: 0, logged_at: at(9, 7, 8) },
    ];
    expect(sleepByBucket(rows, days)).toEqual([6.5, null, 7.5]);
  });
  it('totals effective sets per bucket', () => {
    const buckets = makeBuckets('week', 2, NOW);
    const logs = [log('Bench Press', at(9, 6), 8, 60), log('Bench Press', at(9, 6), 8, 60), log('Barbell Back Squat', at(9, 1), 5, 100)];
    // Bench set: chest 1 + triceps 0.5 + shoulders 0.5 = 2 effective sets each; squat: quads 1 + glutes 0.5 = 1.5
    expect(totalSetsByBucket(logs, catalog, buckets)).toEqual([1.5, 4]);
  });
});
