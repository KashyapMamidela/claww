import AsyncStorage from '@react-native-async-storage/async-storage';

// A workout in progress survives the app being closed or killed: the session is written to the phone as it changes,
// and read back on the next launch. Sets already logged are safe in the set queue either way; this keeps the
// *session* (which exercise, which sets are ticked, the clock) so the user carries on instead of starting over.

const KEY = 'claww.liveSession.v1';
/** A session left alone for longer than this is stale (the user went to bed): it is dropped, not resumed. */
export const MAX_AGE_MS = 12 * 60 * 60 * 1000;

export interface LiveSessionSnapshot {
  v: 1;
  userId: string;
  savedAt: number;
  sessionId: string | null;
  // The rest is the session's own state, stored as it is; the provider owns its shape.
  workout: unknown;
  dayIndex: number;
  exerciseIndex: number;
  plan: unknown[];
  clock: { startedAt: number; [k: string]: unknown };
  prescribed: unknown[];
  modalities: Record<string, string>;
}

/** The snapshot if it is a usable, recent session of this user; otherwise null. Pure. */
export function validateSnapshot(raw: unknown, userId: string, now: number): LiveSessionSnapshot | null {
  if (!raw || typeof raw !== 'object') return null;
  const s = raw as Partial<LiveSessionSnapshot>;
  if (s.v !== 1 || s.userId !== userId) return null;
  if (typeof s.savedAt !== 'number' || now - s.savedAt > MAX_AGE_MS || now < s.savedAt - 60_000) return null;
  if (!s.workout || !Array.isArray(s.plan) || s.plan.length === 0 || !Array.isArray(s.prescribed)) return null;
  if (!s.clock || typeof s.clock.startedAt !== 'number') return null;
  if (typeof s.dayIndex !== 'number' || typeof s.exerciseIndex !== 'number') return null;
  return { ...(s as LiveSessionSnapshot), modalities: s.modalities ?? {} };
}

export async function saveLiveSession(snapshot: LiveSessionSnapshot): Promise<void> {
  try {
    await AsyncStorage.setItem(KEY, JSON.stringify(snapshot));
  } catch {
    // a failed save only means no resume after a kill; the workout itself carries on
  }
}

export async function clearLiveSession(): Promise<void> {
  try {
    await AsyncStorage.removeItem(KEY);
  } catch {
    // nothing to do
  }
}

export async function loadLiveSession(userId: string, now = Date.now()): Promise<LiveSessionSnapshot | null> {
  try {
    const text = await AsyncStorage.getItem(KEY);
    if (!text) return null;
    const snap = validateSnapshot(JSON.parse(text), userId, now);
    if (!snap) await clearLiveSession();
    return snap;
  } catch {
    return null;
  }
}

// Set when the session came back from disk, so the player skips the start intro and opens as the small bar.
let resumed = false;
export const markResumed = () => {
  resumed = true;
};
/** True once after a resume; reading it clears it. */
export const consumeResumed = (): boolean => {
  const r = resumed;
  resumed = false;
  return r;
};
