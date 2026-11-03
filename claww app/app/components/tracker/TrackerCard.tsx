import React from 'react';
import { Text, View } from 'react-native';
import { FONT } from '../../lib/theme';
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
    <View
      style={{
        backgroundColor: '#151517',
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.13)',
        borderLeftWidth: accentStripe ? 3 : 1,
        borderLeftColor: accentStripe ? color : 'rgba(255,255,255,0.13)',
        borderRadius: 16,
        paddingHorizontal: 14,
        paddingVertical: 13,
        gap: 10,
      }}
    >
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
        <Text style={{ color, fontSize: 10, fontWeight: '800', letterSpacing: 0.9, fontFamily: FONT }}>{label}</Text>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
          {right ? <Text style={{ color: '#71717A', fontSize: 10.5, fontFamily: FONT }}>{right}</Text> : null}
          {onPress ? <Icon name="chevron-right" size={13} color="#52525B" /> : null}
        </View>
      </View>
      {children}
    </View>
  );
  if (!onPress) return body;
  return (
    <PressScale onPress={onPress} scaleTo={0.985} accessibilityRole="button" accessibilityLabel={`${label}. Open chart.`}>
      {body}
    </PressScale>
  );
}

export function Empty({ children }: { children: string }) {
  return <Text style={{ color: '#71717A', fontSize: 12, lineHeight: 18, fontFamily: FONT }}>{children}</Text>;
}

export function Headline({ children, sub }: { children: string; sub?: string }) {
  return (
    <Text style={{ color: '#fff', fontSize: 15, fontWeight: '800', fontFamily: FONT }}>
      {children}
      {sub ? <Text style={{ color: '#71717A', fontSize: 12, fontWeight: '500' }}>{`  ${sub}`}</Text> : null}
    </Text>
  );
}
