import React, { useEffect, useMemo, useState } from 'react';
import { Platform, View } from 'react-native';
import { ensureSkiaWebLoaded } from '../../lib/skiaWeb';
import {
  Canvas,
  Group,
  Path,
  Circle,
  SweepGradient,
  BlurMask,
  DashPathEffect,
  Skia,
  vec,
  PathOp,
  type SkPath,
} from '@shopify/react-native-skia';

export interface RingSpec {
  r: number;
  strokeWidth: number;
  color: string;
  pct: number;
}

/** Parses a "#rrggbb" color and returns a darkened/brightened "rgb(...)"
 * version of it (each channel scaled by `factor`, clamped to 0..255).
 * Falls back to a plain gray if `color` isn't a 6-digit hex string — every
 * call site in this codebase passes one, but a silent fallback beats a
 * crash on a bad value. */
function scaleColor(color: string, factor: number): string {
  const m = /^#([0-9a-fA-F]{6})$/.exec(color);
  if (!m) return '#333333';
  const n = parseInt(m[1], 16);
  const clamp = (v: number) => Math.max(0, Math.min(255, Math.round(v)));
  const r = clamp(((n >> 16) & 255) * factor);
  const g = clamp(((n >> 8) & 255) * factor);
  const b = clamp((n & 255) * factor);
  return `rgb(${r}, ${g}, ${b})`;
}

const TWO_PI = Math.PI * 2;
const DEG = Math.PI / 180;
/** Normalizes an angle into [0, 2π) — used only so very large `pct` values
 * (e.g. 1000%) don't accumulate float error in an ever-growing radian
 * value; it never changes what the angle visually means. */
function normalizeAngle(rad: number): number {
  const r = rad % TWO_PI;
  return r < 0 ? r + TWO_PI : r;
}

interface RingProps {
  cx: number;
  cy: number;
  r: number;
  strokeWidth: number;
  color: string;
  /** Raw progress relative to this ring's own sweep, unclamped — 1 = one
   * full lap around `sweepTotal`, 2.5 = two and a half laps. */
  progress: number;
  trackColor?: string;
  trackDash?: string;
  /** Where the ring/dial starts, in radians (0 = 3 o'clock, clockwise). */
  startAngle: number;
  /** Total angular sweep of one full lap, in radians (2π = a full circle,
   * less for a partial dial like the sleep arc). */
  sweepTotal: number;
}

/**
 * One Apple-Activity-style ring. Overflow past 100% is drawn on the exact
 * same radius and stroke width as the base ring — never a second track,
 * never an outward-offset spiral. `progress` is not clamped: at 250% the
 * ring renders as a full closed lap with the tip sitting at the 50% mark,
 * drawn as a second layer directly on top of the completed lap underneath
 * it (this is genuinely two overlapping strokes at the same radius, which
 * is what makes the tip read as "on top of" rather than "instead of" the
 * base lap).
 *
 * Geometry follows Apple's own convention exactly:
 * - `lap` = min(progress, 1) — the fraction of `sweepTotal` actually drawn
 *   as an arc/circle.
 * - `tipAngle` = startAngle + sweepTotal·progress — the TRUE current
 *   position, still tracking every extra revolution even though the arc
 *   itself only ever draws one lap's worth of stroke.
 * - The ring's own local arc is always drawn from local angle 0 to local
 *   angle sweepTotal·lap, then rotated by `tipAngle − sweepTotal·lap` so
 *   its local end lands exactly on the true tip — for progress ≤ 1 that
 *   rotation reduces to exactly `startAngle` (12 o'clock for a full-circle
 *   ring), and for progress > 1 it lands wherever the extra revolutions put it.
 */
