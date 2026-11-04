import React from 'react';
import { Text, TouchableOpacity, View } from 'react-native';
import { useRouter } from 'expo-router';
import { COLORS, FONT } from '../lib/theme';
import { Icon } from './ui/Icon';

// NG PHASE 6: the header shared by the three meal-setup steps (screens 11 to 13): back, title, "Step n of 3" and
// three progress segments.

export function MealSetupHeader({ step, sub, onBack }: { step: 1 | 2 | 3; sub: string; onBack?: () => void }) {
  const router = useRouter();
  return (
    <View style={{ paddingHorizontal: 20, paddingTop: 12, paddingBottom: 6 }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 14 }}>
        <TouchableOpacity
          onPress={onBack ?? (() => router.back())}
          accessibilityRole="button"
          accessibilityLabel="Go back"
          style={{ width: 44, height: 44, alignItems: 'center', justifyContent: 'center' }}
        >
          <Icon name="chevron-left" size={22} color={COLORS.fg} />
        </TouchableOpacity>
        <View style={{ flex: 1 }}>
          <Text style={{ color: COLORS.fg, fontSize: 20, fontWeight: '800', fontFamily: FONT }}>Set up your meals</Text>
          <Text style={{ color: COLORS.textMuted, fontSize: 13, fontFamily: FONT }}>
            Step {step} of 3 · {sub}
          </Text>
        </View>
      </View>
      <View style={{ flexDirection: 'row', gap: 8, marginTop: 10 }} accessibilityLabel={`Step ${step} of 3`}>
        {[1, 2, 3].map((n) => (
          <View key={n} style={{ flex: 1, height: 3, borderRadius: 2, backgroundColor: n <= step ? COLORS.green : 'rgba(255,255,255,0.10)' }} />
        ))}
      </View>
    </View>
  );
}
