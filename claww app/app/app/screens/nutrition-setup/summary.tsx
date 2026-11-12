import { mealTitle } from '../../../lib/mealPlanMeal';
import React, { useEffect, useMemo, useState } from 'react';
import { Alert, ScrollView, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { COLORS, FONT, FONT_HAND, BG, bg } from '../../../lib/theme';
import { useAppState } from '../../../lib/appState';
import { useProfile } from '../../../lib/profile';
import { track } from '../../../lib/analytics';
import { computeNutritionSample, saveNutritionTargets, type ActivityLevel, type Goal, type NutritionDefaults } from '../../../lib/data';
import { saveUserResources } from '../../../lib/userResources';
import { resetMealPlans } from '../../../lib/mealPlanData';
import { ADD_ONS, MEAL_TEMPLATES, planDay, type PlanDiet } from '../../../lib/engine';
import { itemsText } from '../../../lib/mealPlanMeal';
import { planLine } from '../../../lib/mealPlanView';
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
import { SectionHeader } from '../../../components/ui/SectionHeader';
import { Stepper } from '../../../components/ui/Stepper';
import { Surface } from '../../../components/ui/Surface';

const G = COLORS.green;
const BUDGET_STEP = 25;
const BUDGET_MIN = 50;
const BUDGET_MAX = 1000;
/** Time for the setup screens to finish closing before anything under them is redrawn. */
const LEAVE_MS = 700;

// NG PHASE 6, step 3 (screen 13): what the user has, the gaps the plan works around (each with a Change link), and
// where the day's meals will appear once the meal planner ships (NG PHASE 7). Saving here writes the food
// resources, the dietary restrictions and, if the user has no targets yet, the calorie and macro targets.

export default function MealSetupSummary() {
  const router = useRouter();
  const { userId } = useAppState();
  const { profile } = useProfile(userId);
  const [draft, setDraft] = useState(getDraft());
  const [budgetOpen, setBudgetOpen] = useState(false);
  // A ref, not state: this screen must not redraw between the tap and leaving (a redraw just before the screens close
  // crashes Android, "child already has a parent"), so there is no "Saving…" label.
  const saving = React.useRef(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    track('nutrition_setup_step_3');
  }, []);

  const availability = useMemo(() => draftAvailability(draft), [draft]);
  const budget = draftBudget(draft);
  const visible = new Set(visibleFoods(draft.diet));
  const gaps = useMemo(() => resourceGaps({ sources: draft.sources, cookWith: draft.cookWith, diet: draft.diet, availability }), [draft, availability]);
  const chips = FOOD_ROWS.filter((r) => r.group === 'protein' && visible.has(r.key) && availability[r.key] !== 'no');

  // A day on this plan: the same planner the Nutrition tab uses, on the answers so far.
  const sampleTarget = useMemo(() => {
    const saved = profile?.personalization_profile?.nutritionDefaults;
    if (saved) return { kcal: saved.calories, protein: saved.protein_g };
    const w = draft.basics?.weight ?? profile?.weight ?? 70;
    return { kcal: 2000, protein: Math.round(w * 1.6) };
  }, [profile, draft.basics]);
  const sample = useMemo(() => {
    if (!draft.diet) return null;
    return planDay({
      target: sampleTarget,
      resources: { sources: draft.sources, cookWith: draft.cookWith, diet: draft.diet as PlanDiet, availability: availability as Record<string, 'yes' | 'sometimes' | 'no'>, avoid: [], style: draft.planStyle },
      date: new Date().toISOString().slice(0, 10),
      seed: userId ?? 'preview',
      history: [],
      templates: MEAL_TEMPLATES,
      addOns: ADD_ONS,
    });
  }, [draft, availability, sampleTarget, userId]);

  const goBackTo = (step: 1 | 2) => {
    // Step 3 sits on top of 2 on top of 1, so going back is a pop, not a push.
    router.dismiss(step === 2 ? 1 : 2);
  };

  const setBudget = (b: number) => setDraft(patchDraft({ budget: Math.max(BUDGET_MIN, Math.min(BUDGET_MAX, b)) }));

  const save = () => {
    if (!userId || saving.current || !draft.diet) return;
    saving.current = true;
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
        gainWeight: profile?.personalization_profile?.goalChoice === 'gain',
      });
    }

    const restrictions = restrictionsForDiet(draft.diet, profile?.personalization_profile?.dietaryRestrictions ?? []);
    const basics = draft.basics ? { height: draft.basics.height, weight: draft.basics.weight, age: draft.basics.age } : undefined;
    const resources = {
      sources: draft.sources,
      cookWith: draft.cookWith,
      diet: draft.diet,
      budgetInrDay: budget,
      planStyle: draft.planStyle,
      availability,
      avoid: [] as string[],
    };

    // Leave first, save after the screens have closed. Saving here rewrites the profile, which redraws the Nutrition
    // tab underneath, and redrawing a tab while the stack above it is closing crashed Android. If the save fails the
    // answers are kept and the user is offered another try.
    router.dismissTo('/(tabs)/nutrition');
    setTimeout(async () => {
      const okTargets = targets ? await saveNutritionTargets(userId, targets, restrictions, basics) : true;
      const okResources = await saveUserResources(userId, resources);
      if (okResources) await resetMealPlans(userId).catch(() => {});
      if (okTargets && okResources) {
        resetDraft();
        return;
      }
      Alert.alert('Could not save your meal setup', 'Check your connection and try again. Your answers are kept.', [
        { text: 'Not now', style: 'cancel' },
        { text: 'Try again', onPress: () => router.push('/nutrition-setup') },
      ]);
    }, LEAVE_MS);
  };

  const tile = (label: string, value: string, onPress?: () => void) => {
    const body = (
      <View style={{ flex: 1, minHeight: 74, borderRadius: 14, padding: 12, backgroundColor: 'rgba(255,255,255,0.08)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.12)', justifyContent: 'center', gap: 4 }}>
        <Text style={{ color: COLORS.textMuted, fontSize: 11, letterSpacing: 0.8, fontFamily: BG[700] }}>{label}</Text>
        <Text style={{ color: COLORS.fg, fontSize: 17, fontFamily: BG[800] }}>{value}</Text>
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
        <Text style={{ color: COLORS.fg, fontSize: 28, fontVariant: ['tabular-nums'], letterSpacing: -0.6, fontFamily: BG[800] }}>Here is what you have</Text>

        <Hero variant="green" accessibilityLabel="Your kitchen">
          <Text style={{ color: COLORS.textMuted, fontSize: 11, letterSpacing: 0.9, fontFamily: BG[700] }}>YOUR KITCHEN</Text>
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
                <Text style={{ color: COLORS.fg, fontSize: 13, fontFamily: BG[700] }}>
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
              <Text style={{ color: COLORS.textMuted, fontSize: 13, letterSpacing: 0.9, fontFamily: BG[700] }}>GAPS YOUR PLAN WORKS AROUND</Text>
            </View>
            {gaps.map((g, i) => (
              <View key={g.id} style={{ flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 12, borderTopWidth: i === 0 ? 0 : 1, borderTopColor: COLORS.border }}>
                <View style={{ flex: 1 }}>
                  <Text style={{ color: COLORS.fg, fontSize: 17, fontFamily: BG[800] }}>{g.title}</Text>
                  <Text style={{ color: COLORS.textMuted, fontSize: 17, fontFamily: FONT_HAND }}>{'→'} {g.fix}</Text>
                </View>
                <PressScale onPress={() => goBackTo(g.step)} accessibilityRole="button" accessibilityLabel={`Change: ${g.title}`}>
                  <View style={{ minHeight: 44, minWidth: 64, alignItems: 'center', justifyContent: 'center' }}>
                    <Text style={{ color: G, fontSize: 15, fontFamily: BG[800] }}>Change</Text>
                  </View>
                </PressScale>
              </View>
            ))}
          </Surface>
        ) : null}

        <Surface padding={16}>
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 10 }}>
            <SectionHeader>A day on this plan</SectionHeader>
            {sample && sample.meals.length > 0 ? <Text style={{ color: COLORS.fg, fontSize: 13, flexShrink: 1, textAlign: 'right', fontFamily: BG[700] }}>{planLine(sample)}</Text> : null}
          </View>
          {sample && sample.meals.length > 0 ? (
            sample.meals.map((m, i) => (
              <View key={m.meal} style={{ paddingVertical: 12, borderTopWidth: i === 0 ? 0 : 1, borderTopColor: COLORS.border, marginTop: i === 0 ? 8 : 0 }}>
                <Text style={{ color: COLORS.textMuted, fontSize: 15, fontFamily: BG[400] }}>{m.meal.charAt(0).toUpperCase() + m.meal.slice(1)}</Text>
                <Text style={{ color: COLORS.fg, fontSize: 17, fontFamily: BG[800] }}>{mealTitle(m)}</Text>
                <Text style={{ color: COLORS.textMuted, fontSize: 13, fontVariant: ['tabular-nums'], fontFamily: BG[400] }}>
                  {m.kcal} kcal · P {Math.round(m.protein)} g · {itemsText(m)}
                </Text>
              </View>
            ))
          ) : (
            <Text style={{ color: COLORS.textMuted, fontSize: 15, lineHeight: 20, marginTop: 8, fontFamily: BG[400] }}>
              Pick a diet to see a sample day built from nutritionist-reviewed meal templates.
            </Text>
          )}
          <Text style={{ color: COLORS.textFaint, fontSize: 13, marginTop: 6, fontFamily: BG[400] }}>Built from meal templates (still being reviewed), never generated.</Text>
        </Surface>

        {error ? <ErrorCard message={error} onRetry={save} /> : null}

        <Button variant="primary" accent={G} accentDeep={COLORS.greenDeep} size="lg" fullWidth disabled={!draft.diet} onPress={save} icon={<Icon name="check" size={16} color="#fff" />}>
          Save my setup
        </Button>
      </ScrollView>

      <BottomSheet visible={budgetOpen} onClose={() => setBudgetOpen(false)}>
        <View style={{ padding: 20, gap: 14 }}>
          <Text style={{ color: COLORS.fg, fontSize: 20, fontFamily: BG[800] }}>Food budget a day</Text>
          <Text style={{ color: COLORS.textMuted, fontSize: 15, lineHeight: 20, fontFamily: BG[400] }}>
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