function Ring({ cx, cy, r, strokeWidth, color, progress, trackColor, trackDash, startAngle, sweepTotal }: RingProps) {
  const p = Math.max(0, progress);
  const lap = Math.min(p, 1);
  const tipAngle = normalizeAngle(startAngle + sweepTotal * p);
  const ringRotationRad = tipAngle - sweepTotal * lap;
  const startColor = scaleColor(color, 0.45);
  const endColor = color;

  const oval = useMemo(() => Skia.XYWHRect(cx - r, cy - r, r * 2, r * 2), [cx, cy, r]);
  const sweepDeg = (sweepTotal * lap) / DEG;
  const arcPath = useMemo(() => {
    const path = Skia.Path.Make();
    // sweepAngle in degrees; a full 360° sweep draws a closed circle
    // (happens once lap === 1, i.e. progress >= 1 on a full-circle ring).
    path.addArc(oval, 0, sweepDeg);
    return path;
  }, [oval, sweepDeg]);

  const trackPath = useMemo(() => {
    const path = Skia.Path.Make();
    path.addArc(oval, 0, sweepTotal / DEG);
    return path;
  }, [oval, sweepTotal]);

  // Tip cap sits at local (cx + r, cy) — i.e. where angle 0 would be before
  // the tip group's own rotation carries it to the true tip angle. Locally,
  // "ahead" (the direction of travel) is +y, since d/dθ(cos θ, sin θ) at
  // θ=0 is (0, 1).
  const tipLocalX = cx + r;
  const tipLocalY = cy;
  const capRadius = strokeWidth / 2;

  // Only a full-circle ring (sweepTotal === 2π) ever shows a genuine
  // wraparound overflow — a partial dial (e.g. the sleep arc) never
  // exceeds its own 100% in this app, so there's nothing "ahead" of the
  // tip to shadow onto there.
  const isFullCircle = Math.abs(sweepTotal - TWO_PI) < 1e-6;
  const showTipShadow = isFullCircle && p > 1;
  const shadowClipPath: SkPath | null = useMemo(() => {
    if (!showTipShadow) return null;
    const outer = Skia.Path.Make();
    outer.addCircle(cx, cy, r + strokeWidth / 2);
    const inner = Skia.Path.Make();
    inner.addCircle(cx, cy, Math.max(0, r - strokeWidth / 2));
    const annulus = Skia.Path.MakeFromOp(outer, inner, PathOp.Difference);
    if (!annulus) return null;
    // Half-plane "ahead" of the tip in the tip group's local (pre-rotation)
    // frame: local +y from the tip's own local y downward, covering every
    // x — big enough to always exceed the ring's own bounding box.
    const big = (r + strokeWidth) * 4;
    const ahead = Skia.Path.Make();
    ahead.addRect(Skia.XYWHRect(cx - big, tipLocalY, big * 2, big));
    return Skia.Path.MakeFromOp(annulus, ahead, PathOp.Intersect);
  }, [showTipShadow, cx, cy, r, strokeWidth, tipLocalY]);

  const shadowOffset = strokeWidth * 0.12;
  // Strictly < 1, not <= 1: at exactly p === 1 the tip has traveled all the
  // way back around to the same physical point as the start, so the start
  // cap (drawn last, in the dark startColor) would sit directly on top of
  // the tip cap (bright endColor) and look like a stray dark dot instead of
  // a clean closed ring. The tip cap alone is correct there. At p === 0
  // there's nothing drawn yet at all — no stray dot on an empty track.
  const showStartCap = p > 0 && p < 1;

  return (
    <>
      {trackColor && (
        <Group transform={[{ rotate: startAngle }]} origin={vec(cx, cy)}>
          <Path path={trackPath} style="stroke" strokeWidth={strokeWidth} strokeCap="round" color={trackColor}>
            {trackDash && <DashPathEffect intervals={trackDash.split(/\s+/).map(Number)} />}
          </Path>
        </Group>
      )}

      {/* Base + overflow lap — one path, drawn with a sweep gradient whose
          end always sits exactly at the tip. Butt caps here on purpose:
          the round-cap look is added separately as cap circles below, so
          the two ends of this path never bulge past the tip/seam point. */}
      {lap > 0 && (
        <Group transform={[{ rotate: ringRotationRad }]} origin={vec(cx, cy)}>
          <Path path={arcPath} style="stroke" strokeWidth={strokeWidth} strokeCap="butt">
            <SweepGradient c={vec(cx, cy)} colors={[startColor, endColor]} positions={[0, lap]} />
          </Path>
        </Group>
      )}

      {/* Tip group — rotated directly to the true tip angle (tracking every
          extra revolution, not just the drawn lap), with the tip cap drawn
          at local (cx + r, cy) so the rotation carries it into place. */}
      {p > 0 && (
        <Group transform={[{ rotate: tipAngle }]} origin={vec(cx, cy)}>
          {showTipShadow && shadowClipPath && (
            <Group clip={shadowClipPath}>
              <Circle cx={tipLocalX} cy={tipLocalY + shadowOffset} r={capRadius} color="rgba(0,0,0,0.55)">
                <BlurMask style="normal" blur={strokeWidth * 0.22} />
              </Circle>
            </Group>
          )}
          <Circle cx={tipLocalX} cy={tipLocalY} r={capRadius} color={endColor} />
        </Group>
      )}

      {/* Start cap — only shown below 100%, at the ring's own start point,
          in the gradient's start color. This is what hides the
          sweep-gradient colour seam there; above 100% the ring is a closed
          lap and the tip cap itself sits against that seam instead. */}
      {showStartCap && (
        <Group transform={[{ rotate: startAngle }]} origin={vec(cx, cy)}>
          <Circle cx={cx + r} cy={cy} r={capRadius} color={startColor} />
        </Group>
      )}
    </>
  );
}

