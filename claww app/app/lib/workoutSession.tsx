import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { AppState } from 'react-native';
import * as Haptics from 'expo-haptics';
import { getExerciseForms, getLastTimeSets, logWorkoutDayEvent, logWorkoutSet, type WorkoutRow } from './data';
import type { ExerciseForm } from './exerciseForm';
import { useAppState } from './appState';
import { newClientId, useSetQueueFlusher } from './setQueueRuntime';
import { refreshReminders } from './reminderSync';
import {
  adjustRest as adjustRestClock,
  elapsedSeconds,
  endRest,
  pause,
  restIsOver,
  resume,
  startClock,
  startRest,
  type ClockState,
} from './sessionClock';
import {
  applyLastTimeWeights,
  buildInitialState,
  currentSetIndex,
  isExerciseComplete,
  isSessionComplete,
  markDone,
  markSkipped,
  nextExerciseWithWork,
  sessionTotals,
  updateRow,
  type ExerciseState,
  type LastTimeMap,
  type SetRowState,
} from './sessionPlan';

const REST_SECONDS = 45;

export type SessionStatus = 'idle' | 'active' | 'resting' | 'completed';

export interface SessionSummary {
  elapsedSeconds: number;
  setsCompleted: number;
  totalSetsPlanned: number;
  repsCompleted: number;
  exercisesCompleted: number;
  totalExercises: number;
  xpEarned: number;
}

export interface LastCompletedSet {
  exerciseName: string;
  setNumber: number;
  totalSets: number;
  reps: number;
  weight: number;
}

interface WorkoutSessionState {
  status: SessionStatus;
  workout: WorkoutRow | null;
  dayIndex: number;
  exerciseIndex: number;
  /** Index of the first unlogged set of the current exercise, or -1 when it's complete. */
  setIndex: number;
  /** Every exercise's set rows — what the player renders and edits. */
  plan: ExerciseState[];
  /** Last session's sets per exercise name, for the "last" column. */
  lastTime: LastTimeMap;
  /** Form-guide content per exercise name — empty until the catalog has it (V2 PHASE 6.2 / 8). */
  forms: Record<string, ExerciseForm>;
  /** True once lastTime has loaded, so "first time doing this exercise" isn't guessed from an empty map. */
  lastTimeLoaded: boolean;
  /** Start, pause and rest timestamps. Changes only on those events — never
   * once a second — so ticking displays derive their value locally with
   * useNow (see components/player/clocks.tsx). */
  clock: ClockState | null;
  /** When the current rest ends (ms since epoch), or null. Same as clock.restEndsAt. */
  restEndsAt: number | null;
  isPaused: boolean;
  lastSummary: SessionSummary | null;
  /** The set that was just logged — shown on the rest screen. */
  lastCompletedSet: LastCompletedSet | null;
  startSession: (workout: WorkoutRow, dayIndex?: number) => void;
  togglePause: () => void;
  /** Edits a set row; a weight change carries forward to later unlogged sets. */
  updateSetRow: (exIdx: number, setIdx: number, patch: Partial<Pick<SetRowState, 'reps' | 'weight'>>) => void;
  /** Logs a set with its row's numbers — the current one by default. Updates the UI at once; saving happens in the background. `rir` is the optional reps-left-in-the-tank chip (0-3, 3 = 3+). */
  logSet: (exIdx?: number, setIdx?: number, rir?: number | null) => void;
  /** Id shared by every set of this session (V2 PHASE 6.3), or null when idle. */
  sessionId: string | null;
  skipExercise: () => void;
  goToExercise: (exIdx: number) => void;
  previousExercise: () => void;
  skipRest: () => void;
  /** Adds or removes rest time, in seconds (e.g. ±15). */
  adjustRest: (deltaSeconds: number) => void;
  endSession: () => void;
}

const WorkoutSessionContext = createContext<WorkoutSessionState | null>(null);

