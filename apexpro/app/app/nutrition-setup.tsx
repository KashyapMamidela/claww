import React, { useEffect } from 'react';
import { View } from 'react-native';
import { useRouter } from 'expo-router';
import { COLORS } from '../lib/theme';
import { useAppState } from '../lib/appState';
import { getProfile } from '../lib/data';

/**
 * Entry point kept at this path so existing `router.push('/nutrition-setup')`
 * call sites don't need to change. Unlike workout-setup, this flow prefills
 * from the user's existing profile (it's an edit flow, not just onboarding),
 * so it has to fetch once before handing off to the first step of the
 * multi-step flow under `screens/nutrition-setup/*` (see Phase 5.2).
 */
export default function NutritionSetupEntry() {
  const router = useRouter();
  const { userId } = useAppState();

  useEffect(() => {
    if (!userId) return;
    let cancelled = false;

    getProfile(userId).then((profile) => {
      if (cancelled) return;
      router.replace({
        pathname: '/screens/nutrition-setup/details',
        params: {
          height: profile?.height ? String(profile.height) : '',
          weight: profile?.weight ? String(profile.weight) : '',
          age: profile?.age ? String(profile.age) : '',
          gender: profile?.gender ?? '',
          goal: profile?.goal ?? '',
          activityLevel: profile?.personalization_profile?.workoutDefaults?.activityLevel ?? '',
          dietaryRestrictions: (profile?.personalization_profile?.dietaryRestrictions ?? []).join(','),
        },
      });
    });

    return () => {
      cancelled = true;
    };
  }, [userId]);

  return <View style={{ flex: 1, backgroundColor: COLORS.bg }} />;
}
