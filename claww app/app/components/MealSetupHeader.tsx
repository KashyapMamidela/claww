import React from 'react';
import { Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { AREA_COLORS, COLORS, FONT, BG, bg } from '../lib/theme';
import { Icon } from './ui/Icon';
import { PressScale } from './ui/PressScale';
import { Surface } from './ui/Surface';

// The header shared by the three meal-setup steps: a back tile and a progress tile (the same two tiles every setup
// screen uses), then the title and "Step n of 3". Green, because food is green.
export function MealSetupHeader({ step, sub, onBack }: { step: 1 | 2 | 3; sub: string; onBack?: () => void }) {
  const router = useRouter();
  const G = AREA_COLORS.nutrition;
  return (
    <View style={{ paddingHorizontal: 20, paddingTop: 12, paddingBottom: 8, gap: 14 }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
        <PressScale onPress={onBack ?? (() => router.back())} accessibilityRole="button" accessibilityLabel="Go back" hitSlop={6}>
          <Surface radius={14} padding={0} style={{ width: 44, height: 44 }}>
            <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
              <Icon name="chevron-left" size={20} color={COLORS.fg} />
            </View>
          </Surface>
        </PressScale>
        <Surface radius={14} padding={0} style={{ flex: 1, height: 44 }}>
          <View style={{ flex: 1, flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 14 }} accessibilityRole="progressbar" accessibilityLabel={`Step ${step} of 3`}>
            {[1, 2, 3].map((n) => (
              <View
                key={n}
                style={{
                  flex: 1,
                  height: 6,
                  borderRadius: 3,
                  backgroundColor: n < step ? G : n === step ? 'rgba(255,255,255,0.55)' : 'rgba(255,255,255,0.10)',
                  boxShadow: n < step ? `0px 0px 8px ${G}99` : undefined,
                }}
              />
            ))}
          </View>
        </Surface>
      </View>
      <View>
        <Text style={{ color: COLORS.fg, fontSize: 20, fontFamily: BG[800] }}>Set up your meals</Text>
        <Text style={{ color: COLORS.textMuted, fontSize: 13, fontFamily: BG[400] }}>
          Step {step} of 3 · {sub}
        </Text>
      </View>
    </View>
  );
}
