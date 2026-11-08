import React from 'react';
import { Surface } from '../ui/Surface';
import { Text, View } from 'react-native';
import { COLORS, FONT, BG, bg } from '../../lib/theme';
import { Icon } from '../ui/Icon';
import { PressScale } from '../ui/PressScale';

export interface TrackerCardProps {
  label: string;
  /** The area color from AREA_COLORS: it goes on the label and the data, never on the card. */
  color: string;
  right?: string;
  children: React.ReactNode;
  onPress?: () => void;
  /** Left accent stripe instead of a header label row (used by the insight card). */
  accentStripe?: boolean;
}

/** A black card with a colored section label; tapping opens the card's full-screen chart (V2 PHASE 9). */
export function TrackerCard({ label, color, right, children, onPress, accentStripe }: TrackerCardProps) {
  const body = (
    <Surface
      radius={16}
      padding={0}
      grain={0.08}
      decoration={accentStripe ? <View pointerEvents="none" style={{ position: 'absolute', left: 0, top: 0, bottom: 0, width: 3, backgroundColor: color }} /> : undefined}
    >
    <View style={{ paddingHorizontal: 14, paddingVertical: 13, gap: 10 }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
        <Text style={{ color, fontSize: 11, letterSpacing: 0.9, fontFamily: BG[800] }}>{label}</Text>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
          {right ? <Text style={{ color: COLORS.textMuted, fontSize: 11, fontFamily: BG[400] }}>{right}</Text> : null}
          {onPress ? <Icon name="chevron-right" size={13} color="#52525B" /> : null}
        </View>
      </View>
      {children}
    </View>
    </Surface>
  );
  if (!onPress) return body;
  return (
    <PressScale onPress={onPress} scaleTo={0.985} accessibilityRole="button" accessibilityLabel={`${label}. Open chart.`}>
      {body}
    </PressScale>
  );
}

export function Empty({ children }: { children: string }) {
  return <Text style={{ color: COLORS.textMuted, fontSize: 13, lineHeight: 18, fontFamily: BG[400] }}>{children}</Text>;
}

export function Headline({ children, sub }: { children: string; sub?: string }) {
  return (
    <Text style={{ color: '#fff', fontSize: 15, fontFamily: BG[800] }}>
      {children}
      {sub ? <Text style={{ color: COLORS.textMuted, fontSize: 13, fontWeight: '500' }}>{`  ${sub}`}</Text> : null}
    </Text>
  );
}
