import React, { useEffect, useRef, useState } from 'react';
import { Text, TextProps, TextStyle } from 'react-native';
import { useReducedMotion } from 'react-native-reanimated';

// Premium D2: a number that counts up to its value when it first appears. The last value shown for each `id` is kept in
// memory, so coming back to a tab counts from there (and not from 0). Reduce motion shows the number at once.

const shown = new Map<string, number>();

export function CountUp({ value, id, duration = 700, format = (n: number) => String(Math.round(n)), textStyle, ...rest }: { value: number; id: string; duration?: number; format?: (n: number) => string; textStyle?: TextStyle } & TextProps) {
  const reduced = useReducedMotion();
  const [display, setDisplay] = useState(() => shown.get(id) ?? 0);
  const raf = useRef<number | null>(null);

  useEffect(() => {
    const from = shown.get(id) ?? 0;
    if (reduced || from === value) {
      shown.set(id, value);
      setDisplay(value);
      return;
    }
    const start = Date.now();
    const tick = () => {
      const t = Math.min(1, (Date.now() - start) / duration);
      const eased = 1 - Math.pow(1 - t, 3);
      const v = from + (value - from) * eased;
      setDisplay(v);
      if (t < 1) raf.current = requestAnimationFrame(tick);
      else shown.set(id, value);
    };
    raf.current = requestAnimationFrame(tick);
    return () => {
      if (raf.current !== null) cancelAnimationFrame(raf.current);
    };
  }, [value, id, duration, reduced]);

  return (
    <Text {...rest} style={textStyle}>
      {format(display)}
    </Text>
  );
}
