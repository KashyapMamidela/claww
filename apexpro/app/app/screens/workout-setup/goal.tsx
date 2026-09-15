import React, { useState } from 'react';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { COLORS } from '../../../lib/theme';
import { SetupChipStep } from '../../../components/SetupChipStep';
import type { Goal } from '../../../lib/data';

const A = COLORS.blue;
const TOTAL_STEPS = 7;

const OPTIONS: { value: Goal; label: string }[] = [
  { value: 'muscle_gain', label: 'Build Muscle' },
  { value: 'fat_loss', label: 'Lose Fat' },
  { value: 'endurance', label: 'Endurance' },
  { value: 'maintenance', label: 'Maintain' },
  { value: 'flexibility', label: 'Flexibility' },
];

export default function WorkoutSetupGoal() {
  const router = useRouter();
  const { height, weight, equipment, modalities } = useLocalSearchParams<{
    height: string;
    weight: string;
    equipment: string;
    modalities: string;
  }>();
  const [goal, setGoal] = useState<Goal | null>(null);

  const select = (value: Goal) => {
    setGoal(value);
    setTimeout(() => {
      router.push({
        pathname: '/screens/workout-setup/experience',
        params: { height, weight, equipment, modalities, goal: value },
      });
    }, 220);
  };

  return (
    <SetupChipStep
      step={3}
      totalSteps={TOTAL_STEPS}
      accent={A}
      eyebrow="PRIMARY GOAL"
      title="What's the main target?"
      subtitle="Sets the rep ranges and volume your plan trains at."
      options={OPTIONS}
      selected={goal}
      onSelect={select}
    />
  );
}
