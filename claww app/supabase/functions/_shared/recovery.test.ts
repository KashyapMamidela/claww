import { describe, expect, it } from 'vitest';
import { computeRecoveryScore, type WorkoutLogRow } from './recovery.ts';

// score = clamp(sleepScore + recoveryGap - fatiguePenalty + 30, 0, 100)
//   sleepScore     = min(hours/8, 1) * 40
//   recoveryGap    = 30 if no prior session, else min(hoursSince/24, 1) * 30
//   fatiguePenalty = clamp((sets*reps)/10, 0, 10) * 3
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
  it('full sleep, no prior session on record -> full credit both ways', () => {
    // sleepScore = min(8/8,1)*40 = 40; no session -> recoveryGap=30, fatiguePenalty=0
    // score = 40 + 30 - 0 + 30 = 100
    const result = computeRecoveryScore({ hours: 8 }, null);
    expect(result.score).toBe(100);
    expect(result.band).toBe('High');
  });

  it('zero sleep, no prior session', () => {
    // sleepScore = 0; recoveryGap=30, fatiguePenalty=0 -> score = 0+30-0+30 = 60
    const result = computeRecoveryScore({ hours: 0 }, null);
    expect(result.score).toBe(60);
    expect(result.band).toBe('Moderate');
  });

  it('a very recent, high-intensity session caps the score even with full sleep', () => {
    // Full sleep isolates the session variable: sleepScore=40.
    // sets=6, reps=20 -> volume=120 -> intensity=clamp(12,0,10)=10 -> fatiguePenalty=30.
    // completed_at ~0h ago -> recoveryGap=0.
    // score = 40 + 0 - 30 + 30 = 40 (the floor a maximally fatiguing, very
    // recent session can push you to when sleep was full).
    const result = computeRecoveryScore(
      { hours: 8 },
      workoutLog({ sets: 6, reps_achieved: 20, hoursAgo: 0 })
    );
    expect(result.score).toBe(40);
    expect(result.band).toBe('Moderate');
  });

  it('missing data on both inputs (null sleep log, null workout log)', () => {
    // sleepLog null -> sleepHours defaults to 0 -> sleepScore=0 (same numeric
    // path as the zero-sleep case, but exercising the null-safety branch
    // instead of an explicit {hours:0}).
    const result = computeRecoveryScore(null, null);
    expect(result.score).toBe(60);
    expect(result.band).toBe('Moderate');
  });

  describe('band boundaries', () => {
    it('score=39 is Low (just under the Low/Moderate line)', () => {
      // Pin recoveryGap=0 (session right now) and fatiguePenalty=30 (max
      // intensity) so score reduces to exactly sleepScore: sleepHours=7.8 ->
      // sleepScore = min(7.8/8,1)*40 = 39.
      const result = computeRecoveryScore(
        { hours: 7.8 },
        workoutLog({ sets: 6, reps_achieved: 20, hoursAgo: 0 })
      );
      expect(result.score).toBe(39);
      expect(result.band).toBe('Low');
    });

    it('score=40 is Moderate (just at the Low/Moderate line)', () => {
      // Same construction, sleepHours=8 -> sleepScore=40 -> score=40.
      const result = computeRecoveryScore(
        { hours: 8 },
        workoutLog({ sets: 6, reps_achieved: 20, hoursAgo: 0 })
      );
      expect(result.score).toBe(40);
      expect(result.band).toBe('Moderate');
    });

    it('score=70 is Moderate (just at the Moderate/High line)', () => {
      // Full sleep (sleepScore=40), zero-intensity session (fatiguePenalty=0)
      // completed right now (recoveryGap=0) -> score = 40+0-0+30 = 70.
      const result = computeRecoveryScore(
        { hours: 8 },
        workoutLog({ sets: 0, reps_achieved: 0, hoursAgo: 0 })
      );
      expect(result.score).toBe(70);
      expect(result.band).toBe('Moderate');
    });

    it('score=71 is High (just over the Moderate/High line)', () => {
      // Same, but completed 0.8h ago -> recoveryGap = min(0.8/24,1)*30 = 1
      // -> score = 40+1-0+30 = 71.
      const result = computeRecoveryScore(
        { hours: 8 },
        workoutLog({ sets: 0, reps_achieved: 0, hoursAgo: 0.8 })
      );
      expect(result.score).toBe(71);
      expect(result.band).toBe('High');
    });
  });
});
