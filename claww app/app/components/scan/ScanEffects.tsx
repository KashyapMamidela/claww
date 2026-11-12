import React, { useEffect } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, { Easing, FadeIn, Keyframe, type SharedValue, useAnimatedStyle, useReducedMotion, useSharedValue, withRepeat, withSequence, withTiming } from 'react-native-reanimated';
import { BG, COLORS } from '../../lib/theme';

// A tag lands on the photo: fades in from 85 % size with a firm ease-out, no bounce (scale never starts at 0).
const TAG_IN = new Keyframe({
  0: { opacity: 0, transform: [{ scale: 0.85 }] },
  100: { opacity: 1, transform: [{ scale: 1 }], easing: Easing.bezier(0.23, 1, 0.32, 1) },
}).duration(220);

// The scan's motion. While the plate is read, a soft green band sweeps down the photo and the corners breathe; when the
// plate is read, the foods it found pop onto the photo one after another as tags. Both run on the UI thread, and with
// Reduce motion on, the band stays still and the tags simply appear.

const G = COLORS.green;

/** A band of light that travels down its parent while `active`. Put it inside the photo's frame. */
export function ScanSweep({ active, height }: { active: boolean; height: number }) {
  const reduced = useReducedMotion();
  const p = useSharedValue(0);
  useEffect(() => {
    if (active && !reduced) {
      p.set(0);
      p.set(withRepeat(withSequence(withTiming(1, { duration: 1500, easing: Easing.bezier(0.45, 0, 0.55, 1) }), withTiming(0, { duration: 1500, easing: Easing.bezier(0.45, 0, 0.55, 1) })), -1));
    } else {
      p.set(withTiming(0, { duration: 200 }));
    }
  }, [active, reduced, p]);
  const band = useAnimatedStyle(() => ({ transform: [{ translateY: p.get() * Math.max(0, height - 64) }], opacity: active ? 1 : 0 }));
  // The measuring ripple: a grid of dots lights up in a ring that spreads from the middle of the plate.
  const wave = useSharedValue(0);
  useEffect(() => {
    if (active && !reduced) {
      wave.set(0);
      wave.set(withRepeat(withTiming(1, { duration: 1800, easing: Easing.out(Easing.quad) }), -1));
    } else wave.set(0);
  }, [active, reduced, wave]);
  if (!active) return null;
  return (
    <View pointerEvents="none" style={StyleSheet.absoluteFill}>
      {!reduced ? (
        <View style={StyleSheet.absoluteFill}>
          {DOTS.map((d, i) => (
            <RippleDot key={i} dot={d} wave={wave} />
          ))}
        </View>
      ) : null}
      <Animated.View style={[{ position: 'absolute', left: 0, right: 0, top: 0, height: 64 }, band]}>
        <LinearGradient colors={['rgba(34,197,94,0)', 'rgba(34,197,94,0.28)', 'rgba(74,222,128,0.55)']} style={{ flex: 1 }} />
        <View style={{ height: 2, backgroundColor: '#86EFAC' }} />
      </Animated.View>
    </View>
  );
}

const COLS = 9;
const ROWS = 5;
/** Each dot's place on the photo (in %) and its distance from the centre, 0 (middle) to 1 (corner). */
const DOTS = Array.from({ length: COLS * ROWS }, (_, i) => {
  const cx = (i % COLS) / (COLS - 1);
  const cy = Math.floor(i / COLS) / (ROWS - 1);
  return { left: `${6 + cx * 88}%`, top: `${10 + cy * 80}%`, dist: Math.min(1, Math.hypot(cx - 0.5, cy - 0.5) / Math.hypot(0.5, 0.5)) } as const;
});

function RippleDot({ dot, wave }: { dot: (typeof DOTS)[number]; wave: SharedValue<number> }) {
  const style = useAnimatedStyle(() => {
    const front = wave.get() * 1.3 - 0.15;
    const lit = Math.max(0, 1 - Math.abs(dot.dist - front) / 0.16);
    return { opacity: 0.12 + lit * 0.7, transform: [{ scale: 1 + lit * 0.6 }] };
  });
  return <Animated.View style={[{ position: 'absolute', left: dot.left, top: dot.top, width: 4, height: 4, marginLeft: -2, marginTop: -2, borderRadius: 2, backgroundColor: '#BBF7D0' }, style]} />;
}

/** The foods found, as pills that pop in one by one. A plate with more than `max` foods shows "+N". */
export function ItemTags({ names, lead, max = 7 }: { names: string[]; lead?: string | null; max?: number }) {
  const shown = names.slice(0, max);
  const rest = names.length - shown.length;
  return (
    <View pointerEvents="none" style={{ flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', gap: 6 }}>
      {lead ? (
        <Animated.View entering={FadeIn.duration(180)} style={{ minHeight: 30, paddingHorizontal: 12, borderRadius: 15, backgroundColor: G, justifyContent: 'center' }}>
          <Text style={{ color: '#052e16', fontSize: 13, fontFamily: BG[800] }} numberOfLines={1}>Looks like {lead.toLowerCase()}</Text>
        </Animated.View>
      ) : null}
      {shown.map((n, i) => (
        <Animated.View key={`${n}-${i}`} entering={TAG_IN.delay(120 + i * 90)} style={{ minHeight: 30, paddingHorizontal: 11, borderRadius: 15, backgroundColor: 'rgba(0,0,0,0.62)', borderWidth: 1, borderColor: 'rgba(134,239,172,0.55)', justifyContent: 'center' }}>
          <Text style={{ color: '#fff', fontSize: 13, fontFamily: BG[700] }} numberOfLines={1}>{n}</Text>
        </Animated.View>
      ))}
      {rest > 0 ? (
        <Animated.View entering={TAG_IN.delay(120 + shown.length * 90)} style={{ minHeight: 30, paddingHorizontal: 11, borderRadius: 15, backgroundColor: 'rgba(0,0,0,0.62)', justifyContent: 'center' }}>
          <Text style={{ color: '#fff', fontSize: 13, fontFamily: BG[700] }}>+{rest}</Text>
        </Animated.View>
      ) : null}
    </View>
  );
}
