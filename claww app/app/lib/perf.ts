import { useEffect, useRef } from 'react';

// Dev-only profiling for the workout player (V2 PHASE 2.1). Every helper is a
// no-op outside __DEV__, so none of this costs anything in a release build.
// Read the numbers from the Metro / `adb logcat` console in a dev build.

declare const __DEV__: boolean;
const enabled = typeof __DEV__ !== 'undefined' && __DEV__;

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

/** Counts renders of a component; the totals are logged once a second. */
export function useRenderCount(name: string): void {
  if (!enabled) return;
  renderCounts[name] = (renderCounts[name] ?? 0) + 1;
  ensureReporter();
}

let doneTappedAt: number | null = null;

/** Call on the tap that logs a set. */
export function markSetTap(): void {
  if (enabled) doneTappedAt = performance.now();
}

/** Logs tap-to-next-set latency once the UI for `key` (e.g. "exercise:set") has committed. */
export function useSetLatency(key: string): void {
  const last = useRef(key);
  useEffect(() => {
    if (!enabled || key === last.current) return;
    last.current = key;
    if (doneTappedAt !== null) {
      console.log(`[perf] tap → next set shown: ${(performance.now() - doneTappedAt).toFixed(1)} ms`);
      doneTappedAt = null;
    }
  }, [key]);
}
