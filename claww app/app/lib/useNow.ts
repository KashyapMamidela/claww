import { useEffect, useState } from 'react';

/** Current time, refreshed every `intervalMs` while `active`. Keeps a ticking
 * display local to the one component that shows it, instead of pushing a
 * per-second value through shared context. */
export function useNow(intervalMs: number, active = true): number {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    if (!active) return;
    setNow(Date.now());
    const id = setInterval(() => setNow(Date.now()), intervalMs);
    return () => clearInterval(id);
  }, [intervalMs, active]);
  return now;
}
