import React, { useEffect, useMemo } from 'react';
import { View } from 'react-native';
import Svg, { Circle, Path } from 'react-native-svg';
import Animated, { useAnimatedProps, useSharedValue, withSpring } from 'react-native-reanimated';

const AnimatedPath = Animated.createAnimatedComponent(Path);

export interface RingSpec {
  r: number;
  strokeWidth: number;
  color: string;
  pct: number;
}

/** Parses a "#rrggbb" color and returns a darkened "rgb(...)" version of it
 * (each channel scaled toward black by `factor`). Falls back to a plain
 * dark gray if `color` isn't a 6-digit hex string — every call site in this
 * codebase passes one, but a silent fallback beats a crash on a bad value. */
function darken(color: string, factor: number): string {
  const m = /^#([0-9a-fA-F]{6})$/.exec(color);
  if (!m) return '#333333';
  const n = parseInt(m[1], 16);
  const r = Math.round(((n >> 16) & 255) * factor);
  const g = Math.round(((n >> 8) & 255) * factor);
  const b = Math.round((n & 255) * factor);
  return `rgb(${r}, ${g}, ${b})`;
}

function polarToXY(cx: number, cy: number, r: number, angleDeg: number) {
  const rad = (angleDeg * Math.PI) / 180;
  return { x: cx + r * Math.cos(rad), y: cy + r * Math.sin(rad) };
}

/**
 * A ring at exactly 100% and a ring at 300% both used to render as the same
 * full circle — no way to tell "hit the target" apart from "blew way past
 * it" (e.g. 4000/2461 kcal). This is a genuine multi-revolution circular
 * arc, not a normal 0–100% progress circle clamped at one lap: `revolutions`
 * is not capped, and 2.5 means the path actually travels 2 full turns plus
 * half of a third, all as ONE continuous SVG <Path> built by sampling points
 * around the center in polar coordinates — not several stacked <Circle>
 * elements. That distinction matters for exactly one reason: a <Circle>'s
 * stroke-dasharray puts a rounded cap at BOTH ends of whatever's visible,
 * so stacking one "ring" per lap put a second cap at the lap's start point
 * (the same angle every lap starts from) as well as the real leading tip —
 * which is what made overlapping laps read as a new ring beginning there
 * instead of a continuation. A single <Path> only ever has two ends: the
 * true start (angle 0, hidden under the track before any progress) and the
 * true leading tip (wherever `revolutions` actually lands) — so the only
 * capsule-shaped cap that ever shows is the one at the real leading end.
 *
 * Each full revolution's radius grows by `spiralStepPx` so overlapping laps
 * are visually distinguishable as a coil (this is what makes 250% legible
 * as "2.5 turns" instead of a solid blob) — this is still ONE continuous
 * path, just one whose radius is itself a function of cumulative angle
 * traveled, not multiple independent rings at different fixed radii.
 */
const SPIRAL_STEP_FACTOR = 0.6;
/** Degrees between sampled points along the path — small enough that the
 * polyline reads as a smooth curve at any ring size used in this app. */
const SAMPLE_STEP_DEG = 4;

interface SpiralPath {
  d: string;
  totalLength: number;
}

/**
 * Builds one continuous multi-turn circular path by sampling points in
 * polar coordinates and joining them with line segments — the standard way
 * to draw a path whose radius changes with angle, since SVG's own arc
 * command can't express more than ~360° per call, let alone a spiral.
 * `revolutions` is not clamped: 2.5 samples all the way around twice, then
 * half again, with the radius growing every full turn.
 */
function buildSpiralPath(
  cx: number,
  cy: number,
  r0: number,
  revolutions: number,
  spiralStepPx: number,
  startAngleDeg: number,
  direction: 1 | -1
): SpiralPath {
  const safeRevolutions = Math.max(0, revolutions);
  const totalAngleDeg = safeRevolutions * 360 * direction;
  const numSamples = Math.max(1, Math.min(1440, Math.ceil((Math.abs(totalAngleDeg) || 1) / SAMPLE_STEP_DEG)));

  let d = '';
  let prevX = 0;
  let prevY = 0;
  let totalLength = 0;

  for (let i = 0; i <= numSamples; i++) {
    const frac = i / numSamples;
    const angleTraveled = frac * totalAngleDeg;
    const revFrac = Math.abs(angleTraveled) / 360;
    const r = r0 + spiralStepPx * revFrac;
    const angleDeg = startAngleDeg + angleTraveled;
    const { x, y } = polarToXY(cx, cy, r, angleDeg);
    if (i === 0) {
      d = `M ${x} ${y}`;
    } else {
      d += ` L ${x} ${y}`;
      totalLength += Math.hypot(x - prevX, y - prevY);
    }
    prevX = x;
    prevY = y;
  }

  return { d, totalLength };
}

