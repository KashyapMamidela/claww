import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Rise } from '../../components/ui/Rise';
import { usePullToRefresh } from '../../lib/usePullToRefresh';
import { mealTitle } from '../../lib/mealPlanMeal';
import { dayLabel } from '../../lib/format';
import { useToast } from '../../components/ui/Toast';
import { useHideBarOnScroll } from '../../lib/tabBarVisibility';
import { ScrollView, Text, TouchableOpacity, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useFocusEffect } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTabBottomPad } from '../../lib/useTabBottomPad';
import { COLORS, FONT, FONT_HAND, HEADER_CONTENT_HEIGHT, TAB_BAR_CONTENT_HEIGHT, BG, bg } from '../../lib/theme';
import { useAppState, type MealLogRow, type MealType } from '../../lib/appState';
import { getProfile, getRecentMeals, saveFoodProfile, type NutritionDefaults } from '../../lib/data';
import { normalizeFoodProfile, shouldAskFoodProfile } from '../../lib/foodProfile';
import { nextMealFor } from '../../lib/homeMoment';
import { dayLine, proteinGapNote, rateMeal, usualsFrom, type Usual } from '../../lib/nutritionLogic';
import { MealDetailModal } from '../../components/MealDetailModal';
import { SlotPenMark } from '../../components/nutrition/SlotPenMark';
import { usePenMarks } from '../../lib/usePenMarks';
import { CatchUpBanner } from '../../components/nutrition/CatchUpBanner';
import { MealCard } from '../../components/nutrition/MealCard';
import { FoodSearchSheet } from '../../components/nutrition/FoodSearchSheet';
import { Icon } from '../../components/ui/Icon';
import { Button } from '../../components/ui/Button';
import { SectionLabel } from '../../components/ui/SectionLabel';
import { ProgressBar } from '../../components/ui/ProgressBar';
import { ProgressRing } from '../../components/ui/ProgressRing';
import { Surface } from '../../components/ui/Surface';
import { Display, LargeTitle } from '../../components/ui/Typography';
import { Skeleton } from '../../components/ui/Skeleton';
import { PressScale } from '../../components/ui/PressScale';
import { BottomSheet } from '../../components/ui/BottomSheet';
import { ensureMealPlans, replanToday, swapChoices, applySwap, type StoredPlan } from '../../lib/mealPlanData';
import { planLine, slotLabel, slotViews, type MealSlot } from '../../lib/mealPlanView';
import { SKIPPED } from '../../lib/catchUp';
import { itemsText, plannedToMeal } from '../../lib/mealPlanMeal';
import type { PlannedMeal } from '../../lib/engine';

// NG PHASE 8 (screen 14): the Nutrition tab. The macro card with the day's protein note in the pen, three labelled
// actions, one-tap usuals from your last two weeks, and today's meals with what is next. Without meal plans yet
// (NG PHASE 7) the up-next card asks what you are having instead of offering "Ate as planned".

const G = COLORS.green;
const DEFAULT_GOALS: NutritionDefaults = { calories: 2000, protein_g: 140, carbs_g: 220, fats_g: 65 };
const SLOTS: MealType[] = ['Breakfast', 'Lunch', 'Dinner'];

const timeText = (iso: string) => new Date(iso).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });

/** Premium N3: each macro keeps its own colour everywhere: protein pink, carbs amber, fat sky blue. */
const MACRO = { protein: '#F472B6', carbs: '#F59E0B', fat: '#38BDF8' } as const;

