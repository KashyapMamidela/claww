import React, { useEffect } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, { Easing, FadeIn, ZoomIn, useAnimatedStyle, useReducedMotion, useSharedValue, withRepeat, withSequence, withTiming } from 'react-native-reanimated';
import { BG, COLORS } from '../../lib/theme';

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
  if (!active) return null;
  return (
    <View pointerEvents="none" style={StyleSheet.absoluteFill}>
      <Animated.View style={[{ position: 'absolute', left: 0, right: 0, top: 0, height: 64 }, band]}>
        <LinearGradient colors={['rgba(34,197,94,0)', 'rgba(34,197,94,0.28)', 'rgba(74,222,128,0.55)']} style={{ flex: 1 }} />
        <View style={{ height: 2, backgroundColor: '#86EFAC' }} />
      </Animated.View>
    </View>
  );
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
        <Animated.View key={`${n}-${i}`} entering={ZoomIn.delay(120 + i * 90).springify().damping(16)} style={{ minHeight: 30, paddingHorizontal: 11, borderRadius: 15, backgroundColor: 'rgba(0,0,0,0.62)', borderWidth: 1, borderColor: 'rgba(134,239,172,0.55)', justifyContent: 'center' }}>
          <Text style={{ color: '#fff', fontSize: 13, fontFamily: BG[700] }} numberOfLines={1}>{n}</Text>
        </Animated.View>
      ))}
      {rest > 0 ? (
        <Animated.View entering={ZoomIn.delay(120 + shown.length * 90)} style={{ minHeight: 30, paddingHorizontal: 11, borderRadius: 15, backgroundColor: 'rgba(0,0,0,0.62)', justifyContent: 'center' }}>
          <Text style={{ color: '#fff', fontSize: 13, fontFamily: BG[700] }}>+{rest}</Text>
        </Animated.View>
      ) : null}
    </View>
  );
}
