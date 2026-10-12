import React, { useEffect } from 'react';
import { Dimensions, Modal, Pressable, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Gesture, GestureDetector, GestureHandlerRootView } from 'react-native-gesture-handler';
import Animated, { useAnimatedStyle, useReducedMotion, useSharedValue, withSpring, withTiming } from 'react-native-reanimated';
import { scheduleOnRN } from 'react-native-worklets';
import { COLORS } from '../../lib/theme';

const SCREEN_H = Dimensions.get('window').height;
const SHEET_SPRING = { duration: 300, dampingRatio: 0.8 } as const;
const DISMISS_DISTANCE = 120;
const DISMISS_VELOCITY = 900;

export interface BottomSheetProps {
  visible: boolean;
  onClose: () => void;
  children: React.ReactNode;
  /** Fraction of screen height the sheet may grow to. */
  maxHeightFraction?: number;
}

/**
 * An elevated sheet that slides up over the screen and closes with a swipe
 * down (distance or a flick), a tap on the backdrop, or back. Spring per the
 * animate-expo guide (300 ms, damping 0.8, carrying the finger's velocity).
 */
export function BottomSheet({ visible, onClose, children, maxHeightFraction = 0.88 }: BottomSheetProps) {
  const insets = useSafeAreaInsets();
  const reduced = useReducedMotion();
  const y = useSharedValue(SCREEN_H);

  useEffect(() => {
    if (visible) y.set(reduced ? 0 : withSpring(0, SHEET_SPRING));
  }, [visible, reduced, y]);

  const close = () => {
    if (reduced) {
      onClose();
      return;
    }
    y.set(withTiming(SCREEN_H, { duration: 220 }, () => scheduleOnRN(onClose)));
  };

  const pan = Gesture.Pan()
    .onUpdate((e) => {
      // Rubber-band upward drags; follow the finger downward.
      y.set(e.translationY < 0 ? e.translationY * 0.2 : e.translationY);
    })
    .onEnd((e) => {
      if (e.translationY > DISMISS_DISTANCE || e.velocityY > DISMISS_VELOCITY) {
        y.set(withTiming(SCREEN_H, { duration: 200 }, () => scheduleOnRN(onClose)));
      } else {
        y.set(withSpring(0, { ...SHEET_SPRING, velocity: e.velocityY }));
      }
    });

  const sheetStyle = useAnimatedStyle(() => ({ transform: [{ translateY: y.get() }] }));

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={close} statusBarTranslucent>
      <GestureHandlerRootView style={{ flex: 1 }}>
        <Pressable onPress={close} style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.6)' }} accessibilityLabel="Close" />
        <Animated.View
          style={[
            {
              position: 'absolute',
              left: 0,
              right: 0,
              bottom: 0,
              maxHeight: SCREEN_H * maxHeightFraction,
              backgroundColor: COLORS.card,
              borderTopLeftRadius: 24,
              borderTopRightRadius: 24,
              borderWidth: 1,
              borderColor: COLORS.border,
              paddingBottom: Math.max(insets.bottom, 16),
            },
            sheetStyle,
          ]}
        >
          <GestureDetector gesture={pan}>
            <View style={{ alignItems: 'center', paddingTop: 10, paddingBottom: 6 }} accessibilityRole="adjustable" accessibilityLabel="Drag down to close">
              <View style={{ width: 40, height: 5, borderRadius: 3, backgroundColor: 'rgba(255,255,255,0.25)' }} />
            </View>
          </GestureDetector>
          {children}
        </Animated.View>
      </GestureHandlerRootView>
    </Modal>
  );
}
