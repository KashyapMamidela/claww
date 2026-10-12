// The adaptive engine (V2 PHASE 6.4). Dependency-free like planning.ts, so the
// app, the Edge Functions and Vitest can all import it. Plain arithmetic only:
// the model never computes a number here, and every sentence in `reason` is
// built from the numbers.
//
// Decisions D1-D16 from the change plan are the defaults. Every threshold
// lives in ADAPTIVE_CONFIG so a decision can be changed in one place.

import { deriveAllowedEquipment } from './planning.ts';

// ─────────────────────────────────────────────────────────────────────────────
// Config
// ─────────────────────────────────────────────────────────────────────────────

export const ADAPTIVE_CONFIG = {
  performance: {
    /** ratio >= this: hit the target, rep target +1 (D2). */
    repUpAt: 1.0,
    /** ratio >= this (and below repUpAt): close, hold. Below it: rep target -1. */
    holdAt: 0.85,
    /** ratio >= this (and below holdAt): struggled, rep target -1. Below it: too heavy, weight down; counts as a failed session. */
    failBelow: 0.7,
  },
  /** Top-of-range sessions in a row (different calendar days) before the weight goes up (D16). */
  topStreakForWeightUp: 2,
  /** Failed sessions in a row before a deload (D4). */
  failuresForDeload: 2,
  deloadFraction: 0.05,
  deloadRoundKg: 2.5,
  /** Increment used when a loadable exercise has none in the catalog. */
  defaultIncrementKg: 2.5,
  sets: {
    min: 2,
    max: 5,
    /** Weight-up cycles completed before the next top-of-range event adds a set instead of weight. */
    cyclesBeforeSetUp: 2,
    /** Sessions in a row under holdAt before a set is removed. */
    declineSessionsForSetDown: 3,
  },
  /** Sessions in a row without any reps/weight progress before an exercise counts as plateaued. */
  plateauSessions: 4,
  wholeBody: {
    sleepGoodHours: 7,
    sleepModerateHours: 6,
    proteinGoodPct: 0.9,
    proteinModeratePct: 0.75,
    /** Muscle score at or above this is fatigue "low"; at or above fatigueModerateAt "moderate"; otherwise "high" (D8). */
    fatigueLowAt: 70,
    fatigueModerateAt: 50,
  },
  muscle: {
    weights: { fatigue: 0.4, time: 0.25, soreness: 0.2, readiness: 0.15 },
    /** [upper bound in hours (exclusive), points]. Last entry is the open-ended band. */
    timeBands: [
      [24, 20],
      [48, 50],
      [72, 75],
      [96, 90],
      [Infinity, 100],
    ] as [number, number][],
    /** Soreness 0..5 -> points. */
    sorenessPoints: [100, 90, 75, 55, 30, 10],
    readinessPoints: { strong: 100, normal: 85, slightly_weak: 65, weak: 40, very_weak: 20 } as Record<string, number>,
    /** [lowest score in band, label], best first. */
    bands: [
      [85, 'Excellent'],
      [70, 'Good'],
      [50, 'Moderate'],
      [30, 'Low'],
      [0, 'Very low'],
    ] as [number, MuscleBand][],
    /** Bands that block progression for an exercise whose primary muscle is in them. */
    blockingBands: ['Low', 'Very low'] as MuscleBand[],
    /**
     * FATIGUE POINTS TABLE - NOT FROM THE CO-FOUNDER'S SPEC, NEEDS REVIEW.
     * The spec says fatigue comes from effective sets, average RIR and the
     * exercise's stimulus type but gives no numbers. Each set adds
     * stimulusWeight x rirWeight points (a secondary-muscle set counts
     * secondaryShare of that); fatigue = 100 - points x pointsToFatigue,
     * clamped 0..100. Example: 12 hard compound sets (RIR 1) = 15 points =
     * fatigue 25; 6 compound sets at RIR 2 = 6 points = fatigue 70.
     */
    fatigue: {
      stimulusWeight: { compound: 1.0, isolation: 0.7, isometric: 0.5, plyometric: 1.0, conditioning: 0.6, mobility: 0.1 } as Record<string, number>,
      /** RIR 0, 1, 2, 3+ . */
      rirWeight: [1.5, 1.25, 1.0, 0.75],
      /** Used when a set has no RIR logged; the score's confidence drops. */
      unknownRirWeight: 1.0,
      secondaryShare: 0.5,
      pointsToFatigue: 5,
    },
  },
};

