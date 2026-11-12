import { useEffect, useRef } from 'react';
import { pushCapped, summarize, type TimingSummary } from './perfStats';

// Profiling for the workout player (V2 PHASE 2.1) and the NG PHASE 0.4 baseline.
// On in dev builds, and in EAS preview builds through EXPO_PUBLIC_PERF=1 in eas.json,
// because dev builds run unoptimised JavaScript and give slower numbers than a real
// install. Every helper is a no-op otherwise, so a production build pays nothing.
// Dev builds also log to the Metro / `adb logcat` console; any enabled build shows the
// set latency and Home first paint in Settings > Test tools (`getPerfReport`).

declare const __DEV__: boolean;
const isDev = typeof __DEV__ !== 'undefined' && __DEV__;
export const PERF_ENABLED = isDev || process.env.EXPO_PUBLIC_PERF === '1';

const renderCounts: Record<string, number> = {};
let reporter: ReturnType<typeof setInterval> | null = null;

function ensureReporter() {
  if (reporter) return;
  reporter = setInterval(() => {
    const entries = Object.entries(renderCounts).filter(([, n]) => n > 0);
    if (entries.length === 0) return;
    console.log(`[perf] renders/s ${entries.map(([k, n]) => `${k}=${n}`).join(' ')}`);
    for (const [k] of entries) renderCounts[k] = 0;
  }, 1000);
}

/** Counts renders of a component; the totals are logged once a second (dev builds only). */
export function useRenderCount(name: string): void {
  if (!isDev) return;
  renderCounts[name] = (renderCounts[name] ?? 0) + 1;
  ensureReporter();
}

let doneTappedAt: number | null = null;
let setLatencies: number[] = [];
let homeFirstPaintMs: number | null = null;

/** Call on the tap that logs a set. */
export function markSetTap(): void {
  if (PERF_ENABLED) doneTappedAt = performance.now();
}

/** Records tap-to-next-set latency once the UI for `key` (e.g. "exercise:set") has committed. */
export function useSetLatency(key: string): void {
  const last = useRef(key);
  useEffect(() => {
    if (!PERF_ENABLED || key === last.current) return;
    last.current = key;
    if (doneTappedAt !== null) {
      const ms = performance.now() - doneTappedAt;
      setLatencies = pushCapped(setLatencies, ms);
      if (isDev) console.log(`[perf] tap → next set shown: ${ms.toFixed(1)} ms`);
      doneTappedAt = null;
    }
  }, [key]);
}

// On Hermes performance.now() isn't zero at JS start (it showed 2,579,274,331 ms), so time from this module's load.
const JS_START = performance.now();

/** Records, once per app run, how long after JS start a screen first painted (Home's cold start). */
export function useFirstPaint(screen: 'home'): void {
  useEffect(() => {
    if (!PERF_ENABLED || homeFirstPaintMs !== null || screen !== 'home') return;
    // performance.now() counts from the JS runtime start, close to (but after) a cold app start.
    homeFirstPaintMs = performance.now() - JS_START;
    if (isDev) console.log(`[perf] Home first paint: ${homeFirstPaintMs.toFixed(0)} ms after JS start`);
  }, [screen]);
}

export interface PerfReport {
  setLatency: TimingSummary;
  homeFirstPaintMs: number | null;
}

export function getPerfReport(): PerfReport {
  return { setLatency: summarize(setLatencies), homeFirstPaintMs };
}

export function resetPerfReport(): void {
  setLatencies = [];
}
