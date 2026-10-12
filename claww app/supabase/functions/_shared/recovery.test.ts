import { describe, expect, it } from 'vitest';
import { computeRecoveryScore, proteinShare, type WorkoutLogRow } from './recovery.ts';

// V2 PHASE 7.5 rewrote the inputs (decision D7): water and "a meal was
// logged" left the score; protein against target joined sleep, rest time and
// last-session load. These tests were rewritten on purpose for that change.
//
// With protein known:
//   score = clamp(sleepScore + recoveryGap - fatiguePenalty + proteinScore + 20, 0, 100)
//   sleepScore     = min(hours/8, 1) * 40
//   recoveryGap    = 25 if no prior session, else min(hoursSince/24, 1) * 25
//   fatiguePenalty = clamp((sets*reps)/10, 0, 10) * 3
//   proteinScore   = min(proteinPct, 1) * 15
// With protein unknown (null): (sleepScore + recoveryGap - fatiguePenalty + 20) / 85 * 100
// band: <40 Low, <=70 Moderate, >70 High
// Every expected number below is hand-derived from that formula, not copied
// from the app's own output.

function workoutLog(overrides: Partial<WorkoutLogRow> & { hoursAgo: number }): WorkoutLogRow {
  return {
    sets: overrides.sets ?? null,
    reps_achieved: overrides.reps_achieved ?? null,
    reps_prescribed: overrides.reps_prescribed ?? null,
    completed_at: new Date(Date.now() - overrides.hoursAgo * 60 * 60 * 1000).toISOString(),
  };
}