interface ActiveArcProps {
  cx: number;
  cy: number;
  r: number;
  strokeWidth: number;
  color: string;
  /** Progress expressed in full revolutions (0.6 = 60%, 2.5 = two and a
   * half laps) — not clamped to 1. */
  progressInRevolutions: number;
  startAngleDeg: number;
  direction: 1 | -1;
}

/**
 * The single continuous active arc — a darker, wider "shadow" path directly
 * under a bright, true-width path on top, both sharing the exact same
 * geometry so the shadow reads as a rim peeking out along the bright path's
 * whole length, with the raised capsule look concentrated at the leading
 * tip where strokeLinecap="round" actually terminates the path.
 */
function ActiveArc({ cx, cy, r, strokeWidth, color, progressInRevolutions, startAngleDeg, direction }: ActiveArcProps) {
  const spiralStepPx = strokeWidth * SPIRAL_STEP_FACTOR;
  const { d, totalLength } = useMemo(
    () => buildSpiralPath(cx, cy, r, progressInRevolutions, spiralStepPx, startAngleDeg, direction),
    [cx, cy, r, progressInRevolutions, spiralStepPx, startAngleDeg, direction]
  );

  // The path's own geometry (and therefore its length) changes shape every
  // time progress changes — there's no stable "arc length" to animate
  // incrementally between two different spirals the way a plain circle's
  // dasharray can. Instead this replays a draw-on animation (hidden -> full)
  // against the new path's own length each time, via the standard
  // dasharray/dashoffset reveal trick.
  const dashoffset = useSharedValue(totalLength);
  useEffect(() => {
    dashoffset.value = totalLength;
    dashoffset.value = withSpring(0, { duration: 700, dampingRatio: 1 });
  }, [d, totalLength]);
  const animatedProps = useAnimatedProps(() => ({
    strokeDashoffset: dashoffset.value,
  }));

  if (totalLength <= 0) return null;

  return (
    <>
      <AnimatedPath
        d={d}
        fill="none"
        stroke={darken(color, 0.4)}
        strokeWidth={strokeWidth * 1.5}
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeDasharray={`${totalLength} ${totalLength}`}
        animatedProps={animatedProps}
      />
      <AnimatedPath
        d={d}
        fill="none"
        stroke={color}
        strokeWidth={strokeWidth}
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeDasharray={`${totalLength} ${totalLength}`}
        animatedProps={animatedProps}
      />
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
  /** direction the active arc travels: 1 = clockwise, -1 = counter-clockwise */
  direction?: 1 | -1;
  children?: React.ReactNode;
}

/**
 * Circular progress ring(s) with a centered content slot. The background
 * track is a plain full circle; the active progress is one continuous
 * multi-revolution SVG path (see `ActiveArc`/`buildSpiralPath`) that is
 * never clamped to a single lap — values over 100% keep traveling around
 * the same center, coiling outward turn by turn.
 */
export function ProgressRing({
  size,
  rings,
  trackDash,
  trackColor = 'rgba(255,255,255,0.06)',
  rotation = -90,
  trackFraction = 1,
  direction = 1,
  children,
}: ProgressRingProps) {
  const c = size / 2;
  return (
    <View style={{ width: size, height: size }}>
      {/* overflow: 'visible' — the shadow path is wider than the bright
          path's own stroke, and outer revolutions of the spiral extend past
          this Svg's nominal width/height (sized only for the base radius).
          SVG clips to its own viewport by default. */}
      <Svg width={size} height={size} style={{ transform: [{ rotate: `${rotation}deg` }], overflow: 'visible' }}>
        {rings.map((ring, i) => {
          const circ = 2 * Math.PI * ring.r;
          return (
            <React.Fragment key={i}>
              <Circle
                cx={c}
                cy={c}
                r={ring.r}
                fill="none"
                stroke={trackColor}
                strokeWidth={ring.strokeWidth}
                strokeLinecap="round"
                {...(trackFraction < 1
                  ? { strokeDasharray: `${circ * trackFraction} ${circ * (1 - trackFraction) + 1}` }
                  : trackDash
                  ? { strokeDasharray: trackDash }
                  : {})}
              />
              <ActiveArc
                cx={c}
                cy={c}
                r={ring.r}
                strokeWidth={ring.strokeWidth}
                color={ring.color}
                progressInRevolutions={(Math.max(0, ring.pct) / 100) * trackFraction}
                startAngleDeg={0}
                direction={direction}
              />
            </React.Fragment>
          );
        })}
      </Svg>
      <View style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, alignItems: 'center', justifyContent: 'center' }}>
        {children}
      </View>
    </View>
  );
}
