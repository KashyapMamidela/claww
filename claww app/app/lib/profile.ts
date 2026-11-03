import { useCallback, useEffect, useState, useSyncExternalStore } from 'react';
import { getProfile, type Profile } from './data';
import { profileVersion, readProfileCache, subscribeProfile, writeProfileCache } from './profileStore';

// NG PHASE 2: `profiles` is the only source of age, height, weight and gender. Every screen
// reads them through this hook, so they are asked once and shown everywhere; setup flows
// show "From your profile · Edit" instead of asking again. Cached (lib/profileStore.ts),
// shown at once from the cache, refreshed in the background when stale, and reloaded
// after any profile write (lib/data.ts calls invalidateProfile()).

export interface UseProfile {
  profile: Profile | null;
  loading: boolean;
  refresh: () => Promise<void>;
}

const inflight = new Map<string, Promise<Profile | null>>();

function load(userId: string): Promise<Profile | null> {
  const running = inflight.get(userId);
  if (running) return running;
  const p = getProfile(userId)
    .then((row) => {
      if (row) writeProfileCache(userId, row);
      return row;
    })
    .finally(() => inflight.delete(userId));
  inflight.set(userId, p);
  return p;
}

export function useProfile(userId: string | null): UseProfile {
  const version = useSyncExternalStore(subscribeProfile, profileVersion, profileVersion);
  const cached = userId ? readProfileCache<Profile>(userId) : null;
  const [loading, setLoading] = useState(!cached);

  useEffect(() => {
    if (!userId) return;
    const entry = readProfileCache<Profile>(userId);
    if (entry?.fresh) {
      setLoading(false);
      return;
    }
    let cancelled = false;
    setLoading(!entry);
    load(userId).finally(() => {
      if (!cancelled) setLoading(false);
    });
    return () => {
      cancelled = true;
    };
  }, [userId, version]);

  const refresh = useCallback(async () => {
    if (userId) await load(userId);
  }, [userId]);

  return { profile: cached?.value ?? null, loading, refresh };
}

export { basicsSummary, hasBasics, profileBasics, type ProfileBasics } from './profileBasics';
