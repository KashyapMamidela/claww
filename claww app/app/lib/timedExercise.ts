// NG PHASE 3.6: cardio, running, cycling, yoga and mobility are done against a clock, not in sets of
// reps. Pure helpers for the player's timer block. Dependency-free so Vitest can test them.

export type TimedModality = 'cardio' | 'mobility' | 'yoga';

export function isTimedModality(modality: string | null | undefined): modality is TimedModality {
  return modality === 'cardio' || modality === 'mobility' || modality === 'yoga';
}

const DEFAULT_MINUTES: Record<TimedModality, number> = { cardio: 20, yoga: 20, mobility: 10 };

/**
 * The block's target length. Plans don't store a duration for these slots yet (NG PHASE 5's blueprints will),
 * so: a single-set slot whose reps read like minutes (5 to 90) uses them, anything else gets the modality's
 * default (cardio 20, yoga 20, mobility 10 minutes).
 */
export function targetMinutes(modality: TimedModality, sets: number, reps: number): number {
  if (sets === 1 && Number.isFinite(reps) && reps >= 5 && reps <= 90) return Math.round(reps);
  return DEFAULT_MINUTES[modality];
}

/** Moves where the distance matters: walking, running, cycling and machines that measure it. Distance is optional. */
export function usesDistance(name: string): boolean {
  return /\b(running|jog(ging)?|cycling|walk(ing)?|treadmill|stationary bike|spin bike|hill sprints|fartlek|rowing|swimming)\b/i.test(name);
}

/** m:ss, or h:mm:ss from an hour. Never negative. */
export function formatTimer(ms: number): string {
  const total = Math.max(0, Math.floor(ms / 1000));
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = total % 60;
  const ss = String(s).padStart(2, '0');
  return h > 0 ? `${h}:${String(m).padStart(2, '0')}:${ss}` : `${m}:${ss}`;
}

export interface TimerDisplay {
  /** The big number: time left, or time over once the target has passed. */
  text: string;
  /** True once the target has been reached. */
  over: boolean;
  /** 0..1 of the target done, for the ring. */
  fraction: number;
}

/** Counts down from the target; past it, counts up as "+m:ss over". */
export function timerDisplay(elapsedMs: number, targetMs: number): TimerDisplay {
  const elapsed = Math.max(0, elapsedMs);
  if (targetMs <= 0) return { text: formatTimer(elapsed), over: false, fraction: 0 };
  if (elapsed < targetMs) return { text: formatTimer(targetMs - elapsed), over: false, fraction: elapsed / targetMs };
  return { text: `+${formatTimer(elapsed - targetMs)}`, over: true, fraction: 1 };
}

/**
 * Minutes to log, to one decimal. If the timer ran for at least 15 seconds that is the time. Done tapped without
 * really using the timer means "as planned", so the target is logged, the same as ticking a set.
 */
export function loggedMinutes(elapsedMs: number, targetMin: number): number {
  if (elapsedMs >= 15_000) return Math.max(0.1, Math.round((elapsedMs / 60_000) * 10) / 10);
  return targetMin;
}

/** Distance stepper: 0.5 km at a time, never below zero, rounded to 0.1. */
export function stepKm(value: number, delta: number): number {
  return Math.max(0, Math.round((value + delta * 0.5) * 10) / 10);
}
