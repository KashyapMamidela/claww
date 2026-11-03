// NG PHASE 2: the one cached copy of the signed-in user's profile row. No imports, so
// lib/data.ts can invalidate it after every write without a circular import; the
// `useProfile()` hook in lib/profile.ts reads through it.

type Listener = () => void;

let cached: { userId: string; value: unknown; at: number } | null = null;
let version = 0;
const listeners = new Set<Listener>();

/** How long a fetched profile counts as fresh before the hook reloads it in the background. */
export const PROFILE_TTL_MS = 5 * 60 * 1000;

export function readProfileCache<T>(userId: string, now = Date.now()): { value: T; fresh: boolean } | null {
  if (!cached || cached.userId !== userId) return null;
  return { value: cached.value as T, fresh: now - cached.at < PROFILE_TTL_MS };
}

export function writeProfileCache(userId: string, value: unknown, now = Date.now()): void {
  cached = { userId, value, at: now };
  version += 1;
  listeners.forEach((l) => l());
}

/** Call after any write to `profiles`: every `useProfile()` reloads. */
export function invalidateProfile(): void {
  if (cached) cached = { ...cached, at: Number.NEGATIVE_INFINITY };
  version += 1;
  listeners.forEach((l) => l());
}

/** On sign-out, so the next account never sees the last one's profile. */
export function clearProfileCache(): void {
  cached = null;
  version += 1;
  listeners.forEach((l) => l());
}

export function profileVersion(): number {
  return version;
}

export function subscribeProfile(listener: Listener): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}
