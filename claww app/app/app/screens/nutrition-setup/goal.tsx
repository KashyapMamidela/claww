import React, { useState } from 'react';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { COLORS } from '../../../lib/theme';
import { SetupChipStep } from '../../../components/SetupChipStep';
import type { Goal } from '../../../lib/data';

const G = COLORS.green;
const TOTAL_STEPS = 5;

const OPTIONS: { value: Goal; label: string }[] = [
  { value: 'muscle_gain', label: 'Build Muscle' },
  { value: 'fat_loss', label: 'Lose Fat' },
  { value: 'endurance', label: 'Endurance' },
  { value: 'maintenance', label: 'Maintain' },
  { value: 'flexibility', label: 'Flexibility' },
];

export default function NutritionSetupGoal() {
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
  const [goal, setGoal] = useState<Goal | null>((params.goal as Goal) || null);

  const select = (value: Goal) => {
    setGoal(value);
    setTimeout(() => {
      router.push({ pathname: '/screens/nutrition-setup/activity', params: { ...params, goal: value } });
    }, 220);
  };

  return (
    <SetupChipStep
      step={1}
      totalSteps={TOTAL_STEPS}
      accent={G}
      eyebrow="GOAL"
      title="What's the main target?"
      subtitle="Sets your calorie adjustment and protein floor."
      options={OPTIONS}
      selected={goal}
      onSelect={select}
    />
  );
}
