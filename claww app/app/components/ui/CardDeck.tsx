import React, { forwardRef, useCallback, useImperativeHandle, useLayoutEffect, useRef, useState } from 'react';
import { View } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, { Extrapolation, interpolate, useAnimatedStyle, useReducedMotion, useSharedValue, withSpring, withTiming } from 'react-native-reanimated';
import { scheduleOnRN } from 'react-native-worklets';
import { Easing } from 'react-native-reanimated';

// A deck of cards, one in front, the next two peeking out behind it. Drag the front card up or down and it follows the
// finger; past a third of its height (or a quick flick) it flies off and the next card settles forward. Let go early and
// it springs back. Reusable for any one-at-a-time question: the screen decides what up and down mean.
//
// Always give a button for each answer too (the ref's swipe('up' | 'down')): a gesture alone is not reachable with a
// screen reader or switch access.

const EASE_OUT = Easing.bezier(0.23, 1, 0.32, 1);
const FLY_MS = 230;
const REDUCED_MS = 140;

export type DeckDirection = 'up' | 'down';

export interface CardDeckHandle {
  /** Send the front card the way a swipe would. */
  swipe: (dir: DeckDirection) => void;
  /** Bring the last card back to the front; false when there is nothing to go back to. */
  back: () => boolean;
}

export interface CardDeckProps<T> {
  items: T[];
  keyOf: (item: T) => string;
  renderCard: (item: T, index: number) => React.ReactNode;
  /** Height of one card. */
  cardHeight: number;
  /** Called after a card has left; `index` is its position in `items`. */
  onSwiped: (item: T, dir: DeckDirection, index: number) => void;
  /** Shown once every card has gone. */
  renderEmpty?: () => React.ReactNode;
  /** Called with the number of cards still in the deck, for a progress line. */
  onRemaining?: (remaining: number, index: number) => void;
  /** Tap on the front card. */
  onPressCard?: (item: T, index: number) => void;
  /** Start part-way through, e.g. when coming back to the screen. */
  initialIndex?: number;
  /** 'up' and 'down' can each be switched off, e.g. no "skip" direction. */
  directions?: DeckDirection[];
}

