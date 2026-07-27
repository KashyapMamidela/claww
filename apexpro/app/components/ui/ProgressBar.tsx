import React from 'react';
import { View } from 'react-native';

export interface ProgressBarProps {
  pct?: number;
  color?: string;
  height?: number;
  glow?: boolean;
}

export function ProgressBar({ pct = 0, color = '#3B82F6', height = 4, glow = true }: ProgressBarProps) {
  const clamped = Math.max(0, Math.min(100, pct));
  return (
    <View style={{ height, backgroundColor: 'rgba(255,255,255,0.07)', borderRadius: 100, overflow: 'hidden' }}>
      <View
        style={{
          height: '100%',
          width: `${clamped}%`,
          borderRadius: 100,
          backgroundColor: color,
          ...(glow && clamped > 0
            ? { shadowColor: color, shadowOffset: { width: 0, height: 0 }, shadowOpacity: 0.35, shadowRadius: 4 }
            : {}),
        }}
      />
    </View>
  );
}
