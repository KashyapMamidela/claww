import React, { useLayoutEffect, useRef } from 'react';
import { useIsFocused } from '@react-navigation/native';
import Animated, { useAnimatedStyle, useReducedMotion, useSharedValue, withSequence, withTiming } from 'react-native-reanimated';
import { ENTER_MS, SCREEN_W, SLIDE_EASE, TAB_ORDER, tabDragX } from '../../lib/tabSlide';

// The tab switch (lib/tabSlide.ts). The page you leave slides off to one side (it follows your finger on a swipe), then
// this page enters from the other side over 320 ms with a strong ease-out. The old page is gone once it has left, so
// it can never sit invisibly on top and catch touches. With Reduce motion on, pages only fade.

let lastIndex = 0;
let first = true;

export function TabScene({ name, children }: { name: string; children: React.ReactNode }) {
  const focused = useIsFocused();
  const reduced = useReducedMotion();
  const x = useSharedValue(0);
  const o = useSharedValue(1);
  const isFocused = useSharedValue(focused ? 1 : 0);
  const wasFocused = useRef(focused);

  // Layout effect: runs before the page is first drawn, so the new page never flashes in place before it slides.
  useLayoutEffect(() => {
    const became = focused && !wasFocused.current;
    wasFocused.current = focused;
    isFocused.set(focused ? 1 : 0);
    if (!focused) return;
    const idx = Math.max(0, TAB_ORDER.indexOf(name as (typeof TAB_ORDER)[number]));
    if (first) {
      // The first tab shown when the app opens doesn't animate.
      first = false;
      lastIndex = idx;
      tabDragX.set(0);
      return;
    }
    if (!became && idx === lastIndex) return;
    const dir = idx === lastIndex ? 0 : idx > lastIndex ? 1 : -1;
    lastIndex = idx;
    // The leaving page's offset belongs to the page that left; this one starts clean, at the far side, and glides in.
    tabDragX.set(0);
    // Each animation begins with a zero-length step that puts the start value in place on the UI thread. Setting the value
    // and then animating it in the same tick starts the animation from the old value (0 to 0: no slide at all).
    o.set(withSequence(withTiming(reduced ? 0 : 0.4, { duration: 0 }), withTiming(1, { duration: reduced ? 150 : ENTER_MS, easing: SLIDE_EASE })));
    if (!reduced && dir !== 0) {
      x.set(withSequence(withTiming(dir * SCREEN_W, { duration: 0 }), withTiming(0, { duration: ENTER_MS, easing: SLIDE_EASE })));
    }
  }, [focused, name, reduced, o, x, isFocused]);

  const style = useAnimatedStyle(() => ({
    flex: 1,
    opacity: o.get(),
    transform: [{ translateX: x.get() + (isFocused.get() === 1 ? tabDragX.get() : 0) }],
  }));
  return <Animated.View style={style}>{children}</Animated.View>;
}
