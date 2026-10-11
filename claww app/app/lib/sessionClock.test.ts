import { describe, expect, it } from 'vitest';
import {
  adjustRest,
  elapsedSeconds,
  endRest,
  pause,
  restIsOver,
  restRemainingSeconds,
  resume,
  startClock,
  startRest,
} from './sessionClock';

const T0 = 1_000_000;
const s = (n: number) => n * 1000;

describe('sessionClock', () => {
  it('counts elapsed seconds from start', () => {
    const c = startClock(T0);
    expect(elapsedSeconds(c, T0)).toBe(0);
    expect(elapsedSeconds(c, T0 + s(90.9))).toBe(90);
  });

  it('freezes elapsed time while paused and excludes the pause after resuming', () => {
    let c = startClock(T0);
    c = pause(c, T0 + s(60));
    expect(elapsedSeconds(c, T0 + s(300))).toBe(60);
    c = resume(c, T0 + s(300));
    expect(elapsedSeconds(c, T0 + s(310))).toBe(70);
  });

  it('counts rest down from a stored end time, rounding up', () => {
    const c = startRest(startClock(T0), T0, 45);
    expect(restRemainingSeconds(c, T0)).toBe(45);
    expect(restRemainingSeconds(c, T0 + s(44.2))).toBe(1);
    expect(restRemainingSeconds(c, T0 + s(45))).toBe(0);
    expect(restRemainingSeconds(c, T0 + s(500))).toBe(0);
  });

  it('stays correct after a long background gap (no ticking needed)', () => {
    const c = startRest(startClock(T0), T0, 45);
    expect(restIsOver(c, T0 + s(30))).toBe(false);
    expect(restIsOver(c, T0 + s(600))).toBe(true);
  });

  it('pausing during rest holds the remaining time and resume pushes the end back', () => {
    let c = startRest(startClock(T0), T0, 45);
    c = pause(c, T0 + s(10));
    expect(restRemainingSeconds(c, T0 + s(200))).toBe(35);
    expect(restIsOver(c, T0 + s(200))).toBe(false);
    c = resume(c, T0 + s(200));
    expect(restRemainingSeconds(c, T0 + s(200))).toBe(35);
    expect(restIsOver(c, T0 + s(235))).toBe(true);
  });

  it('adjusts rest by ±15 s but never below now', () => {
    let c = startRest(startClock(T0), T0, 45);
    c = adjustRest(c, T0, 15);
    expect(restRemainingSeconds(c, T0)).toBe(60);
    c = adjustRest(c, T0 + s(50), -15);
    expect(restRemainingSeconds(c, T0 + s(50))).toBe(0);
  });

  it('is a no-op to adjust or report rest when not resting', () => {
    const c = startClock(T0);
    expect(adjustRest(c, T0, 15)).toBe(c);
    expect(restRemainingSeconds(c, T0)).toBe(0);
    expect(restIsOver(c, T0)).toBe(false);
    expect(endRest(startRest(c, T0, 45)).restEndsAt).toBeNull();
  });

  it('pause and resume are idempotent', () => {
    const c = startClock(T0);
    expect(resume(c, T0 + 5)).toBe(c);
    const p = pause(c, T0 + 5);
    expect(pause(p, T0 + 50)).toBe(p);
  });
});
