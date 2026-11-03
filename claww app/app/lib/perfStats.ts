// Pure summaries for lib/perf.ts's recorded timings (NG PHASE 0.4 baseline).

export interface TimingSummary {
  count: number;
  median: number | null;
  p90: number | null;
}

/** Nearest-rank percentile of `values` (0 < p <= 100); null when empty. */
export function percentile(values: number[], p: number): number | null {
  if (values.length === 0) return null;
  const sorted = [...values].sort((a, b) => a - b);
  const rank = Math.ceil((p / 100) * sorted.length);
  return sorted[Math.min(sorted.length, Math.max(1, rank)) - 1];
}

/** Median of an even count is the mean of the two middle values. */
export function median(values: number[]): number | null {
  if (values.length === 0) return null;
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
}

export function summarize(values: number[]): TimingSummary {
  return { count: values.length, median: median(values), p90: percentile(values, 90) };
}

/** Keeps the newest `max` values. */
export function pushCapped(values: number[], value: number, max = 50): number[] {
  const next = [...values, value];
  return next.length > max ? next.slice(next.length - max) : next;
}
