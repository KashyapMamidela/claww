import React, { useState } from 'react';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { COLORS } from '../../../lib/theme';
import { SetupChipStep } from '../../../components/SetupChipStep';
import type { Equipment } from '../../../lib/data';

const A = COLORS.blue;
const TOTAL_STEPS = 7;

const OPTIONS: { value: Equipment; label: string }[] = [
  { value: 'gym', label: 'Full Gym' },
  { value: 'home', label: 'Home Equipment' },
  { value: 'none', label: 'Bodyweight Only' },
];

export default function WorkoutSetupEquipment() {
  const router = useRouter();
  const { height, weight } = useLocalSearchParams<{ height: string; weight: string }>();
  const [equipment, setEquipment] = useState<Equipment | null>(null);

  const select = (value: Equipment) => {
    setEquipment(value);
    setTimeout(() => {
      router.push({ pathname: '/screens/workout-setup/modality', params: { height, weight, equipment: value } });
    }, 220);
  };

  return (
    <SetupChipStep
      step={1}
      totalSteps={TOTAL_STEPS}
      accent={A}
      eyebrow="EQUIPMENT"
      title="What do you have access to?"
      subtitle="This decides which exercises are even on the table — the biggest single lever on what your plan looks like."
      options={OPTIONS}
      selected={equipment}
      onSelect={select}
    />
  );
}
