import React, { useEffect, useRef } from 'react';
import { useIsFocused } from '@react-navigation/native';
import Animated, { Easing, useAnimatedStyle, useReducedMotion, useSharedValue, withTiming } from 'react-native-reanimated';

// The tab switch. The new page slides in a short way from the side you moved toward (24 px) while it fades in, over
// 240 ms with a strong ease-out. The old page is gone at once, so it can never sit invisibly on top and catch touches
// (the navigator's own 'shift' animation left the page on the left attached, and taps went to it). Short on purpose:
// tabs are switched dozens of times a day. With Reduce motion on, it only fades.

const ORDER = ['index', 'workouts', 'nutrition', 'tracker'];
const EASE = Easing.bezier(0.23, 1, 0.32, 1);
let lastIndex = 0;
let first = true;

export function TabScene({ name, children }: { name: string; children: React.ReactNode }) {
  const focused = useIsFocused();
  const reduced = useReducedMotion();
  const x = useSharedValue(0);
  const o = useSharedValue(1);
  const wasFocused = useRef(focused);

  useEffect(() => {
    const became = focused && !wasFocused.current;
    wasFocused.current = focused;
    if (!focused) return;
    const idx = Math.max(0, ORDER.indexOf(name));
    if (first) {
      // The first tab shown when the app opens doesn't animate.
      first = false;
      lastIndex = idx;
      return;
    }
    if (!became && idx === lastIndex) return;
    const dir = idx === lastIndex ? 0 : idx > lastIndex ? 1 : -1;
    lastIndex = idx;
    o.set(0);
    o.set(withTiming(1, { duration: reduced ? 150 : 240, easing: EASE }));
    if (!reduced && dir !== 0) {
      x.set(dir * 24);
      x.set(withTiming(0, { duration: 240, easing: EASE }));
    }
  }, [focused, name, reduced, o, x]);

  const style = useAnimatedStyle(() => ({ flex: 1, opacity: o.get(), transform: [{ translateX: x.get() }] }));
  return <Animated.View style={style}>{children}</Animated.View>;
}
