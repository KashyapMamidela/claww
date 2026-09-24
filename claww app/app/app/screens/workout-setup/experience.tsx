import React, { useState } from 'react';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { COLORS } from '../../../lib/theme';
import { SetupChipStep } from '../../../components/SetupChipStep';
import type { ExperienceLevel } from '../../../lib/data';

const A = COLORS.blue;
const TOTAL_STEPS = 8;

const OPTIONS: { value: ExperienceLevel; label: string }[] = [
  { value: 'beginner', label: 'Beginner' },
  { value: 'intermediate', label: 'Intermediate' },
  { value: 'advanced', label: 'Advanced' },
];

export default function WorkoutSetupExperience() {
  const router = useRouter();
  const { height, weight, equipment, modalities, goal } = useLocalSearchParams<{
    height: string;
    weight: string;
    equipment: string;
    modalities: string;
    goal: string;
  }>();
  const [experienceLevel, setExperienceLevel] = useState<ExperienceLevel | null>(null);

  const select = (value: ExperienceLevel) => {
    setExperienceLevel(value);
    setTimeout(() => {
      router.push({
        pathname: '/screens/workout-setup/activity',
        params: { height, weight, equipment, modalities, goal, experienceLevel: value },
      });
    }, 220);
  };

  return (
    <SetupChipStep
      step={4}
      totalSteps={TOTAL_STEPS}
      accent={A}
      eyebrow="EXPERIENCE"
      title="How long have you been training?"
      subtitle="Caps how much volume your plan programs per session."
      options={OPTIONS}
      selected={experienceLevel}
      onSelect={select}
    />
  );
}
