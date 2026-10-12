import { describe, expect, it } from 'vitest';
import {
  ADAPTIVE_CONFIG,
  bandFor,
  decideExercise,
  evaluateSession,
  fatigueFromSets,
  fatigueLevel,
  initialState,
  isTopOfRange,
  muscleRecovery,
  performanceRatio,
  prescribe,
  timePoints,
  wholeBodyRecovery,
  type ExerciseMeta,
  type ExerciseState,
  type SessionResult,
} from './adaptive';

const barbell: ExerciseMeta = { name: 'Bench Press', loadable: true, incrementKg: 2.5, primaryMuscle: 'chest' };
const dumbbell: ExerciseMeta = { name: 'Dumbbell Bicep Curl', loadable: true, incrementKg: 1, primaryMuscle: 'biceps' };
const bodyweight: ExerciseMeta = { name: 'Push-Up', loadable: false, incrementKg: null, primaryMuscle: 'chest', hasHarderVariation: true };

const base = (over: Partial<ExerciseState> = {}): ExerciseState => ({
  ...initialState({ repMin: 6, repMax: 10, startReps: 8, sets: 3, weightKg: 60 }),
  ...over,
});

let day = 0;
const date = () => `2026-10-${String(++day).padStart(2, '0')}`;
const session = (state: ExerciseState, reps: number[], over: Partial<SessionResult> = {}): SessionResult => ({
  date: date(),
  reps,
  prescribed: { weightKg: state.next.weightKg, reps: state.next.repTarget, sets: state.next.sets },
  ...over,
});

describe('performance ratio and top of range', () => {
  it('is achieved reps over rep target x sets', () => {
    expect(performanceRatio({ date: 'x', reps: [8, 8, 8], prescribed: { weightKg: 60, reps: 8, sets: 3 } })).toBe(1);
    expect(performanceRatio({ date: 'x', reps: [9, 9, 7], prescribed: { weightKg: 60, reps: 9, sets: 3 } })).toBeCloseTo(25 / 27, 6);
    expect(performanceRatio({ date: 'x', reps: [], prescribed: { weightKg: 60, reps: 0, sets: 3 } })).toBe(0);
  });
  it('top of range needs max reps on every prescribed set', () => {
    const p = { weightKg: 60, reps: 10, sets: 3 };
    expect(isTopOfRange({ date: 'x', reps: [10, 10, 10], prescribed: p }, 10)).toBe(true);
    expect(isTopOfRange({ date: 'x', reps: [10, 10, 9], prescribed: p }, 10)).toBe(false);
    expect(isTopOfRange({ date: 'x', reps: [10, 10], prescribed: p }, 10)).toBe(false);
  });
});

