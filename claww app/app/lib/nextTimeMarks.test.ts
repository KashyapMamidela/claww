import { describe, expect, it } from 'vitest';
import { nextTimeMark } from './nextTimeMarks';

const base = { exerciseName: 'Bench Press', reason: 'Every set hit the top of the range.', sets: 3, reps: 8 };

describe('nextTimeMark', () => {
  it('weight up: strikes the top set and underlines the new weight', () => {
    const m = nextTimeMark({ ...base, commands: ['INCREASE_WEIGHT'], weightKg: 62.5 }, [{ reps: 8, weight: 60 }, { reps: 8, weight: 60 }]);
    expect(m).toMatchObject({ oldValue: '60 kg × 8', newValue: '62.5 kg × 8', note: 'add weight next time' });
  });
  it('hold with the same numbers shows no struck value', () => {
    const m = nextTimeMark({ ...base, commands: [], weightKg: 60 }, [{ reps: 8, weight: 60 }]);
    expect(m?.oldValue).toBeNull();
    expect(m?.note).toBe('same again, own it');
  });
  it('sets change shows sets × reps', () => {
    const m = nextTimeMark({ ...base, commands: ['INCREASE_SETS'], weightKg: 60, sets: 4 }, [{ reps: 8, weight: 60 }, { reps: 8, weight: 60 }, { reps: 8, weight: 60 }]);
    expect(m).toMatchObject({ oldValue: '3 × 8', newValue: '4 × 8' });
  });
  it('bodyweight reps up', () => {
    const m = nextTimeMark({ ...base, commands: ['INCREASE_REPS'], weightKg: 0, reps: 12 }, [{ reps: 10, weight: 0 }, { reps: 10, weight: 0 }, { reps: 10, weight: 0 }]);
    expect(m).toMatchObject({ oldValue: '3 × 10', newValue: '3 × 12', note: 'more reps next time' });
  });
  it('every note fits the pen limit', () => {
    for (const c of ['CALIBRATE', 'DELOAD', 'INCREASE_WEIGHT', 'DECREASE_SETS', 'SUGGEST_HARDER_VARIATION'] as const) {
      const m = nextTimeMark({ ...base, commands: [c], weightKg: 40 }, []);
      expect(m!.note.length).toBeLessThanOrEqual(40);
    }
  });
});
