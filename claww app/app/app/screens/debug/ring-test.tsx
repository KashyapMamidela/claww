import React from 'react';
import { ScrollView, Text, View } from 'react-native';
import { ProgressRing } from '../../../components/ui/ProgressRing';
import { COLORS, FONT } from '../../../lib/theme';

/**
 * Dev-only visual check for the Apple-Activity-style ProgressRing overflow
 * behavior — not linked from any nav, reached by URL only
 * (/screens/debug/ring-test). Covers the four cases the spec asked to be
 * confirmed by eye: a real overflow value from production data, exactly
 * 100%, a plain sub-100% arc, and a large multi-lap overflow.
 */
const CASES: { label: string; pct: number }[] = [
  { label: '121.9% — real data (3000/2461 kcal)', pct: 121.9 },
  { label: '100% exact', pct: 100 },
  { label: '60% — no overflow', pct: 60 },
  { label: '250% — large overflow', pct: 250 },
];

export default function RingTestScreen() {
  return (
    <ScrollView style={{ flex: 1, backgroundColor: '#080808' }} contentContainerStyle={{ padding: 24, gap: 32 }}>
      {CASES.map((c) => (
        <View key={c.label} style={{ alignItems: 'center', gap: 12 }}>
          <Text style={{ color: '#fff', fontFamily: FONT, fontSize: 13 }}>{c.label}</Text>
          <ProgressRing size={200} rings={[{ r: 80, strokeWidth: 18, color: COLORS.green, pct: c.pct }]}>
            <Text style={{ color: '#fff', fontFamily: FONT, fontSize: 20, fontWeight: '900' }}>{c.pct}%</Text>
          </ProgressRing>
        </View>
      ))}
    </ScrollView>
  );
}
