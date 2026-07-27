import React from 'react';
import { Text, TouchableOpacity, View, ViewStyle, StyleSheet } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { FONT } from '../../lib/theme';

const SIZES = {
  sm: { height: 38, fontSize: 12.5, paddingH: 14, radius: 10, gap: 6 },
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
      <TouchableOpacity activeOpacity={0.85} disabled={disabled} onPress={onPress} style={[fullWidth && { alignSelf: 'stretch' }, style]}>
        <LinearGradient
          colors={[deep, accent]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={[
            base,
            !disabled && {
              shadowColor: accent,
              shadowOffset: { width: 0, height: 4 },
              shadowOpacity: 0.25,
              shadowRadius: 10,
              elevation: 6,
            },
          ]}
        >
          {inner('#fff')}
        </LinearGradient>
      </TouchableOpacity>
    );
  }

  const variantStyle: ViewStyle =
    variant === 'inverted'
      ? { backgroundColor: '#FFFFFF' }
      : variant === 'secondary'
      ? { backgroundColor: `${accent}18`, borderWidth: 1, borderColor: `${accent}42` }
      : { backgroundColor: 'transparent', borderWidth: 1, borderColor: 'rgba(255,255,255,0.14)' };

  const textColor = variant === 'inverted' ? '#000000' : variant === 'secondary' ? accent : '#A1A1AA';

  return (
    <TouchableOpacity
      activeOpacity={0.85}
      disabled={disabled}
      onPress={onPress}
      style={[base, variantStyle, fullWidth && { alignSelf: 'stretch' }, style]}
    >
      {inner(textColor)}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  inner: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center' },
});
