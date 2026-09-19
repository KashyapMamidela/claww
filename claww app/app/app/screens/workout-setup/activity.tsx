import React, { useState } from 'react';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { COLORS } from '../../../lib/theme';
import { SetupChipStep } from '../../../components/SetupChipStep';
import type { ActivityLevel } from '../../../lib/data';

const A = COLORS.blue;
const TOTAL_STEPS = 7;

const OPTIONS: { value: ActivityLevel; label: string }[] = [
  { value: 'sedentary', label: 'Sedentary' },
  { value: 'moderate', label: 'Moderately Active' },
  { value: 'active', label: 'Very Active' },
];

export default function WorkoutSetupActivity() {
  const router = useRouter();
  const { height, weight, equipment, modalities, goal, experienceLevel } = useLocalSearchParams<{
    height: string;
    weight: string;
    equipment: string;
    modalities: string;
    goal: string;
    experienceLevel: string;
  }>();
  const [activityLevel, setActivityLevel] = useState<ActivityLevel | null>(null);

  const select = (value: ActivityLevel) => {
    setActivityLevel(value);
    setTimeout(() => {
      router.push({
        pathname: '/screens/workout-setup/review',
        params: { height, weight, equipment, modalities, goal, experienceLevel, activityLevel: value },
      });
    }, 220);
  };

  return (
    <SetupChipStep
      step={5}
      totalSteps={TOTAL_STEPS}
      accent={A}
      eyebrow="ACTIVITY LEVEL"
      title="How active is daily life outside training?"
      subtitle="Feeds your weekly training frequency."
      options={OPTIONS}
      selected={activityLevel}
      onSelect={select}
    />
  );
}