describe('performance thresholds', () => {
  // repTarget 8, sets 3: 24 reps is 100%. Boundaries around each cut.
  const run = (reps: number[]) => {
    const s = base();
    return evaluateSession(s, session(s, reps), barbell);
  };
  it('>= 100% raises the rep target by 1', () => {
    const r = run([8, 8, 8]);
    expect(r.commands).toEqual(['INCREASE_REPS']);
    expect(r.state.next.repTarget).toBe(9);
  });
  it('100% at the range max holds (cannot go past the range)', () => {
    const s = base({ next: { weightKg: 60, repTarget: 10, sets: 3 } });
    const r = evaluateSession(s, session(s, [10, 10, 9]), barbell);
    expect(r.ratio).toBeCloseTo(29 / 30, 6);
  });
  it('85 to 99% holds', () => {
    // 21/24 = 87.5%
    const r = run([7, 7, 7]);
    expect(r.commands).toEqual(['HOLD']);
    expect(r.state.next.repTarget).toBe(8);
    // exactly 85%: 20.4 is not an integer, so use 17/20 with 4 sets of 5
    const s = base({ next: { weightKg: 60, repTarget: 5, sets: 4 }, repMin: 3, repMax: 8 });
    const r2 = evaluateSession(s, session(s, [4, 4, 4, 5]), barbell);
    expect(r2.ratio).toBeCloseTo(0.85, 6);
    expect(r2.commands).toEqual(['HOLD']);
  });
  it('70 to 84% lowers the rep target by 1', () => {
    // 17/24 = 70.8%
    const r = run([6, 6, 5]);
    expect(r.commands).toEqual(['DECREASE_REPS']);
    expect(r.state.next.repTarget).toBe(7);
    expect(r.state.next.weightKg).toBe(60);
    // exactly 70%: 14/20, 4 sets of 5
    const s = base({ next: { weightKg: 60, repTarget: 5, sets: 4 }, repMin: 3, repMax: 8 });
    const r2 = evaluateSession(s, session(s, [4, 3, 4, 3]), barbell);
    expect(r2.ratio).toBeCloseTo(0.7, 6);
    expect(r2.commands).toEqual(['DECREASE_REPS']);
  });
  it('< 70% lowers the weight by one increment', () => {
    // 16/24 = 66.7%
    const r = run([6, 5, 5]);
    expect(r.commands).toEqual(['DECREASE_WEIGHT']);
    expect(r.state.next.weightKg).toBe(57.5);
    expect(r.state.failureStreak).toBe(1);
  });
  it('rep target never goes below the range minimum', () => {
    const s = base({ next: { weightKg: 60, repTarget: 6, sets: 3 } });
    const r = evaluateSession(s, session(s, [5, 4, 4]), barbell); // 13/18 = 72%
    expect(r.state.next.repTarget).toBe(6);
  });
});

describe('deload after two failed sessions in a row', () => {
  it('drops the weight 5%, rounded to 2.5 kg, on the second failure', () => {
    let s = base({ next: { weightKg: 100, repTarget: 8, sets: 3 } });
    const first = evaluateSession(s, session(s, [5, 5, 5]), barbell);
    expect(first.commands).toEqual(['DECREASE_WEIGHT']);
    s = first.state;
    expect(s.next.weightKg).toBe(97.5);
    const second = evaluateSession(s, session(s, [5, 5, 5]), barbell);
    expect(second.commands).toEqual(['DELOAD']);
    // 97.5 x 0.95 = 92.625 -> 92.5
    expect(second.state.next.weightKg).toBe(92.5);
    expect(second.state.failureStreak).toBe(0);
  });
  it('a good session in between resets the failure count', () => {
    let s = base();
    s = evaluateSession(s, session(s, [5, 5, 5]), barbell).state;
    s = evaluateSession(s, session(s, [8, 8, 8]), barbell).state;
    expect(s.failureStreak).toBe(0);
  });
  it('bodyweight deload lowers the rep target by 2', () => {
    let s = base({ next: { weightKg: null, repTarget: 9, sets: 3 } });
    s = evaluateSession(s, session(s, [4, 4, 4]), bodyweight).state;
    const r = evaluateSession(s, session(s, [3, 3, 3]), bodyweight);
    expect(r.commands).toEqual(['DELOAD']);
    expect(r.state.next.repTarget).toBeLessThan(9);
  });
});

