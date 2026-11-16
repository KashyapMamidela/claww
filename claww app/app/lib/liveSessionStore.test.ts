import { describe, expect, it } from 'vitest';
import { MAX_AGE_MS, validateSnapshot } from './liveSessionStore';

const now = 1_800_000_000_000;
const good = {
  v: 1,
  userId: 'u1',
  savedAt: now - 60_000,
  sessionId: 's1',
  workout: { id: 'w' },
  dayIndex: 0,
  exerciseIndex: 1,
  plan: [{ rows: [] }],
  clock: { startedAt: now - 600_000 },
  prescribed: [],
  modalities: {},
};

describe('validateSnapshot', () => {
  it('accepts a recent session of the same user', () => {
    expect(validateSnapshot(good, 'u1', now)?.exerciseIndex).toBe(1);
  });
  it('rejects another user, a stale session, and a clock-skewed future one', () => {
    expect(validateSnapshot(good, 'u2', now)).toBeNull();
    expect(validateSnapshot({ ...good, savedAt: now - MAX_AGE_MS - 1 }, 'u1', now)).toBeNull();
    expect(validateSnapshot({ ...good, savedAt: now + 10 * 60_000 }, 'u1', now)).toBeNull();
  });
  it('rejects anything malformed instead of throwing', () => {
    expect(validateSnapshot(null, 'u1', now)).toBeNull();
    expect(validateSnapshot('x', 'u1', now)).toBeNull();
    expect(validateSnapshot({ ...good, plan: [] }, 'u1', now)).toBeNull();
    expect(validateSnapshot({ ...good, clock: {} }, 'u1', now)).toBeNull();
    expect(validateSnapshot({ ...good, v: 2 }, 'u1', now)).toBeNull();
  });
  it('fills in missing modalities', () => {
    const { modalities, ...rest } = good;
    void modalities;
    expect(validateSnapshot(rest, 'u1', now)?.modalities).toEqual({});
  });
});
