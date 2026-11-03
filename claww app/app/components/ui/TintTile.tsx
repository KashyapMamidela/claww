import React from 'react';
import { Platform, StyleProp, StyleSheet, View, ViewStyle } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import Svg, { Circle, Defs, Pattern, Rect } from 'react-native-svg';
import { tint } from '../../lib/theme';
import { Icon } from './Icon';
import { Surface } from './Surface';

// NG PHASE 1 (build plan 5.3): a Surface that belongs to one area (steps, water,
// recovery...). Glow of the area colour from the top-right, a border tinted with
// it, a coloured under-glow, a faint dot texture top-right and the area's icon as
// a big watermark. Colour means data: use it only for that area's tile.

export interface TintTileProps {
  color: string;
  /** Icon name from components/ui/Icon, drawn large and faint bottom-right. */
  watermark?: string;
  children?: React.ReactNode;
  style?: StyleProp<ViewStyle>;
  padding?: number;
  radius?: number;
  accessibilityLabel?: string;
}

export function TintTile({ color, watermark, children, style, padding = 14, radius = 18, accessibilityLabel }: TintTileProps) {
  const decoration = (
    <>
      <LinearGradient
        pointerEvents="none"
        colors={[tint(color, 0.24), tint(color, 0)]}
        start={{ x: 1, y: 0 }}
        end={{ x: 0.35, y: 0.75 }}
        style={StyleSheet.absoluteFill}
      />
      <Svg pointerEvents="none" width={56} height={40} style={styles.dots}>
        <Defs>
          <Pattern id="dots" width={8} height={8} patternUnits="userSpaceOnUse">
            <Circle cx={2} cy={2} r={1} fill={tint(color, 0.35)} />
          </Pattern>
        </Defs>
        <Rect width={56} height={40} fill="url(#dots)" />
      </Svg>
      {watermark ? (
        <View pointerEvents="none" style={styles.watermark}>
          <Icon name={watermark} size={64} color={tint(color, 0.09)} strokeWidth={1.5} />
        </View>
      ) : null}
    </>
  );

  return (
    <Surface
      style={[glow(color), style]}
      shadow={false}
      padding={padding}
      radius={radius}
      borderColor={tint(color, 0.35)}
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
    ios: { shadowColor: color, shadowOpacity: 0.35, shadowRadius: 14, shadowOffset: { width: 0, height: 8 } },
    default: { elevation: 8, shadowColor: color },
  })!;
}

const styles = StyleSheet.create({
  dots: { position: 'absolute', top: 6, right: 6 },
  watermark: { position: 'absolute', right: -8, bottom: -10 },
});
