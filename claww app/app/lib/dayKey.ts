import { useEffect, useState } from 'react';
import { AppState } from 'react-native';
import { localDateKey } from './sessionPrescription';
import { msUntilNextMidnight } from './dayKeyMath';

export { msUntilNextMidnight };

/**
 * Today's local date as "YYYY-MM-DD", and it changes at midnight and whenever the app comes back to the
 * foreground on a new day. Anything that loads "today's" data keys off this, so an app left open overnight
 * doesn't keep showing yesterday's meals.
 */
export function useDayKey(): string {
  const [key, setKey] = useState(() => localDateKey(new Date()));
  useEffect(() => {
    let timer: ReturnType<typeof setTimeout>;
    const check = () => setKey((k) => {
      const now = localDateKey(new Date());
      return now === k ? k : now;
    });
    const schedule = () => {
      timer = setTimeout(() => {
        check();
        schedule();
      }, msUntilNextMidnight(new Date()) + 500);
    };
    schedule();
    const sub = AppState.addEventListener('change', (s) => {
      if (s === 'active') check();
    });
    return () => {
      clearTimeout(timer);
      sub.remove();
    };
  }, []);
  return key;
}
