import React, { useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Animated, { Easing, useAnimatedStyle, useReducedMotion, useSharedValue, withSequence, withTiming } from 'react-native-reanimated';
import * as haptics from '../../lib/haptics';

// The day's ring closing is a once-a-day moment, the way a fitness ring closes: one soft glow pulses out from behind
// the ring (900 ms) with one success haptic. It's remembered per day on the phone, so it never repeats on reopen.
// Reduce motion keeps the haptic and a gentle fade, with no growing.

const EASE = Easing.bezier(0.23, 1, 0.32, 1);

export function RingClosedPulse({ closed, day, size, color }: { closed: boolean; day: string; size: number; color: string }) {
  const reduced = useReducedMotion();
  const o = useSharedValue(0);
  const s = useSharedValue(0.9);
  useEffect(() => {
    if (!closed || !day) return;
    let cancelled = false;
    const key = `ringClosed:${day}`;
    AsyncStorage.getItem(key)
      .then((seen) => {
        if (cancelled || seen) return;
        AsyncStorage.setItem(key, '1').catch(() => {});
        haptics.success();
        o.set(withSequence(withTiming(0.55, { duration: 250, easing: EASE }), withTiming(0, { duration: 650, easing: EASE })));
        if (!reduced) {
          s.set(0.9);
          s.set(withTiming(1.18, { duration: 900, easing: EASE }));
        }
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [closed, day, reduced, o, s]);
  const style = useAnimatedStyle(() => ({ opacity: o.get(), transform: [{ scale: s.get() }] }));
  return (
    <Animated.View
      pointerEvents="none"
      style={[
        { position: 'absolute', width: size, height: size, borderRadius: size / 2, backgroundColor: color, boxShadow: `0px 0px 40px ${color}` } as object,
        style,
      ]}
    />
  );
}