describe('two top-of-range sessions in a row', () => {
  it('weight goes up one increment and reps restart at the range minimum', () => {
    let s = base({ next: { weightKg: 60, repTarget: 10, sets: 3 } });
    s = evaluateSession(s, session(s, [10, 10, 10]), barbell).state;
    expect(s.topStreak).toBe(1);
    const r = evaluateSession(s, session(s, [10, 10, 10]), barbell);
    expect(r.commands).toEqual(['INCREASE_WEIGHT']);
    expect(r.state.next.weightKg).toBe(62.5);
    expect(r.state.next.repTarget).toBe(6);
    expect(r.state.topStreak).toBe(0);
    expect(r.state.successCycles).toBe(1);
  });
  it('uses the dumbbell increment for dumbbell lifts', () => {
    let s = base({ next: { weightKg: 10, repTarget: 10, sets: 3 } });
    s = evaluateSession(s, session(s, [10, 10, 10]), dumbbell).state;
    const r = evaluateSession(s, session(s, [10, 10, 10]), dumbbell);
    expect(r.state.next.weightKg).toBe(11);
  });
  it('a miss between two top sessions resets the counter', () => {
    let s = base({ next: { weightKg: 60, repTarget: 10, sets: 3 } });
    s = evaluateSession(s, session(s, [10, 10, 10]), barbell).state;
    s = evaluateSession(s, session(s, [10, 9, 9]), barbell).state;
    expect(s.topStreak).toBe(0);
  });
  it('the same exercise twice on one calendar day counts once', () => {
    let s = base({ next: { weightKg: 60, repTarget: 10, sets: 3 } });
    const a = evaluateSession(s, { ...session(s, [10, 10, 10]), date: '2026-11-01' }, barbell);
    expect(a.state.topStreak).toBe(1);
    const b = evaluateSession(a.state, { ...session(a.state, [10, 10, 10]), date: '2026-11-01' }, barbell);
    expect(b.state.topStreak).toBe(1);
    expect(b.state.next.weightKg).toBe(60);
    const c = evaluateSession(b.state, { ...session(b.state, [10, 10, 10]), date: '2026-11-02' }, barbell);
    expect(c.commands).toEqual(['INCREASE_WEIGHT']);
  });
});

describe('sets', () => {
  it('adds a set instead of weight after repeated weight increases', () => {
    let s = base({ next: { weightKg: 60, repTarget: 10, sets: 3 }, successCycles: ADAPTIVE_CONFIG.sets.cyclesBeforeSetUp });
    s = evaluateSession(s, session(s, [10, 10, 10]), barbell).state;
    const r = evaluateSession(s, session(s, [10, 10, 10]), barbell);
    expect(r.commands).toEqual(['INCREASE_SETS']);
    expect(r.state.next.sets).toBe(4);
    expect(r.state.next.weightKg).toBe(60);
    expect(r.state.successCycles).toBe(0);
  });
  it('never goes past the maximum', () => {
    let s = base({ next: { weightKg: 60, repTarget: 10, sets: ADAPTIVE_CONFIG.sets.max }, successCycles: 5 });
    s = evaluateSession(s, session(s, [10, 10, 10, 10, 10]), barbell).state;
    const r = evaluateSession(s, session(s, [10, 10, 10, 10, 10]), barbell);
    expect(r.commands).toEqual(['INCREASE_WEIGHT']);
  });
  it('removes a set after repeated decline, never below the minimum', () => {
    let s = base({ next: { weightKg: 60, repTarget: 8, sets: 3 } });
    // Two reps under target on every set: 75%, 71%, 67%, each under the 85% hold line.
    for (let i = 0; i < 3; i++) s = evaluateSession(s, session(s, Array(3).fill(s.next.repTarget - 2)), barbell).state;
    expect(s.next.sets).toBe(2);
    const low = base({ next: { weightKg: 60, repTarget: 8, sets: ADAPTIVE_CONFIG.sets.min }, declineStreak: 2 });
    const r = evaluateSession(low, session(low, [6, 6]), barbell);
    expect(r.state.next.sets).toBe(ADAPTIVE_CONFIG.sets.min);
  });
});