export interface ProgressRingProps {
  size: number;
  rings: RingSpec[];
  /** dashed empty track pattern, e.g. "3 9" for locked/empty rings */
  trackDash?: string;
  trackColor?: string;
  /** rotation of the whole ring in degrees (default -90 = start at top) */
  rotation?: number;
  /** fraction of the circle the track covers (1 = full, 0.75 = arc dial) */
  trackFraction?: number;
  children?: React.ReactNode;
}

/**
 * Circular progress ring(s) with a centered content slot, rendered on
 * @shopify/react-native-skia rather than react-native-svg — an accurate
 * Apple-Activity-style overflow past 100% needs a real sweep (conic)
 * gradient whose end tracks the tip, plus path-boolean clipping for the
 * tip's forward shadow, neither of which react-native-svg can do cleanly.
 */
export function ProgressRing({
  size,
  rings,
  trackDash,
  trackColor = 'rgba(255,255,255,0.06)',
  rotation = -90,
  trackFraction = 1,
  children,
}: ProgressRingProps) {
  const c = size / 2;
  const startAngle = rotation * DEG;
  const sweepTotal = TWO_PI * trackFraction;

  // Native links CanvasKit in-process, so it's ready on first render; web
  // has to fetch/instantiate its WASM runtime first, and mounting <Canvas>
  // before that resolves throws. Rendering just the centered content slot
  // (no ring) for that one short window is preferable to a crash.
  const [skiaReady, setSkiaReady] = useState(Platform.OS !== 'web');
  useEffect(() => {
    if (Platform.OS === 'web') ensureSkiaWebLoaded().then(() => setSkiaReady(true));
  }, []);

  if (!skiaReady) {
    return (
      <View style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }}>{children}</View>
    );
  }

  return (
    <View style={{ width: size, height: size }}>
      <Canvas style={{ width: size, height: size }}>
        {rings.map((ring, i) => (
          <Ring
            key={i}
            cx={c}
            cy={c}
            r={ring.r}
            strokeWidth={ring.strokeWidth}
            color={ring.color}
            progress={ring.pct / 100}
            trackColor={trackColor}
            trackDash={trackDash}
            startAngle={startAngle}
            sweepTotal={sweepTotal}
          />
        ))}
      </Canvas>
      <View style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, alignItems: 'center', justifyContent: 'center' }}>
        {children}
      </View>
    </View>
  );
}
