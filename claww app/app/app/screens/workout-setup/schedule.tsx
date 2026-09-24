import React, { useState } from 'react';
import { Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { COLORS, FONT } from '../../../lib/theme';
import { OnboardingTopBar } from '../../../components/OnboardingTopBar';
import { Button } from '../../../components/ui/Button';
import { Chip } from '../../../components/ui/Chip';
import type { SplitPreference } from '../../../lib/data';

const A = COLORS.blue;
const TOTAL_STEPS = 8;

const WEEKDAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

const SPLIT_OPTIONS: { value: SplitPreference; label: string }[] = [
  { value: 'auto', label: 'Let CLAWW Choose' },
  { value: 'full_body', label: 'Full Body' },
  { value: 'upper_lower', label: 'Upper / Lower' },
  { value: 'push_pull_legs', label: 'Push / Pull / Legs' },
];

/**
 * Previously the app only ever asked a days-per-week COUNT (via activity
 * level) and let the LLM pick whatever split it wanted — a real gap the
 * cofounder flagged twice (no weekday picker, no way to reject a split
 * before generation). Both are optional here: skipping this screen
 * (leaving no days selected) falls back to the old activity-based day
 * count exactly as before, so nobody who liked the old flow is forced
 * into a new one.
 */
export default function WorkoutSetupSchedule() {
  const router = useRouter();
  const { height, weight, equipment, modalities, goal, experienceLevel, activityLevel } = useLocalSearchParams<{
    height: string;
    weight: string;
    equipment: string;
    modalities: string;
    goal: string;
    experienceLevel: string;
    activityLevel: string;
  }>();
  const [trainingDays, setTrainingDays] = useState<string[]>([]);
  const [split, setSplit] = useState<SplitPreference>('auto');

  const toggleDay = (day: string) => {
    setTrainingDays((prev) => (prev.includes(day) ? prev.filter((d) => d !== day) : [...prev, day]));
  };

  const next = () => {
    router.push({
      pathname: '/screens/workout-setup/review',
      params: {
        height,
        weight,
        equipment,
        modalities,
        goal,
        experienceLevel,
        activityLevel,
        trainingDays: trainingDays.join(','),
        splitPreference: split,
      },
    });
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#050505' }}>
      <OnboardingTopBar step={6} totalSteps={TOTAL_STEPS} accent={A} showBack />
      <View style={{ flex: 1, paddingHorizontal: 24, paddingTop: 38, paddingBottom: 24 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 14 }}>
          <View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: A }} />
          <Text style={{ color: A, fontSize: 10, fontWeight: '700', letterSpacing: 1, fontFamily: FONT }}>SCHEDULE</Text>
        </View>
        <Text style={{ color: '#fff', fontSize: 28, fontWeight: '900', letterSpacing: -0.6, lineHeight: 32, fontFamily: FONT }}>
          Which days work for you?
        </Text>
        <Text style={{ color: '#71717A', fontSize: 13, marginTop: 10, marginBottom: 22, lineHeight: 19, fontFamily: FONT }}>
          Optional — pick your actual free days and your plan lands exactly there. Skip it and CLAWW picks a
          day count from your activity level instead.
        </Text>

        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10 }}>
          {WEEKDAYS.map((day) => (
            <Chip key={day} active={trainingDays.includes(day)} accent={A} accentDeep={COLORS.blueDeep} onPress={() => toggleDay(day)}>
              {day.slice(0, 3)}
            </Chip>
          ))}
        </View>

        <Text style={{ color: '#71717A', fontSize: 10, fontWeight: '700', letterSpacing: 0.9, marginTop: 30, marginBottom: 12, fontFamily: FONT }}>
          PREFERRED SPLIT
        </Text>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10 }}>
          {SPLIT_OPTIONS.map((opt) => (
            <Chip key={opt.value} active={split === opt.value} accent={A} accentDeep={COLORS.blueDeep} onPress={() => setSplit(opt.value)}>
              {opt.label}
            </Chip>
          ))}
        </View>

        <View style={{ flex: 1 }} />
        <Button variant="primary" accent={A} accentDeep={COLORS.blueDeep} size="lg" fullWidth onPress={next}>
          Continue
        </Button>
      </View>
    </SafeAreaView>
  );
}
