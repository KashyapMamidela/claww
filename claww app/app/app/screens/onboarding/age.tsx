import React, { useState } from 'react';
import { Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { COLORS, FONT } from '../../../lib/theme';
import { OnboardingTopBar } from '../../../components/OnboardingTopBar';
import { Button } from '../../../components/ui/Button';
import { Chip } from '../../../components/ui/Chip';
import { Icon } from '../../../components/ui/Icon';
import { PressScale } from '../../../components/ui/PressScale';
import { Surface } from '../../../components/ui/Surface';

const A = COLORS.blue;
const MIN_AGE = 13;
const MAX_AGE = 80;
const PRESETS = [18, 25, 35, 45];

export default function OnboardingAge() {
  const router = useRouter();
  const { name } = useLocalSearchParams<{ name: string }>();
  const [age, setAge] = useState(25);

  const next = () => {
    router.push({ pathname: '/screens/onboarding/gender', params: { name: name ?? '', age: String(age) } });
  };

  const stepBtn = (dir: -1 | 1) => (
    <PressScale
      accessibilityRole="button"
      accessibilityLabel={dir < 0 ? 'Decrease age' : 'Increase age'}
      hitSlop={6}
      onPress={() => setAge((a) => Math.max(MIN_AGE, Math.min(MAX_AGE, a + dir)))}
    >
      <Surface radius={16} padding={0} style={{ width: 64, height: 64 }}>
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
          <Icon name={dir === -1 ? 'minus' : 'plus'} size={22} color={A} />
        </View>
      </Surface>
    </PressScale>
  );

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: COLORS.bg }}>
      <OnboardingTopBar step={1} totalSteps={6} accent={A} showBack />
      <View style={{ flex: 1, paddingHorizontal: 20, paddingTop: 32, paddingBottom: 20 }}>
        <Text style={{ color: COLORS.textMuted, fontSize: 13, fontFamily: FONT }}>{name ? `Nice to meet you, ${name}` : 'Step two'}</Text>
        <Text style={{ color: COLORS.fg, fontSize: 34, fontWeight: '900', fontVariant: ['tabular-nums'], letterSpacing: -0.8, lineHeight: 38, marginTop: 6, fontFamily: FONT }}>How old are you?</Text>

        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', gap: 24 }}>
          <View style={{ flexDirection: 'row', alignItems: 'flex-end', gap: 6 }}>
            <Text style={{ color: COLORS.fg, fontSize: 88, fontWeight: '900', letterSpacing: -3, lineHeight: 92, fontFamily: FONT, fontVariant: ['tabular-nums'] }}>{age}</Text>
            <Text style={{ color: COLORS.textMuted, fontSize: 17, fontWeight: '700', marginBottom: 14, fontFamily: FONT }}>yrs</Text>
          </View>

          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 16 }}>
            {stepBtn(-1)}
            {stepBtn(1)}
          </View>

          <View style={{ flexDirection: 'row', gap: 8 }}>
            {PRESETS.map((v) => (
              <Chip key={v} active={age === v} accent={A} accentDeep={COLORS.blueDeep} onPress={() => setAge(v)}>
                {String(v)}
              </Chip>
            ))}
          </View>
        </View>

        <Button variant="primary" size="lg" fullWidth onPress={next}>
          Continue
        </Button>
      </View>
    </SafeAreaView>
  );
}
