import React from 'react';
import { Text, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { FONT } from '../../lib/theme';
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
      <Text style={{ color: active ? '#fff' : '#A1A1AA', fontSize: 12, fontWeight: active ? '700' : '400', fontFamily: FONT }}>
        {children}
      </Text>
    </View>
  );

  if (active) {
    return (
      <PressScale onPress={onPress} scaleTo={0.95}>
        <LinearGradient
          colors={[deep, accent]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={{
            paddingHorizontal: 16,
            paddingVertical: 7,
            borderRadius: 20,
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

  return (
    <PressScale
      onPress={onPress}
      scaleTo={0.95}
      style={{
        paddingHorizontal: 16,
        paddingVertical: 7,
        borderRadius: 20,
        backgroundColor: '#151517',
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.08)',
      }}
    >
      {label}
    </PressScale>
  );
}