export default function NutritionTab() {
  const { userId, meals, saveMeal, removeMeal } = useAppState();
  const penMarks = usePenMarks(7);
  const router = useRouter();
  // Polish step 5: "Something else" on a meal reminder opens the + sheet for that meal.
  const { search } = useLocalSearchParams<{ search?: string }>();
  const insets = useSafeAreaInsets();
  const tabPad28 = useTabBottomPad(28);
  const hideBar = useHideBarOnScroll('nutrition');
  const pull = usePullToRefresh('#22C55E');
  const [targets, setTargets] = useState<NutritionDefaults | null>(null);
  const [targetsLoaded, setTargetsLoaded] = useState(false);
  const [askFoodProfile, setAskFoodProfile] = useState(false);
  const [selectedMeal, setSelectedMeal] = useState<MealLogRow | null>(null);
  const [usuals, setUsuals] = useState<Usual[]>([]);
  const [recent, setRecent] = useState<string[]>([]);
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchFor, setSearchFor] = useState<MealType | null>(null); // a missed meal being answered with Something else
  const toast = useToast();
  const [plan, setPlan] = useState<StoredPlan | null>(null);
  const mealsRef = useRef(meals);
  mealsRef.current = meals;
  const [swapMeal, setSwapMeal] = useState<PlannedMeal | null>(null);
  const [swapList, setSwapList] = useState<PlannedMeal[]>([]);
  const [logging, setLogging] = useState(false);

  useFocusEffect(
    useCallback(() => {
      if (!userId) return;
      let cancelled = false;
      getProfile(userId).then((profile) => {
        if (cancelled) return;
        const t = profile?.personalization_profile?.nutritionDefaults ?? null;
        setTargets(t);
        setAskFoodProfile(shouldAskFoodProfile(!!t, normalizeFoodProfile(profile?.personalization_profile?.foodProfile)));
        setTargetsLoaded(true);
      });
      ensureMealPlans(userId).then(async (p) => {
        if (cancelled) return;
        setPlan(p);
        // Something other than the plan was eaten (a photo log, a usual): plan the rest of the day again.
        if (p && mealsRef.current.some((m) => m.plan_status !== 'as_planned')) {
          const re = await replanToday(userId, mealsRef.current);
          if (re && !cancelled) setPlan(re);
        }
      });
      getRecentMeals(userId, 14).then((rows) => {
        if (cancelled) return;
        setUsuals(usualsFrom(rows));
        setRecent(Array.from(new Set(rows.map((r) => r.description))).slice(0, 8));
      });
      return () => {
        cancelled = true;
      };
    }, [userId])
  );

  useEffect(() => () => {
  }, []);

  const goals = targets
    ? { kcal: targets.calories, protein: targets.protein_g, carbs: targets.carbs_g, fats: targets.fats_g }
    : { kcal: DEFAULT_GOALS.calories, protein: DEFAULT_GOALS.protein_g, carbs: DEFAULT_GOALS.carbs_g, fats: DEFAULT_GOALS.fats_g };

  const consumed = Math.round(meals.reduce((s, m) => s + (m.calories ?? 0), 0));
  const protein = Math.round(meals.reduce((s, m) => s + (m.protein_g ?? 0), 0));
  const carbs = Math.round(meals.reduce((s, m) => s + (m.carbs_g ?? 0), 0));
  const fats = Math.round(meals.reduce((s, m) => s + (m.fats_g ?? 0), 0));
  const loggedTypes = meals.map((m) => m.meal_type ?? '').filter(Boolean);
  const hour = new Date().getHours();
  const upNext = nextMealFor(loggedTypes, hour);
  const pen = proteinGapNote(protein, targets ? goals.protein : null, upNext);
  const sorted = useMemo(() => meals.filter((m) => m.plan_status !== 'skipped').sort((a, b) => a.logged_at.localeCompare(b.logged_at)), [meals]);

  // Each logged meal is rated against what the day needed at that point.
  const rated = useMemo(() => {
    let kcalBefore = 0;
    let proteinBefore = 0;
    return sorted.map((m, i) => {
      const later = nextMealFor(sorted.slice(0, i + 1).map((x) => x.meal_type ?? ''), new Date(m.logged_at).getHours());
      const r = rateMeal(
        { kcal: m.calories ?? 0, protein: m.protein_g ?? 0, fats: m.fats_g ?? 0, sodiumMg: m.nutrients?.sodiumMg ?? null, mealType: m.meal_type },
        { kcalTarget: goals.kcal, proteinTarget: goals.protein, kcalBefore, proteinBefore, nextMeal: later }
      );
      kcalBefore += m.calories ?? 0;
      proteinBefore += m.protein_g ?? 0;
      return { meal: m, ...r };
    });
  }, [sorted, goals.kcal, goals.protein]);

  const logUsual = async (u: Usual) => {
    const type = (u.mealType as MealType | null) ?? upNext ?? 'Snack';
    const row = await saveMeal(type, { description: u.label, calories: u.kcal, protein_g: u.protein, carbs_g: u.carbs, fats_g: u.fats, planStatus: 'extra' });
    if (!row) return;
    replanToday(userId!, [...meals, row]).then((p) => p && setPlan(p));
    toast.show({ message: `Logged ${u.label}`, actionLabel: 'Undo', onAction: () => { removeMeal(row.id); } });
  };


  useEffect(() => {
    if (!search || !['breakfast', 'lunch', 'dinner'].includes(search)) return;
    setSearchFor((search.charAt(0).toUpperCase() + search.slice(1)) as MealType);
    setSearchOpen(true);
    router.setParams({ search: undefined });
  }, [search, router]);

  const slots = useMemo(() => slotViews(plan, meals, hour), [plan, meals, hour]);
  const upSlot = slots.find((v) => v.state === 'up_next') ?? null;
  const missedSlots = slots.filter((v) => v.state === 'missed');
  const [showMissed, setShowMissed] = useState(false);

  const ateAsPlanned = async (m: PlannedMeal) => {
    if (logging) return;
    setLogging(true);
    const type = (m.meal.charAt(0).toUpperCase() + m.meal.slice(1)) as MealType;
    const row = await saveMeal(type, plannedToMeal(m));
    setLogging(false);
    if (row) toast.show({ message: `Logged ${m.meal}`, actionLabel: 'Undo', onAction: () => { removeMeal(row.id); } });
  };

  // A meal logged some other way changes what is left of the day: plan the rest again.
  const afterOtherLog = async (row: MealLogRow) => {
    setSearchOpen(false);
    setSearchFor(null);
    if (!userId) return;
    const p = await replanToday(userId, [...meals, row]);
    if (p) setPlan(p);
  };

  // A missed meal keeps its card: answer it later with As planned / Something else / Skipped, saved at once.
  const answerMissed = async (slot: MealSlot, kind: 'planned' | 'skipped' | 'else', m: PlannedMeal | null) => {
    if (logging) return;
    const type = (slot.charAt(0).toUpperCase() + slot.slice(1)) as MealType;
    if (kind === 'else') {
      setSearchFor(type);
      setSearchOpen(true);
      return;
    }
    setLogging(true);
    const row = await saveMeal(type, kind === 'planned' && m ? plannedToMeal(m) : SKIPPED);
    setLogging(false);
    if (row && userId) replanToday(userId, [...meals, row]).then((p) => p && setPlan(p));
  };

  const openSwap = async (m: PlannedMeal) => {
    if (!userId) return;
    setSwapMeal(m);
    setSwapList(await swapChoices(userId, m));
  };

  const chooseSwap = async (choice: PlannedMeal) => {
    if (!userId || !plan) return;
    setPlan(await applySwap(userId, plan, choice));
    setSwapMeal(null);
  };

  // Scan and the camera buttons open the scanner (NG PHASE 9); describing a meal in words is still on the meal-log screen.
  const openAdd = (type: MealType) => router.push({ pathname: '/scan', params: { mealType: type } });
  const addType: MealType = upNext ?? 'Snack';

  const size = 150;
  const sw = 12;
  const pct = goals.kcal > 0 ? (consumed / goals.kcal) * 100 : 0;
  const line = dayLine(meals.filter((m) => m.plan_status !== 'skipped').map((m) => m.meal_type ?? ''), protein, targets ? goals.protein : null);

  const action = (label: string, icon: string, onPress: () => void, primary = false, flex = 1) => (
    <PressScale onPress={onPress} accessibilityRole="button" accessibilityLabel={label} style={{ flex }}>
      <View
        style={{
          minHeight: 52,
          borderRadius: 16,
          borderWidth: 1,
          borderColor: primary ? G : COLORS.greenBorderMd,
          backgroundColor: primary ? G : 'rgba(34,197,94,0.08)',
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 8,
        }}
      >
        <Icon name={icon} size={18} color={primary ? '#052e16' : G} />
        <Text style={{ color: primary ? '#052e16' : G, fontSize: 17, fontFamily: BG[800] }}>{label}</Text>
      </View>
    </PressScale>
  );

  return (
    <View style={{ flex: 1, backgroundColor: COLORS.bg }}>
      <ScrollView {...hideBar} key={pull.key} refreshControl={pull.refreshControl} showsVerticalScrollIndicator={false}>
        <View
          style={{
            paddingHorizontal: 16,
            paddingTop: insets.top + HEADER_CONTENT_HEIGHT + 8,
            paddingBottom: tabPad28,
            gap: 14,
          }}
        >
          <View>
            <SectionLabel color={G}>{dayLabel(new Date()).toUpperCase()}</SectionLabel>
          </View>

          {targetsLoaded && !targets && (
            <TouchableOpacity
              activeOpacity={0.85}
              onPress={() => router.push('/nutrition-setup')}
              accessibilityRole="button"
              style={{ flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: COLORS.card, borderWidth: 1, borderColor: COLORS.greenBorder, borderRadius: 16, paddingHorizontal: 16, paddingVertical: 14 }}
            >
              <View style={{ width: 36, height: 36, borderRadius: 10, backgroundColor: 'rgba(34,197,94,0.14)', alignItems: 'center', justifyContent: 'center' }}>
                <Icon name="sparkles" size={16} color={G} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={{ color: '#fff', fontSize: 15, fontFamily: BG[700] }}>Set up your meals</Text>
                <Text style={{ color: COLORS.textMuted, fontSize: 13, marginTop: 1, fontFamily: BG[400] }}>Three short steps. Showing generic targets for now.</Text>
              </View>
              <Icon name="chevron-right" size={16} color={COLORS.textMuted} />
            </TouchableOpacity>
          )}

          {askFoodProfile && (
            <Surface radius={20} padding={14} borderColor={COLORS.greenBorder}><View style={{ gap: 10 }}>
              <Text style={{ color: '#fff', fontSize: 15, fontFamily: BG[700] }}>What do you like to eat?</Text>
              <Text style={{ color: COLORS.textMuted, fontSize: 13, lineHeight: 18, fontFamily: BG[400] }}>Tell us your cuisines and foods to avoid and suggestions will fit you better.</Text>
              <View style={{ flexDirection: 'row', gap: 10 }}>
                <TouchableOpacity
                  activeOpacity={0.85}
                  onPress={() => router.push({ pathname: '/screens/nutrition-setup/foodprofile', params: { edit: '1' } })}
                  style={{ minHeight: 44, paddingHorizontal: 14, borderRadius: 12, backgroundColor: 'rgba(34,197,94,0.14)', justifyContent: 'center' }}
                >
                  <Text style={{ color: G, fontSize: 15, fontFamily: BG[700] }}>Set preferences</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  activeOpacity={0.85}
                  onPress={() => {
                    setAskFoodProfile(false);
                    if (userId) saveFoodProfile(userId, normalizeFoodProfile({}));
                  }}
                  style={{ minHeight: 44, paddingHorizontal: 14, justifyContent: 'center' }}
                >
                  <Text style={{ color: COLORS.textMuted, fontSize: 15, fontFamily: BG[600] }}>Not now</Text>
                </TouchableOpacity>
              </View>
            </View></Surface>
          )}

          {!targetsLoaded ? (
            <Skeleton height={200} borderRadius={20} />
          ) : (
            <Rise i={0}>
            <Surface padding={18}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 18 }}>
                <ProgressRing size={size} rings={[{ r: (size - sw) / 2, strokeWidth: sw, color: G, pct: consumed === 0 ? 0 : pct }]} trackColor="rgba(255,255,255,0.055)">
                  <Text style={{ color: '#fff', fontSize: 28, fontVariant: ['tabular-nums'], fontFamily: BG[800] }}>{consumed.toLocaleString('en-IN')}</Text>
                  <Text style={{ color: COLORS.textMuted, fontSize: 13, fontFamily: BG[400] }}>of {goals.kcal.toLocaleString('en-IN')} kcal</Text>
                </ProgressRing>
                <View style={{ flex: 1, gap: 12 }}>
                  {[
                    { label: 'Protein', cur: protein, goal: goals.protein, color: MACRO.protein },
                    { label: 'Carbs', cur: carbs, goal: goals.carbs, color: MACRO.carbs },
                    { label: 'Fat', cur: fats, goal: goals.fats, color: MACRO.fat },
                  ].map((m) => (
                    <View key={m.label}>
                      <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 5 }}>
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                          <View style={{ width: 7, height: 7, borderRadius: 4, backgroundColor: m.color, boxShadow: `0px 0px 6px ${m.color}` } as object} />
                          <Text style={{ color: COLORS.textMuted, fontSize: 15, fontFamily: BG[400] }}>{m.label}</Text>
                        </View>
                        <Text style={{ fontFamily: BG[400], fontVariant: ['tabular-nums'] }}>
                          <Text style={{ color: '#fff', fontSize: 15, fontWeight: '800' }}>{m.cur}</Text>
                          <Text style={{ color: COLORS.textMuted, fontSize: 13 }}> / {m.goal} g</Text>
                        </Text>
                      </View>
                      <ProgressBar pct={m.goal > 0 ? (m.cur / m.goal) * 100 : 0} color={m.color} height={6} />
                    </View>
                  ))}
                </View>
              </View>
              {pen ? <Text style={{ color: COLORS.fg, fontSize: 22, marginTop: 14, fontFamily: FONT_HAND }}>{pen}</Text> : null}
              <Text style={{ color: COLORS.textMuted, fontSize: 13, marginTop: pen ? 4 : 14, fontFamily: BG[400] }}>{line}</Text>
            </Surface>
            </Rise>
          )}

          {/* Premium N1: Scan a meal is the one big green button; Search and Diary sit under it, tinted. */}
          <Rise i={1}>
          <View style={{ gap: 10 }}>
            <Button variant="primary" size="lg" fullWidth accent={G} accentDeep={COLORS.greenDeep} onPress={() => openAdd(addType)} icon={<Icon name="camera" size={19} color="#fff" />}>
              Scan a meal
            </Button>
            <View style={{ flexDirection: 'row', gap: 10 }}>
              <View style={{ flex: 1 }}>
                <Button variant="secondary" size="md" fullWidth accent={G} onPress={() => setSearchOpen(true)} icon={<Icon name="search" size={16} color={G} />}>
                  Search
                </Button>
              </View>
              <View style={{ flex: 1 }}>
                <Button variant="secondary" size="md" fullWidth accent={G} onPress={() => router.push('/diary')} icon={<Icon name="utensils" size={16} color={G} />}>
                  Diary
                </Button>
              </View>
            </View>
          </View>
          </Rise>

          {usuals.length > 0 ? (
            <View style={{ gap: 10 }}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                <SectionLabel color={G}>YOUR USUALS · ONE TAP</SectionLabel>
                <Text style={{ color: COLORS.textMuted, fontSize: 13, fontFamily: BG[400] }}>from your last 2 weeks</Text>
              </View>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 10 }}>
                {usuals.map((u) => (
                  <PressScale key={u.key} onPress={() => logUsual(u)} accessibilityRole="button" accessibilityLabel={`Log ${u.label}, ${u.kcal} kilocalories`}>
                    <View style={{ minHeight: 44, borderRadius: 22, borderWidth: 1, borderColor: COLORS.borderStrong, backgroundColor: COLORS.card, paddingHorizontal: 16, flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                      <Text style={{ color: COLORS.fg, fontSize: 15, fontFamily: BG[700] }}>+ {u.label.length > 24 ? `${u.label.slice(0, 24)}…` : u.label}</Text>
                      <Text style={{ color: COLORS.textMuted, fontSize: 13, fontFamily: BG[400] }}>{u.kcal} kcal</Text>
                    </View>
                  </PressScale>
                ))}
              </ScrollView>
            </View>
          ) : null}

          <CatchUpBanner />

          <View style={{ gap: 10 }}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
              <SectionLabel color={G}>{plan ? "TODAY'S PLAN · 3 MEALS" : "TODAY'S MEALS"}</SectionLabel>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 2, flexShrink: 1, marginLeft: 12 }}>
                <Text numberOfLines={1} style={{ color: COLORS.textMuted, fontSize: 13, fontFamily: BG[400], flexShrink: 1 }}>{plan ? planLine(plan) : 'set up your meals for a plan'}</Text>
                {missedSlots.length > 0 ? (
                  <PressScale onPress={() => setShowMissed((x) => !x)} accessibilityRole="button" accessibilityState={{ expanded: showMissed }} accessibilityLabel={showMissed ? 'Hide meals you have not logged' : 'Show meals you have not logged'} hitSlop={4}>
                    <View style={{ width: 44, height: 44, alignItems: 'center', justifyContent: 'center' }}>
                      <Icon name={showMissed ? 'chevron-up' : 'chevron-down'} size={20} color={COLORS.textMuted} />
                    </View>
                  </PressScale>
                ) : null}
              </View>
            </View>
            {plan?.notes.map((n) => (
              <Text key={n} style={{ color: COLORS.textMuted, fontSize: 13, fontFamily: BG[400] }}>{n}</Text>
            ))}

            {slots.map((v) => {
              const label = slotLabel(v.slot);
              // Meals you have not logged fold into one row until you open them (each is a tall card with three buttons).
              if (v.state === 'missed' && !showMissed) {
                if (v.slot !== missedSlots[0]?.slot) return null;
                return (
                  <PressScale key="missed-fold" onPress={() => setShowMissed(true)} accessibilityRole="button" accessibilityLabel={`${missedSlots.length} meals not logged. Open them.`}>
                    <Surface radius={20} padding={0} grain={0.06}>
                      <View style={{ minHeight: 64, flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 16 }}>
                        <View style={{ width: 40, height: 40, borderRadius: 12, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(245,158,11,0.14)' }}>
                          <Icon name="clock" size={19} color={COLORS.amber} />
                        </View>
                        <View style={{ flex: 1 }}>
                          <Text style={{ color: COLORS.fg, fontSize: 17, fontFamily: BG[700] }}>{missedSlots.length === 1 ? `${slotLabel(missedSlots[0].slot)} not logged` : `${missedSlots.length} meals not logged`}</Text>
                          <Text style={{ color: COLORS.textMuted, fontSize: 13, fontFamily: BG[400] }}>{missedSlots.map((m) => slotLabel(m.slot)).join(', ')} {'·'} tap to answer</Text>
                        </View>
                        <Icon name="chevron-down" size={20} color={COLORS.textMuted} />
                      </View>
                    </Surface>
                  </PressScale>
                );
              }
              if (v.logged) {
                const r = rated.find((x) => x.meal.id === v.logged!.id);
                const old = plan?.replaced?.[v.slot];
                return (
                  <MealCard
                    key={v.slot}
                    mealType={v.logged.meal_type}
                    time={timeText(v.logged.logged_at)}
                    planStatus={v.state === 'as_planned' || v.state === 'swapped' || v.state === 'skipped' ? v.state : 'extra'}
                    name={v.logged.description}
                    macros={v.state === 'skipped' ? 'no meal' : `${Math.round(v.logged.calories ?? 0)} kcal · P ${Math.round(v.logged.protein_g ?? 0)} g${old && v.state === 'swapped' ? ` · was ${old}` : ''}`}
                    photoPath={(v.logged as MealLogRow).photo_url}
                    rating={r?.rating}
                    onPress={() => setSelectedMeal(v.logged as MealLogRow)}
                  />
                );
              }
              if (v.state === 'up_next') {
                const m = v.planned;
                const old = plan?.replaced?.[v.slot];
                return (
                  <Surface key={v.slot} radius={20} padding={16} borderColor={COLORS.greenBorderMd}><View style={{ gap: 10 }}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                      {/* Premium N2: a round tile for the meal, so each card has a face before there is a photo. */}
                      <View style={{ width: 48, height: 48, borderRadius: 24, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(34,197,94,0.14)', borderWidth: 1, borderColor: COLORS.greenBorderMd }}>
                        <Icon name={v.slot === 'breakfast' ? 'coffee' : v.slot === 'lunch' ? 'salad' : 'utensils'} size={22} color={G} />
                      </View>
                      <Text style={{ flex: 1, color: COLORS.textMuted, fontSize: 15, fontFamily: BG[400] }}>{label} · up next</Text>
                    </View>
                    {m ? (
                      <>
                        {old ? <Text style={{ color: COLORS.textMuted, fontSize: 15, textDecorationLine: 'line-through', fontFamily: BG[400] }}>{old}</Text> : null}
                        <Text style={{ color: COLORS.fg, fontSize: 22, textDecorationLine: old ? 'underline' : 'none', fontFamily: BG[800] }}>{mealTitle(m)}</Text>
                        <Text style={{ color: COLORS.textMuted, fontSize: 15, fontVariant: ['tabular-nums'], fontFamily: BG[400] }}>{m.kcal} kcal · P {Math.round(m.protein)} g</Text>
                        <Text style={{ color: COLORS.textMuted, fontSize: 13, lineHeight: 18, fontFamily: BG[400] }}>{itemsText(m)}</Text>
                        <SlotPenMark marks={penMarks.marks} slot={v.slot} onDecide={penMarks.decide} />
                        {old ? <Text style={{ color: COLORS.fg, fontSize: 20, fontFamily: FONT_HAND }}>changed to fit the rest of your day</Text> : null}
                        <View style={{ flexDirection: 'row', gap: 10, alignItems: 'center' }}>
                          <View style={{ flex: 1.3 }}>
                            <Button variant="primary" accent={G} accentDeep={COLORS.greenDeep} size="md" fullWidth disabled={logging} onPress={() => ateAsPlanned(m)} icon={<Icon name="check" size={16} color="#fff" />}>
                              Ate as planned
                            </Button>
                          </View>
                          <View style={{ flex: 1 }}>
                            <Button variant="secondary" accent={G} size="md" fullWidth onPress={() => setSearchOpen(true)}>
                              Different
                            </Button>
                          </View>
                          <PressScale onPress={() => openAdd(upNext ?? 'Snack')} accessibilityRole="button" accessibilityLabel="Log with a photo">
                            <View style={{ width: 44, height: 40, borderRadius: 20, borderWidth: 1, borderColor: COLORS.greenBorderMd, alignItems: 'center', justifyContent: 'center' }}>
                              <Icon name="camera" size={18} color={G} />
                            </View>
                          </PressScale>
                        </View>
                        <PressScale onPress={() => openSwap(m)} accessibilityRole="button" accessibilityLabel="Swap this meal for another">
                          <View style={{ minHeight: 40, justifyContent: 'center' }}>
                            <Text style={{ color: G, fontSize: 15, fontFamily: BG[700] }}>Swap for another {v.slot}</Text>
                          </View>
                        </PressScale>
                      </>
                    ) : (
                      <>
                        <Text style={{ color: COLORS.fg, fontSize: 22, fontFamily: BG[800] }}>What are you having?</Text>
                        <Text style={{ color: COLORS.textMuted, fontSize: 15, fontFamily: BG[400] }}>
                          {Math.max(0, goals.kcal - consumed).toLocaleString('en-IN')} kcal and {Math.max(0, goals.protein - protein)} g protein left today
                        </Text>
                        <View style={{ flexDirection: 'row', gap: 10 }}>
                          <View style={{ flex: 1.2 }}>
                            <Button variant="primary" accent={G} accentDeep={COLORS.greenDeep} size="md" fullWidth onPress={() => setSearchOpen(true)} icon={<Icon name="search" size={16} color="#fff" />}>
                              Search
                            </Button>
                          </View>
                          <View style={{ flex: 1 }}>
                            <Button variant="secondary" accent={G} size="md" fullWidth onPress={() => openAdd(upNext ?? 'Snack')} icon={<Icon name="camera" size={16} color={G} />}>
                              Photo
                            </Button>
                          </View>
                        </View>
                      </>
                    )}
                  </View></Surface>
                );
              }
              if (v.state === 'missed') {
                const m = v.planned;
                return (
                  <Surface key={v.slot} radius={20} padding={16}><View style={{ gap: 10 }}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                      <View style={{ width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(255,255,255,0.06)' }}>
                        <Icon name={v.slot === 'breakfast' ? 'coffee' : v.slot === 'lunch' ? 'salad' : 'utensils'} size={17} color={COLORS.textMuted} />
                      </View>
                      <Text style={{ flex: 1, color: COLORS.textMuted, fontSize: 15, fontFamily: BG[400] }}>{label} · not logged yet</Text>
                    </View>
                    {m ? (
                      <Text style={{ color: COLORS.fg, fontSize: 17, fontFamily: BG[700] }}>
                        {mealTitle(m)} <Text style={{ color: COLORS.textMuted, fontWeight: '400', fontSize: 15 }}>· {m.kcal} kcal · P {Math.round(m.protein)} g</Text>
                      </Text>
                    ) : null}
                    <View style={{ gap: 8 }}>
                      <View style={{ flexDirection: 'row', gap: 8 }}>
                        {m ? (
                          <View style={{ flex: 1 }}>
                            <Button variant="primary" accent={G} accentDeep={COLORS.greenDeep} size="md" fullWidth disabled={logging} onPress={() => answerMissed(v.slot, 'planned', m)}>
                              As planned
                            </Button>
                          </View>
                        ) : null}
                        <View style={{ flex: 1 }}>
                          <Button variant="secondary" accent={G} size="md" fullWidth onPress={() => answerMissed(v.slot, 'else', m)}>
                            Different
                          </Button>
                        </View>
                      </View>
                      <Button variant="ghost" size="sm" fullWidth disabled={logging} onPress={() => answerMissed(v.slot, 'skipped', m)}>
                        I skipped it
                      </Button>
                    </View>
                    <SlotPenMark marks={penMarks.marks} slot={v.slot} onDecide={penMarks.decide} />
                  </View></Surface>
                );
              }
              return (
                <View key={v.slot} style={{ borderRadius: 16, borderWidth: 1, borderColor: COLORS.border, borderStyle: 'dashed', padding: 14, gap: 2 }}>
                  <Text style={{ color: COLORS.textMuted, fontSize: 15, fontFamily: BG[400] }}>{label} · later</Text>
                  {v.planned ? (
                    <Text style={{ color: COLORS.fg, fontSize: 17, fontFamily: BG[700] }}>
                      {mealTitle(v.planned)} <Text style={{ color: COLORS.textMuted, fontWeight: '400', fontSize: 15 }}>· {v.planned.kcal} kcal · P {Math.round(v.planned.protein)} g</Text>
                    </Text>
                  ) : null}
                  <SlotPenMark marks={penMarks.marks} slot={v.slot} onDecide={penMarks.decide} />
                </View>
              );
            })}
            {!plan && targetsLoaded ? (
              <Text style={{ color: COLORS.textMuted, fontSize: 13, lineHeight: 18, fontFamily: BG[400] }}>
                Finish "Set up your meals" and your three meals a day are planned from what you can get.
              </Text>
            ) : null}
          </View>

          <PressScale onPress={() => router.push('/diary')} accessibilityRole="button" accessibilityLabel="Food diary: photos, ratings and micronutrients">
            <View style={{ borderRadius: 20, borderWidth: 1, borderColor: COLORS.greenBorderMd, backgroundColor: 'rgba(34,197,94,0.08)', padding: 16, flexDirection: 'row', alignItems: 'center', gap: 14 }}>
              <View style={{ width: 48, height: 44, borderRadius: 12, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(34,197,94,0.14)', borderWidth: 1, borderColor: COLORS.greenBorder }}>
                <Icon name="utensils" size={22} color={G} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={{ color: COLORS.fg, fontSize: 17, fontFamily: BG[800] }}>Food diary</Text>
                <Text style={{ color: COLORS.textMuted, fontSize: 15, fontFamily: BG[400] }}>Photos, ratings and micronutrients</Text>
              </View>
              <Icon name="chevron-right" size={18} color={COLORS.textMuted} />
            </View>
          </PressScale>
        </View>
      </ScrollView>


      <MealDetailModal meal={selectedMeal} onClose={() => setSelectedMeal(null)} />
      <FoodSearchSheet visible={searchOpen} mealType={searchFor ?? addType} recent={recent} planned={!!upSlot?.planned} onClose={() => { setSearchOpen(false); setSearchFor(null); }} onLogged={afterOtherLog} />

      <BottomSheet visible={swapMeal !== null} onClose={() => setSwapMeal(null)}>
        <View style={{ padding: 20, gap: 12 }}>
          <Text style={{ color: COLORS.fg, fontSize: 20, fontFamily: BG[800] }}>Swap {swapMeal?.meal}</Text>
          <Text style={{ color: COLORS.textMuted, fontSize: 15, fontFamily: BG[400] }}>Close in calories and protein to what was planned.</Text>
          {swapList.length === 0 ? <Text style={{ color: COLORS.textMuted, fontSize: 15, fontFamily: BG[400] }}>No close match from what you can get.</Text> : null}
          {swapList.map((o) => (
            <PressScale key={o.templateId} onPress={() => chooseSwap(o)} accessibilityRole="button" accessibilityLabel={`${o.name}, ${o.kcal} kilocalories`}>
              <Surface padding={14}>
                <Text style={{ color: COLORS.fg, fontSize: 17, fontFamily: BG[800] }}>{o.name}</Text>
                <Text style={{ color: COLORS.textMuted, fontSize: 15, fontFamily: BG[400] }}>{o.kcal} kcal · P {Math.round(o.protein)} g</Text>
              </Surface>
            </PressScale>
          ))}
        </View>
      </BottomSheet>
    </View>
  );
}
