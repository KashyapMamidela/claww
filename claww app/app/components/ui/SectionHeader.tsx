import React from 'react';
import { Text, View } from 'react-native';
import { COLORS, BG } from '../../lib/theme';

/**
 * A section's heading, in sentence case with weight for emphasis ("Today's plan"). Replaces the tracked, all-caps
 * green labels for headings; small capitals stay only for metadata like a date. `right` puts a quiet detail on the
 * same line (e.g. "2,469 kcal · P 138 g").
 */
export function SectionHeader({ children, right }: { children: React.ReactNode; right?: React.ReactNode }) {
  return (
    <View style={{ flexDirection: 'row', alignItems: 'baseline', justifyContent: 'space-between', gap: 10 }} accessibilityRole="header">
      <Text style={{ color: COLORS.fg, fontSize: 19, letterSpacing: -0.2, fontFamily: BG[800], flexShrink: 1 }}>{children}</Text>
      {typeof right === 'string' ? <Text style={{ color: COLORS.textMuted, fontSize: 13, fontVariant: ['tabular-nums'], fontFamily: BG[400] }}>{right}</Text> : right ?? null}
    </View>
  );
}
