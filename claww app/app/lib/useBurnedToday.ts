import { useCallback, useState } from 'react';
import { useFocusEffect } from '@react-navigation/native';
import { getTodayWorkoutStats, saveBurnedGoal } from './data';
import { burnedKcal, type Burned } from './dayStats';
import { burnedGoal } from './burnGoal';
import { useProfile } from './profile';
import type { StepsResult } from './steps';

// Polish step 4: today's Burned number and its goal, for the Burned ring. The number is the one definition in
// lib/dayStats (Health Connect when connected, else the steps estimate plus sessions and activities logged today), the
// goal is lib/burnGoal (derived from the profile, or what the user set).
export interface BurnedToday {
  burned: Burned;
  goal: number | null;
  setGoal: (kcal: number) => void;
}

export function useBurnedToday(userId: string | null, steps: StepsResult): BurnedToday {
  const { profile } = useProfile(userId);
  const [loggedKcal, setLoggedKcal] = useState(0);
  const [override, setOverride] = useState<number | null>(null);

  useFocusEffect(
    useCallback(() => {
      if (!userId) return;
      let cancelled = false;
      getTodayWorkoutStats(userId, profile?.weight ?? null).then((stats) => {
        if (!cancelled) setLoggedKcal(stats.calorieBurn);
      });
      return () => {
        cancelled = true;
      };
    }, [userId, profile?.weight])
  );

  const burned = burnedKcal({
    healthConnectKcal: steps.available ? steps.caloriesBurned : null,
    steps: steps.available ? steps.steps : null,
    loggedKcal,
    weightKg: profile?.weight ?? null,
  });
  const goal = burnedGoal({
    stored: override ?? profile?.personalization_profile?.burnedGoal,
    height: profile?.height ?? null,
    weight: profile?.weight ?? null,
    age: profile?.age ?? null,
    gender: profile?.gender ?? null,
    activityLevel: profile?.personalization_profile?.workoutDefaults?.activityLevel ?? null,
  });

  const setGoal = (kcal: number) => {
    setOverride(kcal);
    if (userId) saveBurnedGoal(userId, kcal);
  };
  return { burned, goal, setGoal };
}
