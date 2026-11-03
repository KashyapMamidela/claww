import React, { useEffect, useState } from 'react';
import { Platform, View } from 'react-native';
import { Canvas, RoundedRect } from '@shopify/react-native-skia';
import { ensureSkiaWebLoaded } from '../../lib/skiaWeb';
import { tint } from '../../lib/theme';

export interface HeatGridProps {
  /** weeks[w][d]: true trained, false not, null in the future. Oldest week first, Monday first. */
  weeks: (boolean | null)[][];
  color: string;
  /** Maximum cell size in px; the grid shrinks to fit the width. */
  maxCell?: number;
}

const GAP = 3;

/** Consistency grid (V2 PHASE 9): one column per week, one row per weekday. */
export function HeatGrid({ weeks, color, maxCell = 22 }: HeatGridProps) {
  const [width, setWidth] = useState(0);
  const [skiaReady, setSkiaReady] = useState(Platform.OS !== 'web');
  useEffect(() => {
    if (Platform.OS !== 'web') return;
    let cancelled = false;
    ensureSkiaWebLoaded().then(() => !cancelled && setSkiaReady(true));
    return () => {
      cancelled = true;
    };
  }, []);

  const cols = Math.max(1, weeks.length);
  const cell = Math.max(4, Math.min(maxCell, (width - GAP * (cols - 1)) / cols));
  const height = cell * 7 + GAP * 6;

  return (
    <View style={{ height }} onLayout={(e) => setWidth(e.nativeEvent.layout.width)} accessibilityLabel="Training days grid">
      {width > 0 && skiaReady ? (
        <Canvas style={{ width, height }}>
          {weeks.map((week, w) =>
            week.map((on, d) => (
              <RoundedRect
                key={`${w}-${d}`}
                x={w * (cell + GAP)}
                y={d * (cell + GAP)}
                width={cell}
                height={cell}
                r={Math.min(4, cell / 3)}
                color={on === null ? 'rgba(255,255,255,0.02)' : on ? color : tint(color, 0.12)}
              />
            ))
          )}
        </Canvas>
      ) : null}
    </View>
  );
}
