import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { logWorkoutDayEvent, logWorkoutSet, type WorkoutRow } from './data';
import { useAppState } from './appState';

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
  elapsedSeconds: number;
  restRemaining: number;
  isPaused: boolean;
  weight: number;
  lastSummary: SessionSummary | null;
  /** The set that was just confirmed — shown during the rest screen instead
   * of the upcoming set number, so the last set of an exercise reads as
   * "4/4 ✓" rather than jumping straight to the next exercise's "1/N" with
   * no confirmation the 4th set ever happened. */
  lastCompletedSet: LastCompletedSet | null;
  startSession: (workout: WorkoutRow, dayIndex?: number) => void;
  togglePause: () => void;
  setWeight: (w: number) => void;
  /** Logs the set with what the user actually confirmed — see LiveWorkoutPlayer's confirm step. */
  finishSet: (repsAchieved: number, weightAchieved: number) => void;
  skipExercise: () => void;
  skipRest: () => void;
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
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [restRemaining, setRestRemaining] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const [weight, setWeightState] = useState(0);
  const [lastSummary, setLastSummary] = useState<SessionSummary | null>(null);
  const [lastCompletedSet, setLastCompletedSet] = useState<LastCompletedSet | null>(null);

  const totals = useRef({ setsCompleted: 0, repsCompleted: 0, exercisesCompleted: 0, xpEarned: 0 });

  const today = workout?.plan.days[dayIndex] ?? null;
  const exercises = today?.exercises ?? [];
  const totalSetsPlanned = exercises.reduce((s, ex) => s + ex.sets, 0);

  // Overall session clock — ticks whenever a session is running and not paused.
  useEffect(() => {
    if ((status !== 'active' && status !== 'resting') || isPaused) return;
    const id = setInterval(() => setElapsedSeconds((e) => e + 1), 1000);
    return () => clearInterval(id);
  }, [status, isPaused]);

  // Rest countdown — separate from the overall clock so it can hit 0 and
  // auto-resume the set even while the overall clock keeps rolling.
  useEffect(() => {
    if (status !== 'resting' || isPaused) return;
    if (restRemaining <= 0) {
      setStatus('active');
      return;
    }
    const id = setInterval(() => setRestRemaining((r) => Math.max(0, r - 1)), 1000);
    return () => clearInterval(id);
  }, [status, isPaused, restRemaining]);

  const startSession = useCallback((w: WorkoutRow, startDayIndex = 0) => {
    totals.current = { setsCompleted: 0, repsCompleted: 0, exercisesCompleted: 0, xpEarned: 0 };
    setWorkout(w);
    setDayIndex(startDayIndex);
    setExerciseIndex(0);
    setSetNumber(1);
    setElapsedSeconds(0);
    setRestRemaining(0);
    setIsPaused(false);
    setWeightState(0);
    setLastSummary(null);
    setLastCompletedSet(null);
    setStatus('active');
  }, []);

  const togglePause = useCallback(() => setIsPaused((p) => !p), []);
  const setWeight = useCallback((w: number) => setWeightState(Math.max(0, w)), []);

  const finish = useCallback(
    (summary: SessionSummary) => {
      if (userId && workout && today) {
        logWorkoutDayEvent(userId, workout.id, today.day, today.focus, 'completed');
      }
      setLastSummary(summary);
      setStatus('completed');
    },
    [userId, workout, today]
  );

  const finishSet = useCallback((repsAchieved: number, weightAchieved: number) => {
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
        elapsedSeconds,
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
    setRestRemaining(REST_SECONDS);
    setStatus('resting');
  }, [userId, workout, today, exercises, exerciseIndex, setNumber, weight, elapsedSeconds, totalSetsPlanned, finish, bumpXp]);

  const skipExercise = useCallback(() => {
    if (!today) return;
    const isLastExercise = exerciseIndex >= exercises.length - 1;
    if (isLastExercise) {
      finish({
        elapsedSeconds,
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
    setStatus('active');
  }, [today, exercises, exerciseIndex, elapsedSeconds, totalSetsPlanned, finish]);

  const skipRest = useCallback(() => {
    setRestRemaining(0);
    setStatus('active');
  }, []);

  const endSession = useCallback(() => {
    setStatus('idle');
    setWorkout(null);
    setDayIndex(0);
  }, []);

  const value = useMemo<WorkoutSessionState>(
    () => ({
      status,
      workout,
      dayIndex,
      exerciseIndex,
      setNumber,
      elapsedSeconds,
      restRemaining,
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
      endSession,
    }),
    [
      status,
      workout,
      dayIndex,
      exerciseIndex,
      setNumber,
      elapsedSeconds,
      restRemaining,
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
