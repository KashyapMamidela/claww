import React, { useEffect } from 'react';
import { View } from 'react-native';
import Svg, { Circle } from 'react-native-svg';
import Animated, { useAnimatedProps, useSharedValue, withSpring } from 'react-native-reanimated';

const AnimatedCircle = Animated.createAnimatedComponent(Circle);

export interface RingSpec {
  r: number;
  strokeWidth: number;
  color: string;
  pct: number;
}

interface RingArcProps {
  cx: number;
  cy: number;
  r: number;
  strokeWidth: number;
  color: string;
  pct: number;
  trackFraction: number;
}

/** The colored (filled) arc of one ring — springs its length to a new pct instead of jump-cutting. */
function RingArc({ cx, cy, r, strokeWidth, color, pct, trackFraction }: RingArcProps) {
  const circ = 2 * Math.PI * r;
  const target = Math.max(0, Math.min(1, pct / 100)) * circ * trackFraction;
  const arcLen = useSharedValue(0);
  useEffect(() => {
    arcLen.value = withSpring(target, { duration: 700, dampingRatio: 1 });
  }, [target]);
  const animatedProps = useAnimatedProps(() => ({
    strokeDasharray: `${arcLen.value} ${Math.max(0, circ - arcLen.value)}`,
  }));

  return (
    <AnimatedCircle
      cx={cx}
      cy={cy}
      r={r}
      fill="none"
      stroke={color}
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      animatedProps={animatedProps}
    />
  );
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

interface RingLapProps extends RingArcProps {
  /** How many complete extra laps (each a full 100%) sit "inside" this one —
   * used to push this lap's radius outward so it coils past the base ring
   * instead of sitting flush on top of it. */
  lapIndex: number;
  /** Arc length for this lap as a 0..1 fraction of a full lap (1 = a fully
   * closed extra loop, <1 = the currently in-progress partial loop). */
  lapFraction: number;
}

/**
 * A ring at exactly 100% and a ring at 300% both used to render as the same
 * full circle — no way to tell "hit the target" apart from "blew way past
 * it" (e.g. 4000/2461 kcal). Fixed once already by drawing the overflow as a
 * same-radius, same-length arc laid back over the ring's own start point —
 * but that read as a second, disconnected ring beginning there rather than
 * a continuation of the first (confirmed by direct user feedback against a
 * real Apple Activity ring screenshot). Apple's own rings don't overlap
 * flush — each extra lap coils to a slightly LARGER radius than the one
 * inside it, so the overlap reads as one continuous spiral viewed from
 * above, not two flat rings sharing a track. Each lap here is pushed
 * outward by `lapIndex * SPIRAL_STEP` for exactly that reason.
 *
 * Every lap is a same-center, WIDER shadow arc (darkened color) directly
 * under a same-center bright arc at the true stroke width — not a
 * same-color blob (had no direction, bulged both ways) and not a
 * translated *black* circle (two earlier bugs, in order: (1) offsetting the
 * shadow's own center a couple pixels off-axis to fake a drop-shadow made
 * it an eccentric circle relative to the arc it's meant to sit under, which
 * pixel-sampled testing showed clips unpredictably well before its nominal
 * width; (2) pure black at any opacity is close to invisible against this
 * app's near-black card backgrounds — only a colored shadow shows up
 * there). react-native-svg has no <filter>/feDropShadow support (checked
 * its type exports directly — none), hence a plain wider stroke instead of
 * a real blur.
 */
const SPIRAL_STEP_FACTOR = 0.6;

function RingLapShadow({ cx, cy, r, strokeWidth, color, lapIndex, lapFraction, trackFraction }: RingLapProps) {
  const spiralR = r + lapIndex * strokeWidth * SPIRAL_STEP_FACTOR;
  const circ = 2 * Math.PI * spiralR;
  const target = Math.max(0, Math.min(1, lapFraction)) * circ * trackFraction;
  const arcLen = useSharedValue(0);
  useEffect(() => {
    arcLen.value = withSpring(target, { duration: 700, dampingRatio: 1 });
  }, [target]);
  const animatedProps = useAnimatedProps(() => ({
    strokeDasharray: `${arcLen.value} ${Math.max(0, circ - arcLen.value)}`,
  }));

  return (
    <AnimatedCircle
      cx={cx}
      cy={cy}
      r={spiralR}
      fill="none"
      stroke={darken(color, 0.4)}
      strokeWidth={strokeWidth * 1.5}
      strokeLinecap="round"
      animatedProps={animatedProps}
    />
  );
}

function RingLapArc({ cx, cy, r, strokeWidth, color, lapIndex, lapFraction, trackFraction }: RingLapProps) {
  const spiralR = r + lapIndex * strokeWidth * SPIRAL_STEP_FACTOR;
  const circ = 2 * Math.PI * spiralR;
  const target = Math.max(0, Math.min(1, lapFraction)) * circ * trackFraction;
  const arcLen = useSharedValue(0);
  useEffect(() => {
    arcLen.value = withSpring(target, { duration: 700, dampingRatio: 1 });
  }, [target]);
  const animatedProps = useAnimatedProps(() => ({
    strokeDasharray: `${arcLen.value} ${Math.max(0, circ - arcLen.value)}`,
  }));

  return (
    <AnimatedCircle
      cx={cx}
      cy={cy}
      r={spiralR}
      fill="none"
      stroke={color}
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      animatedProps={animatedProps}
    />
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
 * Circular progress ring(s) with a centered content slot.
 * Ports the inline-SVG ring pattern used across the design screens.
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
  return (
    <View style={{ width: size, height: size }}>
      {/* overflow: 'visible' — the overflow shadow/arc strokes are deliberately
          wider than the base ring's own stroke width (up to 1.7x), so their
          outer edge extends past this Svg's nominal width/height (sized only
          for the base ring). SVG clips to its own viewport by default, which
          was silently cutting off exactly the outer half of the shadow rim
          that's supposed to be visible — confirmed by sampling the rendered
          pixels directly, not a guess. */}
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
              <RingArc cx={c} cy={c} r={ring.r} strokeWidth={ring.strokeWidth} color={ring.color} pct={ring.pct} trackFraction={trackFraction} />
              {ring.pct > 100 &&
                (() => {
                  const extraPct = ring.pct - 100;
                  const fullExtraLaps = Math.floor(extraPct / 100);
                  const partialLapFraction = (extraPct % 100) / 100;
                  const laps: { lapIndex: number; lapFraction: number }[] = [];
                  for (let i = 1; i <= fullExtraLaps; i++) laps.push({ lapIndex: i, lapFraction: 1 });
                  if (partialLapFraction > 0) laps.push({ lapIndex: fullExtraLaps + 1, lapFraction: partialLapFraction });
                  return laps.map((lap) => (
                    <React.Fragment key={lap.lapIndex}>
                      <RingLapShadow
                        cx={c}
                        cy={c}
                        r={ring.r}
                        strokeWidth={ring.strokeWidth}
                        color={ring.color}
                        pct={ring.pct}
                        trackFraction={trackFraction}
                        lapIndex={lap.lapIndex}
                        lapFraction={lap.lapFraction}
                      />
                      <RingLapArc
                        cx={c}
                        cy={c}
                        r={ring.r}
                        strokeWidth={ring.strokeWidth}
                        color={ring.color}
                        pct={ring.pct}
                        trackFraction={trackFraction}
                        lapIndex={lap.lapIndex}
                        lapFraction={lap.lapFraction}
                      />
                    </React.Fragment>
                  ));
                })()}
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
