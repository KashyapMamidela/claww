import React, { useEffect } from 'react';
import { View } from 'react-native';
import { useRouter } from 'expo-router';
import { COLORS } from '../lib/theme';
import { useAppState } from '../lib/appState';
import { getProfile } from '../lib/data';
import { getUserResources } from '../lib/userResources';
import { dietFromRestrictions } from '../lib/resourceDefaults';
import { emptyDraft, resetDraft } from '../lib/mealSetupDraft';

/**
 * Entry point kept at this path so existing `router.push('/nutrition-setup')` call sites don't need to change.
 * NG PHASE 6: the setup is three short steps under `screens/nutrition-setup/` (where, foods, summary). Before the
 * first step it loads what the user answered last time (or their saved diet) into the in-memory draft, so
 * setting up again starts from their answers instead of from nothing.
 */
export default function NutritionSetupEntry() {
  const router = useRouter();
  const { userId } = useAppState();

  useEffect(() => {
    if (!userId) return;
    let cancelled = false;

    Promise.all([getUserResources(userId), getProfile(userId)]).then(([resources, profile]) => {
      if (cancelled) return;
      if (resources) {
        resetDraft({
          ...emptyDraft(),
          sources: resources.sources,
          cookWith: resources.cookWith,
          diet: resources.diet,
          edits: resources.availability,
          budget: resources.budgetInrDay,
          planStyle: resources.planStyle,
        });
      } else {
        resetDraft({ ...emptyDraft(), diet: dietFromRestrictions(profile?.personalization_profile?.dietaryRestrictions ?? []) });
      }
      router.replace('/screens/nutrition-setup/where');
    });

    return () => {
      cancelled = true;
    };
  }, [userId]);

  return <View style={{ flex: 1, backgroundColor: COLORS.bg }} />;
}
