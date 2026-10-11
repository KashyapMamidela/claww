import React, { useEffect, useMemo, useState } from 'react';
import { Platform, Text, View } from 'react-native';
import { Canvas, DashPathEffect, Line, RoundedRect, vec } from '@shopify/react-native-skia';
import { ensureSkiaWebLoaded } from '../../lib/skiaWeb';
import { FONT, tint } from '../../lib/theme';

export interface BarChartProps {
  values: number[];
  color: string;
  height?: number;
  /** Draws a dashed horizontal line at this value. */
  goal?: number | null;
  /** Index drawn at full strength (e.g. today); others at lower opacity. Defaults to the last bar. */
  highlightIndex?: number;
  /** Labels under the bars; an empty string leaves that slot blank. */
  labels?: string[];
}

/** Simple Skia bar chart with an optional dashed goal line (V2 PHASE 4.2; reused by later chart cards). */
export function BarChart({ values, color, height = 120, goal = null, highlightIndex, labels }: BarChartProps) {
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

  const max = useMemo(() => Math.max(1, ...values, goal ?? 0) * 1.08, [values, goal]);
  const n = Math.max(1, values.length);
  const gap = n > 20 ? 2 : 4;
  const barW = width > 0 ? Math.max(2, (width - gap * (n - 1)) / n) : 0;
  const hi = highlightIndex ?? values.length - 1;

  return (
    <View>
      <View style={{ height }} onLayout={(e) => setWidth(e.nativeEvent.layout.width)}>
        {width > 0 && skiaReady ? (
          <Canvas style={{ width, height }}>
            {values.map((v, i) => {
              const h = Math.max(v > 0 ? 2 : 0, (v / max) * height);
              return (
                <RoundedRect
                  key={i}
                  x={i * (barW + gap)}
                  y={height - h}
                  width={barW}
                  height={h}
                  r={Math.min(4, barW / 2)}
                  color={i === hi ? color : tint(color, 0.45)}
                />
              );
            })}
            {goal ? (
              <Line p1={vec(0, height - (goal / max) * height)} p2={vec(width, height - (goal / max) * height)} color="rgba(255,255,255,0.45)" strokeWidth={1}>
                <DashPathEffect intervals={[5, 5]} />
              </Line>
            ) : null}
          </Canvas>
        ) : null}
      </View>
      {labels && width > 0 ? (
        <View style={{ flexDirection: 'row', marginTop: 6 }}>
          {labels.map((l, i) => (
            <Text key={i} numberOfLines={1} style={{ width: barW + (i < labels.length - 1 ? gap : 0), color: '#71717A', fontSize: 9.5, textAlign: 'center', fontFamily: FONT }}>
              {l}
            </Text>
          ))}
        </View>
      ) : null}
    </View>
  );
}