export type AdaptiveConfig = typeof ADAPTIVE_CONFIG;

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

export type MuscleBand = 'Excellent' | 'Good' | 'Moderate' | 'Low' | 'Very low';
export type Confidence = 'high' | 'medium' | 'low';
export type Readiness = 'strong' | 'normal' | 'slightly_weak' | 'weak' | 'very_weak';
export type Level = 'good' | 'moderate' | 'poor';

export type Command =
  | 'INCREASE_REPS'
  | 'INCREASE_WEIGHT'
  | 'INCREASE_SETS'
  | 'DECREASE_REPS'
  | 'DECREASE_WEIGHT'
  | 'DECREASE_SETS'
  | 'DELOAD'
  | 'HOLD'
  | 'BLOCK_PROGRESSION'
  | 'REDUCE_SETS_TODAY'
  | 'SUGGEST_HARDER_VARIATION'
  | 'CALIBRATE';

/** What the catalog says about an exercise (a slice of the `exercises` row). */
export interface ExerciseMeta {
  name: string;
  loadable: boolean;
  incrementKg: number | null;
  primaryMuscle: string;
  hasHarderVariation?: boolean;
}

/** The per-user, per-exercise state (mirrors `exercise_progress`). */
export interface ExerciseState {
  repMin: number;
  repMax: number;
  /** Numbers to prescribe next time if nothing blocks progression. */
  next: { weightKg: number | null; repTarget: number; sets: number };
  /** What the user actually did last session; used when progression is blocked today. */
  last: { weightKg: number | null; repTarget: number; sets: number } | null;
  topStreak: number;
  failureStreak: number;
  successCycles: number;
  declineStreak: number;
  stagnantSessions: number;
  lastSessionDate: string | null;
  pendingCommands: Command[];
  pendingReason: string;
}

export interface SessionResult {
  /** Local calendar date, YYYY-MM-DD. */
  date: string;
  /** Reps achieved on each logged set. */
  reps: number[];
  /** What the user was shown for this session. */
  prescribed: { weightKg: number | null; reps: number; sets: number };
  /** Weight actually used, when it differs from the prescription. */
  weightKg?: number | null;
  /** True when the prescription had progression blocked or sets reduced by recovery. */
  blocked?: boolean;
}

export interface SessionEvaluation {
  state: ExerciseState;
  ratio: number;
  topOfRange: boolean;
  commands: Command[];
  reason: string;
}

export interface RecoveryInputs {
  sleepHours?: number | null;
  /** Protein eaten as a fraction of target, e.g. 0.92. */
  proteinPct?: number | null;
  /** Estimated muscle recovery score of the exercise's primary muscle (0-100). */
  muscleScore?: number | null;
}

export interface Prescription {
  weightKg: number | null;
  reps: number;
  sets: number;
  commands: Command[];
  reason: string;
}

// ─────────────────────────────────────────────────────────────────────────────
// Small helpers
// ─────────────────────────────────────────────────────────────────────────────

const roundTo = (x: number, step: number) => Math.round(x / step) * step;
/** Floating point noise off kg values (62.5 stays 62.5). */
const kg = (x: number) => Math.round(x * 100) / 100;
const fmtKg = (w: number | null) => (w === null ? 'bodyweight' : `${kg(w)} kg`);
const clamp = (n: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, n));

export function incrementFor(meta: ExerciseMeta, cfg: AdaptiveConfig = ADAPTIVE_CONFIG): number {
  return meta.incrementKg && meta.incrementKg > 0 ? meta.incrementKg : cfg.defaultIncrementKg;
}

