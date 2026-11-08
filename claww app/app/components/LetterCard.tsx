import React, { forwardRef } from 'react';
import { Text, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { COLORS, FONT, FONT_HAND, SURFACES } from '../lib/theme';
import { SHARE_HEIGHT, SHARE_WIDTH } from '../lib/shareCard';
import type { LetterNumber } from '../lib/letter';

// Polish step 10: the Sunday letter, laid out at its real 1080 x 1920 pixels and captured like the session share card.

export interface LetterData {
  name: string;
  dateText: string;
  line: string;
  numbers: LetterNumber[];
  changes: string[];
}

export const LetterCard = forwardRef<View, { data: LetterData }>(function LetterCard({ data }, ref) {
  return (
    <View ref={ref} collapsable={false} style={{ width: SHARE_WIDTH, height: SHARE_HEIGHT, backgroundColor: COLORS.bg, overflow: 'hidden' }}>
      <LinearGradient colors={[...SURFACES.heroGreen]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={{ position: 'absolute', left: 0, top: 0, right: 0, bottom: 0 }} />
      <View style={{ flex: 1, padding: 90, justifyContent: 'space-between' }}>
        <View>
          <Text style={{ color: COLORS.fg, fontSize: 64, fontWeight: '900', fontVariant: ['tabular-nums'], letterSpacing: 2, fontFamily: FONT }}>CLAWW</Text>
          <Text style={{ color: 'rgba(255,255,255,0.75)', fontSize: 44, marginTop: 8, fontFamily: FONT }}>{data.dateText}</Text>
        </View>

        <View style={{ gap: 28 }}>
          <Text style={{ color: 'rgba(255,255,255,0.8)', fontSize: 44, fontWeight: '800', letterSpacing: 3, fontFamily: FONT }}>YOUR WEEK, MARKED UP</Text>
          <Text style={{ color: COLORS.fg, fontSize: 112, fontWeight: '900', fontVariant: ['tabular-nums'], letterSpacing: -3, lineHeight: 122, fontFamily: FONT }}>{data.line}</Text>
        </View>

        <View style={{ gap: 28 }}>
          <View style={{ flexDirection: 'row', gap: 28 }}>
            {data.numbers.map((n) => (
              <View key={n.label} style={{ flex: 1, borderRadius: 40, borderWidth: 2, borderColor: 'rgba(255,255,255,0.22)', backgroundColor: 'rgba(255,255,255,0.10)', padding: 30, gap: 8 }}>
                <Text style={{ color: COLORS.fg, fontSize: 76, fontWeight: '900', fontVariant: ['tabular-nums'], letterSpacing: -2, fontFamily: FONT }}>{n.value}</Text>
                <Text style={{ color: 'rgba(255,255,255,0.78)', fontSize: 34, lineHeight: 40, fontFamily: FONT }}>{n.label}</Text>
              </View>
            ))}
          </View>
          {data.changes.length > 0 ? (
            <View style={{ borderRadius: 40, borderWidth: 2, borderColor: 'rgba(255,255,255,0.22)', backgroundColor: 'rgba(0,0,0,0.25)', padding: 40, gap: 14 }}>
              <Text style={{ color: 'rgba(255,255,255,0.7)', fontSize: 34, fontFamily: FONT }}>What changed</Text>
              {data.changes.map((c) => (
                <Text key={c} style={{ color: COLORS.pen, fontSize: 64, fontFamily: FONT_HAND }}>{c}</Text>
              ))}
            </View>
          ) : null}
        </View>

        <Text style={{ color: 'rgba(255,255,255,0.6)', fontSize: 34, fontFamily: FONT }}>{data.name ? `${data.name}'s week, with CLAWW` : 'A week with CLAWW'}</Text>
      </View>
    </View>
  );
});
