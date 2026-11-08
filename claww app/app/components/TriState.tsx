import React from 'react';
import { Pressable, Text, View } from 'react-native';
import { COLORS, FONT } from '../lib/theme';
import type { Availability } from '../lib/resourceDefaults';

// NG PHASE 6: Yes / Sometimes / No for one food (screen 12). Yes is green, Sometimes amber, No grey, so a glance
// down the list reads the whole picture. 44 px tall options; the selected one carries its colour and bold text.

const OPTIONS: { value: Availability; label: string; bg: string }[] = [
  { value: 'yes', label: 'Yes', bg: '#15803D' },
  { value: 'sometimes', label: 'Sometimes', bg: '#B45309' },
  { value: 'no', label: 'No', bg: '#3F3F46' },
];

export function TriState({ value, onChange, label }: { value: Availability; onChange: (v: Availability) => void; label: string }) {
  return (
    <View
      accessibilityRole="radiogroup"
      accessibilityLabel={label}
      style={{ flexDirection: 'row', backgroundColor: 'rgba(0,0,0,0.45)', borderRadius: 14, padding: 3, gap: 2, borderWidth: 1, borderColor: COLORS.border }}
    >
      {OPTIONS.map((o) => {
        const on = o.value === value;
        return (
          <Pressable
            key={o.value}
            onPress={() => onChange(o.value)}
            accessibilityRole="radio"
            accessibilityState={{ selected: on }}
            accessibilityLabel={`${label}: ${o.label}`}
            style={{ minHeight: 44, minWidth: o.value === 'sometimes' ? 78 : 44, paddingHorizontal: 8, borderRadius: 12, alignItems: 'center', justifyContent: 'center', backgroundColor: on ? o.bg : 'transparent' }}
          >
            <Text style={{ color: on ? '#fff' : COLORS.textMuted, fontSize: 13, fontWeight: on ? '800' : '600', fontFamily: FONT }}>{o.label}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}
