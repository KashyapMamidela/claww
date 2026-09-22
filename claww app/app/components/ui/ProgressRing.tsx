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

/**
 * A ring at exactly 100% and a ring at 300% both used to render as the same
 * full circle — no way to tell "hit the target" apart from "blew way past
 * it" (e.g. 4000/2461 kcal). This draws a second, darker arc on top of the
 * already-full ring, sweeping from the same start point for however far
 * past 100% the value went (capped at one extra full lap) — a visible
 * "shadow" cutting across the completed ring, not just a static cap.
 */
function RingOverflowArc({ cx, cy, r, strokeWidth, pct, trackFraction }: Omit<RingArcProps, 'color'>) {
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
      stroke="rgba(0,0,0,0.42)"
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
      <Svg width={size} height={size} style={{ transform: [{ rotate: `${rotation}deg` }] }}>
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
                <RingOverflowArc cx={c} cy={c} r={ring.r} strokeWidth={ring.strokeWidth} pct={ring.pct} trackFraction={trackFraction} />
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
