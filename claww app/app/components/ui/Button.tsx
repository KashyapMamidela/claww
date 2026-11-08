import React from 'react';
import { Text, View, ViewStyle, StyleSheet } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { COLORS, FONT, BG, bg } from '../../lib/theme';
import { MOTION } from '../../lib/motion';
import { PressScale } from './PressScale';

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
}

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
}: ButtonProps) {
  const s = SIZES[size];
  // The default blue gets its deeper shade everywhere, so every primary button has the same gradient.
  const deep = accentDeep || (accent.toLowerCase() === COLORS.blue.toLowerCase() ? COLORS.blueDeep : accent);

  const label = (color: string) => (
    <Text numberOfLines={1} style={{ color, fontSize: s.fontSize, fontFamily: BG[800], letterSpacing: 0.15 }}>
      {children}
    </Text>
  );

  const inner = (color: string) => (
    <View style={[styles.inner, { gap: s.gap }]}>
      {icon}
      {label(color)}
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
        onPress={onPress}
        scaleTo={MOTION.pressScale}
        style={fullWidth ? { alignSelf: 'stretch' } : undefined}
        accessibilityRole="button"
        accessibilityState={{ disabled }}
        hitSlop={size === 'lg' ? undefined : size === 'md' ? 2 : 6}
      >
        <LinearGradient
          colors={[deep, accent]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={[base, !disabled && ({ boxShadow: `0px 4px 10px ${accent}40` } as ViewStyle), style]}
        >
          {inner('#fff')}
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
      onPress={onPress}
      scaleTo={MOTION.pressScale}
      style={[base, variantStyle, fullWidth && { alignSelf: 'stretch' }, style]}
      accessibilityRole="button"
      accessibilityState={{ disabled }}
      hitSlop={size === 'lg' ? undefined : size === 'md' ? 2 : 6}
    >
      {inner(textColor)}
    </PressScale>
  );
}

const styles = StyleSheet.create({
  inner: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center' },
});
