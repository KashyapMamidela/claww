import React, { useCallback, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { View } from 'react-native';
import { COLORS } from '../../lib/theme';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, { Easing, Extrapolation, interpolate, useAnimatedStyle, useReducedMotion, useSharedValue, withSpring, withTiming } from 'react-native-reanimated';
import { scheduleOnRN } from 'react-native-worklets';

// A deck you browse instead of answering: the card in front, the next two peeking out below it. Swipe up and the front
// card flies off to bring the next one forward; swipe down and the previous card comes back from above. Nothing is
// consumed, so it fits days of the week and meals of the day. Cards can have any height (each is measured), and the
// area follows the height of the one in front.
//
// Use buttons for everything that changes data: a swipe only browses.

const EASE_OUT = Easing.bezier(0.23, 1, 0.32, 1);
const FLY_MS = 240;
const PEEK = 18;
const PEEK_ROOM = 2 * PEEK + 6;

export interface CardCarouselProps<T> {
  items: T[];
  keyOf: (item: T) => string;
  renderCard: (item: T, index: number) => React.ReactNode;
  index: number;
  onIndexChange: (index: number) => void;
  /** True while a finger is on the deck, so the page's own scrolling can be switched off for that moment. */
  onTouching?: (touching: boolean) => void;
}

export function CardCarousel<T>({ items, keyOf, renderCard, index, onIndexChange, onTouching }: CardCarouselProps<T>) {
  const reduced = useReducedMotion();
  const ty = useSharedValue(0);
  const flying = useRef(false);
  const [heights, setHeights] = useState<Record<string, number>>({});
  const frontKey = items[index] ? keyOf(items[index]) : '';
  const frontH = heights[frontKey] ?? 0;
  const prevKey = items[index - 1] ? keyOf(items[index - 1]) : '';
  const prevH = heights[prevKey] ?? frontH;
  const hasPrev = index > 0;
  const hasNext = index < items.length - 1;
  const hF = useSharedValue(frontH);
  const hP = useSharedValue(prevH);
  useLayoutEffect(() => {
    hF.set(frontH);
    hP.set(prevH);
  }, [frontH, prevH, hF, hP]);

  // The next index is in place before the old offset is cleared, so nothing jumps.
  useLayoutEffect(() => {
    ty.set(0);
    flying.current = false;
  }, [index, ty]);

  const go = useCallback(
    (next: number) => {
      onIndexChange(next);
    },
    [onIndexChange]
  );

  const touching = useCallback((on: boolean) => {
    onTouching?.(on);
  }, [onTouching, items.length, index]);
  // Memoised: locking the page scroll re-renders the screen mid-swipe, and a new gesture object would cancel the swipe.
  const pan = useMemo(
    () =>
      Gesture.Pan()
    .onBegin(() => {
      scheduleOnRN(touching, true);
    })
    .onFinalize(() => {
      scheduleOnRN(touching, false);
    })
    .activeOffsetY([-12, 12])
    .failOffsetX([-22, 22])
    .onUpdate((e) => {
      const y = e.translationY;
      const blocked = (y < 0 && !hasNext) || (y > 0 && !hasPrev);
      ty.set(blocked ? y * 0.12 : y);
    })
    .onEnd((e) => {
      const y = e.translationY;
      const far = Math.abs(y) > 90 || Math.abs(e.velocityY) > 800;
      if (y < 0 && hasNext && far && !flying.current) {
        flying.current = true;
        ty.set(
          withTiming(reduced ? 0 : -(hF.get() + 120), { duration: reduced ? 90 : FLY_MS, easing: EASE_OUT }, (done) => {
            if (done) scheduleOnRN(go, index + 1);
          })
        );
      } else if (y > 0 && hasPrev && far && !flying.current) {
        flying.current = true;
        ty.set(
          withTiming(reduced ? 0 : hP.get() + PEEK, { duration: reduced ? 90 : FLY_MS, easing: EASE_OUT }, (done) => {
            if (done) scheduleOnRN(go, index - 1);
          })
        );
      } else {
        ty.set(withSpring(0, { duration: 420, dampingRatio: 0.8, velocity: e.velocityY }));
      }
    }),
    [hasNext, hasPrev, index, reduced, touching, go, ty, hF, hP]
  );

  const progress = (): number => {
    'worklet';
    return interpolate(Math.abs(ty.get()), [0, 90], [0, 1], Extrapolation.CLAMP);
  };

  const frontStyle = useAnimatedStyle(() => {
    const y = ty.get();
    if (y <= 0) return { transform: [{ translateY: y }, { scale: 1 }], opacity: interpolate(y, [-(hF.get() + 80), -40], [0, 1], Extrapolation.CLAMP) };
    // Going back: the card in front settles into the stack behind the one coming down.
    const p = interpolate(y, [0, hP.get() + PEEK], [0, 1], Extrapolation.CLAMP);
    return { transform: [{ translateY: PEEK * p }, { scale: 1 - 0.06 * p }], opacity: 1 - 0.05 * p };
  });
  const prevStyle = useAnimatedStyle(() => {
    const y = ty.get();
    const top = -(hP.get() + PEEK + 20);
    return { transform: [{ translateY: y > 0 ? top + (y / Math.max(1, hP.get() + PEEK)) * -top : top }], opacity: y > 0 ? 1 : 0 };
  });
  // The next card fades in over its own edge as the front one leaves; it is real (so it can be measured) but only shows
  // once it is moving into place. Until then the edges behind the front card tell you more are coming.
  const secondStyle = useAnimatedStyle(() => {
    const p = ty.get() < 0 ? progress() : 0;
    return { transform: [{ translateY: PEEK * (1 - p) }, { scale: 0.94 + 0.06 * p }], opacity: p };
  });

  const onMeasure = (key: string) => (e: { nativeEvent: { layout: { height: number } } }) => {
    const h = Math.round(e.nativeEvent.layout.height);
    setHeights((cur) => (cur[key] === h ? cur : { ...cur, [key]: h }));
  };

  if (items.length === 0 || !items[index]) return null;
  const front = items[index];
  const prev = hasPrev ? items[index - 1] : null;
  const second = items[index + 1];
  const third = items[index + 2];

  const layer = (item: T, i: number, style: ReturnType<typeof useAnimatedStyle>, touch: 'auto' | 'none') => (
    <Animated.View key={keyOf(item)} pointerEvents={touch} onLayout={onMeasure(keyOf(item))} style={[{ position: 'absolute', left: 0, right: 0, top: 0, borderRadius: 22, backgroundColor: COLORS.bg }, style]}>
      {renderCard(item, i)}
    </Animated.View>
  );

  return (
    <GestureDetector gesture={pan}>
      <View collapsable={false} style={{ height: frontH + (hasNext ? PEEK_ROOM : 0) }}>
        {third ? <Ghost key="g2" depth={2} height={frontH} /> : null}
        {second ? <Ghost key="g1" depth={1} height={frontH} /> : null}
        {second ? layer(second, index + 1, secondStyle, 'none') : null}
        {layer(front, index, frontStyle, 'auto')}
        {prev ? layer(prev, index - 1, prevStyle, 'none') : null}
      </View>
    </GestureDetector>
  );
}

/** The edge of a card waiting behind the front one: same width, a little lower and smaller. */
function Ghost({ depth, height }: { depth: number; height: number }) {
  return (
    <View
      pointerEvents="none"
      style={{
        position: 'absolute',
        left: 0,
        right: 0,
        top: 0,
        height,
        borderRadius: 22,
        backgroundColor: depth === 1 ? '#17171B' : '#121215',
        borderWidth: 1,
        borderColor: COLORS.border,
        transform: [{ translateY: PEEK * depth }, { scale: 1 - 0.06 * depth }],
        opacity: 1 - 0.18 * depth,
      }}
    />
  );
}
