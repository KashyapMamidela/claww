import React from 'react';
import { StyleProp, StyleSheet, View, ViewStyle } from 'react-native';
import { BlurView } from 'expo-blur';
import { LinearGradient } from 'expo-linear-gradient';

// Glass, second pass. The first version had a bright rim and a visible sheen, so it read as "effect". This one is
// built to disappear: it should look like a dark pane of smoked glass with a single catch of light on its top edge.
//
//  1. Blur   : light, just enough that text behind it turns into soft shapes.
//  2. Body   : a smoked tint (dark, slightly cool) that carries the contrast, plus a gentle darkening toward the bottom
//              so the pane has thickness.
//  3. Edge   : a hairline that is lit only along the top (where light would land) and almost invisible elsewhere,
//              and a faint outer line so the pane separates from a dark page without a glow.
//
// No coloured glow, no big shadow. Use it only for things that float over content: tab bar, sheets, toasts.

export interface GlassProps {
  radius?: number;
  /** 0-100. Kept low on purpose. */
  blur?: number;
  /** Smoked body tint. */
  tint?: string;
  style?: StyleProp<ViewStyle>;
  children?: React.ReactNode;
  /** Round only the top corners (sheets). */
  topOnly?: boolean;
}

export function Glass({ radius = 24, blur = 22, tint = 'rgba(16,17,21,0.72)', style, children, topOnly = false }: GlassProps) {
  const corners: ViewStyle = topOnly ? { borderTopLeftRadius: radius, borderTopRightRadius: radius } : { borderRadius: radius };
  return (
    <View
      style={[
        corners,
        // A tight, neutral drop shadow: it lifts the pane without a halo spilling onto what is around it.
        { boxShadow: '0px 8px 24px -12px rgba(0,0,0,0.9), 0px 0px 0px 0.5px rgba(0,0,0,0.6)' } as ViewStyle,
        style,
      ]}
    >
      <View style={[{ flexGrow: 1, overflow: 'hidden' }, corners]}>
        <BlurView intensity={blur} tint="dark" experimentalBlurMethod="dimezisBlurView" blurReductionFactor={3} style={StyleSheet.absoluteFill} />
        <View style={[StyleSheet.absoluteFill, { backgroundColor: tint }]} />
        {/* Thickness: the pane gets a little darker toward its bottom edge. */}
        <LinearGradient pointerEvents="none" colors={['rgba(255,255,255,0.035)', 'rgba(0,0,0,0)', 'rgba(0,0,0,0.18)']} locations={[0, 0.5, 1]} style={StyleSheet.absoluteFill} />
        {/* Edge: a hairline, lit along the top only. */}
        <View pointerEvents="none" style={[StyleSheet.absoluteFill, corners, { borderWidth: StyleSheet.hairlineWidth, borderColor: 'rgba(255,255,255,0.07)' }]} />
        <LinearGradient
          pointerEvents="none"
          colors={['rgba(255,255,255,0)', 'rgba(255,255,255,0.28)', 'rgba(255,255,255,0)']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={{ position: 'absolute', top: 0, left: radius * 0.6, right: radius * 0.6, height: StyleSheet.hairlineWidth * 2 }}
        />
        {children}
      </View>
    </View>
  );
}
