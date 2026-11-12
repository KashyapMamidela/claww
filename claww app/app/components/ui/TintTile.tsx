import React from 'react';
import { Platform, StyleProp, StyleSheet, View, ViewStyle } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import Svg, { Circle, Defs, Pattern, Rect } from 'react-native-svg';
import { tint } from '../../lib/theme';
import { Icon } from './Icon';
import { Stamp } from './Stamp';
import { Surface } from './Surface';

// NG PHASE 1 (build plan 5.3): a Surface that belongs to one area (steps, water,
// recovery...). Glow of the area colour from the top-right, a border tinted with
// it, a coloured under-glow, a faint dot texture top-right and the area's icon as
// a big watermark. Colour means data: use it only for that area's tile.

export interface TintTileProps {
  color: string;
  /** Icon name from components/ui/Icon, drawn large and faint bottom-right. */
  watermark?: string;
  /** Stamp size; 64 fits a small tile, bigger cards want about 96. */
  watermarkSize?: number;
  children?: React.ReactNode;
  style?: StyleProp<ViewStyle>;
  padding?: number;
  radius?: number;
  accessibilityLabel?: string;
}

// Polish step 8 cut the dot grid and the watermark; the watermark is back as a Stamp (user request, 2026-11-12).
export function TintTile({ color, watermark, watermarkSize = 64, children, style, padding = 14, radius = 18, accessibilityLabel }: TintTileProps) {
  const decoration = (
    <>
      <LinearGradient
        pointerEvents="none"
        colors={[tint(color, 0.24), tint(color, 0)]}
        start={{ x: 1, y: 0 }}
        end={{ x: 0.35, y: 0.75 }}
        style={StyleSheet.absoluteFill}
      />
      {watermark ? <Stamp name={watermark} color={color} size={watermarkSize} right={watermarkSize > 64 ? -14 : -10} bottom={watermarkSize > 64 ? -18 : -12} /> : null}
    </>
  );

  return (
    <Surface
      // Neutral edge and no coloured under-glow: the area colour lives in the icon and the bar, so a row of tiles
      // reads as one calm group instead of three glowing outlines.
      style={style}
      shadow={false}
      padding={padding}
      radius={radius}
      borderColor="rgba(255,255,255,0.08)"
      decoration={decoration}
      accessibilityLabel={accessibilityLabel}
    >
      {children}
    </Surface>
  );
}

// The coloured under-glow. Android draws a tinted elevation shadow (API 28+);
// older Androids fall back to a plain shadow, which still reads as depth.
function glow(color: string): ViewStyle {
  return Platform.select<ViewStyle>({
    ios: { shadowColor: color, shadowOpacity: 0.18, shadowRadius: 8, shadowOffset: { width: 0, height: 4 } },
    default: { elevation: 3, shadowColor: color },
  })!;
}