describe('bodyweight exercises', () => {
  it('reps climb to the range max, then the engine suggests the harder variation', () => {
    let s = base({ next: { weightKg: null, repTarget: 8, sets: 3 } });
    s = evaluateSession(s, session(s, [8, 8, 8]), bodyweight).state;
    expect(s.next.repTarget).toBe(9);
    s = evaluateSession(s, session(s, [9, 9, 9]), bodyweight).state;
    expect(s.next.repTarget).toBe(10);
    s = evaluateSession(s, session(s, [10, 10, 10]), bodyweight).state;
    const r = evaluateSession(s, session(s, [10, 10, 10]), bodyweight);
    expect(r.commands).toEqual(['SUGGEST_HARDER_VARIATION']);
    expect(r.state.next.weightKg).toBeNull();
  });
  it('without a harder variation it just holds at the top', () => {
    let s = base({ next: { weightKg: null, repTarget: 10, sets: 3 } });
    const meta = { ...bodyweight, hasHarderVariation: false };
    s = evaluateSession(s, session(s, [10, 10, 10]), meta).state;
    const r = evaluateSession(s, session(s, [10, 10, 10]), meta);
    expect(r.commands).toEqual(['HOLD']);
  });
});

describe('whole-body recovery', () => {
  it('classifies sleep at 7 and 6 hours', () => {
    expect(wholeBodyRecovery({ sleepHours: 7 }).sleep).toBe('good');
    expect(wholeBodyRecovery({ sleepHours: 6.9 }).sleep).toBe('moderate');
    expect(wholeBodyRecovery({ sleepHours: 6 }).sleep).toBe('moderate');
    expect(wholeBodyRecovery({ sleepHours: 5.9 }).sleep).toBe('poor');
  });
  it('classifies protein at 90% and 75%', () => {
    expect(wholeBodyRecovery({ proteinPct: 0.9 }).protein).toBe('good');
    expect(wholeBodyRecovery({ proteinPct: 0.89 }).protein).toBe('moderate');
    expect(wholeBodyRecovery({ proteinPct: 0.75 }).protein).toBe('moderate');
    expect(wholeBodyRecovery({ proteinPct: 0.74 }).protein).toBe('poor');
  });
  it('fatigue level comes from the muscle score: 70+ low, 50-69 moderate, under 50 high', () => {
    expect(fatigueLevel(70)).toBe('low');
    expect(fatigueLevel(69)).toBe('moderate');
    expect(fatigueLevel(50)).toBe('moderate');
    expect(fatigueLevel(49)).toBe('high');
    expect(wholeBodyRecovery({ muscleScore: 49 }).fatigue).toBe('poor');
  });
  it('combines inputs: good, moderate, poor, several poor', () => {
    expect(wholeBodyRecovery({ sleepHours: 8, proteinPct: 1, muscleScore: 90 }).state).toBe('good');
    expect(wholeBodyRecovery({ sleepHours: 6.5, proteinPct: 1, muscleScore: 90 }).state).toBe('moderate');
    expect(wholeBodyRecovery({ sleepHours: 5, proteinPct: 1, muscleScore: 90 }).state).toBe('poor');
    expect(wholeBodyRecovery({ sleepHours: 5, proteinPct: 0.5, muscleScore: 90 }).state).toBe('several_poor');
  });
  it('leaves unknown inputs out instead of inventing them', () => {
    const r = wholeBodyRecovery({});
    expect(r.state).toBe('good');
    expect(r.sleep).toBeNull();
    expect(r.poorCount).toBe(0);
  });
});

