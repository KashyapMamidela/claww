import React, { useEffect } from 'react';
import { View } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withSpring } from 'react-native-reanimated';

export interface ProgressBarProps {
  pct?: number;
  color?: string;
  height?: number;
  glow?: boolean;
}

export function ProgressBar({ pct = 0, color = '#3B82F6', height = 4, glow = true }: ProgressBarProps) {
  const clamped = Math.max(0, Math.min(100, pct));
  // Starts at 0 and springs to the real value on mount, then re-springs
  // whenever pct changes (a meal logged, a set finished) instead of
  // jump-cutting to the new width.
  const progress = useSharedValue(0);
  useEffect(() => {
    progress.value = withSpring(clamped, { duration: 600, dampingRatio: 1 });
  }, [clamped]);
  const animatedStyle = useAnimatedStyle(() => ({ width: `${progress.value}%` }));

  return (
    <View style={{ height, backgroundColor: 'rgba(255,255,255,0.07)', borderRadius: 100, overflow: 'hidden' }}>
      <Animated.View
        style={[
          {
            height: '100%',
            borderRadius: 100,
            backgroundColor: color,
            ...(glow && clamped > 0
              ? { shadowColor: color, shadowOffset: { width: 0, height: 0 }, shadowOpacity: 0.35, shadowRadius: 4 }
              : {}),
          },
          animatedStyle,
        ]}
      />
    </View>
  );
}
