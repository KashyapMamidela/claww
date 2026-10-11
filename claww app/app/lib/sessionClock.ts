// Timestamp-based session clocks (V2 PHASE 2.2). Nothing here counts down
// in a setInterval: the session stores when things started or end, and the
// displayed values are derived from "now". That keeps them correct after the
// app is backgrounded (JS timers are suspended there) and means the shared
// session context never changes once a second. Pure, so Vitest can test it.

export interface ClockState {
  /** When the session started (ms since epoch). */
  startedAt: number;
  /** When the current pause began, or null while running. */
  pausedAt: number | null;
  /** Total ms spent paused before the current pause. */
  pausedTotalMs: number;
  /** When the current rest ends, or null when not resting. */
  restEndsAt: number | null;
}

export function startClock(now: number): ClockState {
  return { startedAt: now, pausedAt: null, pausedTotalMs: 0, restEndsAt: null };
}

/** Active (unpaused) seconds since the session started. */
export function elapsedSeconds(clock: ClockState, now: number): number {
  const until = clock.pausedAt ?? now;
  return Math.max(0, Math.floor((until - clock.startedAt - clock.pausedTotalMs) / 1000));
}

/** Seconds left in the current rest (rounded up so it shows 1 until it truly hits 0). 0 when not resting. */
export function restRemainingSeconds(clock: ClockState, now: number): number {
  if (clock.restEndsAt === null) return 0;
  const until = clock.pausedAt ?? now;
  return Math.max(0, Math.ceil((clock.restEndsAt - until) / 1000));
}

export function pause(clock: ClockState, now: number): ClockState {
  if (clock.pausedAt !== null) return clock;
  return { ...clock, pausedAt: now };
}

/** Resumes, pushing the rest end back by however long the pause lasted. */
export function resume(clock: ClockState, now: number): ClockState {
  if (clock.pausedAt === null) return clock;
  const pausedMs = Math.max(0, now - clock.pausedAt);
  return {
    ...clock,
    pausedAt: null,
    pausedTotalMs: clock.pausedTotalMs + pausedMs,
    restEndsAt: clock.restEndsAt === null ? null : clock.restEndsAt + pausedMs,
  };
}

export function startRest(clock: ClockState, now: number, seconds: number): ClockState {
  return { ...clock, restEndsAt: now + seconds * 1000 };
}

export function endRest(clock: ClockState): ClockState {
  return { ...clock, restEndsAt: null };
}

/** Adds (or with a negative value removes) rest time; never goes below "now". */
export function adjustRest(clock: ClockState, now: number, deltaSeconds: number): ClockState {
  if (clock.restEndsAt === null) return clock;
  const reference = clock.pausedAt ?? now;
  return { ...clock, restEndsAt: Math.max(reference, clock.restEndsAt + deltaSeconds * 1000) };
}

/** True when a rest is running and its end time has passed (and the session isn't paused). */
export function restIsOver(clock: ClockState, now: number): boolean {
  return clock.restEndsAt !== null && clock.pausedAt === null && now >= clock.restEndsAt;
}
