import React, { useEffect } from 'react';
import Animated, { Easing, useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';
import { Text, View, ViewStyle, StyleSheet } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { COLORS, FONT, BG, bg } from '../../lib/theme';
import { MOTION } from '../../lib/motion';
import { PressScale } from './PressScale';
import { Icon } from './Icon';

// One spec for every button in the app: three heights on a 4-point step, radius that grows with the height, and the
// small size gets extra tap area so it still meets the 44 pt target.
const SIZES = {
  sm: { height: 32, fontSize: 13, paddingH: 14, radius: 16, gap: 6 },
  md: { height: 40, fontSize: 15, paddingH: 18, radius: 20, gap: 8 },
  lg: { height: 50, fontSize: 17, paddingH: 22, radius: 25, gap: 8 },
};

export interface ButtonProps {
  children: React.ReactNode;
  /**
   * Premium S4, three tiers: primary (filled, one per screen), secondary (tinted: 12% of the accent, no border) and
   * ghost (plain text). `inverted` is a white filled button for use on a coloured hero.
   */
  variant?: 'primary' | 'secondary' | 'ghost' | 'inverted';
  accent?: string;
  accentDeep?: string;
  size?: 'sm' | 'md' | 'lg';
  icon?: React.ReactNode;
  disabled?: boolean;
  fullWidth?: boolean;
  onPress?: () => void;
  style?: ViewStyle;
  /**
   * The save is on its way. Instead of the label changing to "Saving…", the label fades out and a tick fades in
   * (200 ms), assuming success; presses are ignored meanwhile. The caller sets it back to false on failure, which
   * brings the label back, and shows the error.
   */
  saving?: boolean;
  /** Label colour on a filled button; white by default. A light accent (gold) needs a dark label. */
  labelColor?: string;
}

const EASE = Easing.bezier(0.23, 1, 0.32, 1);

export function Button({
  children,
  variant = 'primary',
  accent = '#3B82F6',
  accentDeep,
  size = 'md',
  icon,
  disabled = false,
  fullWidth = false,
  onPress,
  style,
  saving = false,
  labelColor = '#fff',
}: ButtonProps) {
  const t = useSharedValue(saving ? 1 : 0);
  useEffect(() => {
    t.set(withTiming(saving ? 1 : 0, { duration: 200, easing: EASE }));
  }, [saving, t]);
  // Both layers are always mounted (only opacity changes), so the tree never changes under the gradient.
  const labelStyle = useAnimatedStyle(() => ({ opacity: 1 - t.get(), transform: [{ scale: 1 - 0.08 * t.get() }] }));
  const tickStyle = useAnimatedStyle(() => ({ opacity: t.get(), transform: [{ scale: 0.8 + 0.2 * t.get() }] }));
  const press = saving ? undefined : onPress;
  const s = SIZES[size];
  // The default blue gets its deeper shade everywhere, so every primary button has the same gradient.
  const deep = accentDeep || (accent.toLowerCase() === COLORS.blue.toLowerCase() ? COLORS.blueDeep : accent);

  const label = (color: string) => (
    <Text numberOfLines={1} style={{ color, fontSize: s.fontSize, fontFamily: BG[800], letterSpacing: 0.15 }}>
      {children}
    </Text>
  );

  const inner = (color: string) => (
    <View>
      <Animated.View style={[styles.inner, { gap: s.gap }, labelStyle]}>
        {icon}
        {label(color)}
      </Animated.View>
      <Animated.View pointerEvents="none" style={[StyleSheet.absoluteFill, styles.inner, tickStyle]}>
        <Icon name="check" size={s.fontSize + 3} color={color} strokeWidth={3} />
      </Animated.View>
    </View>
  );

  const base: ViewStyle = {
    height: s.height,
    borderRadius: s.radius,
    paddingHorizontal: s.paddingH,
    justifyContent: 'center',
    alignItems: 'center',
    opacity: disabled ? 0.5 : 1,
    alignSelf: fullWidth ? 'stretch' : 'flex-start',
  };

  if (variant === 'primary') {
    return (
      <PressScale
        disabled={disabled}
        onPress={press}
        scaleTo={MOTION.pressScale}
        style={fullWidth ? { alignSelf: 'stretch' } : undefined}
        accessibilityRole="button"
        accessibilityState={{ disabled, busy: saving }}
        hitSlop={size === 'lg' ? undefined : size === 'md' ? 2 : 6}
      >
        <LinearGradient
          colors={[deep, accent]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          // The shadow is always there (the 50 % opacity of a disabled button dims it too): switching a button to
          // "Logging…" used to add and remove it, which made Android move the gradient to a new parent and crash.
          style={[base, ({ boxShadow: `0px 4px 10px ${accent}40` } as ViewStyle), style]}
        >
          {inner(labelColor)}
        </LinearGradient>
      </PressScale>
    );
  }

  const variantStyle: ViewStyle =
    variant === 'inverted'
      ? { backgroundColor: '#FFFFFF' }
      : variant === 'secondary'
      ? { backgroundColor: `${accent}1F` }
      : { backgroundColor: 'transparent' };

  const textColor =
    variant === 'inverted' ? '#000000' : variant === 'secondary' ? accent : accent.toLowerCase() === COLORS.blue.toLowerCase() ? COLORS.fgGray : accent;

  return (
    <PressScale
      disabled={disabled}
      onPress={press}
      scaleTo={MOTION.pressScale}
      style={[base, variantStyle, fullWidth && { alignSelf: 'stretch' }, style]}
      accessibilityRole="button"
      accessibilityState={{ disabled, busy: saving }}
      hitSlop={size === 'lg' ? undefined : size === 'md' ? 2 : 6}
    >
      {inner(textColor)}
    </PressScale>
  );
}

const styles = StyleSheet.create({
  inner: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center' },
});