describe('muscle recovery score', () => {
  it('time bands: <24 20, 24-48 50, 48-72 75, 72-96 90, 96+ 100', () => {
    expect([0, 23.9, 24, 47.9, 48, 71.9, 72, 95.9, 96, 200].map((h) => timePoints(h))).toEqual([20, 20, 50, 50, 75, 75, 90, 90, 100, 100]);
  });
  it('applies 0.40 / 0.25 / 0.20 / 0.15 to fatigue, time, soreness, readiness', () => {
    // fatigue 55, time 48-72h -> 75, soreness 2 -> 75, readiness normal -> 85
    const r = muscleRecovery({ fatigue: 55, hoursSinceTrained: 60, soreness: 2, readiness: 'normal' });
    // 55*0.40 + 75*0.25 + 75*0.20 + 85*0.15 = 22 + 18.75 + 15 + 12.75 = 68.5
    expect(r.score).toBe(69);
    expect(r.band).toBe('Moderate');
    expect(r.confidence).toBe('high');
  });
  it('soreness 0-5 maps to 100/90/75/55/30/10', () => {
    const at = (soreness: number) => muscleRecovery({ fatigue: 100, hoursSinceTrained: 100, soreness, readiness: 'strong' }).score;
    // all other parts 100, so score = 80 + 0.20 * points
    expect([0, 1, 2, 3, 4, 5].map(at)).toEqual([100, 98, 95, 91, 86, 82]);
  });
  it('readiness maps Strong 100, Normal 85, Slightly weak 65, Weak 40, Very weak 20', () => {
    const at = (readiness: 'strong' | 'normal' | 'slightly_weak' | 'weak' | 'very_weak') =>
      muscleRecovery({ fatigue: 100, hoursSinceTrained: 100, soreness: 0, readiness }).score;
    expect(['strong', 'normal', 'slightly_weak', 'weak', 'very_weak'].map((r) => at(r as 'strong'))).toEqual([100, 98, 95, 91, 88]);
  });
  it('clamps to 0-100', () => {
    expect(muscleRecovery({ fatigue: 500, hoursSinceTrained: 500, soreness: 0, readiness: 'strong' }).score).toBe(100);
    expect(muscleRecovery({ fatigue: -50, hoursSinceTrained: 1, soreness: 5, readiness: 'very_weak' }).score).toBeGreaterThanOrEqual(0);
  });
  it('bands: 85+ Excellent, 70-84 Good, 50-69 Moderate, 30-49 Low, under 30 Very low', () => {
    expect([100, 85, 84, 70, 69, 50, 49, 30, 29, 0].map((n) => bandFor(n))).toEqual([
      'Excellent', 'Excellent', 'Good', 'Good', 'Moderate', 'Moderate', 'Low', 'Low', 'Very low', 'Very low',
    ]);
  });
  it('missing check-in lowers confidence and is never invented', () => {
    const noCheckin = muscleRecovery({ fatigue: 80, hoursSinceTrained: 80, soreness: null, readiness: null });
    expect(noCheckin.confidence).toBe('low');
    expect(noCheckin.missing).toEqual(['soreness', 'readiness']);
    // rescaled over fatigue + time only: (80*0.40 + 90*0.25) / 0.65
    expect(noCheckin.score).toBe(Math.round((80 * 0.4 + 90 * 0.25) / 0.65));
    expect(muscleRecovery({ fatigue: 80, hoursSinceTrained: 80, soreness: 1, readiness: null }).confidence).toBe('medium');
    expect(muscleRecovery({ fatigue: 80, hoursSinceTrained: 80, soreness: 1, readiness: 'normal', rirMissing: true }).confidence).toBe('medium');
    expect(muscleRecovery({ fatigue: null, hoursSinceTrained: 80, soreness: 1, readiness: 'normal' }).confidence).toBe('low');
  });
  it('returns no score when nothing is known', () => {
    const r = muscleRecovery({ fatigue: null, hoursSinceTrained: null, soreness: null, readiness: null });
    expect(r.score).toBeNull();
    expect(r.band).toBeNull();
    expect(r.confidence).toBe('low');
  });
});

describe('fatigue from sets', () => {
  it('uses the points table and flags missing RIR', () => {
    // 12 compound sets at RIR 1: 12 x 1.0 x 1.25 = 15 points -> 100 - 75 = 25
    const hard = Array.from({ length: 12 }, () => ({ stimulus: 'compound', rir: 1 }));
    expect(fatigueFromSets(hard)).toEqual({ score: 25, rirMissing: false });
    // 6 compound sets at RIR 2: 6 points -> 70
    expect(fatigueFromSets(Array.from({ length: 6 }, () => ({ stimulus: 'compound', rir: 2 }))).score).toBe(70);
    const unknown = fatigueFromSets([{ stimulus: 'compound', rir: null }]);
    expect(unknown.rirMissing).toBe(true);
    expect(fatigueFromSets([])).toEqual({ score: 100, rirMissing: false });
  });
  it('secondary-muscle sets count for a share, isolation counts less', () => {
    expect(fatigueFromSets([{ stimulus: 'compound', rir: 2, share: 0.5 }]).score).toBe(98); // 100 - 0.5*5 = 97.5 -> 98
    expect(fatigueFromSets([{ stimulus: 'isolation', rir: 2 }]).score).toBe(97); // 100 - 3.5 = 96.5 -> 97
  });
});

