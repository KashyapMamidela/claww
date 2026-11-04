import React, { useEffect, useMemo, useState } from 'react';
import { ScrollView, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { COLORS, FONT, FONT_HAND } from '../../../lib/theme';
import { useAppState } from '../../../lib/appState';
import { useProfile } from '../../../lib/profile';
import { track } from '../../../lib/analytics';
import { MEAL_PLAN_ENABLED } from '../../../lib/flags';
import { computeNutritionSample, saveNutritionTargets, type ActivityLevel, type Goal, type NutritionDefaults } from '../../../lib/data';
import { saveUserResources } from '../../../lib/userResources';
import { FOOD_ROWS, cookLabel, defaultBudget, dietLabel, restrictionsForDiet, sourcesLabel, visibleFoods } from '../../../lib/resourceDefaults';
import { resourceGaps } from '../../../lib/resourceGaps';
import { draftAvailability, draftBudget, getDraft, patchDraft, resetDraft } from '../../../lib/mealSetupDraft';
import { MealSetupHeader } from '../../../components/MealSetupHeader';
import { BottomSheet } from '../../../components/ui/BottomSheet';
import { Button } from '../../../components/ui/Button';
import { ErrorCard } from '../../../components/ui/ErrorCard';
import { Hero } from '../../../components/ui/Hero';
import { Icon } from '../../../components/ui/Icon';
import { PressScale } from '../../../components/ui/PressScale';
import { SectionLabel } from '../../../components/ui/SectionLabel';
import { Stepper } from '../../../components/ui/Stepper';
import { Surface } from '../../../components/ui/Surface';

const G = COLORS.green;
const BUDGET_STEP = 25;
const BUDGET_MIN = 50;
const BUDGET_MAX = 1000;

// NG PHASE 6, step 3 (screen 13): what the user has, the gaps the plan works around (each with a Change link), and
// where the day's meals will appear once the meal planner ships (NG PHASE 7). Saving here writes the food
// resources, the dietary restrictions and, if the user has no targets yet, the calorie and macro targets.

export default function MealSetupSummary() {
  const router = useRouter();
  const { userId } = useAppState();
  const { profile } = useProfile(userId);
  const [draft, setDraft] = useState(getDraft());
  const [budgetOpen, setBudgetOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    track('nutrition_setup_step_3');
  }, []);

  const availability = useMemo(() => draftAvailability(draft), [draft]);
  const budget = draftBudget(draft);
  const visible = new Set(visibleFoods(draft.diet));
  const gaps = useMemo(() => resourceGaps({ sources: draft.sources, cookWith: draft.cookWith, diet: draft.diet, availability }), [draft, availability]);
  const chips = FOOD_ROWS.filter((r) => r.group === 'protein' && visible.has(r.key) && availability[r.key] !== 'no');

  const goBackTo = (step: 1 | 2) => {
    // Step 3 sits on top of 2 on top of 1, so going back is a pop, not a push.
    router.dismiss(step === 2 ? 1 : 2);
  };

  const setBudget = (b: number) => setDraft(patchDraft({ budget: Math.max(BUDGET_MIN, Math.min(BUDGET_MAX, b)) }));

  const save = async () => {
    if (!userId || saving || !draft.diet) return;
    setSaving(true);
    setError(null);

    const existingTargets = profile?.personalization_profile?.nutritionDefaults ?? null;
    let targets: NutritionDefaults | null = existingTargets;
    const height = draft.basics?.height ?? profile?.height ?? 0;
    const weight = draft.basics?.weight ?? profile?.weight ?? 0;
    const age = draft.basics?.age ?? profile?.age ?? 0;
    if (!targets && height > 0 && weight > 0 && age > 0) {
      targets = computeNutritionSample({
        height,
        weight,
        age,
        gender: profile?.gender ?? null,
        goal: (profile?.goal as Goal | null) ?? null,
        activityLevel: (profile?.personalization_profile?.workoutDefaults?.activityLevel as ActivityLevel | undefined) ?? 'moderate',
      });
    }

    const restrictions = restrictionsForDiet(draft.diet, profile?.personalization_profile?.dietaryRestrictions ?? []);
    const okTargets = targets
      ? await saveNutritionTargets(userId, targets, restrictions, draft.basics ? { height: draft.basics.height, weight: draft.basics.weight, age: draft.basics.age } : undefined)
      : true;
    const okResources = await saveUserResources(userId, {
      sources: draft.sources,
      cookWith: draft.cookWith,
      diet: draft.diet,
      budgetInrDay: budget,
      planStyle: draft.planStyle,
      availability,
      avoid: [],
    });
    setSaving(false);
    if (!okTargets || !okResources) {
      setError('Could not save your answers. Check your connection and try again.');
      return;
    }
    resetDraft();
    router.dismissTo('/(tabs)/nutrition');
  };

  const tile = (label: string, value: string, onPress?: () => void) => {
    const body = (
      <View style={{ flex: 1, minHeight: 74, borderRadius: 14, padding: 12, backgroundColor: 'rgba(255,255,255,0.08)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.12)', justifyContent: 'center', gap: 4 }}>
        <Text style={{ color: COLORS.textMuted, fontSize: 11, fontWeight: '700', letterSpacing: 0.8, fontFamily: FONT }}>{label}</Text>
        <Text style={{ color: COLORS.fg, fontSize: 18, fontWeight: '800', fontFamily: FONT }}>{value}</Text>
      </View>
    );
    return onPress ? (
      <PressScale onPress={onPress} accessibilityRole="button" accessibilityLabel={`${label}: ${value}. Tap to change`} style={{ flex: 1 }}>
        {body}
      </PressScale>
    ) : (
      <View style={{ flex: 1 }}>{body}</View>
    );
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: COLORS.bg }}>
      <MealSetupHeader step={3} sub="your resources" />
      <ScrollView contentContainerStyle={{ paddingHorizontal: 20, paddingTop: 18, paddingBottom: 32, gap: 14 }}>
        <Text style={{ color: COLORS.fg, fontSize: 28, fontWeight: '900', letterSpacing: -0.6, fontFamily: FONT }}>Here is what you have</Text>

        <Hero variant="green" accessibilityLabel="Your kitchen">
          <Text style={{ color: COLORS.textMuted, fontSize: 11, fontWeight: '700', letterSpacing: 0.9, fontFamily: FONT }}>YOUR KITCHEN</Text>
          <View style={{ flexDirection: 'row', gap: 10, marginTop: 12 }}>
            {tile('FOOD FROM', sourcesLabel(draft.sources))}
            {tile('COOK WITH', cookLabel(draft.cookWith))}
          </View>
          <View style={{ flexDirection: 'row', gap: 10, marginTop: 10 }}>
            {tile('BUDGET · TAP TO CHANGE', `₹${budget} a day`, () => setBudgetOpen(true))}
            {tile('YOU EAT', dietLabel(draft.diet))}
          </View>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 14 }}>
            {chips.map((r) => (
              <View key={r.key} style={{ borderRadius: 10, paddingHorizontal: 10, paddingVertical: 7, backgroundColor: availability[r.key] === 'yes' ? 'rgba(255,255,255,0.12)' : 'rgba(245,158,11,0.22)' }}>
                <Text style={{ color: COLORS.fg, fontSize: 13, fontWeight: '700', fontFamily: FONT }}>
                  {r.title}
                  {availability[r.key] === 'sometimes' ? ' sometimes' : ''}
                </Text>
              </View>
            ))}
          </View>
        </Hero>

        {gaps.length > 0 ? (
          <Surface padding={16}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 6 }}>
              <Icon name="pencil" size={14} color={COLORS.textMuted} />
              <Text style={{ color: COLORS.textMuted, fontSize: 12, fontWeight: '700', letterSpacing: 0.9, fontFamily: FONT }}>GAPS YOUR PLAN WORKS AROUND</Text>
            </View>
            {gaps.map((g, i) => (
              <View key={g.id} style={{ flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 12, borderTopWidth: i === 0 ? 0 : 1, borderTopColor: COLORS.border }}>
                <View style={{ flex: 1 }}>
                  <Text style={{ color: COLORS.fg, fontSize: 16, fontWeight: '800', fontFamily: FONT }}>{g.title}</Text>
                  <Text style={{ color: COLORS.textMuted, fontSize: 18, fontFamily: FONT_HAND }}>{'→'} {g.fix}</Text>
                </View>
                <PressScale onPress={() => goBackTo(g.step)} accessibilityRole="button" accessibilityLabel={`Change: ${g.title}`}>
                  <View style={{ minHeight: 44, minWidth: 64, alignItems: 'center', justifyContent: 'center' }}>
                    <Text style={{ color: G, fontSize: 14, fontWeight: '800', fontFamily: FONT }}>Change</Text>
                  </View>
                </PressScale>
              </View>
            ))}
          </Surface>
        ) : null}

        <Surface padding={16}>
          <SectionLabel color={G}>A DAY ON THIS PLAN</SectionLabel>
          <Text style={{ color: COLORS.textMuted, fontSize: 14, lineHeight: 20, marginTop: 10, fontFamily: FONT }}>
            {MEAL_PLAN_ENABLED
              ? 'Your three meals for today appear on the Nutrition tab.'
              : 'Your three meals a day will be built from this, from nutritionist-reviewed meal templates. They arrive in the next update; what you set here is saved now.'}
          </Text>
        </Surface>

        {error ? <ErrorCard message={error} onRetry={save} retrying={saving} /> : null}

        <Button variant="primary" accent={G} accentDeep={COLORS.greenDeep} size="lg" fullWidth disabled={saving || !draft.diet} onPress={save} icon={<Icon name="check" size={16} color="#fff" />}>
          {saving ? 'Saving…' : 'Save my setup'}
        </Button>
      </ScrollView>

      <BottomSheet visible={budgetOpen} onClose={() => setBudgetOpen(false)}>
        <View style={{ padding: 20, gap: 14 }}>
          <Text style={{ color: COLORS.fg, fontSize: 20, fontWeight: '800', fontFamily: FONT }}>Food budget a day</Text>
          <Text style={{ color: COLORS.textMuted, fontSize: 14, lineHeight: 20, fontFamily: FONT }}>
            What you can spend each day beyond the meals your mess or tiffin already covers.
          </Text>
          <Stepper
            label="Budget"
            value={`₹${budget}`}
            unit="a day"
            onDecrement={() => setBudget(budget - BUDGET_STEP)}
            onIncrement={() => setBudget(budget + BUDGET_STEP)}
            decrementDisabled={budget <= BUDGET_MIN}
            incrementDisabled={budget >= BUDGET_MAX}
          />
          <Button variant="secondary" size="md" fullWidth onPress={() => setBudget(defaultBudget(draft.sources))}>
            Use the suggested {'₹'}{defaultBudget(draft.sources)}
          </Button>
          <Button variant="primary" accent={G} accentDeep={COLORS.greenDeep} size="md" fullWidth onPress={() => setBudgetOpen(false)}>
            Done
          </Button>
        </View>
      </BottomSheet>
    </SafeAreaView>
  );
}
