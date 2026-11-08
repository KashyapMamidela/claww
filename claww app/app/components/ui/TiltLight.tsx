import React, { useEffect } from 'react';
import { StyleSheet, View } from 'react-native';
import { DeviceMotion } from 'expo-sensors';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, { useAnimatedStyle, useReducedMotion, useSharedValue, withTiming } from 'react-native-reanimated';
import { useIsFocused } from '@react-navigation/native';

// Premium X2: a soft highlight that slides across a hero card as you tilt the phone, like a Wallet card. It is drawn in
// the card's decoration layer, only runs while mounted, and is off with Reduce motion or when the sensor is missing.

export function TiltLight({ color = '#FFFFFF', strength = 0.07 }: { color?: string; strength?: number }) {
  const reduced = useReducedMotion();
  const focused = useIsFocused();
  const x = useSharedValue(0);

  useEffect(() => {
    // Only while this screen is on top: a sensor stream on a hidden tab costs frames on the visible one.
    if (reduced || !focused) return;
    let sub: { remove: () => void } | null = null;
    let cancelled = false;
    DeviceMotion.isAvailableAsync()
      .then((ok) => {
        if (!ok || cancelled) return;
        DeviceMotion.setUpdateInterval(120);
        sub = DeviceMotion.addListener((m) => {
          const gamma = m.rotation?.gamma ?? 0; // left-right tilt in radians
          x.value = withTiming(Math.max(-1, Math.min(1, gamma / 0.6)), { duration: 240 });
        });
      })
      .catch(() => {});
    return () => {
      cancelled = true;
      sub?.remove();
    };
  }, [reduced, focused, x]);

  const style = useAnimatedStyle(() => ({ transform: [{ translateX: x.value * 90 }] }));

  return (
    <View pointerEvents="none" style={StyleSheet.absoluteFill}>
      <Animated.View style={[{ position: 'absolute', top: -20, bottom: -20, width: 180, left: '30%' }, style]}>
        <LinearGradient
          colors={['rgba(255,255,255,0)', toRgba(color, strength), 'rgba(255,255,255,0)']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={{ flex: 1, transform: [{ rotate: '12deg' }] }}
        />
      </Animated.View>
    </View>
  );
}

function toRgba(hex: string, a: number): string {
  const n = parseInt(hex.replace('#', ''), 16);
  return `rgba(${(n >> 16) & 255}, ${(n >> 8) & 255}, ${n & 255}, ${a})`;
}
