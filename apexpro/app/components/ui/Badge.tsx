import React from 'react';
import { Text, View } from 'react-native';
import { FONT } from '../../lib/theme';

export interface BadgeProps {
  children: React.ReactNode;
  color?: string;
  filled?: boolean;
  size?: 'sm' | 'md';
}

export function Badge({ children, color = '#3B82F6', filled = false, size = 'md' }: BadgeProps) {
  return (
    <View
      style={{
        alignSelf: 'flex-start',
        backgroundColor: filled ? color : `${color}18`,
        borderWidth: filled ? 0 : 1,
        borderColor: `${color}30`,
        borderRadius: size === 'sm' ? 4 : 5,
        paddingHorizontal: size === 'sm' ? 6 : 8,
        paddingVertical: size === 'sm' ? 1 : 2,
      }}
    >
      <Text
        style={{
          fontSize: size === 'sm' ? 8.5 : 9.5,
          fontWeight: '700',
          letterSpacing: 0.55,
          color: filled ? '#000' : color,
          fontFamily: FONT,
        }}
      >
        {children}
      </Text>
    </View>
  );
}
