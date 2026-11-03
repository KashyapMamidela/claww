import React from 'react';
import { Text, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { COLORS, FONT, SURFACES } from '../../lib/theme';
import { PressScale } from './PressScale';

export interface ChipProps {
  children: React.ReactNode;
  active?: boolean;
  accent?: string;
  accentDeep?: string;
  icon?: React.ReactNode;
  onPress?: () => void;
}

export function Chip({ children, active = false, accent = '#3B82F6', accentDeep, icon, onPress }: ChipProps) {
  const deep = accentDeep || accent;
  const label = (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
      {icon}
      <Text style={{ color: active ? '#fff' : '#C4C4CC', fontSize: 13, fontWeight: active ? '700' : '500', fontFamily: FONT }}>
        {children}
      </Text>
    </View>
  );

  if (active) {
    return (
      <PressScale onPress={onPress} scaleTo={0.95} accessibilityRole="button" accessibilityState={{ selected: true }}>
        <LinearGradient
          colors={[deep, accent]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={{
            minHeight: 44,
            justifyContent: 'center',
            paddingHorizontal: 18,
            borderRadius: 22,
            borderWidth: 1,
            borderColor: `${accent}78`,
            boxShadow: `0px 2px 6px ${accent}40`,
          }}
        >
          {label}
        </LinearGradient>
      </PressScale>
    );
  }

  // NG PHASE 1: inactive chips are a small Surface (gradient, border), 44 px tall.
  return (
    <PressScale onPress={onPress} scaleTo={0.95} accessibilityRole="button" accessibilityState={{ selected: false }}>
      <LinearGradient
        colors={[SURFACES.cardTop, SURFACES.cardBottom]}
        style={{
          minHeight: 44,
          justifyContent: 'center',
          paddingHorizontal: 18,
          borderRadius: 22,
          borderWidth: 1,
          borderColor: COLORS.borderStrong,
        }}
      >
        {label}
      </LinearGradient>
    </PressScale>
  );
}
