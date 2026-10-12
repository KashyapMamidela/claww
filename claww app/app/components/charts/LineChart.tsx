import React, { useEffect, useMemo, useState } from 'react';
import { Platform, Text, View } from 'react-native';
import { Canvas, Circle, Path } from '@shopify/react-native-skia';
import { ensureSkiaWebLoaded } from '../../lib/skiaWeb';
import { FONT } from '../../lib/theme';

export interface LineSeries {
  values: (number | null)[];
  color: string;
}

export interface LineChartProps {
  series: LineSeries[];
  height?: number;
  labels?: string[];
}

const PAD = 6;

/**
 * Multi-line Skia chart (V2 PHASE 9). Gaps (null) break the line: only
 * neighbouring points that were both measured are joined, so a lift that
 * wasn't trained in a bucket doesn't draw a made-up slope. A series with a
 * single point shows as a dot.
 */
export function LineChart({ series, height = 130, labels }: LineChartProps) {
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

  const n = Math.max(2, ...series.map((s) => s.values.length));
  const { min, max } = useMemo(() => {
    const all = series.flatMap((s) => s.values).filter((v): v is number => v !== null);
    if (all.length === 0) return { min: 0, max: 1 };
    const lo = Math.min(...all);
    const hi = Math.max(...all);
    const pad = Math.max((hi - lo) * 0.15, hi * 0.03, 1);
    return { min: Math.max(0, lo - pad), max: hi + pad };
  }, [series]);

  const x = (i: number) => PAD + (i / (n - 1)) * Math.max(1, width - PAD * 2);
  const y = (v: number) => PAD + (1 - (v - min) / Math.max(1e-6, max - min)) * (height - PAD * 2);

  const paths = series.map((s) => {
    let d = '';
    let pen = false;
    s.values.forEach((v, i) => {
      if (v === null) {
        pen = false;
        return;
      }
      d += `${pen ? 'L' : 'M'}${x(i).toFixed(1)} ${y(v).toFixed(1)} `;
      pen = true;
    });
    return d.trim();
  });

  return (
    <View>
      <View style={{ height }} onLayout={(e) => setWidth(e.nativeEvent.layout.width)}>
        {width > 0 && skiaReady ? (
          <Canvas style={{ width, height }}>
            {[0.25, 0.5, 0.75].map((f) => (
              <Path key={f} path={`M0 ${(height * f).toFixed(1)} L${width} ${(height * f).toFixed(1)}`} color="rgba(255,255,255,0.06)" style="stroke" strokeWidth={1} />
            ))}
            {series.map((s, si) => (
              <React.Fragment key={si}>
                {paths[si] ? <Path path={paths[si]} color={s.color} style="stroke" strokeWidth={2.5} strokeJoin="round" strokeCap="round" /> : null}
                {s.values.map((v, i) => (v === null ? null : <Circle key={i} cx={x(i)} cy={y(v)} r={i === s.values.length - 1 ? 3.5 : 2.5} color={s.color} />))}
              </React.Fragment>
            ))}
          </Canvas>
        ) : null}
      </View>
      {labels && width > 0 ? (
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: 6, paddingHorizontal: PAD }}>
          {labels.map((l, i) => (
            <Text key={i} numberOfLines={1} style={{ color: '#71717A', fontSize: 9.5, fontFamily: FONT, minWidth: 1 }}>
              {l}
            </Text>
          ))}
        </View>
      ) : null}
    </View>
  );
}
