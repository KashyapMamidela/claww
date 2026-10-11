import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { AppState } from 'react-native';
import * as Haptics from 'expo-haptics';
import { logWorkoutDayEvent, logWorkoutSet, type WorkoutRow } from './data';
import { useAppState } from './appState';
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
}

interface WorkoutSessionState {
  status: SessionStatus;
  workout: WorkoutRow | null;
  dayIndex: number;
  exerciseIndex: number;
  setNumber: number;
  /** Start, pause and rest timestamps. Changes only on those events — never
   * once a second — so ticking displays derive their value locally with
   * useNow (see components/player/clocks.tsx). */
  clock: ClockState | null;
  /** When the current rest ends (ms since epoch), or null. Same as clock.restEndsAt. */
  restEndsAt: number | null;
  isPaused: boolean;
  weight: number;
  lastSummary: SessionSummary | null;
  /** The set that was just confirmed — shown during the rest screen instead
   * of the upcoming set number, so the last set of an exercise reads as
   * "4/4" done rather than jumping straight to the next exercise's "1/N" with
   * no confirmation the 4th set ever happened. */
  lastCompletedSet: LastCompletedSet | null;
  startSession: (workout: WorkoutRow, dayIndex?: number) => void;
  togglePause: () => void;
  setWeight: (w: number) => void;
  /** Logs the set with what the user actually did. */
  finishSet: (repsAchieved: number, weightAchieved: number) => void;
  skipExercise: () => void;
  skipRest: () => void;
  /** Adds or removes rest time, in seconds (e.g. ±15). */
  adjustRest: (deltaSeconds: number) => void;
  endSession: () => void;
}

const WorkoutSessionContext = createContext<WorkoutSessionState | null>(null);

