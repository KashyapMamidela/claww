import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ScrollView, Text, TouchableOpacity, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useFocusEffect } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTabBottomPad } from '../../lib/useTabBottomPad';
import { COLORS, FONT, FONT_HAND, HEADER_CONTENT_HEIGHT, TAB_BAR_CONTENT_HEIGHT } from '../../lib/theme';
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
import { Display } from '../../components/ui/Typography';
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

export default function NutritionTab() {
  const { userId, meals, saveMeal, removeMeal } = useAppState();
  const penMarks = usePenMarks(7);
  const router = useRouter();
  // Polish step 5: "Something else" on a meal reminder opens the + sheet for that meal.
  const { search } = useLocalSearchParams<{ search?: string }>();
  const insets = useSafeAreaInsets();
  const tabPad28 = useTabBottomPad(28);
  const [targets, setTargets] = useState<NutritionDefaults | null>(null);
  const [targetsLoaded, setTargetsLoaded] = useState(false);
  const [askFoodProfile, setAskFoodProfile] = useState(false);
  const [selectedMeal, setSelectedMeal] = useState<MealLogRow | null>(null);
  const [usuals, setUsuals] = useState<Usual[]>([]);
  const [recent, setRecent] = useState<string[]>([]);
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchFor, setSearchFor] = useState<MealType | null>(null); // a missed meal being answered with Something else
  const [undo, setUndo] = useState<{ id: string; label: string } | null>(null);
  const undoTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
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
    if (undoTimer.current) clearTimeout(undoTimer.current);
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
    setUndo({ id: row.id, label: u.label });
    if (undoTimer.current) clearTimeout(undoTimer.current);
    undoTimer.current = setTimeout(() => setUndo(null), 6000);
  };

  const undoLast = async () => {
    if (!undo) return;
    const id = undo.id;
    setUndo(null);
    await removeMeal(id);
  };

  useEffect(() => {
    if (!search || !['breakfast', 'lunch', 'dinner'].includes(search)) return;
    setSearchFor((search.charAt(0).toUpperCase() + search.slice(1)) as MealType);
    setSearchOpen(true);
    router.setParams({ search: undefined });
  }, [search, router]);

  const slots = useMemo(() => slotViews(plan, meals, hour), [plan, meals, hour]);
  const upSlot = slots.find((v) => v.state === 'up_next') ?? null;

  const ateAsPlanned = async (m: PlannedMeal) => {
    if (logging) return;
    setLogging(true);
    const type = (m.meal.charAt(0).toUpperCase() + m.meal.slice(1)) as MealType;
    await saveMeal(type, plannedToMeal(m));
    setLogging(false);
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
        <Text style={{ color: primary ? '#052e16' : G, fontSize: 16, fontWeight: '800', fontFamily: FONT }}>{label}</Text>
      </View>
    </PressScale>
  );

  return (
    <View style={{ flex: 1, backgroundColor: COLORS.bg }}>
      <ScrollView showsVerticalScrollIndicator={false}>
        <View
          style={{
            paddingHorizontal: 16,
            paddingTop: insets.top + HEADER_CONTENT_HEIGHT + 8,
            paddingBottom: tabPad28,
            gap: 14,
          }}
        >
          <View>
            <SectionLabel color={G}>{new Date().toLocaleDateString(undefined, { weekday: 'long', month: 'short', day: 'numeric' }).toUpperCase()}</SectionLabel>
            <Display style={{ marginTop: 4 }}>Nutrition</Display>
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
                <Text style={{ color: '#fff', fontSize: 15, fontWeight: '700', fontFamily: FONT }}>Set up your meals</Text>
                <Text style={{ color: COLORS.textMuted, fontSize: 13, marginTop: 1, fontFamily: FONT }}>Three short steps. Showing generic targets for now.</Text>
              </View>
              <Icon name="chevron-right" size={16} color={COLORS.textMuted} />
            </TouchableOpacity>
          )}

          {askFoodProfile && (
            <View style={{ backgroundColor: COLORS.card, borderWidth: 1, borderColor: COLORS.greenBorder, borderRadius: 16, padding: 14, gap: 10 }}>
              <Text style={{ color: '#fff', fontSize: 15, fontWeight: '700', fontFamily: FONT }}>What do you like to eat?</Text>
              <Text style={{ color: COLORS.textMuted, fontSize: 13, lineHeight: 18, fontFamily: FONT }}>Tell us your cuisines and foods to avoid and suggestions will fit you better.</Text>
              <View style={{ flexDirection: 'row', gap: 10 }}>
                <TouchableOpacity
                  activeOpacity={0.85}
                  onPress={() => router.push({ pathname: '/screens/nutrition-setup/foodprofile', params: { edit: '1' } })}
                  style={{ minHeight: 44, paddingHorizontal: 14, borderRadius: 12, backgroundColor: 'rgba(34,197,94,0.14)', justifyContent: 'center' }}
                >
                  <Text style={{ color: G, fontSize: 14, fontWeight: '700', fontFamily: FONT }}>Set preferences</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  activeOpacity={0.85}
                  onPress={() => {
                    setAskFoodProfile(false);
                    if (userId) saveFoodProfile(userId, normalizeFoodProfile({}));
                  }}
                  style={{ minHeight: 44, paddingHorizontal: 14, justifyContent: 'center' }}
                >
                  <Text style={{ color: COLORS.textMuted, fontSize: 14, fontWeight: '600', fontFamily: FONT }}>Not now</Text>
                </TouchableOpacity>
              </View>
            </View>
          )}

          {!targetsLoaded ? (
            <Skeleton height={200} borderRadius={20} />
          ) : (
            <Surface padding={18}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 18 }}>
                <ProgressRing size={size} rings={[{ r: (size - sw) / 2, strokeWidth: sw, color: G, pct: consumed === 0 ? 0 : pct }]} trackColor="rgba(255,255,255,0.055)">
                  <Text style={{ color: '#fff', fontSize: 30, fontWeight: '900', fontVariant: ['tabular-nums'], fontFamily: FONT }}>{consumed.toLocaleString('en-IN')}</Text>
                  <Text style={{ color: COLORS.textMuted, fontSize: 13, fontFamily: FONT }}>of {goals.kcal.toLocaleString('en-IN')} kcal</Text>
                </ProgressRing>
                <View style={{ flex: 1, gap: 12 }}>
                  {[
                    { label: 'Protein', cur: protein, goal: goals.protein, color: G },
                    { label: 'Carbs', cur: carbs, goal: goals.carbs, color: COLORS.amber },
                    { label: 'Fat', cur: fats, goal: goals.fats, color: '#FB923C' },
                  ].map((m) => (
                    <View key={m.label}>
                      <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 5 }}>
                        <Text style={{ color: COLORS.textMuted, fontSize: 14, fontFamily: FONT }}>{m.label}</Text>
                        <Text style={{ fontFamily: FONT, fontVariant: ['tabular-nums'] }}>
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
              <Text style={{ color: COLORS.textMuted, fontSize: 13, marginTop: pen ? 4 : 14, fontFamily: FONT }}>{line}</Text>
            </Surface>
          )}

          <View style={{ flexDirection: 'row', gap: 10 }}>
            {action('Scan', 'camera', () => openAdd(addType), true, 1.3)}
            {action('Search', 'search', () => setSearchOpen(true))}
            {action('Diary', 'utensils', () => router.push('/diary'))}
          </View>

          {usuals.length > 0 ? (
            <View style={{ gap: 10 }}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                <SectionLabel color={G}>YOUR USUALS · ONE TAP</SectionLabel>
                <Text style={{ color: COLORS.textMuted, fontSize: 13, fontFamily: FONT }}>from your last 2 weeks</Text>
              </View>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 10 }}>
                {usuals.map((u) => (
                  <PressScale key={u.key} onPress={() => logUsual(u)} accessibilityRole="button" accessibilityLabel={`Log ${u.label}, ${u.kcal} kilocalories`}>
                    <View style={{ minHeight: 44, borderRadius: 22, borderWidth: 1, borderColor: COLORS.borderStrong, backgroundColor: COLORS.card, paddingHorizontal: 16, flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                      <Text style={{ color: COLORS.fg, fontSize: 15, fontWeight: '700', fontFamily: FONT }}>+ {u.label.length > 24 ? `${u.label.slice(0, 24)}…` : u.label}</Text>
                      <Text style={{ color: COLORS.textMuted, fontSize: 13, fontFamily: FONT }}>{u.kcal} kcal</Text>
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
              <Text style={{ color: COLORS.textMuted, fontSize: 13, fontFamily: FONT }}>{plan ? planLine(plan) : 'set up your meals for a plan'}</Text>
            </View>
            {plan?.notes.map((n) => (
              <Text key={n} style={{ color: COLORS.textMuted, fontSize: 13, fontFamily: FONT }}>{n}</Text>
            ))}

            {slots.map((v) => {
              const label = slotLabel(v.slot);
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
                  <View key={v.slot} style={{ borderRadius: 20, borderWidth: 1, borderColor: COLORS.greenBorderMd, backgroundColor: COLORS.card, padding: 16, gap: 10 }}>
                    <Text style={{ color: COLORS.textMuted, fontSize: 14, fontFamily: FONT }}>{label} · up next</Text>
                    {m ? (
                      <>
                        {old ? <Text style={{ color: COLORS.textMuted, fontSize: 15, textDecorationLine: 'line-through', fontFamily: FONT }}>{old}</Text> : null}
                        <Text style={{ color: COLORS.fg, fontSize: 22, fontWeight: '800', textDecorationLine: old ? 'underline' : 'none', fontFamily: FONT }}>{m.name}</Text>
                        <Text style={{ color: COLORS.textMuted, fontSize: 14, fontVariant: ['tabular-nums'], fontFamily: FONT }}>{m.kcal} kcal · P {Math.round(m.protein)} g</Text>
                        <Text style={{ color: COLORS.textMuted, fontSize: 13, lineHeight: 18, fontFamily: FONT }}>{itemsText(m)}</Text>
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
                            <View style={{ width: 48, height: 44, borderRadius: 12, borderWidth: 1, borderColor: COLORS.greenBorderMd, alignItems: 'center', justifyContent: 'center' }}>
                              <Icon name="camera" size={18} color={G} />
                            </View>
                          </PressScale>
                        </View>
                        <PressScale onPress={() => openSwap(m)} accessibilityRole="button" accessibilityLabel="Swap this meal for another">
                          <View style={{ minHeight: 40, justifyContent: 'center' }}>
                            <Text style={{ color: G, fontSize: 14, fontWeight: '700', fontFamily: FONT }}>Swap for another {v.slot}</Text>
                          </View>
                        </PressScale>
                      </>
                    ) : (
                      <>
                        <Text style={{ color: COLORS.fg, fontSize: 22, fontWeight: '800', fontFamily: FONT }}>What are you having?</Text>
                        <Text style={{ color: COLORS.textMuted, fontSize: 14, fontFamily: FONT }}>
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
                  </View>
                );
              }
              if (v.state === 'missed') {
                const m = v.planned;
                return (
                  <View key={v.slot} style={{ borderRadius: 20, borderWidth: 1, borderColor: COLORS.border, backgroundColor: COLORS.card, padding: 16, gap: 10 }}>
                    <Text style={{ color: COLORS.textMuted, fontSize: 14, fontFamily: FONT }}>{label} · not logged yet</Text>
                    {m ? (
                      <Text style={{ color: COLORS.fg, fontSize: 17, fontWeight: '700', fontFamily: FONT }}>
                        {m.name} <Text style={{ color: COLORS.textMuted, fontWeight: '400', fontSize: 14 }}>· {m.kcal} kcal · P {Math.round(m.protein)} g</Text>
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
                  </View>
                );
              }
              return (
                <View key={v.slot} style={{ borderRadius: 16, borderWidth: 1, borderColor: COLORS.border, borderStyle: 'dashed', padding: 14, gap: 2 }}>
                  <Text style={{ color: COLORS.textMuted, fontSize: 14, fontFamily: FONT }}>{label} · later</Text>
                  {v.planned ? (
                    <Text style={{ color: COLORS.fg, fontSize: 16, fontWeight: '700', fontFamily: FONT }}>
                      {v.planned.name} <Text style={{ color: COLORS.textMuted, fontWeight: '400', fontSize: 14 }}>· {v.planned.kcal} kcal · P {Math.round(v.planned.protein)} g</Text>
                    </Text>
                  ) : null}
                  <SlotPenMark marks={penMarks.marks} slot={v.slot} onDecide={penMarks.decide} />
                </View>
              );
            })}
            {!plan && targetsLoaded ? (
              <Text style={{ color: COLORS.textMuted, fontSize: 13, lineHeight: 18, fontFamily: FONT }}>
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
                <Text style={{ color: COLORS.fg, fontSize: 18, fontWeight: '800', fontFamily: FONT }}>Food diary</Text>
                <Text style={{ color: COLORS.textMuted, fontSize: 14, fontFamily: FONT }}>Photos, ratings and micronutrients</Text>
              </View>
              <Icon name="chevron-right" size={18} color={COLORS.textMuted} />
            </View>
          </PressScale>
        </View>
      </ScrollView>

      {undo ? (
        <View
          pointerEvents="box-none"
          style={{ position: 'absolute', left: 16, right: 16, bottom: Math.max(insets.bottom, 12) + TAB_BAR_CONTENT_HEIGHT + 12 }}
        >
          <View style={{ minHeight: 52, borderRadius: 16, backgroundColor: '#1F1F23', borderWidth: 1, borderColor: COLORS.borderStrong, paddingHorizontal: 16, flexDirection: 'row', alignItems: 'center', gap: 12 }}>
            <Text numberOfLines={1} style={{ flex: 1, color: COLORS.fg, fontSize: 15, fontFamily: FONT }}>Logged {undo.label}</Text>
            <TouchableOpacity onPress={undoLast} accessibilityRole="button" accessibilityLabel="Undo" style={{ minHeight: 44, minWidth: 56, justifyContent: 'center', alignItems: 'center' }}>
              <Text style={{ color: G, fontSize: 15, fontWeight: '800', fontFamily: FONT }}>Undo</Text>
            </TouchableOpacity>
          </View>
        </View>
      ) : null}

      <MealDetailModal meal={selectedMeal} onClose={() => setSelectedMeal(null)} />
      <FoodSearchSheet visible={searchOpen} mealType={searchFor ?? addType} recent={recent} planned={!!upSlot?.planned} onClose={() => { setSearchOpen(false); setSearchFor(null); }} onLogged={afterOtherLog} />

      <BottomSheet visible={swapMeal !== null} onClose={() => setSwapMeal(null)}>
        <View style={{ padding: 20, gap: 12 }}>
          <Text style={{ color: COLORS.fg, fontSize: 20, fontWeight: '800', fontFamily: FONT }}>Swap {swapMeal?.meal}</Text>
          <Text style={{ color: COLORS.textMuted, fontSize: 14, fontFamily: FONT }}>Close in calories and protein to what was planned.</Text>
          {swapList.length === 0 ? <Text style={{ color: COLORS.textMuted, fontSize: 14, fontFamily: FONT }}>No close match from what you can get.</Text> : null}
          {swapList.map((o) => (
            <PressScale key={o.templateId} onPress={() => chooseSwap(o)} accessibilityRole="button" accessibilityLabel={`${o.name}, ${o.kcal} kilocalories`}>
              <Surface padding={14}>
                <Text style={{ color: COLORS.fg, fontSize: 16, fontWeight: '800', fontFamily: FONT }}>{o.name}</Text>
                <Text style={{ color: COLORS.textMuted, fontSize: 14, fontFamily: FONT }}>{o.kcal} kcal · P {Math.round(o.protein)} g</Text>
              </Surface>
            </PressScale>
          ))}
        </View>
      </BottomSheet>
    </View>
  );
}
