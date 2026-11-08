import React from 'react';
import { StyleProp, StyleSheet, View, ViewStyle } from 'react-native';
import { BlurView } from 'expo-blur';
import { LinearGradient } from 'expo-linear-gradient';

// Premium glass, kept calm on purpose: three ingredients and no more.
//  1. a gentle blur of what is behind it (not a frosted wall),
//  2. a rim: a 1 px edge that is bright at the top-left and fades toward the bottom-right, like light on a glass edge,
//  3. a soft tint with a faint top highlight, so the panel reads as a surface and keeps text legible.
// Use it only where something floats over content: the tab bar, the title bar, sheets and toasts.

export interface GlassProps {
  radius?: number;
  /** 0-100. Default is light on purpose. */
  blur?: number;
  /** Base tint, darker means more legible. */
  tint?: string;
  style?: StyleProp<ViewStyle>;
  children?: React.ReactNode;
  /** Round only the top corners (sheets). */
  topOnly?: boolean;
}

export function Glass({ radius = 24, blur = 30, tint = 'rgba(18,18,22,0.58)', style, children, topOnly = false }: GlassProps) {
  const corners: ViewStyle = topOnly ? { borderTopLeftRadius: radius, borderTopRightRadius: radius } : { borderRadius: radius };
  return (
    <View style={[{ boxShadow: '0px 18px 36px -14px rgba(0,0,0,0.85)' } as ViewStyle, corners, style]}>
      {/* Rim: a gradient behind the panel, showing through a 1 px gap. */}
      <LinearGradient
        pointerEvents="none"
        colors={['rgba(255,255,255,0.38)', 'rgba(255,255,255,0.06)', 'rgba(255,255,255,0.18)']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={[StyleSheet.absoluteFill, corners]}
      />
      <View style={[{ margin: 1, overflow: 'hidden', flexGrow: 1 }, topOnly ? { borderTopLeftRadius: radius - 1, borderTopRightRadius: radius - 1 } : { borderRadius: radius - 1 }]}>
        <BlurView intensity={blur} tint="dark" experimentalBlurMethod="dimezisBlurView" blurReductionFactor={3} style={StyleSheet.absoluteFill} />
        <View style={[StyleSheet.absoluteFill, { backgroundColor: tint }]} />
        <LinearGradient pointerEvents="none" colors={['rgba(255,255,255,0.10)', 'rgba(255,255,255,0)']} start={{ x: 0.5, y: 0 }} end={{ x: 0.5, y: 0.45 }} style={StyleSheet.absoluteFill} />
        {children}
      </View>
    </View>
  );
}