describe('computeRecoveryScore', () => {
  it('full sleep, no prior session, protein unknown -> top of the scale, High', () => {
    // sleepScore = min(8/8,1)*40 = 40; no session -> recoveryGap=25, fatiguePenalty=0.
    // protein unknown -> (40 + 25 - 0 + 20) / 85 * 100 = 100
    const result = computeRecoveryScore({ hours: 8 }, null);
    expect(result.score).toBe(100);
    expect(result.band).toBe('High');
  });

  it('zero sleep, no prior session, protein unknown', () => {
    // (0 + 25 - 0 + 20) / 85 * 100 = 52.94 -> 53
    const result = computeRecoveryScore({ hours: 0 }, null);
    expect(result.score).toBe(53);
    expect(result.band).toBe('Moderate');
  });

  it('a very recent, high-intensity session drags the score down even with full sleep', () => {
    // sleepScore=40 (full sleep isolates the session variable).
    // sets=6, reps=20 -> volume=120 -> intensity=clamp(12,0,10)=10 -> fatiguePenalty=30.
    // completed_at ~0h ago -> recoveryGap=0. Protein unknown.
    // (40 + 0 - 30 + 20) / 85 * 100 = 35.29 -> 35
    const result = computeRecoveryScore({ hours: 8 }, workoutLog({ sets: 6, reps_achieved: 20, hoursAgo: 0 }));
    expect(result.score).toBe(35);
    expect(result.band).toBe('Low');
  });

  it('missing data on every input (null sleep log, null workout log, no protein)', () => {
    // sleepLog null -> sleepHours defaults to 0 -> same numeric path as the
    // zero-sleep case, but exercising the null-safety branch instead.
    const result = computeRecoveryScore(null, null, null);
    expect(result.score).toBe(53);
    expect(result.band).toBe('Moderate');
  });

  describe('protein moves the score, water and meals do not', () => {
    it('hitting the protein target adds the full 15 points', () => {
      // sleepScore = 4/8*40 = 20. No session -> recoveryGap=25, fatiguePenalty=0.
      // protein 100% -> 15. score = 20 + 25 - 0 + 15 + 20 = 80
      const result = computeRecoveryScore({ hours: 4 }, null, { proteinPct: 1 });
      expect(result.score).toBe(80);
      expect(result.band).toBe('High');
    });

    it('half the protein target contributes half credit', () => {
      // sleepScore=0, recoveryGap=25, protein 0.5 -> 7.5. score = 0 + 25 + 7.5 + 20 = 52.5 -> 53
      const result = computeRecoveryScore({ hours: 0 }, null, { proteinPct: 0.5 });
      expect(result.score).toBe(53);
      expect(result.band).toBe('Moderate');
    });

    it('protein over the target does not exceed the 15-point cap', () => {
      // protein 200% -> min(2,1)*15 = 15. score = 0 + 25 + 15 + 20 = 60
      const result = computeRecoveryScore({ hours: 0 }, null, { proteinPct: 2 });
      expect(result.score).toBe(60);
      expect(result.band).toBe('Moderate');
    });

    it('known zero protein is different from unknown protein', () => {
      // known 0%: 0 + 25 + 0 + 20 = 45. Unknown would rescale to 53.
      expect(computeRecoveryScore({ hours: 0 }, null, { proteinPct: 0 }).score).toBe(45);
      expect(computeRecoveryScore({ hours: 0 }, null, null).score).toBe(53);
    });

    it('a negative or non-finite protein value is treated safely', () => {
      expect(computeRecoveryScore({ hours: 0 }, null, { proteinPct: -1 }).score).toBe(45);
      expect(computeRecoveryScore({ hours: 0 }, null, { proteinPct: Number.NaN }).score).toBe(53);
    });
  });

  describe('band boundaries', () => {
    it('score=39 is Low (just under the Low/Moderate line)', () => {
      // sleep 2h -> 10. Zero-intensity session ~0h ago -> recoveryGap~0, fatiguePenalty=0.
      // protein 60% -> 9. score = 10 + 0 - 0 + 9 + 20 = 39
      const result = computeRecoveryScore({ hours: 2 }, workoutLog({ sets: 0, reps_achieved: 0, hoursAgo: 0 }), { proteinPct: 0.6 });
      expect(result.score).toBe(39);
      expect(result.band).toBe('Low');
    });

    it('score=40 is Moderate (just at the Low/Moderate line)', () => {
      // sleep 4h -> 20. Same zero-intensity session. protein known at 0%.
      // score = 20 + 0 - 0 + 0 + 20 = 40
      const result = computeRecoveryScore({ hours: 4 }, workoutLog({ sets: 0, reps_achieved: 0, hoursAgo: 0 }), { proteinPct: 0 });
      expect(result.score).toBe(40);
      expect(result.band).toBe('Moderate');
    });

    it('score=70 is Moderate (just at the Moderate/High line)', () => {
      // sleep 6h -> 30, zero-intensity session, protein 100% -> 15.
      // fixed sum 30 + 0 + 15 + 20 = 65. hoursAgo=4.8 -> recoveryGap = min(4.8/24,1)*25 = 5. score = 70.
      const result = computeRecoveryScore({ hours: 6 }, workoutLog({ sets: 0, reps_achieved: 0, hoursAgo: 4.8 }), { proteinPct: 1 });
      expect(result.score).toBe(70);
      expect(result.band).toBe('Moderate');
    });

    it('score=71 is High (just over the Moderate/High line)', () => {
      // Same fixed sum of 65, hoursAgo=5.76 -> recoveryGap = min(5.76/24,1)*25 = 6. score = 71.
      const result = computeRecoveryScore({ hours: 6 }, workoutLog({ sets: 0, reps_achieved: 0, hoursAgo: 5.76 }), { proteinPct: 1 });
      expect(result.score).toBe(71);
      expect(result.band).toBe('High');
    });
  });
});

describe('proteinShare', () => {
  it('is total protein over the target', () => {
    expect(proteinShare([{ protein_g: 40 }, { protein_g: 50 }], 100)).toBe(0.9);
  });
  it('treats a null protein value as zero within a logged day', () => {
    expect(proteinShare([{ protein_g: null }, { protein_g: 50 }], 100)).toBe(0.5);
  });
  it('is unknown (null) with no target, no meals or a non-positive target', () => {
    expect(proteinShare([{ protein_g: 40 }], null)).toBeNull();
    expect(proteinShare([{ protein_g: 40 }], 0)).toBeNull();
    expect(proteinShare([], 100)).toBeNull();
    expect(proteinShare(null, 100)).toBeNull();
  });
});
