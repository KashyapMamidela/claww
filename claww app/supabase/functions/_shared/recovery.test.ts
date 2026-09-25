import { describe, expect, it } from 'vitest';
import { computeRecoveryScore, type WorkoutLogRow } from './recovery.ts';

// score = clamp(sleepScore + recoveryGap - fatiguePenalty + hydrationScore + nutritionScore + 20, 0, 100)
//   sleepScore     = min(hours/8, 1) * 35
//   recoveryGap    = 25 if no prior session, else min(hoursSince/24, 1) * 25
//   fatiguePenalty = clamp((sets*reps)/10, 0, 10) * 3
//   hydrationScore = min(waterMl/2000, 1) * 10
//   nutritionScore = loggedMealToday ? 10 : 0
// band: <40 Low, <=70 Moderate, >70 High
// Every expected number below is hand-derived from that formula, not copied
// from the app's own output — see the comment on each case.

function workoutLog(overrides: Partial<WorkoutLogRow> & { hoursAgo: number }): WorkoutLogRow {
  return {
    sets: overrides.sets ?? null,
    reps_achieved: overrides.reps_achieved ?? null,
    reps_prescribed: overrides.reps_prescribed ?? null,
    completed_at: new Date(Date.now() - overrides.hoursAgo * 60 * 60 * 1000).toISOString(),
  };
}

describe('computeRecoveryScore', () => {
  it('full sleep, no prior session, no hydration/nutrition data -> High', () => {
    // sleepScore = min(8/8,1)*35 = 35; no session -> recoveryGap=25, fatiguePenalty=0
    // hydration/nutrition omitted -> both default to 0
    // score = 35 + 25 - 0 + 0 + 0 + 20 = 80
    const result = computeRecoveryScore({ hours: 8 }, null);
    expect(result.score).toBe(80);
    expect(result.band).toBe('High');
  });

  it('zero sleep, no prior session', () => {
    // sleepScore = 0; recoveryGap=25, fatiguePenalty=0 -> score = 0+25-0+0+0+20 = 45
    const result = computeRecoveryScore({ hours: 0 }, null);
    expect(result.score).toBe(45);
    expect(result.band).toBe('Moderate');
  });

  it('a very recent, high-intensity session drags the score down even with full sleep', () => {
    // sleepScore=35 (full sleep isolates the session variable).
    // sets=6, reps=20 -> volume=120 -> intensity=clamp(12,0,10)=10 -> fatiguePenalty=30.
    // completed_at ~0h ago -> recoveryGap=0. No hydration/nutrition data.
    // score = 35 + 0 - 30 + 0 + 0 + 20 = 25
    const result = computeRecoveryScore(
      { hours: 8 },
      workoutLog({ sets: 6, reps_achieved: 20, hoursAgo: 0 })
    );
    expect(result.score).toBe(25);
    expect(result.band).toBe('Low');
  });

  it('missing data on all four inputs (null sleep log, null workout log, no hydration/nutrition)', () => {
    // sleepLog null -> sleepHours defaults to 0 -> same numeric path as the
    // zero-sleep case, but exercising the null-safety branch instead.
    const result = computeRecoveryScore(null, null);
    expect(result.score).toBe(45);
    expect(result.band).toBe('Moderate');
  });

  describe('hydration and nutrition genuinely move the score', () => {
    it('full hydration + logged meal push a middling sleep day up into High', () => {
      // sleepScore = 4/8*35 = 17.5. No session -> recoveryGap=25, fatiguePenalty=0.
      // hydration: waterMl=2000 -> min(2000/2000,1)*10 = 10.
      // nutrition: loggedMealToday=true -> 10.
      // score = 17.5 + 25 - 0 + 10 + 10 + 20 = 82.5 -> Math.round = 83
      const result = computeRecoveryScore({ hours: 4 }, null, { waterMl: 2000 }, { loggedMealToday: true });
      expect(result.score).toBe(83);
      expect(result.band).toBe('High');
    });

    it('partial hydration (half of target) contributes half credit', () => {
      // sleepScore=0, no session -> recoveryGap=25, fatiguePenalty=0, nutrition=0.
      // hydration: waterMl=1000 -> min(1000/2000,1)*10 = 5.
      // score = 0 + 25 - 0 + 5 + 0 + 20 = 50
      const result = computeRecoveryScore({ hours: 0 }, null, { waterMl: 1000 }, null);
      expect(result.score).toBe(50);
      expect(result.band).toBe('Moderate');
    });

    it('hydration over the 2000ml target does not exceed the 10-point cap', () => {
      // Same baseline as above but waterMl=5000 -> min(5000/2000,1)=1 -> still 10.
      // score = 0 + 25 - 0 + 10 + 0 + 20 = 55
      const result = computeRecoveryScore({ hours: 0 }, null, { waterMl: 5000 }, null);
      expect(result.score).toBe(55);
      expect(result.band).toBe('Moderate');
    });
  });

  describe('band boundaries', () => {
    it('score=39 is Low (just under the Low/Moderate line)', () => {
      // sleep=0 -> sleepScore=0. Session ~0h ago -> recoveryGap=0.
      // sets=1, reps_achieved=4 -> volume=4 -> intensity=clamp(0.4,0,10)=0.4 -> fatiguePenalty=1.2.
      // hydration=2000 -> 10. nutrition=true -> 10.
      // score = 0 + 0 - 1.2 + 10 + 10 + 20 = 38.8 -> Math.round = 39
      const result = computeRecoveryScore(
        { hours: 0 },
        workoutLog({ sets: 1, reps_achieved: 4, hoursAgo: 0 }),
        { waterMl: 2000 },
        { loggedMealToday: true }
      );
      expect(result.score).toBe(39);
      expect(result.band).toBe('Low');
    });

    it('score=40 is Moderate (just at the Low/Moderate line)', () => {
      // Same construction but sets=0/reps=0 -> intensity=0 -> fatiguePenalty=0.
      // score = 0 + 0 - 0 + 10 + 10 + 20 = 40
      const result = computeRecoveryScore(
        { hours: 0 },
        workoutLog({ sets: 0, reps_achieved: 0, hoursAgo: 0 }),
        { waterMl: 2000 },
        { loggedMealToday: true }
      );
      expect(result.score).toBe(40);
      expect(result.band).toBe('Moderate');
    });

    it('score=70 is Moderate (just at the Moderate/High line)', () => {
      // Full sleep (sleepScore=35), zero-intensity session, full hydration, no
      // meal logged (nutrition=0) -> fixed sum 35+0(fatigue)+10(hydration)+0+20 = 65.
      // hoursAgo=4.8 -> recoveryGap = min(4.8/24,1)*25 = 5. score = 65+5 = 70.
      const result = computeRecoveryScore(
        { hours: 8 },
        workoutLog({ sets: 0, reps_achieved: 0, hoursAgo: 4.8 }),
        { waterMl: 2000 },
        null
      );
      expect(result.score).toBe(70);
      expect(result.band).toBe('Moderate');
    });

    it('score=71 is High (just over the Moderate/High line)', () => {
      // Same fixed sum of 65, hoursAgo=5.76 -> recoveryGap = min(5.76/24,1)*25 = 6.
      // score = 65+6 = 71.
      const result = computeRecoveryScore(
        { hours: 8 },
        workoutLog({ sets: 0, reps_achieved: 0, hoursAgo: 5.76 }),
        { waterMl: 2000 },
        null
      );
      expect(result.score).toBe(71);
      expect(result.band).toBe('High');
    });
  });
});
