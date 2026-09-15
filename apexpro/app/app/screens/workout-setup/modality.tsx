import React, { useState } from 'react';
import { Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { COLORS, FONT } from '../../../lib/theme';
import { OnboardingTopBar } from '../../../components/OnboardingTopBar';
import { Button } from '../../../components/ui/Button';
import { Chip } from '../../../components/ui/Chip';
import type { Modality } from '../../../lib/data';

const A = COLORS.blue;
const TOTAL_STEPS = 7;

const OPTIONS: { value: Modality; label: string }[] = [
  { value: 'strength', label: 'Strength' },
  { value: 'cardio', label: 'Cardio' },
  { value: 'mobility', label: 'Mobility' },
  { value: 'yoga', label: 'Yoga' },
];

export default function WorkoutSetupModality() {
  const router = useRouter();
  const { height, weight, equipment } = useLocalSearchParams<{ height: string; weight: string; equipment: string }>();
  const [modalities, setModalities] = useState<Modality[]>([]);

  const toggle = (m: Modality) => {
    setModalities((prev) => (prev.includes(m) ? prev.filter((x) => x !== m) : [...prev, m]));
  };

  const next = () => {
    if (modalities.length === 0) return;
    router.push({
      pathname: '/screens/workout-setup/goal',
      params: { height, weight, equipment, modalities: modalities.join(',') },
    });
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#050505' }}>
      <OnboardingTopBar step={2} totalSteps={TOTAL_STEPS} accent={A} showBack />
      <View style={{ flex: 1, paddingHorizontal: 24, paddingTop: 38, paddingBottom: 24 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 14 }}>
          <View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: A }} />
          <Text style={{ color: A, fontSize: 10, fontWeight: '700', letterSpacing: 1, fontFamily: FONT }}>TRAINING TYPES</Text>
        </View>
        <Text style={{ color: '#fff', fontSize: 28, fontWeight: '900', letterSpacing: -0.6, lineHeight: 32, fontFamily: FONT }}>
          What do you want to train?
        </Text>
        <Text style={{ color: '#71717A', fontSize: 13, marginTop: 10, marginBottom: 26, lineHeight: 19, fontFamily: FONT }}>
          Pick as many as you like — your plan will mix days across whatever you select here.
        </Text>

        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10 }}>
          {OPTIONS.map((opt) => (
            <Chip key={opt.value} active={modalities.includes(opt.value)} accent={A} accentDeep={COLORS.blueDeep} onPress={() => toggle(opt.value)}>
              {opt.label}
            </Chip>
          ))}
        </View>

        <View style={{ flex: 1 }} />
        <Button variant="primary" accent={A} accentDeep={COLORS.blueDeep} size="lg" fullWidth disabled={modalities.length === 0} onPress={next}>
          Continue
        </Button>
      </View>
    </SafeAreaView>
  );
}
