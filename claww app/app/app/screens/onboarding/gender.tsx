import React, { useState } from 'react';
import { Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { AREA_COLORS, COLORS, FONT, BG, bg } from '../../../lib/theme';
import { OnboardingTopBar } from '../../../components/OnboardingTopBar';
import { Icon } from '../../../components/ui/Icon';
import { PressScale } from '../../../components/ui/PressScale';
import { Surface } from '../../../components/ui/Surface';
import { TintTile } from '../../../components/ui/TintTile';

// Colours borrowed from the area palette so a picked card glows like every other picked card in the app.
const GENDERS = [
  { id: 'male', label: 'Male', color: AREA_COLORS.workouts },
  { id: 'female', label: 'Female', color: AREA_COLORS.streak },
  { id: 'other', label: 'Other', color: AREA_COLORS.engine },
] as const;

export default function OnboardingGender() {
  const router = useRouter();
  const { name, age } = useLocalSearchParams<{ name: string; age: string }>();
  const [gender, setGender] = useState<string | null>(null);

  const select = (id: string) => {
    setGender(id);
    setTimeout(() => {
      router.push({ pathname: '/screens/onboarding/goal', params: { name: name ?? '', age: age ?? '', gender: id } });
    }, 260);
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: COLORS.bg }}>
      <OnboardingTopBar step={2} totalSteps={6} accent={COLORS.blue} showBack />
      <View style={{ flex: 1, paddingHorizontal: 20, paddingTop: 32, paddingBottom: 20 }}>
        <Text style={{ color: COLORS.textMuted, fontSize: 13, fontFamily: BG[400] }}>Last thing about you</Text>
        <Text style={{ color: COLORS.fg, fontSize: 34, fontVariant: ['tabular-nums'], letterSpacing: -0.8, lineHeight: 38, marginTop: 6, fontFamily: BG[800] }}>How do you identify?</Text>
        <Text style={{ color: COLORS.textMuted, fontSize: 15, marginTop: 8, marginBottom: 26, lineHeight: 22, fontFamily: BG[400] }}>It tunes recovery and calorie targets to you.</Text>

        <View style={{ gap: 12 }} accessibilityRole="radiogroup">
          {GENDERS.map((g) => {
            const on = gender === g.id;
            const body = (
              <View style={{ minHeight: 40, flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                <Text style={{ color: COLORS.fg, fontSize: 17, flex: 1, fontFamily: BG[800] }}>{g.label}</Text>
                {on ? (
                  <View style={{ width: 24, height: 24, borderRadius: 12, backgroundColor: g.color, alignItems: 'center', justifyContent: 'center' }}>
                    <Icon name="check" size={14} color={COLORS.bg} strokeWidth={3} />
                  </View>
                ) : null}
              </View>
            );
            return (
              <PressScale key={g.id} onPress={() => select(g.id)} accessibilityRole="radio" accessibilityState={{ selected: on }} accessibilityLabel={g.label}>
                {on ? <TintTile color={g.color} padding={18}>{body}</TintTile> : <Surface padding={18}>{body}</Surface>}
              </PressScale>
            );
          })}
        </View>
      </View>
    </SafeAreaView>
  );
}