describe('prescription under recovery', () => {
  const state = (over: Partial<ExerciseState> = {}) => base({
    last: { weightKg: 60, repTarget: 10, sets: 3 },
    next: { weightKg: 62.5, repTarget: 6, sets: 3 },
    pendingCommands: ['INCREASE_WEIGHT'],
    pendingReason: 'Top of range 2 sessions running (60 kg x 10), so the weight goes to 62.5 kg and reps restart at 6.',
    ...over,
  });
  it('good recovery allows the full progression', () => {
    const p = prescribe(state(), barbell, { sleepHours: 8, proteinPct: 1, muscleScore: 90 });
    expect(p).toMatchObject({ weightKg: 62.5, reps: 6, sets: 3, commands: ['INCREASE_WEIGHT'] });
  });
  it('moderate recovery holds last session numbers', () => {
    const p = prescribe(state(), barbell, { sleepHours: 6.5, proteinPct: 1, muscleScore: 90 });
    expect(p).toMatchObject({ weightKg: 60, reps: 10, sets: 3 });
    expect(p.commands).toContain('BLOCK_PROGRESSION');
  });
  it('poor recovery reduces by a set and blocks progression', () => {
    const p = prescribe(state(), barbell, { sleepHours: 5.5, proteinPct: 1, muscleScore: 90 });
    expect(p).toMatchObject({ weightKg: 60, reps: 10, sets: 2, commands: ['BLOCK_PROGRESSION', 'REDUCE_SETS_TODAY'] });
  });
  it('a Low or Very low primary muscle blocks progression for that exercise only', () => {
    const low = prescribe(state(), barbell, { sleepHours: 8, proteinPct: 1, muscleScore: 48 });
    expect(low.commands).toEqual(['BLOCK_PROGRESSION', 'REDUCE_SETS_TODAY']);
    expect(low.sets).toBe(2);
    const moderate = prescribe(state(), barbell, { sleepHours: 8, proteinPct: 1, muscleScore: 65 });
    expect(moderate.commands).toContain('BLOCK_PROGRESSION'); // moderate fatigue = hold
    expect(moderate.sets).toBe(3);
  });
  it('several poor inputs reduce and block', () => {
    const p = prescribe(state(), barbell, { sleepHours: 5, proteinPct: 0.5, muscleScore: 90 });
    expect(p.commands).toEqual(['BLOCK_PROGRESSION', 'REDUCE_SETS_TODAY']);
  });
  it('never invents missing inputs: no data means full demand', () => {
    expect(prescribe(state(), barbell, {}).weightKg).toBe(62.5);
  });
  it('first session of a loadable exercise asks the user to calibrate', () => {
    const fresh = initialState({ repMin: 6, repMax: 10, startReps: 8, sets: 3, weightKg: null });
    const p = prescribe(fresh, barbell, {});
    expect(p.commands).toEqual(['CALIBRATE']);
    expect(p.weightKg).toBeNull();
  });
  it('a bodyweight exercise is prescribed without calibration', () => {
    const fresh = initialState({ repMin: 8, repMax: 15, startReps: 10, sets: 3, weightKg: null });
    expect(prescribe(fresh, bodyweight, {}).reps).toBe(10);
  });
  it('a blocked session keeps the pending progression and does not count toward streaks', () => {
    const s = state({ topStreak: 1 });
    const r = evaluateSession(s, { date: '2026-12-01', reps: [10, 10], prescribed: { weightKg: 60, reps: 10, sets: 2 }, blocked: true }, barbell);
    expect(r.state.topStreak).toBe(1);
    expect(r.state.next).toEqual(s.next);
    expect(r.state.last).toEqual({ weightKg: 60, repTarget: 10, sets: 2 });
  });
});

