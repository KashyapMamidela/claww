import React, { memo } from 'react';
import { Text, View } from 'react-native';
import { COLORS, FONT, BG, bg } from '../../lib/theme';
import { Hero } from '../ui/Hero';
import { Icon } from '../ui/Icon';

// The "Your plan" tile on the workout setup. Pure display, memoised: typing in the height and weight fields above it
// must not redraw its gradients, which is what made the screen lag.
export interface PlanTileProps {
  title: string;
  days: number;
  meta: string;
  chips: string[];
  nearest: string | null;
}

function PlanTileBase({ title, days, meta, chips, nearest }: PlanTileProps) {
  return (
    <Hero variant="blue" accessibilityLabel={`Your plan: ${title}, ${days} days a week`}>
      <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 12 }}>
        <View style={{ flex: 1 }}>
          <Text style={{ color: COLORS.textMuted, fontSize: 11, letterSpacing: 0.9, fontFamily: BG[700] }}>YOUR PLAN</Text>
          <Text style={{ color: COLORS.fg, fontSize: 22, fontVariant: ['tabular-nums'], letterSpacing: -0.4, marginTop: 6, fontFamily: BG[800] }}>{title}</Text>
          <Text style={{ color: COLORS.textMuted, fontSize: 15, marginTop: 4, fontFamily: BG[400] }}>{meta}</Text>
        </View>
        <View style={{ width: 52, height: 52, borderRadius: 16, backgroundColor: 'rgba(255,255,255,0.10)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.16)', alignItems: 'center', justifyContent: 'center' }}>
          <Icon name="dumbbell" size={26} color={COLORS.fg} />
        </View>
      </View>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 14 }}>
        {chips.map((t) => (
          <View key={t} style={{ borderRadius: 10, paddingHorizontal: 10, paddingVertical: 6, backgroundColor: 'rgba(255,255,255,0.10)' }}>
            <Text style={{ color: COLORS.fg, fontSize: 13, fontFamily: BG[700] }}>{t}</Text>
          </View>
        ))}
      </View>
      {nearest ? <Text style={{ color: COLORS.textMuted, fontSize: 13, marginTop: 12, lineHeight: 17, fontFamily: BG[400] }}>{nearest}</Text> : null}
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 14 }}>
        <Icon name="shield-check" size={16} color={COLORS.textMuted} />
        <Text style={{ color: COLORS.textMuted, fontSize: 13, flex: 1, fontFamily: BG[400] }}>Picked from trainer-reviewed plans, never generated</Text>
      </View>
    </Hero>
  );
}

export const PlanTile = memo(PlanTileBase, (a, b) => a.title === b.title && a.days === b.days && a.meta === b.meta && a.nearest === b.nearest && a.chips.join('|') === b.chips.join('|'));
