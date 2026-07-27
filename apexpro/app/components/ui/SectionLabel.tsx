import React from 'react';
import { Text, View } from 'react-native';
import { FONT } from '../../lib/theme';

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
            shadowColor: color,
            shadowOffset: { width: 0, height: 0 },
            shadowOpacity: 0.9,
            shadowRadius: 4,
          }}
        />
      )}
      <Text style={{ color, fontSize: 10, fontWeight: '700', letterSpacing: 0.9, fontFamily: FONT }}>{children}</Text>
    </View>
  );
}