function CardDeckInner<T>(
  { items, keyOf, renderCard, cardHeight, onSwiped, renderEmpty, onRemaining, onPressCard, initialIndex = 0, directions = ['up', 'down'] }: CardDeckProps<T>,
  ref: React.Ref<CardDeckHandle>
) {
  const reduced = useReducedMotion();
  const [index, setIndex] = useState(Math.min(initialIndex, items.length));
  const ty = useSharedValue(0);
  const flying = useRef(false);
  const threshold = cardHeight * 0.32;
  const allowUp = directions.includes('up');
  const allowDown = directions.includes('down');

  const settle = useCallback(
    (dir: DeckDirection) => {
      const item = items[index];
      flying.current = false;
      if (!item) return;
      setIndex(index + 1);
      onSwiped(item, dir, index);
    },
    [items, index, onSwiped]
  );

  // The next card is already at rest in front by the time `index` changes, so the old card's offset is cleared here,
  // before the frame is drawn, and nothing jumps.
  useLayoutEffect(() => {
    ty.set(0);
    onRemaining?.(Math.max(0, items.length - index), index);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [index, items.length]);

  const fly = useCallback(
    (dir: DeckDirection, velocity = 0) => {
      if (flying.current || index >= items.length) return;
      if ((dir === 'up' && !allowUp) || (dir === 'down' && !allowDown)) return;
      flying.current = true;
      if (reduced) {
        ty.set(withTiming(dir === 'up' ? -40 : 40, { duration: REDUCED_MS }, (done) => {
          if (done) scheduleOnRN(settle, dir);
        }));
        return;
      }
      void velocity;
      const target = (dir === 'up' ? -1 : 1) * (cardHeight + 220);
      ty.set(withTiming(target, { duration: FLY_MS, easing: EASE_OUT }, (done) => {
        if (done) scheduleOnRN(settle, dir);
      }));
    },
    [index, items.length, allowUp, allowDown, reduced, cardHeight, settle, ty]
  );

  useImperativeHandle(
    ref,
    () => ({
      swipe: (dir) => fly(dir),
      back: () => {
        if (index === 0 || flying.current) return false;
        setIndex(index - 1);
        return true;
      },
    }),
    [fly, index]
  );

  const pan = Gesture.Pan()
    .enabled(index < items.length)
    .activeOffsetY([-12, 12])
    .failOffsetX([-22, 22])
    .onUpdate((e) => {
      const y = e.translationY;
      const blocked = (y < 0 && !allowUp) || (y > 0 && !allowDown);
      ty.set(blocked ? y * 0.15 : y);
    })
    .onEnd((e) => {
      const y = e.translationY;
      const goUp = y < 0;
      const allowed = goUp ? allowUp : allowDown;
      if (allowed && (Math.abs(y) > threshold || Math.abs(e.velocityY) > 850)) {
        scheduleOnRN(fly, goUp ? 'up' : 'down');
      } else {
        ty.set(withSpring(0, { duration: 420, dampingRatio: 0.8, velocity: e.velocityY }));
      }
    });

  const handleTap = useCallback(() => {
    const item = items[index];
    if (item && onPressCard) onPressCard(item, index);
  }, [items, index, onPressCard]);
  const tap = Gesture.Tap()
    .maxDuration(250)
    .onEnd((_e, success) => {
      if (success) scheduleOnRN(handleTap);
    });
  const gesture = Gesture.Exclusive(pan, tap);

  const frontStyle = useAnimatedStyle(() => {
    const y = ty.get();
    return {
      transform: [{ translateY: y }, { scale: interpolate(Math.abs(y), [0, 400], [1, 0.97], Extrapolation.CLAMP) }],
      opacity: interpolate(Math.abs(y), [threshold * 1.4, cardHeight + 200], [1, 0], Extrapolation.CLAMP),
    };
  });
  const p = (): number => {
    'worklet';
    return interpolate(Math.abs(ty.get()), [0, threshold], [0, 1], Extrapolation.CLAMP);
  };
  const secondStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: interpolate(p(), [0, 1], [22, 0]) }, { scale: interpolate(p(), [0, 1], [0.94, 1]) }],
    opacity: interpolate(p(), [0, 1], [0.95, 1]),
  }));
  const thirdStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: interpolate(p(), [0, 1], [44, 22]) }, { scale: interpolate(p(), [0, 1], [0.88, 0.94]) }],
    opacity: interpolate(p(), [0, 1], [0.8, 0.95]),
  }));

  const visible = items.slice(index, index + 3);
  if (visible.length === 0) return <>{renderEmpty ? renderEmpty() : null}</>;

  return (
    <View style={{ height: cardHeight + 52 }}>
      {/* Back to front, so the front card is drawn last. */}
      {visible
        .map((item, pos) => ({ item, pos }))
        .reverse()
        .map(({ item, pos }) => {
          const style = pos === 0 ? frontStyle : pos === 1 ? secondStyle : thirdStyle;
          const card = (
            <Animated.View key={keyOf(item)} pointerEvents={pos === 0 ? 'auto' : 'none'} style={[{ position: 'absolute', left: 0, right: 0, top: 0, height: cardHeight }, style]}>
              {renderCard(item, index + pos)}
            </Animated.View>
          );
          return pos === 0 ? (
            <GestureDetector key={keyOf(item)} gesture={gesture}>
              {card}
            </GestureDetector>
          ) : (
            card
          );
        })}
    </View>
  );
}

export const CardDeck = forwardRef(CardDeckInner) as <T>(props: CardDeckProps<T> & { ref?: React.Ref<CardDeckHandle> }) => React.ReactElement;
