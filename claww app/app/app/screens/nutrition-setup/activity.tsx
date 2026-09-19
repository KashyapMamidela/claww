import React, { useState } from 'react';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { COLORS } from '../../../lib/theme';
import { SetupChipStep } from '../../../components/SetupChipStep';
import type { ActivityLevel } from '../../../lib/data';

const G = COLORS.green;
const TOTAL_STEPS = 5;

const OPTIONS: { value: ActivityLevel; label: string }[] = [
  { value: 'sedentary', label: 'Sedentary' },
  { value: 'moderate', label: 'Moderately Active' },
  { value: 'active', label: 'Very Active' },
];

export default function NutritionSetupActivity() {
  const router = useRouter();
  const params = useLocalSearchParams<{
    height: string;
    weight: string;
    age: string;
    gender: string;
    goal: string;
    activityLevel: string;
    dietaryRestrictions: string;
  }>();
  const [activityLevel, setActivityLevel] = useState<ActivityLevel | null>((params.activityLevel as ActivityLevel) || null);

  const select = (value: ActivityLevel) => {
    setActivityLevel(value);
    setTimeout(() => {
      router.push({ pathname: '/screens/nutrition-setup/dietary', params: { ...params, activityLevel: value } });
    }, 220);
  };

  return (
    <SetupChipStep
      step={2}
      totalSteps={TOTAL_STEPS}
      accent={G}
      eyebrow="ACTIVITY LEVEL"
      title="How active is daily life?"
      subtitle="Feeds your total daily energy estimate alongside training."
      options={OPTIONS}
      selected={activityLevel}
      onSelect={select}
    />
  );
}
