import React from 'react';
import { Text, View } from 'react-native';
import { COLORS, FONT } from '../lib/theme';
import { Surface } from './ui/Surface';
import { PressScale } from './ui/PressScale';
import { Icon } from './ui/Icon';

// NG PHASE 2: basic details are asked once (onboarding, or the first setup that needs them)
// and then shown, not asked again: "From your profile · Edit" (UX rule 2: ask only to correct).

export interface ProfileBasicsCardProps {
  /** "175 cm · 70 kg · 28 yrs" */
  summary: string;
  accent: string;
  onEdit: () => void;
}

export function ProfileBasicsCard({ summary, accent, onEdit }: ProfileBasicsCardProps) {
  return (
    <Surface padding={16} accessibilityLabel={`From your profile: ${summary}`}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
        <View style={{ flex: 1, gap: 4 }}>
          <Text style={{ color: COLORS.textMuted, fontSize: 11, fontWeight: '700', letterSpacing: 0.9, fontFamily: FONT }}>FROM YOUR PROFILE</Text>
          <Text style={{ color: COLORS.fg, fontSize: 18, fontWeight: '800', fontFamily: FONT, fontVariant: ['tabular-nums'] }}>{summary}</Text>
        </View>
        <PressScale onPress={onEdit} accessibilityRole="button" accessibilityLabel="Edit your details">
          <View style={{ minHeight: 44, minWidth: 64, paddingHorizontal: 14, borderRadius: 12, borderWidth: 1, borderColor: COLORS.borderStrong, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
            <Icon name="pencil" size={14} color={accent} />
            <Text style={{ color: accent, fontSize: 13, fontWeight: '700', fontFamily: FONT }}>Edit</Text>
          </View>
        </PressScale>
      </View>
    </Surface>
  );
}
