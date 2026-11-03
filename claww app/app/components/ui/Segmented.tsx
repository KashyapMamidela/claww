import React from 'react';
import { Pressable, Text, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { COLORS, FONT } from '../../lib/theme';
import { Well } from './Well';

// NG PHASE 1 (build plan 5.4): a Well with 3 px padding and 38 px buttons (44 px tall in
// total, so every option is a full touch target). The active option takes the screen's
// accent gradient. Changing the value doesn't animate: it's a direct, frequent control.

export interface SegmentedOption<T extends string> {
  value: T;
  label: string;
}

export interface SegmentedProps<T extends string> {
  options: SegmentedOption<T>[];
  value: T | null;
  onChange: (value: T) => void;
  accent?: string;
  accentDeep?: string;
  accessibilityLabel?: string;
}

export function Segmented<T extends string>({ options, value, onChange, accent = COLORS.blue, accentDeep = COLORS.blueDeep, accessibilityLabel }: SegmentedProps<T>) {
  return (
    <Well>
      <View style={{ flexDirection: 'row', gap: 3 }} accessibilityRole="radiogroup" accessibilityLabel={accessibilityLabel}>
        {options.map((o) => {
          const active = o.value === value;
          const label = (
            <Text
              numberOfLines={1}
              style={{ color: active ? '#fff' : COLORS.textMuted, fontSize: 13, fontWeight: active ? '800' : '600', fontFamily: FONT }}
            >
              {o.label}
            </Text>
          );
          return (
            <Pressable
              key={o.value}
              onPress={() => onChange(o.value)}
              style={{ flex: 1 }}
              accessibilityRole="radio"
              accessibilityState={{ selected: active }}
              accessibilityLabel={o.label}
            >
              {active ? (
                <LinearGradient
                  colors={[accentDeep, accent]}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  style={{ height: 38, borderRadius: 11, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 8, boxShadow: `0px 3px 8px ${accent}40` }}
                >
                  {label}
                </LinearGradient>
              ) : (
                <View style={{ height: 38, borderRadius: 11, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 8 }}>{label}</View>
              )}
            </Pressable>
          );
        })}
      </View>
    </Well>
  );
}