/** A brand-new exercise: the plan's rep range and starting reps, and a starting weight when known. */
export function initialState(range: { repMin: number; repMax: number; startReps: number; sets: number; weightKg: number | null }): ExerciseState {
  return {
    repMin: range.repMin,
    repMax: range.repMax,
    next: { weightKg: range.weightKg, repTarget: clamp(range.startReps, range.repMin, range.repMax), sets: range.sets },
    last: null,
    topStreak: 0,
    failureStreak: 0,
    successCycles: 0,
    declineStreak: 0,
    stagnantSessions: 0,
    lastSessionDate: null,
    pendingCommands: [],
    pendingReason: '',
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// Performance -> progression (run once, when a session ends)
// ─────────────────────────────────────────────────────────────────────────────

/** Total reps achieved divided by rep target x prescribed sets. */
export function performanceRatio(session: SessionResult): number {
  const denom = session.prescribed.reps * session.prescribed.sets;
  if (denom <= 0) return 0;
  return session.reps.reduce((a, b) => a + b, 0) / denom;
}

/** Max reps on every prescribed set. */
export function isTopOfRange(session: SessionResult, repMax: number): boolean {
  return session.reps.length >= session.prescribed.sets && session.reps.every((r) => r >= repMax);
}

export function evaluateSession(
  state: ExerciseState,
  session: SessionResult,
  meta: ExerciseMeta,
  cfg: AdaptiveConfig = ADAPTIVE_CONFIG
): SessionEvaluation {
  const ratio = performanceRatio(session);
  const top = isTopOfRange(session, state.repMax);
  const weight = session.weightKg !== undefined ? session.weightKg : session.prescribed.weightKg;
  const performed = { weightKg: weight, repTarget: session.prescribed.reps, sets: session.prescribed.sets };
  const pct = Math.round(ratio * 100);
  const inc = incrementFor(meta, cfg);

  // D5: "in a row" means different calendar days. A second session of the same
  // exercise on the same day is recorded but does not move any counter.
  if (state.lastSessionDate === session.date) {
    return {
      state: { ...state, last: performed },
      ratio,
      topOfRange: top,
      commands: ['HOLD'],
      reason: `Second session of ${meta.name} on the same day, so it does not count toward progression.`,
    };
  }

  // A day where recovery cut or blocked the prescription says little about
  // readiness to progress: keep the pending decision, move the history.
  if (session.blocked) {
    return {
      state: { ...state, last: performed, lastSessionDate: session.date },
      ratio,
      topOfRange: top,
      commands: ['HOLD'],
      reason: `Reduced session (${pct}% of target), so the plan for next time is unchanged.`,
    };
  }

  const next = { ...state.next, weightKg: weight };
  let { topStreak, failureStreak, successCycles, declineStreak, stagnantSessions } = state;
  const commands: Command[] = [];
  let reason = '';

  const failed = ratio < cfg.performance.failBelow;
  failureStreak = failed ? failureStreak + 1 : 0;
  declineStreak = ratio < cfg.performance.holdAt ? declineStreak + 1 : 0;

  if (failed) {
    topStreak = 0;
    stagnantSessions += 1;
    if (failureStreak >= cfg.failuresForDeload) {
      if (meta.loadable && weight !== null) {
        next.weightKg = Math.max(0, kg(roundTo(weight * (1 - cfg.deloadFraction), cfg.deloadRoundKg)));
        commands.push('DELOAD');
        reason = `${pct}% of target two sessions running, so the weight drops 5% (${fmtKg(weight)} to ${fmtKg(next.weightKg)}).`;
      } else {
        next.repTarget = Math.max(state.repMin, next.repTarget - 2);
        commands.push('DELOAD');
        reason = `${pct}% of target two sessions running, so the rep target drops to ${next.repTarget}.`;
      }
      failureStreak = 0;
    } else if (meta.loadable && weight !== null) {
      next.weightKg = Math.max(0, kg(weight - inc));
      commands.push('DECREASE_WEIGHT');
      reason = `${pct}% of target is too heavy, so the weight drops to ${fmtKg(next.weightKg)}.`;
    } else {
      next.repTarget = Math.max(state.repMin, next.repTarget - 1);
      commands.push('DECREASE_REPS');
      reason = `${pct}% of target, so the rep target drops to ${next.repTarget}.`;
    }
  } else if (ratio >= cfg.performance.repUpAt) {
    if (top) {
      topStreak += 1;
      if (topStreak >= cfg.topStreakForWeightUp) {
        topStreak = 0;
        stagnantSessions = 0;
        if (meta.loadable && weight !== null) {
          if (successCycles >= cfg.sets.cyclesBeforeSetUp && next.sets < cfg.sets.max) {
            next.sets += 1;
            next.repTarget = state.repMax;
            successCycles = 0;
            commands.push('INCREASE_SETS');
            reason = `Top of range ${cfg.topStreakForWeightUp} sessions running after ${cfg.sets.cyclesBeforeSetUp} weight increases, so a set is added (${next.sets} sets).`;
          } else {
            next.weightKg = kg(weight + inc);
            next.repTarget = state.repMin;
            successCycles += 1;
            commands.push('INCREASE_WEIGHT');
            reason = `Top of range ${cfg.topStreakForWeightUp} sessions running (${fmtKg(weight)} x ${state.repMax}), so the weight goes to ${fmtKg(next.weightKg)} and reps restart at ${state.repMin}.`;
          }
        } else if (meta.hasHarderVariation) {
          next.repTarget = state.repMax;
          commands.push('SUGGEST_HARDER_VARIATION');
          reason = `Top of range ${cfg.topStreakForWeightUp} sessions running (${state.repMax} reps), time for a harder variation.`;
        } else {
          next.repTarget = state.repMax;
          commands.push('HOLD');
          reason = `Top of range ${cfg.topStreakForWeightUp} sessions running (${state.repMax} reps). No harder variation is available yet.`;
        }
      } else {
        next.repTarget = Math.min(state.repMax, next.repTarget + 1);
        stagnantSessions = 0;
        commands.push('INCREASE_REPS');
        reason = `Rep target ${next.repTarget}, top counter ${topStreak} of ${cfg.topStreakForWeightUp}.`;
      }
    } else {
      topStreak = 0;
      stagnantSessions = 0;
      if (next.repTarget < state.repMax) {
        next.repTarget += 1;
        commands.push('INCREASE_REPS');
        reason = `Hit the target (${pct}%), so the rep target goes to ${next.repTarget}.`;
      } else {
        commands.push('HOLD');
        reason = `Hit the target at the top of the range (${pct}%).`;
      }
    }
  } else if (ratio >= cfg.performance.holdAt) {
    topStreak = 0;
    stagnantSessions += 1;
    commands.push('HOLD');
    reason = `Close to target (${pct}%), so the numbers stay.`;
  } else {
    topStreak = 0;
    stagnantSessions += 1;
    next.repTarget = Math.max(state.repMin, next.repTarget - 1);
    commands.push('DECREASE_REPS');
    reason = `Struggled (${pct}% of target), so the rep target drops to ${next.repTarget}.`;
  }

  // Sets come down after a run of sessions under the hold line.
  if (declineStreak >= cfg.sets.declineSessionsForSetDown && next.sets > cfg.sets.min) {
    next.sets -= 1;
    declineStreak = 0;
    commands.push('DECREASE_SETS');
    reason += ` ${cfg.sets.declineSessionsForSetDown} sessions under ${Math.round(cfg.performance.holdAt * 100)}% in a row, so one set comes off (${next.sets} sets).`;
  }

  return {
    state: {
      ...state,
      next,
      last: performed,
      topStreak,
      failureStreak,
      successCycles,
      declineStreak,
      stagnantSessions,
      lastSessionDate: session.date,
      pendingCommands: commands,
      pendingReason: reason,
    },
    ratio,
    topOfRange: top,
    commands,
    reason,
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// Whole-body recovery (sleep, protein, fatigue)
// ─────────────────────────────────────────────────────────────────────────────

/** PDF 1's fatigue level comes from the muscle score (D8). */
export function fatigueLevel(score: number, cfg: AdaptiveConfig = ADAPTIVE_CONFIG): 'low' | 'moderate' | 'high' {
  if (score >= cfg.wholeBody.fatigueLowAt) return 'low';
  if (score >= cfg.wholeBody.fatigueModerateAt) return 'moderate';
  return 'high';
}

export interface WholeBodyRecovery {
  state: 'good' | 'moderate' | 'poor' | 'several_poor';
  sleep: Level | null;
  protein: Level | null;
  fatigue: Level | null;
  poorCount: number;
}

/**
 * Each input is Good, Moderate or Poor; an input that is unknown (null) is
 * left out, never guessed. Two or more Poor inputs is "several poor". Water
 * and "a meal was logged" are no longer inputs (D7).
 */
export function wholeBodyRecovery(input: RecoveryInputs, cfg: AdaptiveConfig = ADAPTIVE_CONFIG): WholeBodyRecovery {
  const w = cfg.wholeBody;
  const sleep: Level | null =
    input.sleepHours == null ? null : input.sleepHours >= w.sleepGoodHours ? 'good' : input.sleepHours >= w.sleepModerateHours ? 'moderate' : 'poor';
  const protein: Level | null =
    input.proteinPct == null ? null : input.proteinPct >= w.proteinGoodPct ? 'good' : input.proteinPct >= w.proteinModeratePct ? 'moderate' : 'poor';
  const fl = input.muscleScore == null ? null : fatigueLevel(input.muscleScore, cfg);
  const fatigue: Level | null = fl === null ? null : fl === 'low' ? 'good' : fl === 'moderate' ? 'moderate' : 'poor';
  const levels = [sleep, protein, fatigue].filter((l): l is Level => l !== null);
  const poorCount = levels.filter((l) => l === 'poor').length;
  const state = poorCount >= 2 ? 'several_poor' : poorCount === 1 ? 'poor' : levels.includes('moderate') ? 'moderate' : 'good';
  return { state, sleep, protein, fatigue, poorCount };
}

// ─────────────────────────────────────────────────────────────────────────────
// Per-muscle recovery score
// ─────────────────────────────────────────────────────────────────────────────

export interface SetForFatigue {
  stimulus: string;
  /** 0-3 (3 means 3 or more); null when not logged. */
  rir: number | null;
  /** 1 for the set's primary muscle, secondaryShare for a secondary muscle. */
  share?: number;
}

/** 0-100 where 100 is fully fresh. confidenceHint is 'rir_missing' when any set had no RIR. */
export function fatigueFromSets(sets: SetForFatigue[], cfg: AdaptiveConfig = ADAPTIVE_CONFIG): { score: number; rirMissing: boolean } {
  const f = cfg.muscle.fatigue;
  let points = 0;
  let rirMissing = false;
  for (const s of sets) {
    const stim = f.stimulusWeight[s.stimulus] ?? 1.0;
    let rirW = f.unknownRirWeight;
    if (s.rir === null || s.rir === undefined) rirMissing = true;
    else rirW = f.rirWeight[clamp(Math.round(s.rir), 0, f.rirWeight.length - 1)];
    points += stim * rirW * (s.share ?? 1);
  }
  return { score: clamp(Math.round(100 - points * f.pointsToFatigue), 0, 100), rirMissing };
}

export function timePoints(hoursSince: number, cfg: AdaptiveConfig = ADAPTIVE_CONFIG): number {
  for (const [upper, pts] of cfg.muscle.timeBands) if (hoursSince < upper) return pts;
  return cfg.muscle.timeBands[cfg.muscle.timeBands.length - 1][1];
}

export function bandFor(score: number, cfg: AdaptiveConfig = ADAPTIVE_CONFIG): MuscleBand {
  for (const [min, label] of cfg.muscle.bands) if (score >= min) return label;
  return 'Very low';
}

export interface MuscleInputs {
  /** 0-100 fresh, from fatigueFromSets; null when there is no recent training data. */
  fatigue: number | null;
  hoursSinceTrained: number | null;
  soreness: number | null;
  readiness: Readiness | null;
  /** True when the fatigue number was built from sets that had no RIR. */
  rirMissing?: boolean;
}

export interface MuscleRecovery {
  score: number | null;
  band: MuscleBand | null;
  confidence: Confidence;
  missing: string[];
}

/**
 * Fatigue x 0.40 + Time x 0.25 + Soreness x 0.20 + Readiness x 0.15, clamped
 * 0-100 and rounded. A missing input is left out and the remaining weights
 * are rescaled; it is never replaced by an invented value, and the
 * confidence drops instead. Confidence: high with all four (and RIR), medium
 * when only soreness / readiness / RIR is missing, low when fatigue or time
 * is missing or two or more inputs are.
 */
export function muscleRecovery(input: MuscleInputs, cfg: AdaptiveConfig = ADAPTIVE_CONFIG): MuscleRecovery {
  const wts = cfg.muscle.weights;
  const parts: { key: string; weight: number; value: number }[] = [];
  const missing: string[] = [];
  const add = (key: keyof typeof wts, value: number | null) => {
    if (value === null || Number.isNaN(value)) missing.push(key);
    else parts.push({ key, weight: wts[key], value });
  };
  add('fatigue', input.fatigue === null ? null : clamp(input.fatigue, 0, 100));
  add('time', input.hoursSinceTrained === null ? null : timePoints(input.hoursSinceTrained, cfg));
  add('soreness', input.soreness === null ? null : cfg.muscle.sorenessPoints[clamp(Math.round(input.soreness), 0, 5)]);
  add('readiness', input.readiness === null ? null : cfg.muscle.readinessPoints[input.readiness] ?? null);

  if (parts.length === 0) return { score: null, band: null, confidence: 'low', missing };
  const totalWeight = parts.reduce((a, p) => a + p.weight, 0);
  const raw = parts.reduce((a, p) => a + p.value * p.weight, 0) / totalWeight;
  const score = clamp(Math.round(raw), 0, 100);

  let confidence: Confidence;
  if (missing.includes('fatigue') || missing.includes('time') || missing.length >= 2) confidence = 'low';
  else if (missing.length === 1 || input.rirMissing) confidence = 'medium';
  else confidence = 'high';
  return { score, band: bandFor(score, cfg), confidence, missing };
}

// ─────────────────────────────────────────────────────────────────────────────
// Today's prescription (run when the user taps Begin)
// ─────────────────────────────────────────────────────────────────────────────

export function prescribe(
  state: ExerciseState,
  meta: ExerciseMeta,
  recovery: RecoveryInputs,
  cfg: AdaptiveConfig = ADAPTIVE_CONFIG
): Prescription {
  const wb = wholeBodyRecovery(recovery, cfg);
  const muscleBlocks =
    recovery.muscleScore != null && cfg.muscle.blockingBands.includes(bandFor(recovery.muscleScore, cfg));
  const progression = state.next;

  // First time with a loadable exercise and no weight yet: the user finds one.
  if (meta.loadable && progression.weightKg === null && state.last === null) {
    return {
      weightKg: null,
      reps: progression.repTarget,
      sets: progression.sets,
      commands: ['CALIBRATE'],
      reason: `First session: pick a weight you can lift for ${progression.repTarget} reps with about 2 reps left in the tank.`,
    };
  }

  const reasonFor = (): string => {
    const parts: string[] = [];
    if (wb.sleep === 'poor') parts.push(`slept ${recovery.sleepHours} h`);
    if (wb.protein === 'poor') parts.push(`protein at ${Math.round((recovery.proteinPct ?? 0) * 100)}% of target`);
    if (muscleBlocks) parts.push(`${meta.primaryMuscle} recovery is ${bandFor(recovery.muscleScore as number, cfg).toLowerCase()} (${recovery.muscleScore})`);
    return parts.join(', ');
  };

  const reduce = wb.state === 'poor' || wb.state === 'several_poor' || muscleBlocks;
  const hold = reduce || wb.state === 'moderate';

  if (!hold) {
    return {
      weightKg: progression.weightKg,
      reps: progression.repTarget,
      sets: progression.sets,
      commands: state.pendingCommands.length ? state.pendingCommands : ['HOLD'],
      reason: state.pendingReason || 'Same as last time.',
    };
  }

  // Blocked: keep last session's numbers. With nothing logged yet, the
  // starting numbers are the "last" numbers.
  const base = state.last ?? progression;
  if (reduce) {
    const sets = Math.max(1, base.sets - 1);
    return {
      weightKg: base.weightKg,
      reps: base.repTarget,
      sets,
      commands: ['BLOCK_PROGRESSION', 'REDUCE_SETS_TODAY'],
      reason: `Progression blocked and one set fewer today (${reasonFor()}): ${fmtKg(base.weightKg)} x ${base.repTarget}.`,
    };
  }
  return {
    weightKg: base.weightKg,
    reps: base.repTarget,
    sets: base.sets,
    commands: ['HOLD', 'BLOCK_PROGRESSION'],
    reason: `Recovery is moderate today, so no progression: ${fmtKg(base.weightKg)} x ${base.repTarget} x ${base.sets} again.`,
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// Exercise intelligence: KEEP / REPLACE / SUGGEST
// ─────────────────────────────────────────────────────────────────────────────

export interface CatalogCandidate {
  name: string;
  primaryMuscle: string;
  movementPattern: string;
  role: string;
  equipment: string;
}

export interface ExerciseForSwap extends CatalogCandidate {
  hasHarderVariation?: boolean;
}

export type SwapTrigger = 'missing_equipment' | 'cant_do' | 'discomfort' | 'dislike';

export interface ExerciseDecision {
  action: 'KEEP' | 'REPLACE' | 'SUGGEST';
  replacement: string | null;
  reason: string;
}

/**
 * A replacement must keep the primary muscle, movement pattern and role and
 * fit the user's equipment tier. Hard triggers (equipment, "can't do",
 * discomfort, dislike) REPLACE; a plateau only SUGGESTs the swap; a
 * bodyweight exercise at the top of its range SUGGESTs the harder variation.
 */
export function decideExercise(
  current: ExerciseForSwap,
  catalog: CatalogCandidate[],
  ctx: { equipmentTier: string | null | undefined; triggers?: SwapTrigger[]; stagnantSessions?: number; atTopOfBodyweightRange?: boolean; avoid?: string[] },
  cfg: AdaptiveConfig = ADAPTIVE_CONFIG
): ExerciseDecision {
  const allowed = deriveAllowedEquipment(ctx.equipmentTier);
  const avoid = new Set((ctx.avoid ?? []).map((n) => n.toLowerCase()));
  const triggers = ctx.triggers ?? [];
  if (!allowed.includes(current.equipment) && !triggers.includes('missing_equipment')) triggers.push('missing_equipment');

  if (ctx.atTopOfBodyweightRange && current.hasHarderVariation && triggers.length === 0) {
    return { action: 'SUGGEST', replacement: null, reason: `${current.name} is maxed out, so a harder variation is the next step.` };
  }

  const plateau = (ctx.stagnantSessions ?? 0) >= cfg.plateauSessions;
  if (triggers.length === 0 && !plateau) return { action: 'KEEP', replacement: null, reason: `Keep ${current.name}.` };

  const matches = catalog
    .filter(
      (c) =>
        c.name !== current.name &&
        !avoid.has(c.name.toLowerCase()) &&
        c.primaryMuscle === current.primaryMuscle &&
        c.movementPattern === current.movementPattern &&
        c.role === current.role &&
        allowed.includes(c.equipment)
    )
    // Prefer the same equipment as the exercise being replaced, then name order, so the pick is deterministic.
    .sort((a, b) => Number(b.equipment === current.equipment) - Number(a.equipment === current.equipment) || a.name.localeCompare(b.name));

  if (matches.length === 0) {
    return { action: 'KEEP', replacement: null, reason: `No like-for-like replacement for ${current.name} fits your equipment, so it stays.` };
  }
  const pick = matches[0].name;
  if (triggers.length > 0) {
    return { action: 'REPLACE', replacement: pick, reason: `${current.name} swaps to ${pick}: same ${current.primaryMuscle}, same movement.` };
  }
  return { action: 'SUGGEST', replacement: pick, reason: `No progress on ${current.name} for ${ctx.stagnantSessions} sessions. ${pick} trains the same muscle and movement.` };
}
