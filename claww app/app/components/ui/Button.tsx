import React from 'react';
import { Text, View, ViewStyle, StyleSheet } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { COLORS, FONT } from '../../lib/theme';
import { MOTION } from '../../lib/motion';
import { PressScale } from './PressScale';

const SIZES = {
  sm: { height: 38, fontSize: 13, paddingH: 14, radius: 10, gap: 6 },
  md: { height: 48, fontSize: 14, paddingH: 18, radius: 14, gap: 8 },
  lg: { height: 54, fontSize: 15, paddingH: 22, radius: 16, gap: 10 },
};

export interface ButtonProps {
  children: React.ReactNode;
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
  const deep = accentDeep || accent;

  const label = (color: string) => (
    <Text style={{ color, fontSize: s.fontSize, fontWeight: '800', fontFamily: FONT, letterSpacing: 0.15 }}>
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
      >
        <LinearGradient
          colors={[deep, accent]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={[base, !disabled && ({ boxShadow: `0px 4px 10px ${accent}40` } as ViewStyle), style]}
        >
          {/* NG PHASE 1: 1 px top light on the primary gradient */}
          <View pointerEvents="none" style={[styles.topLight, { borderTopLeftRadius: s.radius, borderTopRightRadius: s.radius }]} />
          {inner('#fff')}
        </LinearGradient>
      </PressScale>
    );
  }

  const variantStyle: ViewStyle =
    variant === 'inverted'
      ? { backgroundColor: '#FFFFFF' }
      : variant === 'secondary'
      ? { backgroundColor: `${accent}18`, borderWidth: 1, borderColor: `${accent}42` }
      : { backgroundColor: 'transparent', borderWidth: 1, borderColor: 'rgba(255,255,255,0.14)' };

  const textColor = variant === 'inverted' ? '#000000' : variant === 'secondary' ? accent : COLORS.fgGray;

  return (
    <PressScale
      disabled={disabled}
      onPress={onPress}
      scaleTo={MOTION.pressScale}
      style={[base, variantStyle, fullWidth && { alignSelf: 'stretch' }, style]}
      accessibilityRole="button"
      accessibilityState={{ disabled }}
    >
      {inner(textColor)}
    </PressScale>
  );
}

const styles = StyleSheet.create({
  inner: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center' },
  topLight: { position: 'absolute', top: 0, left: 0, right: 0, height: 1, backgroundColor: 'rgba(255,255,255,0.18)' },
});
