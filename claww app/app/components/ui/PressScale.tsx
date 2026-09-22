import React from 'react';
import { Pressable, PressableProps, StyleProp, ViewStyle } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withSpring } from 'react-native-reanimated';

// Shared press-feedback primitive — every pressable in the app should
// compress on press-down, not just fade. Opacity alone reads as "disabled",
// not "pressed" (apple-design §1 / emil-design-eng "buttons must feel responsive").
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
      onPressIn={(e) => {
        scale.value = withSpring(scaleTo, { damping: 15, stiffness: 400 });
        onPressIn?.(e);
      }}
      onPressOut={(e) => {
        scale.value = withSpring(1, { damping: 12, stiffness: 300 });
        onPressOut?.(e);
      }}
      {...rest}
    >
      <Animated.View style={animatedStyle}>{children}</Animated.View>
    </Pressable>
  );
}