describe('worked example: bench press over five sessions (plan section 13)', () => {
  // Range 6-10, 3 sets. Recovery is Good every day except session 5.
  const good = { sleepHours: 8, proteinPct: 1, muscleScore: 90 };
  it('reproduces every row of the table', () => {
    let s = initialState({ repMin: 6, repMax: 10, startReps: 8, sets: 3, weightKg: 60 });

    // 1: prescribed 60 x 8 x 3, did 8, 8, 8 -> 100%, rep target 8 -> 9
    let p = prescribe(s, barbell, good);
    expect([p.weightKg, p.reps, p.sets]).toEqual([60, 8, 3]);
    let e = evaluateSession(s, { date: '2026-10-01', reps: [8, 8, 8], prescribed: { weightKg: p.weightKg, reps: p.reps, sets: p.sets } }, barbell);
    expect(Math.round(e.ratio * 100)).toBe(100);
    expect(e.commands).toEqual(['INCREASE_REPS']);
    expect(e.state.next.repTarget).toBe(9);
    s = e.state;

    // 2: prescribed 60 x 9 x 3, did 9, 9, 7 -> 93%, hold
    p = prescribe(s, barbell, good);
    expect([p.weightKg, p.reps, p.sets]).toEqual([60, 9, 3]);
    e = evaluateSession(s, { date: '2026-10-03', reps: [9, 9, 7], prescribed: { weightKg: p.weightKg, reps: p.reps, sets: p.sets } }, barbell);
    expect(Math.round(e.ratio * 100)).toBe(93);
    expect(e.commands).toEqual(['HOLD']);
    s = e.state;

    // 3: prescribed 60 x 9 x 3, did 10, 10, 10 -> top of range, rep target 10, top counter 1 of 2
    p = prescribe(s, barbell, good);
    expect([p.weightKg, p.reps, p.sets]).toEqual([60, 9, 3]);
    e = evaluateSession(s, { date: '2026-10-05', reps: [10, 10, 10], prescribed: { weightKg: p.weightKg, reps: p.reps, sets: p.sets } }, barbell);
    expect(e.topOfRange).toBe(true);
    expect(e.state.next.repTarget).toBe(10);
    expect(e.state.topStreak).toBe(1);
    expect(e.reason).toBe('Rep target 10, top counter 1 of 2.');
    s = e.state;

    // 4: prescribed 60 x 10 x 3, did 10, 10, 10 -> top, 2nd time: weight 60 -> 62.5, reps back to 6
    p = prescribe(s, barbell, good);
    expect([p.weightKg, p.reps, p.sets]).toEqual([60, 10, 3]);
    e = evaluateSession(s, { date: '2026-10-07', reps: [10, 10, 10], prescribed: { weightKg: p.weightKg, reps: p.reps, sets: p.sets } }, barbell);
    expect(e.commands).toEqual(['INCREASE_WEIGHT']);
    expect(e.state.next).toEqual({ weightKg: 62.5, repTarget: 6, sets: 3 });
    s = e.state;

    // 5: would be 62.5 x 6 x 3. Slept 5.5 h and chest is 48: progression blocked,
    // last session's numbers and one set fewer for today only.
    expect(prescribe(s, barbell, good)).toMatchObject({ weightKg: 62.5, reps: 6, sets: 3 });
    const poor = prescribe(s, barbell, { sleepHours: 5.5, proteinPct: 1, muscleScore: 48 });
    expect(poor).toMatchObject({ weightKg: 60, reps: 10, sets: 2, commands: ['BLOCK_PROGRESSION', 'REDUCE_SETS_TODAY'] });
    // The saved state is untouched, so tomorrow's numbers are still 62.5 x 6 x 3.
    expect(s.next).toEqual({ weightKg: 62.5, repTarget: 6, sets: 3 });
  });
});

