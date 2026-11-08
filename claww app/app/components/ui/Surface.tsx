import React from 'react';
import { Image, Platform, StyleProp, StyleSheet, View, ViewStyle } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { SURFACES } from '../../lib/theme';

// NG PHASE 1 (build plan 5.3): the textured card. Vertical gradient, 1 px border,
// a 1 px top light, a tiled grain image (pre-rendered, so it's cheap on low-end
// Android: no live filters, no blur), radius 20 and a soft drop shadow.
//
// The shadow sits on an outer view and the clipping on an inner one: on iOS,
// overflow: 'hidden' on the same view would cut the shadow off.

const NOISE = require('../../assets/textures/noise-256.png');

export interface SurfaceProps {
  children?: React.ReactNode;
  style?: StyleProp<ViewStyle>;
  /** Inner padding, default 16. */
  padding?: number;
  radius?: number;
  /** Grain strength 0..1, default 0.1. 0 skips the image (use inside long lists). */
  grain?: number;
  /** Border colour; TintTile passes the area colour. */
  borderColor?: string;
  /** Gradient stops, top to bottom. */
  colors?: readonly [string, string, ...string[]];
  /** Drop shadow (and Android elevation); off for cards nested inside cards. */
  shadow?: boolean;
  /** Extra layers drawn above the gradient and grain, below the content (glows, watermarks). */
  decoration?: React.ReactNode;
  accessibilityLabel?: string;
}

export function Surface({
  children,
  style,
  padding = 16,
  radius = 20,
  grain = 0.1,
  borderColor = SURFACES.cardBorder,
  colors = [SURFACES.cardTop, SURFACES.cardBottom],
  shadow = true,
  decoration,
  accessibilityLabel,
}: SurfaceProps) {
  return (
    <View style={[{ borderRadius: radius }, shadow && styles.shadow, style]} accessibilityLabel={accessibilityLabel}>
      <View style={{ borderRadius: radius, overflow: 'hidden', borderWidth: 1, borderColor, flexGrow: 1 }}>
        <LinearGradient colors={colors} style={StyleSheet.absoluteFill} />
        {grain > 0 ? <Image source={NOISE} resizeMode="repeat" style={[StyleSheet.absoluteFill, { opacity: grain }]} /> : null}
        <View pointerEvents="none" style={[styles.topLight, { borderTopLeftRadius: radius, borderTopRightRadius: radius }]} />
        {decoration}
        <View style={{ padding, flexGrow: 1 }}>{children}</View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  topLight: { position: 'absolute', top: 0, left: 0, right: 0, height: 1, backgroundColor: SURFACES.topLight },
  shadow: Platform.select<ViewStyle>({
    ios: { shadowColor: '#000', shadowOpacity: 0.45, shadowRadius: 14, shadowOffset: { width: 0, height: 8 } },
    default: { elevation: 6, shadowColor: '#000' },
  }),
});
