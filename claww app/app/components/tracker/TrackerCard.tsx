import React from 'react';
import { Text, View } from 'react-native';
import { COLORS, BG } from '../../lib/theme';
import { Icon } from '../ui/Icon';
import { PressScale } from '../ui/PressScale';
import { TintTile } from '../ui/TintTile';

export interface TrackerCardProps {
  label: string;
  /** The area color from AREA_COLORS: the glow, the label dot and the data. */
  color: string;
  right?: string;
  children: React.ReactNode;
  onPress?: () => void;
  /** The area's icon, stamped large and faint in the corner like the cards above it. */
  stamp?: string;
}

/**
 * A Progress card, built like the "This week" cards above it: the area's glow, its stamp in the corner, a dot and a
 * label. Tapping opens the card's full-screen chart (V2 PHASE 9).
 */
export function TrackerCard({ label, color, right, children, onPress, stamp }: TrackerCardProps) {
  const body = (
    <TintTile color={color} watermark={stamp} watermarkSize={96} padding={16} radius={20}>
      <View style={{ gap: 12 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, flexShrink: 1 }}>
            <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: color }} />
            <Text numberOfLines={1} style={{ color, fontSize: 13, letterSpacing: 0.9, fontFamily: BG[800] }}>{label}</Text>
          </View>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
            {right ? <Text style={{ color: COLORS.textMuted, fontSize: 13, fontFamily: BG[400] }}>{right}</Text> : null}
            {onPress ? <Icon name="chevron-right" size={15} color={COLORS.textMuted} /> : null}
          </View>
        </View>
        {children}
      </View>
    </TintTile>
  );
  if (!onPress) return body;
  return (
    <PressScale onPress={onPress} scaleTo={0.985} accessibilityRole="button" accessibilityLabel={`${label}. Open chart.`}>
      {body}
    </PressScale>
  );
}

export function Empty({ children }: { children: string }) {
  return <Text style={{ color: COLORS.textMuted, fontSize: 15, lineHeight: 21, fontFamily: BG[400] }}>{children}</Text>;
}

export function Headline({ children, sub }: { children: string; sub?: string }) {
  return (
    <Text style={{ color: '#fff', fontSize: 17, fontFamily: BG[800] }}>
      {children}
      {sub ? <Text style={{ color: COLORS.textMuted, fontSize: 15, fontWeight: '500' }}>{`  ${sub}`}</Text> : null}
    </Text>
  );
}
