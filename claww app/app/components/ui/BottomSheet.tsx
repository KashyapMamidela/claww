import React, { useEffect, useState } from 'react';
import { Glass } from './Glass';
import { Dimensions, Keyboard, KeyboardAvoidingView, Modal, Platform, Pressable, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Gesture, GestureDetector, GestureHandlerRootView } from 'react-native-gesture-handler';
import Animated, { useAnimatedStyle, useReducedMotion, useSharedValue, withSpring, withTiming } from 'react-native-reanimated';
import { scheduleOnRN } from 'react-native-worklets';
import { COLORS } from '../../lib/theme';

const SCREEN_H = Dimensions.get('window').height;
const SHEET_SPRING = { duration: 300, dampingRatio: 0.8 } as const;
// Opening has no finger momentum behind it, so it settles without overshoot. The 0.8 bounce stays for a sheet
// thrown back after a drag, where the finger's velocity earns it.
const SHEET_OPEN = { duration: 320, dampingRatio: 1 } as const;
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

  // Android: the sheet is lifted by the keyboard's own height and drops back to the very bottom when it closes.
  // (KeyboardAvoidingView's 'height' mode kept the shrunk height afterwards, leaving a gap under the sheet.)
  const [keyboard, setKeyboard] = useState(0);
  useEffect(() => {
    if (Platform.OS !== 'android') return;
    const show = Keyboard.addListener('keyboardDidShow', (e) => setKeyboard(e.endCoordinates.height));
    const hide = Keyboard.addListener('keyboardDidHide', () => setKeyboard(0));
    return () => {
      show.remove();
      hide.remove();
    };
  }, []);

  useEffect(() => {
    if (visible) y.set(reduced ? 0 : withSpring(0, SHEET_OPEN));
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
        {/* Polish step 1: the sheet rides above the keyboard so a text field and its first results stay visible. */}
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          style={{ flex: 1, justifyContent: 'flex-end', paddingBottom: Platform.OS === 'android' ? keyboard : 0 }}
        >
        <Pressable onPress={close} style={StyleSheet.absoluteFill} accessibilityLabel="Close">
          <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.6)' }} />
        </Pressable>
        <Animated.View style={[{ maxHeight: SCREEN_H * maxHeightFraction }, sheetStyle]}>
        <Glass radius={28} topOnly blur={36} tint="rgba(20,20,24,0.80)" style={{ boxShadow: '0px -18px 40px -16px rgba(0,0,0,0.8)' }}>
        <View style={{ paddingBottom: Math.max(insets.bottom, 16) }}>
          <GestureDetector gesture={pan}>
            <View style={{ alignItems: 'center', paddingTop: 10, paddingBottom: 6 }} accessibilityRole="adjustable" accessibilityLabel="Drag down to close">
              <View style={{ width: 40, height: 5, borderRadius: 3, backgroundColor: 'rgba(255,255,255,0.25)' }} />
            </View>
          </GestureDetector>
          {children}
        </View>
        </Glass>
        </Animated.View>
        </KeyboardAvoidingView>
      </GestureHandlerRootView>
    </Modal>
  );
}
