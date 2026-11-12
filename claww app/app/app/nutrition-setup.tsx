import React, { useEffect } from 'react';
import { View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { foodGoalFrom } from '../lib/mealPlanReset';
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
  // fresh=1 is "Start my meal plan over": a blank page, a goal question and new targets at the end.
  const { fresh } = useLocalSearchParams<{ fresh?: string }>();

  useEffect(() => {
    if (!userId) return;
    let cancelled = false;

    Promise.all([getUserResources(userId), getProfile(userId)]).then(([resources, profile]) => {
      if (cancelled) return;
      if (fresh === '1') {
        const pp = profile?.personalization_profile;
        resetDraft({
          ...emptyDraft(),
          diet: dietFromRestrictions(pp?.dietaryRestrictions ?? []),
          fresh: true,
          foodGoal: foodGoalFrom(profile?.goal, (pp as { nutritionGoal?: string } | undefined)?.nutritionGoal),
        });
      } else if (resources) {
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
  }, [userId, fresh]);

  return <View style={{ flex: 1, backgroundColor: COLORS.bg }} />;
}