export function WorkoutSessionProvider({ children }: { children: React.ReactNode }) {
  const { userId, bumpXp } = useAppState();
  useSetQueueFlusher(userId);
  const [status, setStatus] = useState<SessionStatus>('idle');
  const [workout, setWorkout] = useState<WorkoutRow | null>(null);
  const [dayIndex, setDayIndex] = useState(0);
  const [exerciseIndex, setExerciseIndex] = useState(0);
  const [plan, setPlanState] = useState<ExerciseState[]>([]);
  const [lastTime, setLastTime] = useState<LastTimeMap>({});
  const [forms, setForms] = useState<Record<string, ExerciseForm>>({});
  const [lastTimeLoaded, setLastTimeLoaded] = useState(false);
  const [clock, setClock] = useState<ClockState | null>(null);
  const [lastSummary, setLastSummary] = useState<SessionSummary | null>(null);
  const [lastCompletedSet, setLastCompletedSet] = useState<LastCompletedSet | null>(null);

  // Mirrors of state that taps read synchronously, so two quick taps can't
  // both act on a stale copy.
  const planRef = useRef<ExerciseState[]>([]);
  const touched = useRef(new Set<string>());
  const sessionKey = useRef(0);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const sessionIdRef = useRef<string | null>(null);

  const setPlan = useCallback((next: ExerciseState[]) => {
    planRef.current = next;
    setPlanState(next);
  }, []);

  const today = workout?.plan.days[dayIndex] ?? null;
  const exercises = useMemo(() => today?.exercises ?? [], [today]);
  const isPaused = clock?.pausedAt != null;
  const restEndsAt = clock?.restEndsAt ?? null;
  const setIndex = currentSetIndex(plan[exerciseIndex]);

  const finishRest = useCallback(() => {
    setClock((c) => (c ? endRest(c) : c));
    setStatus((s) => (s === 'resting' ? 'active' : s));
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {});
  }, []);

  // One timeout to the rest's end time — not a per-second interval. Re-armed
  // whenever the end time changes (±15 s, pause/resume).
  useEffect(() => {
    if (status !== 'resting' || !clock || clock.restEndsAt === null || clock.pausedAt !== null) return;
    const ms = clock.restEndsAt - Date.now();
    if (ms <= 0) {
      finishRest();
      return;
    }
    const id = setTimeout(finishRest, ms);
    return () => clearTimeout(id);
  }, [status, clock, finishRest]);

  // JS timers are suspended in the background, so the timeout above can't
  // fire there. Coming back, end a rest whose time has already passed.
  useEffect(() => {
    const sub = AppState.addEventListener('change', (next) => {
      if (next !== 'active') return;
      setClock((c) => {
        if (c && restIsOver(c, Date.now())) {
          setStatus((s) => (s === 'resting' ? 'active' : s));
          return endRest(c);
        }
        return c;
      });
    });
    return () => sub.remove();
  }, []);

  const startSession = useCallback(
    (w: WorkoutRow, startDayIndex = 0) => {
      const key = ++sessionKey.current;
      const dayExercises = w.plan.days[startDayIndex]?.exercises ?? [];
      touched.current = new Set();
      sessionIdRef.current = newClientId();
      setSessionId(sessionIdRef.current);
      setWorkout(w);
      setDayIndex(startDayIndex);
      setExerciseIndex(0);
      setPlan(buildInitialState(dayExercises, {}));
      setLastTime({});
      setLastTimeLoaded(false);
      setForms({});
      setClock(startClock(Date.now()));
      setLastSummary(null);
      setLastCompletedSet(null);
      setStatus('active');

      if (userId) {
        getLastTimeSets(userId, dayExercises.map((ex) => ex.name)).then((map) => {
          if (sessionKey.current !== key) return;
          setLastTime(map);
          setLastTimeLoaded(true);
          setPlan(applyLastTimeWeights(planRef.current, dayExercises, map, (e, s) => !touched.current.has(`${e}:${s}`)));
        });
      }
      getExerciseForms(dayExercises.map((ex) => ex.name)).then((f) => {
        if (sessionKey.current === key) setForms(f);
      });
    },
    [userId, setPlan]
  );

  const togglePause = useCallback(() => {
    setClock((c) => {
      if (!c) return c;
      const now = Date.now();
      return c.pausedAt === null ? pause(c, now) : resume(c, now);
    });
  }, []);

  const updateSetRow = useCallback(
    (exIdx: number, setIdx: number, patch: Partial<Pick<SetRowState, 'reps' | 'weight'>>) => {
      touched.current.add(`${exIdx}:${setIdx}`);
      if (patch.weight !== undefined) {
        planRef.current[exIdx]?.rows.forEach((row, s) => {
          if (s > setIdx && !row.done) touched.current.add(`${exIdx}:${s}`);
        });
      }
      setPlan(updateRow(planRef.current, exIdx, setIdx, patch));
    },
    [setPlan]
  );

  const finish = useCallback(
    (finalPlan: ExerciseState[]) => {
      if (userId && workout && today) {
        logWorkoutDayEvent(userId, workout.id, today.day, today.focus, 'completed').then(() => {
          refreshReminders(userId).catch(() => {}); // drops today's workout reminder
        });
      }
      const totals = sessionTotals(finalPlan);
      setLastSummary({
        ...totals,
        elapsedSeconds: clock ? elapsedSeconds(clock, Date.now()) : 0,
        totalSetsPlanned: finalPlan.reduce((s, ex) => s + ex.rows.length, 0),
        totalExercises: finalPlan.length,
        xpEarned: totals.setsCompleted * 5,
      });
      setClock((c) => (c ? endRest(c) : c));
      setStatus('completed');
    },
    [userId, workout, today, clock]
  );

  const logSet = useCallback(
    (exIdxArg?: number, setIdxArg?: number, rir?: number | null) => {
      if (!userId || !workout || !today) return;
      const current = planRef.current;
      const exIdx = exIdxArg ?? exerciseIndex;
      const setIdx = setIdxArg ?? currentSetIndex(current[exIdx]);
      const exercise = exercises[exIdx];
      const row = current[exIdx]?.rows[setIdx];
      if (!exercise || !row || row.done) return;

      const next = markDone(current, exIdx, setIdx);
      setPlan(next);
      setLastCompletedSet({
        exerciseName: exercise.name,
        setNumber: setIdx + 1,
        totalSets: row ? current[exIdx].rows.length : exercise.sets,
        reps: row.reps,
        weight: row.weight,
      });
      bumpXp(5); // matches awardXp(userId, 5, 'set_completed') in logWorkoutSet

      // Fire-and-forget: the UI above has already moved on.
      logWorkoutSet(userId, {
        exerciseName: exercise.name,
        exerciseId: exercise.exerciseId,
        setNumber: setIdx + 1,
        repsPrescribed: exercise.reps,
        repsAchieved: row.reps,
        weightPrescribed: row.prescribedWeight,
        weightAchieved: row.weight,
        rir: rir ?? null,
        sessionId: sessionIdRef.current,
      });

      if (isSessionComplete(next)) {
        finish(next);
        return;
      }
      if (isExerciseComplete(next[exIdx])) {
        const nextIdx = nextExerciseWithWork(next, exIdx);
        if (nextIdx !== -1) setExerciseIndex(nextIdx);
      } else if (exIdx !== exerciseIndex) {
        setExerciseIndex(exIdx);
      }
      setClock((c) => (c ? startRest(c, Date.now(), REST_SECONDS) : c));
      setStatus('resting');
    },
    [userId, workout, today, exercises, exerciseIndex, bumpXp, finish, setPlan]
  );

  const skipExercise = useCallback(() => {
    const next = markSkipped(planRef.current, exerciseIndex);
    setPlan(next);
    if (isSessionComplete(next)) {
      finish(next);
      return;
    }
    const nextIdx = nextExerciseWithWork(next, exerciseIndex);
    if (nextIdx !== -1) setExerciseIndex(nextIdx);
  }, [exerciseIndex, finish, setPlan]);

  const goToExercise = useCallback(
    (exIdx: number) => {
      if (exIdx >= 0 && exIdx < planRef.current.length) {
        // Coming back to a skipped exercise un-skips it, so its sets can be logged.
        if (planRef.current[exIdx].skipped) {
          setPlan(planRef.current.map((ex, i) => (i === exIdx ? { ...ex, skipped: false } : ex)));
        }
        setExerciseIndex(exIdx);
      }
    },
    [setPlan]
  );

  const previousExercise = useCallback(() => {
    if (exerciseIndex > 0) goToExercise(exerciseIndex - 1);
  }, [exerciseIndex, goToExercise]);

  const skipRest = useCallback(() => {
    setClock((c) => (c ? endRest(c) : c));
    setStatus((s) => (s === 'resting' ? 'active' : s));
  }, []);

  const adjustRest = useCallback((deltaSeconds: number) => {
    setClock((c) => (c ? adjustRestClock(c, Date.now(), deltaSeconds) : c));
  }, []);

  const endSession = useCallback(() => {
    sessionKey.current += 1;
    setStatus('idle');
    setWorkout(null);
    setDayIndex(0);
    setPlan([]);
    setClock(null);
  }, [setPlan]);

  const value = useMemo<WorkoutSessionState>(
    () => ({
      status,
      workout,
      dayIndex,
      exerciseIndex,
      setIndex,
      plan,
      lastTime,
      forms,
      lastTimeLoaded,
      clock,
      restEndsAt,
      isPaused,
      lastSummary,
      lastCompletedSet,
      sessionId,
      startSession,
      togglePause,
      updateSetRow,
      logSet,
      skipExercise,
      goToExercise,
      previousExercise,
      skipRest,
      adjustRest,
      endSession,
    }),
    [
      status,
      workout,
      dayIndex,
      exerciseIndex,
      setIndex,
      plan,
      lastTime,
      forms,
      lastTimeLoaded,
      clock,
      restEndsAt,
      isPaused,
      lastSummary,
      lastCompletedSet,
      sessionId,
      startSession,
      togglePause,
      updateSetRow,
      logSet,
      skipExercise,
      goToExercise,
      previousExercise,
      skipRest,
      adjustRest,
      endSession,
    ]
  );

  return <WorkoutSessionContext.Provider value={value}>{children}</WorkoutSessionContext.Provider>;
}

export function useWorkoutSession(): WorkoutSessionState {
  const ctx = useContext(WorkoutSessionContext);
  if (!ctx) throw new Error('useWorkoutSession must be used within WorkoutSessionProvider');
  return ctx;
}