export function WorkoutSessionProvider({ children }: { children: React.ReactNode }) {
  const { userId, bumpXp } = useAppState();
  const [status, setStatus] = useState<SessionStatus>('idle');
  const [workout, setWorkout] = useState<WorkoutRow | null>(null);
  const [dayIndex, setDayIndex] = useState(0);
  const [exerciseIndex, setExerciseIndex] = useState(0);
  const [setNumber, setSetNumber] = useState(1);
  const [clock, setClock] = useState<ClockState | null>(null);
  const [weight, setWeightState] = useState(0);
  const [lastSummary, setLastSummary] = useState<SessionSummary | null>(null);
  const [lastCompletedSet, setLastCompletedSet] = useState<LastCompletedSet | null>(null);

  const totals = useRef({ setsCompleted: 0, repsCompleted: 0, exercisesCompleted: 0, xpEarned: 0 });

  const today = workout?.plan.days[dayIndex] ?? null;
  const exercises = today?.exercises ?? [];
  const totalSetsPlanned = exercises.reduce((s, ex) => s + ex.sets, 0);
  const isPaused = clock?.pausedAt != null;
  const restEndsAt = clock?.restEndsAt ?? null;

  const finishRest = useCallback(() => {
    setClock((c) => (c ? endRest(c) : c));
    setStatus((s) => (s === 'resting' ? 'active' : s));
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
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

  const startSession = useCallback((w: WorkoutRow, startDayIndex = 0) => {
    totals.current = { setsCompleted: 0, repsCompleted: 0, exercisesCompleted: 0, xpEarned: 0 };
    setWorkout(w);
    setDayIndex(startDayIndex);
    setExerciseIndex(0);
    setSetNumber(1);
    setClock(startClock(Date.now()));
    setWeightState(0);
    setLastSummary(null);
    setLastCompletedSet(null);
    setStatus('active');
  }, []);

  const togglePause = useCallback(() => {
    setClock((c) => {
      if (!c) return c;
      const now = Date.now();
      return c.pausedAt === null ? pause(c, now) : resume(c, now);
    });
  }, []);

  const setWeight = useCallback((w: number) => setWeightState(Math.max(0, w)), []);

  const finish = useCallback(
    (summary: Omit<SessionSummary, 'elapsedSeconds'>) => {
      if (userId && workout && today) {
        logWorkoutDayEvent(userId, workout.id, today.day, today.focus, 'completed');
      }
      setLastSummary({ ...summary, elapsedSeconds: clock ? elapsedSeconds(clock, Date.now()) : 0 });
      setClock((c) => (c ? endRest(c) : c));
      setStatus('completed');
    },
    [userId, workout, today, clock]
  );

  const finishSet = useCallback(
    (repsAchieved: number, weightAchieved: number) => {
      if (!userId || !workout || !today) return;
      const exercise = exercises[exerciseIndex];
      if (!exercise) return;

      totals.current.setsCompleted += 1;
      totals.current.repsCompleted += repsAchieved;
      totals.current.xpEarned += 5;
      bumpXp(5); // matches awardXp(userId, 5, 'set_completed') in logWorkoutSet — live, not just on the session summary

      logWorkoutSet(userId, {
        exerciseName: exercise.name,
        exerciseId: exercise.exerciseId,
        setNumber,
        repsPrescribed: exercise.reps,
        repsAchieved,
        weightPrescribed: weight,
        weightAchieved,
      });

      const isLastSetOfExercise = setNumber >= exercise.sets;
      const isLastExercise = exerciseIndex >= exercises.length - 1;

      setLastCompletedSet({ exerciseName: exercise.name, setNumber, totalSets: exercise.sets });

      if (isLastSetOfExercise) {
        totals.current.exercisesCompleted += 1;
      }

      if (isLastSetOfExercise && isLastExercise) {
        finish({
          setsCompleted: totals.current.setsCompleted,
          totalSetsPlanned,
          repsCompleted: totals.current.repsCompleted,
          exercisesCompleted: totals.current.exercisesCompleted,
          totalExercises: exercises.length,
          xpEarned: totals.current.xpEarned,
        });
        return;
      }

      if (isLastSetOfExercise) {
        setExerciseIndex((i) => i + 1);
        setSetNumber(1);
        setWeightState(0);
      } else {
        setSetNumber((n) => n + 1);
        setWeightState(weightAchieved); // next set starts from what was actually lifted, not the un-adjusted prior value
      }
      setClock((c) => (c ? startRest(c, Date.now(), REST_SECONDS) : c));
      setStatus('resting');
    },
    [userId, workout, today, exercises, exerciseIndex, setNumber, weight, totalSetsPlanned, finish, bumpXp]
  );

  const skipExercise = useCallback(() => {
    if (!today) return;
    const isLastExercise = exerciseIndex >= exercises.length - 1;
    if (isLastExercise) {
      finish({
        setsCompleted: totals.current.setsCompleted,
        totalSetsPlanned,
        repsCompleted: totals.current.repsCompleted,
        exercisesCompleted: totals.current.exercisesCompleted,
        totalExercises: exercises.length,
        xpEarned: totals.current.xpEarned,
      });
      return;
    }
    setExerciseIndex((i) => i + 1);
    setSetNumber(1);
    setWeightState(0);
    setClock((c) => (c ? endRest(c) : c));
    setStatus('active');
  }, [today, exercises, exerciseIndex, totalSetsPlanned, finish]);

  const skipRest = useCallback(() => {
    setClock((c) => (c ? endRest(c) : c));
    setStatus('active');
  }, []);

  const adjustRest = useCallback((deltaSeconds: number) => {
    setClock((c) => (c ? adjustRestClock(c, Date.now(), deltaSeconds) : c));
  }, []);

  const endSession = useCallback(() => {
    setStatus('idle');
    setWorkout(null);
    setDayIndex(0);
    setClock(null);
  }, []);

  const value = useMemo<WorkoutSessionState>(
    () => ({
      status,
      workout,
      dayIndex,
      exerciseIndex,
      setNumber,
      clock,
      restEndsAt,
      isPaused,
      weight,
      lastSummary,
      lastCompletedSet,
      startSession,
      togglePause,
      setWeight,
      finishSet,
      skipExercise,
      skipRest,
      adjustRest,
      endSession,
    }),
    [
      status,
      workout,
      dayIndex,
      exerciseIndex,
      setNumber,
      clock,
      restEndsAt,
      isPaused,
      weight,
      lastSummary,
      lastCompletedSet,
      startSession,
      togglePause,
      setWeight,
      finishSet,
      skipExercise,
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
