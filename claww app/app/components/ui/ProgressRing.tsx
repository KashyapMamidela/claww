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

/**
 * A ring at exactly 100% and a ring at 300% both used to render as the same
 * full circle — no way to tell "hit the target" apart from "blew way past
 * it" (e.g. 4000/2461 kcal). Matches Apple Activity rings' own visual
 * language for this (per direct reference image), not an invented one: the
 * overflow is drawn as a second arc in the *same* bright color as the base
 * ring — not darkened — that visibly wraps back over the ring's own start
 * point, with a shadow along that wrap so the overlap reads as physically
 * stacked/layered.
 *
 * This is a same-center, same-length, WIDER arc in a darkened version of
 * the ring's own color, drawn directly under RingOverflowArc so a dark rim
 * of it peeks out along both edges for the overflow arc's whole length —
 * not a same-color blob (had no direction, bulged both ways) and not a
 * translated *black* circle (two earlier bugs, in order: (1) offsetting
 * the shadow's own center a couple pixels off-axis to fake a drop-shadow
 * made it an eccentric circle relative to the arc it's meant to sit under
 * — same radius, different center — which pixel-sampled testing showed
 * clips unpredictably against the dash's own round end-cap well before its
 * nominal width, visible on essentially none of the arc's length; (2) pure
 * black at any opacity is close to invisible against this app's near-black
 * card backgrounds wherever it pokes out past the base ring's own track —
 * only a colored shadow shows up there). react-native-svg has no
 * <filter>/feDropShadow support (checked its type exports directly — none),
 * hence a plain wider stroke instead of a real blur.
 */
function RingOverflowShadow({ cx, cy, r, strokeWidth, color, pct, trackFraction }: RingArcProps) {
  const circ = 2 * Math.PI * r;
  const overPct = Math.max(0, Math.min(100, pct - 100));
  const target = (overPct / 100) * circ * trackFraction;
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
      stroke={darken(color, 0.4)}
      strokeWidth={strokeWidth * 1.7}
      strokeLinecap="round"
      animatedProps={animatedProps}
    />
  );
}

function RingOverflowArc({ cx, cy, r, strokeWidth, color, pct, trackFraction }: RingArcProps) {
  const circ = 2 * Math.PI * r;
  const overPct = Math.max(0, Math.min(100, pct - 100));
  const target = (overPct / 100) * circ * trackFraction;
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
      // Deliberately thicker than the base ring's own stroke, all the way
      // along, not just at the tip — the reference's overflow segments
      // read as a visibly fatter pill wherever they exist, not a
      // same-width arc with a shadow tacked on.
      strokeWidth={strokeWidth * 1.35}
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
              {ring.pct > 100 && (
                <>
                  <RingOverflowShadow
                    cx={c}
                    cy={c}
                    r={ring.r}
                    strokeWidth={ring.strokeWidth}
                    color={ring.color}
                    pct={ring.pct}
                    trackFraction={trackFraction}
                  />
                  <RingOverflowArc cx={c} cy={c} r={ring.r} strokeWidth={ring.strokeWidth} color={ring.color} pct={ring.pct} trackFraction={trackFraction} />
                </>
              )}
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
