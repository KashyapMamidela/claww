import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useAppState } from './appState';
import { useProfile } from './profile';
import { useWorkoutSession } from './workoutSession';
import { logActivity } from './data';
import { activityLine, liveActivityKcal } from './activities';
import { elapsedSeconds, pause, resume, startClock, type ClockState } from './sessionClock';
import { showMoment } from './moments';
import { setDone } from './haptics';
import { hideSessionNotification, onSessionNotificationAction, showSessionNotification } from '../modules/claww-session-notification';
import { ActivityPlayer } from '../components/activity/ActivityPlayer';

// A live activity: pick a sport or a walk, start a timer, and play. The timer is timestamp-based (lib/sessionClock), so it
// stays right while the app is in the background, and it is saved on the phone so a restart brings it back. While it runs
// there is a player (full screen, or a bar above the tab bar) and an ongoing notification with a chronometer and a Done
// button. Finishing logs the minutes as an activity (calories and recovery, never a plan day) and shows the finish moment.

const KEY = 'claww.activity.v1';
/** A saved activity older than this is dropped on the next start: nobody plays for 12 hours, the app was just left running. */
const STALE_MS = 12 * 3_600_000;

interface Saved {
  userId: string;
  name: string;
  clock: ClockState;
  targetMin: number | null;
}

export interface ActiveActivity {
  name: string;
  clock: ClockState;
  /** Minutes the user aims for, or null for an open-ended session. */
  targetMin: number | null;
}

interface Ctx {
  active: ActiveActivity | null;
  paused: boolean;
  /** False while the full-screen player is open. */
  minimised: boolean;
  weightKg: number | null;
  setMinimised: (v: boolean) => void;
  start: (name: string, targetMin?: number | null) => boolean;
  togglePause: () => void;
  setTarget: (min: number | null) => void;
  /** Logs the minutes played. Resolves false (and keeps the activity running) when the log could not be saved. */
  finish: () => Promise<boolean>;
  discard: () => void;
}

const ActivityCtx = createContext<Ctx | null>(null);

export function useActivitySession(): Ctx {
  const c = useContext(ActivityCtx);
  if (!c) throw new Error('useActivitySession must be used inside ActivitySessionProvider');
  return c;
}

export function ActivitySessionProvider({ children }: { children: React.ReactNode }) {
  const { userId } = useAppState();
  const { profile } = useProfile(userId);
  const { status: workoutStatus } = useWorkoutSession();
  const [active, setActive] = useState<ActiveActivity | null>(null);
  const [minimised, setMinimised] = useState(true);
  const activeRef = useRef<ActiveActivity | null>(null);
  activeRef.current = active;
  const weightKg = profile?.weight ?? null;

  const save = useCallback(
    (a: ActiveActivity | null) => {
      if (!a || !userId) {
        AsyncStorage.removeItem(KEY).catch(() => {});
        return;
      }
      AsyncStorage.setItem(KEY, JSON.stringify({ userId, name: a.name, clock: a.clock, targetMin: a.targetMin } satisfies Saved)).catch(() => {});
    },
    [userId]
  );

  // Bring a running activity back after a restart, minimised so it never takes the screen over by surprise.
  useEffect(() => {
    if (!userId || activeRef.current) return;
    AsyncStorage.getItem(KEY)
      .then((raw) => {
        if (!raw || activeRef.current) return;
        const s = JSON.parse(raw) as Saved;
        if (s.userId !== userId || Date.now() - s.clock.startedAt > STALE_MS) {
          AsyncStorage.removeItem(KEY).catch(() => {});
          return;
        }
        setActive({ name: s.name, clock: s.clock, targetMin: s.targetMin });
        setMinimised(true);
      })
      .catch(() => {});
  }, [userId]);

  const start = useCallback(
    (name: string, targetMin: number | null = null) => {
      if (activeRef.current || !userId) return false;
      const a: ActiveActivity = { name, clock: startClock(Date.now()), targetMin };
      setActive(a);
      setMinimised(false);
      save(a);
      setDone();
      return true;
    },
    [userId, save]
  );

  const togglePause = useCallback(() => {
    const a = activeRef.current;
    if (!a) return;
    const now = Date.now();
    const next = { ...a, clock: a.clock.pausedAt === null ? pause(a.clock, now) : resume(a.clock, now) };
    setActive(next);
    save(next);
    setDone();
  }, [save]);

  const setTarget = useCallback(
    (min: number | null) => {
      const a = activeRef.current;
      if (!a) return;
      const next = { ...a, targetMin: min };
      setActive(next);
      save(next);
    },
    [save]
  );

  const discard = useCallback(() => {
    setActive(null);
    setMinimised(true);
    save(null);
    hideSessionNotification();
  }, [save]);

  const finish = useCallback(async () => {
    const a = activeRef.current;
    if (!a || !userId) return false;
    const seconds = elapsedSeconds(a.clock, Date.now());
    const minutes = Math.max(1, Math.round(seconds / 60));
    const ok = await logActivity(userId, a.name, minutes);
    if (!ok) return false;
    const kcal = liveActivityKcal(a.name, seconds, weightKg);
    setActive(null);
    setMinimised(true);
    save(null);
    hideSessionNotification();
    showMoment({ kind: 'activity', userId, name: a.name, minutes, kcal });
    return true;
  }, [userId, weightKg, save]);

  // The notification: a count-up chronometer while it runs, "Paused" when it doesn't, and a Done button. A workout shares
  // the same notification, so while one is running it keeps the notification to itself.
  const paused = !!active && active.clock.pausedAt !== null;
  const pausedAt = active?.clock.pausedAt ?? null;
  const base = active ? active.clock.startedAt + active.clock.pausedTotalMs : null;
  const name = active?.name ?? null;
  useEffect(() => {
    if (!name || base === null || workoutStatus !== 'idle') return;
    if (pausedAt !== null) {
      const min = Math.floor((pausedAt - (base ?? pausedAt)) / 60000);
      showSessionNotification(name, `Paused · ${min} min`, null, false, ['done']);
    } else {
      showSessionNotification(name, activityLine(name), base, false, ['done']);
    }
  }, [name, base, pausedAt, workoutStatus]);

  const finishRef = useRef(finish);
  finishRef.current = finish;
  useEffect(() => {
    const sub = onSessionNotificationAction((action) => {
      if (action === 'done' && activeRef.current && workoutStatus === 'idle') finishRef.current();
    });
    return () => sub.remove();
  }, [workoutStatus]);

  const value = useMemo<Ctx>(
    () => ({ active, paused, minimised, weightKg, setMinimised, start, togglePause, setTarget, finish, discard }),
    [active, paused, minimised, weightKg, start, togglePause, setTarget, finish, discard]
  );

  return (
    <ActivityCtx.Provider value={value}>
      {children}
      <ActivityPlayer />
    </ActivityCtx.Provider>
  );
}
