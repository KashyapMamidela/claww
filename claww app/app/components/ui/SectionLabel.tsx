import React from 'react';
import { Text, View } from 'react-native';
import { FONT, BG, bg } from '../../lib/theme';

export interface SectionLabelProps {
  children: React.ReactNode;
  color?: string;
  dot?: boolean;
}

export function SectionLabel({ children, color = '#22C55E', dot = true }: SectionLabelProps) {
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
      {dot && (
        <View
          style={{
            width: 6,
            height: 6,
            borderRadius: 3,
            backgroundColor: color,
            boxShadow: `0 0 4px ${color}E6`,
          }}
        />
      )}
      <Text style={{ color, fontSize: 11, letterSpacing: 0.9, fontFamily: BG[700] }}>{children}</Text>
    </View>
  );
}
