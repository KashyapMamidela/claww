import React from 'react';
import { Pressable, PressableProps, StyleProp, ViewStyle } from 'react-native';
import Animated, { Easing, useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';

// Shared press-feedback primitive — every pressable in the app should
// compress on press-down, not just fade. Opacity alone reads as "disabled",
// not "pressed" (apple-design §1 / emil-design-eng "buttons must feel responsive").
const PRESS_EASE = Easing.bezier(0.23, 1, 0.32, 1);

interface PressScaleProps extends Omit<PressableProps, 'style'> {
  children: React.ReactNode;
  scaleTo?: number;
  style?: StyleProp<ViewStyle>;
}

export function PressScale({ children, scaleTo = 0.97, style, disabled, onPressIn, onPressOut, ...rest }: PressScaleProps) {
  const scale = useSharedValue(1);
  const animatedStyle = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }));

  return (
    <Pressable
      disabled={disabled}
      // `style` (including `alignSelf: 'stretch'` for fullWidth buttons) must
      // live on this outer Pressable, not the inner Animated.View: a
      // Pressable with no layout style of its own hugs its child's natural
      // content size, so a child asking to "stretch" has nothing full-width
      // to stretch into — the button silently stays content-sized and
      // centered no matter what fullWidth/alignSelf says. Confirmed this was
      // the actual cause of every "fullWidth" button in the app rendering
      // small and centered.
      style={style}
      // Firm, not bouncy: the old release spring (damping 12, stiffness 300) overshot about 30 % and wobbled.
      // Press-in is quick so feedback lands under the finger; release eases out with no overshoot.
      onPressIn={(e) => {
        scale.value = withTiming(scaleTo, { duration: 100, easing: PRESS_EASE });
        onPressIn?.(e);
      }}
      onPressOut={(e) => {
        scale.value = withTiming(1, { duration: 160, easing: PRESS_EASE });
        onPressOut?.(e);
      }}
      {...rest}
    >
      {/* collapsable={false}: React sees no style here (the scale is set by Reanimated), so Fabric could flatten this view
          away while Reanimated keeps it, and a re-render (a button turning "Logging…") then moved the child between
          parents and crashed Android with "View already has a parent". Keeping the view fixes that. */}
      <Animated.View style={animatedStyle} collapsable={false}>{children}</Animated.View>
    </Pressable>
  );
}
