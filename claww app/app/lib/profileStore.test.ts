import { beforeEach, describe, expect, it } from 'vitest';
import { clearProfileCache, invalidateProfile, PROFILE_TTL_MS, profileVersion, readProfileCache, subscribeProfile, writeProfileCache } from './profileStore';

describe('profileStore', () => {
  beforeEach(() => clearProfileCache());

  it('returns the cached row for the same user only', () => {
    writeProfileCache('u1', { age: 21 }, 1000);
    expect(readProfileCache<{ age: number }>('u1', 1000)).toEqual({ value: { age: 21 }, fresh: true });
    expect(readProfileCache('u2', 1000)).toBeNull();
  });

  it('goes stale after the TTL but keeps the value to show meanwhile', () => {
    writeProfileCache('u1', { age: 21 }, 1000);
    expect(readProfileCache('u1', 1000 + PROFILE_TTL_MS + 1)?.fresh).toBe(false);
    expect(readProfileCache('u1', 1000 + PROFILE_TTL_MS + 1)?.value).toEqual({ age: 21 });
  });

  it('invalidate marks it stale and tells every listener', () => {
    let calls = 0;
    const off = subscribeProfile(() => calls++);
    writeProfileCache('u1', { age: 21 }, 1000);
    const v = profileVersion();
    invalidateProfile();
    expect(readProfileCache('u1', 1001)?.fresh).toBe(false);
    expect(profileVersion()).toBe(v + 1);
    expect(calls).toBe(2);
    off();
    invalidateProfile();
    expect(calls).toBe(2);
  });

  it('clear forgets the last account', () => {
    writeProfileCache('u1', { age: 21 });
    clearProfileCache();
    expect(readProfileCache('u1')).toBeNull();
  });
});
