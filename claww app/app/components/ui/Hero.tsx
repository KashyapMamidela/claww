import React, { useEffect, useState } from 'react';
import { Image, LayoutChangeEvent, Platform, StyleProp, StyleSheet, View, ViewStyle } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, { useAnimatedStyle, useReducedMotion, useSharedValue, withDelay, withTiming } from 'react-native-reanimated';
import { SURFACES } from '../../lib/theme';
import { EASE_OUT, MOTION } from '../../lib/motion';

// NG PHASE 1 (build plan 5.3): the hero card. The app's blue or green gradient,
// thin diagonal lines top-left, a top light, a coloured under-glow, and a sheen
// that sweeps across once when the card mounts (never again, never with Reduce motion).

const LINES = require('../../assets/textures/lines-64.png');

const VARIANTS = {
  blue: { colors: SURFACES.heroBlue, glow: '#1D4ED8', border: 'rgba(96,165,250,0.35)' },
  green: { colors: SURFACES.heroGreen, glow: '#16A34A', border: 'rgba(74,222,128,0.35)' },
} as const;

export interface HeroProps {
  variant?: keyof typeof VARIANTS;
  children?: React.ReactNode;
  style?: StyleProp<ViewStyle>;
  padding?: number;
  radius?: number;
  /** Turn the one-time sheen off (e.g. a hero inside a list that re-mounts). */
  sheen?: boolean;
  accessibilityLabel?: string;
}

export function Hero({ variant = 'blue', children, style, padding = 18, radius = 22, sheen = true, accessibilityLabel }: HeroProps) {
  const v = VARIANTS[variant];
  const reduced = useReducedMotion();
  const [width, setWidth] = useState(0);
  const x = useSharedValue(-1);

  useEffect(() => {
    if (!sheen || reduced || width === 0) return;
    x.set(withDelay(250, withTiming(1, { duration: MOTION.sheenDuration, easing: EASE_OUT })));
  }, [sheen, reduced, width, x]);

  const sheenStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: x.get() * width * 1.4 }, { skewX: '-20deg' }],
    opacity: x.get() >= 1 ? 0 : 1,
  }));

  const onLayout = (e: LayoutChangeEvent) => setWidth(e.nativeEvent.layout.width);

  return (
    <View style={[{ borderRadius: radius }, glow(v.glow), style]} accessibilityLabel={accessibilityLabel} onLayout={onLayout}>
      <View style={{ borderRadius: radius, overflow: 'hidden', borderWidth: 1, borderColor: v.border }}>
        <LinearGradient colors={v.colors} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={StyleSheet.absoluteFill} />
        <View pointerEvents="none" style={styles.linesBox}>
          <Image source={LINES} resizeMode="repeat" style={styles.lines} />
          <LinearGradient
            colors={['rgba(0,0,0,0)', v.colors[1]]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={StyleSheet.absoluteFill}
          />
        </View>
        <View pointerEvents="none" style={[styles.topLight, { borderTopLeftRadius: radius, borderTopRightRadius: radius }]} />
        {sheen && !reduced && width > 0 ? (
          <Animated.View pointerEvents="none" style={[styles.sheen, { width: width * 0.35 }, sheenStyle]}>
            <LinearGradient
              colors={['rgba(255,255,255,0)', 'rgba(255,255,255,0.10)', 'rgba(255,255,255,0)']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={StyleSheet.absoluteFill}
            />
          </Animated.View>
        ) : null}
        <View style={{ padding }}>{children}</View>
      </View>
    </View>
  );
}

function glow(color: string): ViewStyle {
  return Platform.select<ViewStyle>({
    ios: { shadowColor: color, shadowOpacity: 0.22, shadowRadius: 10, shadowOffset: { width: 0, height: 6 } },
    default: { elevation: 4, shadowColor: color },
  })!;
}

const styles = StyleSheet.create({
  linesBox: { position: 'absolute', top: 0, left: 0, width: '60%', height: '65%' },
  lines: { ...StyleSheet.absoluteFillObject, opacity: 0.5 },
  topLight: { position: 'absolute', top: 0, left: 0, right: 0, height: 1, backgroundColor: 'rgba(255,255,255,0.12)' },
  sheen: { position: 'absolute', top: -20, bottom: -20, left: 0 },
});