const NONE = ['none'];
const HOME = ['none', 'home'];
const GYM = ['none', 'home', 'gym'];

describe('exercise intelligence', () => {
  const current = { name: 'Bench Press', primaryMuscle: 'chest', movementPattern: 'horizontal_push', role: 'main', equipment: 'gym' };
  const catalog = [
    current,
    { name: 'Dumbbell Chest Press', primaryMuscle: 'chest', movementPattern: 'horizontal_push', role: 'main', equipment: 'home' },
    { name: 'Push-Up', primaryMuscle: 'chest', movementPattern: 'horizontal_push', role: 'main', equipment: 'none' },
    { name: 'Incline Bench Press', primaryMuscle: 'chest', movementPattern: 'horizontal_push', role: 'main', equipment: 'gym' },
    { name: 'Diamond Push-Up', primaryMuscle: 'triceps', movementPattern: 'horizontal_push', role: 'accessory', equipment: 'none' },
    { name: 'Chest Fly', primaryMuscle: 'chest', movementPattern: 'fly', role: 'accessory', equipment: 'gym' },
  ];
  it('keeps an exercise with no trigger', () => {
    expect(decideExercise(current, catalog, { allowedEquipment: GYM }).action).toBe('KEEP');
  });
  it('replaces on a hard trigger with the same muscle, pattern, role and allowed equipment', () => {
    const d = decideExercise(current, catalog, { allowedEquipment: GYM, triggers: ['discomfort'] });
    expect(d.action).toBe('REPLACE');
    expect(d.replacement).toBe('Incline Bench Press'); // same equipment preferred, never Diamond Push-Up (wrong muscle/role) or Chest Fly (wrong pattern)
  });
  it('replaces when the equipment is not available, using only allowed equipment', () => {
    const d = decideExercise(current, catalog, { allowedEquipment: HOME });
    expect(d.action).toBe('REPLACE');
    expect(d.replacement).toBe('Dumbbell Chest Press');
    const none = decideExercise(current, catalog, { allowedEquipment: NONE });
    expect(none.replacement).toBe('Push-Up');
  });
  it('keeps the exercise when no like-for-like replacement fits', () => {
    const d = decideExercise(current, [current], { allowedEquipment: GYM, triggers: ['dislike'] });
    expect(d.action).toBe('KEEP');
    expect(d.replacement).toBeNull();
  });
  it('respects the avoid list', () => {
    const d = decideExercise(current, catalog, { allowedEquipment: GYM, triggers: ['cant_do'], avoid: ['Incline Bench Press'] });
    expect(d.replacement).toBe('Dumbbell Chest Press');
  });
  it('a plateau only suggests a swap', () => {
    const d = decideExercise(current, catalog, { allowedEquipment: GYM, stagnantSessions: ADAPTIVE_CONFIG.plateauSessions });
    expect(d.action).toBe('SUGGEST');
    expect(decideExercise(current, catalog, { allowedEquipment: GYM, stagnantSessions: ADAPTIVE_CONFIG.plateauSessions - 1 }).action).toBe('KEEP');
  });
  it('suggests the harder variation for a maxed-out bodyweight exercise', () => {
    const pushUp = { name: 'Push-Up', primaryMuscle: 'chest', movementPattern: 'horizontal_push', role: 'main', equipment: 'none', hasHarderVariation: true };
    const d = decideExercise(pushUp, catalog, { allowedEquipment: NONE, atTopOfBodyweightRange: true });
    expect(d.action).toBe('SUGGEST');
    expect(d.replacement).toBeNull();
  });
});
