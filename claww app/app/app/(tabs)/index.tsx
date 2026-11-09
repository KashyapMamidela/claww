import { moveDayItemLabel } from '../../lib/penDays';
import { usePullToRefresh } from '../../lib/usePullToRefresh';
import { riseIn } from '../../lib/motion';
import Animated from 'react-native-reanimated';
import { CountUp } from '../../components/ui/CountUp';
import { WriteOn } from '../../components/ui/WriteOn';
import { TiltLight } from '../../components/ui/TiltLight';
import { mealTitle } from '../../lib/mealPlanMeal';
import { SessionCard } from '../../components/home/SessionCard';
import { dayMinutes } from '../../lib/planStory';
import { timeLabel } from '../../lib/format';
import { logActivity } from '../../lib/data';
import { penLine } from '../../lib/penLine';
import { useToast } from '../../components/ui/Toast';
import { useHideBarOnScroll } from '../../lib/tabBarVisibility';
import { greetingName } from '../../lib/greeting';
import { useTabBottomPad } from '../../lib/useTabBottomPad';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { AppState, ScrollView, Text, TouchableOpacity, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { useFocusEffect } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { AREA_COLORS, COLORS, FONT, FONT_HAND, HEADER_CONTENT_HEIGHT, TAB_BAR_CONTENT_HEIGHT, tint, BG, bg } from '../../lib/theme';
import { useAppState } from '../../lib/appState';
import { getLatestWorkout, getProfile, getSuggestedDayIndex, getWorkoutDayEvents, type WorkoutRow } from '../../lib/data';
import { Icon } from '../../components/ui/Icon';
import { Button } from '../../components/ui/Button';
import { SectionLabel } from '../../components/ui/SectionLabel';
import { HomeStatTiles } from '../../components/HomeStatTiles';
import { Surface } from '../../components/ui/Surface';
import { ProgressBar } from '../../components/ui/ProgressBar';
import { ProgressRing } from '../../components/ui/ProgressRing';
import { SleepRow } from '../../components/SleepRow';
import { SleepLogModal } from '../../components/SleepLogModal';
import { WaterRow } from '../../components/WaterRow';
import { getCatalog, getRecentLoggedSets } from '../../lib/adaptiveData';
import { lowestMuscle, muscleScores, musclesForExercises } from '../../lib/muscleRecovery';
import { Display } from '../../components/ui/Typography';
import { Hero } from '../../components/ui/Hero';
import { PenMark } from '../../components/ui/PenMark';
import { syncWidget } from '../../lib/widgetSync';
import { dayKey } from '../../lib/widgetSnapshot';
import { DEFAULT_STEPS_GOAL } from '../../lib/activityMath';
import { coachLine, type CoachSegment } from '../../lib/coachLine';
import { ActivityCard } from '../../components/workouts/ActivityCard';
import { TodayLine } from '../../components/home/TodayLine';
import { FoodSearchSheet } from '../../components/nutrition/FoodSearchSheet';
import { BottomSheet } from '../../components/ui/BottomSheet';
import { Stepper } from '../../components/ui/Stepper';
import { doneCount, sessionTile, todayLine, type TodayMealInput } from '../../lib/todayLine';
import { slotViews, type MealSlot } from '../../lib/mealPlanView';
import { ensureMealPlans, replanToday, type StoredPlan } from '../../lib/mealPlanData';
import { plannedToMeal } from '../../lib/mealPlanMeal';
import { SKIPPED } from '../../lib/catchUp';
import type { MealType } from '../../lib/data';
import { useBurnedToday } from '../../lib/useBurnedToday';
import { BURN_GOAL_FLOOR, BURN_GOAL_MAX, burnedPct, stepBurnedGoal } from '../../lib/burnGoal';
import { clockLabel, usualMinutesOf } from '../../lib/homeMoment';
import { marksFor, type PlanMark } from '../../lib/planMarks';
import { decideMark, getMarks, recordEngineMarks, syncPenMarks } from '../../lib/penData';
import { activeFor, type PenMark as StoredMark } from '../../lib/engine';
import { dateKey } from '../../lib/planStreak';
import { loadDayPrescription } from '../../lib/todayPlan';
import { Skeleton } from '../../components/ui/Skeleton';
import { useProfile } from '../../lib/profile';
import { getTodaySteps, type StepsResult } from '../../lib/steps';
import { greetingFor, type Greeting } from '../../lib/greeting';
import { SLEEP_TARGET_HOURS, sleepRingPct } from '../../lib/sleepTarget';
import { useFirstPaint } from '../../lib/perf';
import { RINGS_V1 } from '../../lib/flags';
import {
  dailyGoalPct as averageRings,
  isSessionPlannedToday,
  nutritionNote,
  nutritionRingPct,
  nutritionRingPctRaw,
  recoveryRingPct,
  workoutRingPct,
  workoutRow,
  type WorkoutToday,
} from '../../lib/dailyGoal';

function useGreeting(): Greeting {
  const [greeting, setGreeting] = useState(() => greetingFor(new Date()));
  useEffect(() => {
    const sub = AppState.addEventListener('change', (state) => {
      if (state === 'active') setGreeting(greetingFor(new Date()));
    });
    return () => sub.remove();
  }, []);
  return greeting;
}

// New feature — real step count from the phone's own motion sensor
// (expo-sensors' Pedometer), not a wearable. Refreshes whenever Home
// regains focus, same pattern as every other on-focus data fetch on this
// screen. Shared between HomeEmptyState and HomePopulated since both show
// the same Steps stat card.
function useTodaySteps(): StepsResult {
  const [steps, setSteps] = useState<StepsResult>({ steps: 0, available: false, caloriesBurned: null });
  useFocusEffect(
    useCallback(() => {
      let cancelled = false;
      getTodaySteps().then((result) => {
        if (!cancelled) setSteps(result);
      });
      return () => {
        cancelled = true;
      };
    }, [])
  );
  return steps;
}

function AiCard({ children }: { children: React.ReactNode }) {
  return (
    <View
      style={{
        backgroundColor: '#151517',
        borderWidth: 1,
        borderColor: tint(AREA_COLORS.engine, 0.22),
        borderRadius: 16,
        paddingHorizontal: 16,
        paddingVertical: 14,
      }}
    >
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 10 }}>
        <View
          style={{
            width: 28,
            height: 28,
            borderRadius: 8,
            backgroundColor: tint(AREA_COLORS.engine, 0.15),
            borderWidth: 1,
            borderColor: tint(AREA_COLORS.engine, 0.3),
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <Icon name="sparkles" size={14} color={AREA_COLORS.engine} />
        </View>
        <Text style={{ color: '#fff', fontSize: 13, fontFamily: BG[700] }}>CLAWW Insight</Text>
      </View>
      <Text style={{ color: '#A1A1AA', fontSize: 13, lineHeight: 19, fontFamily: BG[400] }}>{children}</Text>
    </View>
  );
}

function HomeLoadingSkeleton() {
  const insets = useSafeAreaInsets();
  const tabPad28 = useTabBottomPad(28);
  return (
    <View
      style={{
        paddingHorizontal: 16,
        paddingTop: insets.top + HEADER_CONTENT_HEIGHT + 8,
        paddingBottom: tabPad28,
        gap: 14,
      }}
    >
      <View style={{ gap: 8 }}>
        <Skeleton width={70} height={11} borderRadius={4} />
        <Skeleton width={200} height={30} borderRadius={8} />
      </View>
      <Skeleton height={220} borderRadius={20} />
      <View style={{ flexDirection: 'row', gap: 8 }}>
        <Skeleton height={78} borderRadius={16} style={{ flex: 1 }} />
        <Skeleton height={78} borderRadius={16} style={{ flex: 1 }} />
        <Skeleton height={78} borderRadius={16} style={{ flex: 1 }} />
      </View>
      <Skeleton height={64} borderRadius={20} />
      <Skeleton height={90} borderRadius={20} />
    </View>
  );
}

function HomeEmptyState() {
  const { userId, userName, sleepLogged, streak } = useAppState();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const tabPad28 = useTabBottomPad(28);
  const steps = useTodaySteps();
  const [sleepModalOpen, setSleepModalOpen] = useState(false);

  return (
    <View
      style={{
        paddingHorizontal: 16,
        paddingTop: insets.top + HEADER_CONTENT_HEIGHT + 8,
        paddingBottom: tabPad28,
        gap: 14,
      }}
    >
      <View>
        <SectionLabel color={COLORS.blue}>DAY ONE</SectionLabel>
        <Display style={{ marginTop: 4 }}>
          Welcome,{'\n'}{greetingName(userName)}.
        </Display>
        <Text style={{ color: COLORS.textMuted, fontSize: 13, marginTop: 6, lineHeight: 18, fontFamily: BG[400] }}>
          No recovery score yet — <Text style={{ color: COLORS.indigo, fontWeight: '700' }}>log tonight's sleep</Text> to unlock one.
        </Text>
      </View>

      <View
        style={{
          backgroundColor: '#151517',
          borderWidth: 1,
          borderColor: 'rgba(59,130,246,0.30)',
          borderRadius: 20,
          paddingHorizontal: 18,
          paddingVertical: 20,
          alignItems: 'center',
          gap: 14,
        }}
      >
        <ProgressRing size={164} rings={[{ r: 66, strokeWidth: 8, color: COLORS.blue, pct: 0 }]} trackDash="3 9">
          <View
            style={{
              width: 56,
              height: 56,
              borderRadius: 16,
              backgroundColor: 'rgba(59,130,246,0.14)',
              borderWidth: 1,
              borderColor: 'rgba(59,130,246,0.30)',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <Icon name="sparkles" size={24} color={COLORS.blue} />
          </View>
        </ProgressRing>
        <View style={{ alignItems: 'center' }}>
          <Text style={{ color: '#fff', fontSize: 15, marginBottom: 4, fontFamily: BG[800] }}>
            Nothing logged yet — that's normal
          </Text>
          <Text style={{ color: COLORS.textMuted, fontSize: 13, lineHeight: 19, maxWidth: 260, textAlign: 'center', fontFamily: BG[400] }}>
            Generate a plan built around your onboarding answers and today's progress ring starts filling in.
          </Text>
        </View>
        <Button
          variant="primary"
          accent={COLORS.blue}
          accentDeep={COLORS.blueDeep}
          size="lg"
          fullWidth
          onPress={() => router.push('/workout-setup')}
          icon={<Icon name="wand-2" size={16} color="#fff" />}
        >
          Generate my first plan
        </Button>
      </View>

      <HomeStatTiles userId={userId} steps={steps} streak={streak} session={{ value: '—', sub: 'no plan yet' }} />

      <WaterRow userId={userId} />

      <View
        style={{
          backgroundColor: '#151517',
          borderWidth: 1,
          borderColor: 'rgba(129,140,248,0.28)',
          borderRadius: 20,
          paddingHorizontal: 18,
          paddingVertical: 16,
          flexDirection: 'row',
          alignItems: 'center',
          gap: 14,
        }}
      >
        <View
          style={{
            width: 48,
            height: 48,
            borderRadius: 14,
            backgroundColor: 'rgba(129,140,248,0.14)',
            borderWidth: 1,
            borderColor: 'rgba(129,140,248,0.30)',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <Icon name="moon" size={22} color={COLORS.indigo} />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={{ color: '#fff', fontSize: 13, marginBottom: 2, fontFamily: BG[700] }}>
            {sleepLogged ? 'Recovery is calculating…' : "Log tonight's sleep"}
          </Text>
          <Text style={{ color: COLORS.textMuted, fontSize: 13, lineHeight: 16, fontFamily: BG[400] }}>
            {sleepLogged
              ? "You'll see your Recovery Score here tomorrow morning."
              : "Unlocks your Recovery Score — a sleep and protein based estimate to guide today's training."}
          </Text>
        </View>
        {!sleepLogged ? (
          <TouchableOpacity
            activeOpacity={0.8}
            onPress={() => setSleepModalOpen(true)}
            style={{
              height: 36,
              paddingHorizontal: 14,
              borderRadius: 10,
              borderWidth: 1,
              borderColor: 'rgba(129,140,248,0.4)',
              backgroundColor: 'rgba(129,140,248,0.14)',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <Text style={{ color: COLORS.indigo, fontSize: 13, fontFamily: BG[700] }}>Log sleep</Text>
          </TouchableOpacity>
        ) : (
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5 }}>
            <Icon name="check" size={13} color={COLORS.green} strokeWidth={3} />
            <Text style={{ color: COLORS.green, fontSize: 13, fontFamily: BG[700] }}>Logged</Text>
          </View>
        )}
      </View>

      <AiCard>
        Your coach is still warming up — <Text style={{ color: '#fff', fontWeight: '700' }}>generate a plan and log a few days</Text> and
        insights will start showing up here.
      </AiCard>

      <SleepLogModal visible={sleepModalOpen} onClose={() => setSleepModalOpen(false)} />
    </View>
  );
}

function HomePopulated() {
  useFirstPaint('home');
  const { userId, userName, recovery, meals, streak, todaySleep, saveMeal, removeMeal } = useAppState();
  const toast = useToast();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const tabPad28 = useTabBottomPad(28);
  const greeting = useGreeting();
  const recoveryColor = recovery?.band === 'Low' ? COLORS.danger : recovery?.band === 'High' ? COLORS.green : COLORS.amber;

  const [latestWorkout, setLatestWorkout] = useState<WorkoutRow | null>(null);
  const [suggestedDayIndex, setSuggestedDayIndex] = useState(0);
  // Polish step 1: the calorie target comes from the cached profile (already loaded elsewhere), never a fallback number.
  // Until it is known the Nutrition row is a skeleton; with no target set it says so instead of guessing.
  const { profile: targetProfile, loading: targetLoading } = useProfile(userId);
  const targetKcal: number | null = targetProfile?.personalization_profile?.nutritionDefaults?.calories ?? null;
  const kcalPending = targetLoading && !targetProfile;
  // The lowest per-muscle recovery score among today's muscles, when it is worth a mention (V2 PHASE 7.5).
  const [tiredMuscle, setTiredMuscle] = useState<{ muscle: string; band: string } | null>(null);
  // NG PHASE 2: today's session for the Workout ring, and the usual training time for its note.
  const [workoutToday, setWorkoutToday] = useState<WorkoutToday>({ planned: false, completed: false, setsDone: 0, setsPlanned: 0 });
  const [usualTime, setUsualTime] = useState<string | null>(null);
  // NG PHASE 12: where today's numbers differ from the plan (the Coach's Pen marks), and the protein target for the coach line.
  const [marks, setMarks] = useState<PlanMark[]>([]);
  // NG PHASE 11: stored pen marks (engine marks and the trend rules'), the same ones the weekly review lists.
  const [penAll, setPenAll] = useState<StoredMark[]>([]);
  const penToday = useMemo(() => activeFor(penAll, dateKey(new Date())), [penAll]);
  const decidePen = async (m: StoredMark, status: 'kept' | 'undone') => {
    if (!userId) return;
    const next = await decideMark(userId, m, status);
    setPenAll((all) => all.map((x) => (x.id === next.id ? next : x)));
  };
  const [proteinTarget, setProteinTarget] = useState<number | null>(null);
  const [sleepOpen, setSleepOpen] = useState(false);
  const steps = useTodaySteps();
  const burn = useBurnedToday(userId, steps);
  const [burnSheet, setBurnSheet] = useState(false);

  // Polish step 4: the Today line acts on the day's meal plan, the same plan the Nutrition tab shows.
  const [plan, setPlan] = useState<StoredPlan | null>(null);
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchFor, setSearchFor] = useState<MealType | null>(null);
  const [logging, setLogging] = useState(false);
  const mealsRef = useRef(meals);
  mealsRef.current = meals;

  // xp/streak come from AppState directly — they update live as XP events
  // fire (set completed, meal logged, sleep logged, plan generated) instead
  // of only refreshing whenever this screen happens to regain focus.
  useFocusEffect(
    useCallback(() => {
      if (!userId) return;
      let cancelled = false;
      ensureMealPlans(userId).then(async (p) => {
        if (cancelled) return;
        setPlan(p);
        if (p && mealsRef.current.some((m) => m.plan_status !== 'as_planned')) {
          const re = await replanToday(userId, mealsRef.current);
          if (re && !cancelled) setPlan(re);
        }
      });
      Promise.all([getLatestWorkout(userId), getProfile(userId)]).then(async ([w, profile]) => {
        const dayEvents = w ? await getWorkoutDayEvents(userId, w.id) : [];
        if (cancelled) return;
        setLatestWorkout(w);
        const dayIdx = w ? getSuggestedDayIndex(w.plan, dayEvents) : 0;
        setSuggestedDayIndex(dayIdx);
        if (w) {
          const names = (w.plan.days[dayIdx]?.exercises ?? []).map((ex) => ex.name);
          const [catalog, sets] = await Promise.all([getCatalog(names), getRecentLoggedSets(userId)]);
          const history = await getCatalog(Array.from(new Set(sets.map((x) => x.exerciseName))));
          if (cancelled) return;
          const now = new Date();
          const sameDay = (iso: string) => new Date(iso).toDateString() === now.toDateString();
          const day = w.plan.days[dayIdx];
          setWorkoutToday({
            planned: isSessionPlannedToday(w.plan.days.map((d) => d.day), now),
            completed: dayEvents.some((e) => e.status === 'completed' && sameDay(e.createdAt)),
            setsDone: sets.filter((x) => sameDay(x.completedAt) && names.includes(x.exerciseName)).length,
            setsPlanned: (day?.exercises ?? []).reduce((n, ex) => n + (Number(ex.sets) || 0), 0),
          });
          loadDayPrescription(userId, w, dayIdx)
            .then((p) => {
              if (cancelled) return;
              const local = marksFor(p);
              setMarks(local);
              recordEngineMarks(userId, local, dateKey(new Date()))
                .then(() => syncPenMarks(userId))
                .then(() => getMarks(userId, 35))
                .then((all) => {
                  if (!cancelled) setPenAll(all);
                })
                .catch(() => {});
            })
            .catch(() => {});
          const muscles = musclesForExercises(names, catalog);
          const low = lowestMuscle(muscleScores(muscles, sets, { ...history, ...catalog }, new Date()), muscles);
          setTiredMuscle(low && low.band && low.band !== 'Excellent' && low.band !== 'Good' ? { muscle: low.muscle, band: low.band } : null);
        }
        const targets = profile?.personalization_profile?.nutritionDefaults;
        setProteinTarget(targets?.protein_g ?? null);
        setUsualTime(profile?.personalization_profile?.workoutDefaults?.usualTrainingTime ?? null);
      });
      return () => {
        cancelled = true;
      };
    }, [userId])
  );

  // Nutrition-today, derived from real meal logs against the user's real
  // (or generic fallback) targets — same numbers the Nutrition tab shows.
  const consumedKcal = meals.reduce((s, m) => s + (m.calories ?? 0), 0);
  // Unclamped — ProgressRing needs the real value (over 100%) to render the
  // "shadow" overflow arc that shows a day that blew past target, not just
  // a ring that looks identically full whether you hit or tripled it.
  const nutritionPctRaw = nutritionRingPctRaw(consumedKcal, targetKcal ?? 0);
  const nutritionPct = nutritionRingPct(consumedKcal, targetKcal ?? 0);

  const sleepHours = todaySleep?.hours ?? null;
  const sleepPct = sleepRingPct(sleepHours);
  const recoveryPct = recovery?.score ?? 0;
  const workoutPct = workoutRingPct(workoutToday);
  const burnedPctValue = burnedPct(burn.burned.kcal, burn.goal);
  // NG PHASE 2: Workout / Nutrition / Recovery; RINGS_V1 brings back the V2 Recovery / Sleep / Nutrition average.
  const dailyGoalPct = RINGS_V1
    ? recovery
      ? Math.round((recoveryPct + nutritionPct + sleepPct) / 3)
      : 0
    : averageRings(burnedPctValue, nutritionPct, recoveryRingPct(recovery?.score));

  const planDays = latestWorkout?.plan.days ?? [];
  const today = planDays[suggestedDayIndex] ?? planDays[0];
  const todayIndex = planDays[suggestedDayIndex] ? suggestedDayIndex : 0;
  const workoutRowText = workoutRow(workoutToday, today?.focus || today?.day || 'Today\'s session', usualTime);
  const dayOfLabel = `DAY ${todayIndex + 1} OF ${planDays.length}`;
  const planCardLabel = today
    ? /^day \d+$/i.test(today.day.trim())
      ? dayOfLabel
      : `${today.day.toUpperCase()} · ${dayOfLabel}`
    : null;

  // NG PHASE 12: the coach line, the hero for this moment, and what is left to eat today.
  const now = new Date();
  const sessionPlanned = workoutToday.planned && !!today;
  const consumedProtein = meals.reduce((s, m) => s + (m.protein_g ?? 0), 0);
  const proteinLeft = proteinTarget ? Math.max(0, proteinTarget - consumedProtein) : null;
  const kcalLeft = targetKcal === null ? null : Math.max(0, targetKcal - consumedKcal);
  const coach: CoachSegment[] = coachLine({
    sleepHours,
    sessionPlanned,
    sessionDone: workoutToday.completed,
    marks,
    proteinLeftG: proteinLeft,
    hour: now.getHours(),
  });
  const stepsGoal = targetProfile?.personalization_profile?.stepsGoal ?? DEFAULT_STEPS_GOAL;
  const sessionMinutes = today ? Math.round((today.exercises.reduce((n, ex) => n + (Number(ex.sets) || 0), 0) * 130) / 60 + 5) : 0;

  // The Today line: the same slot states as the Nutrition tab, so the two always agree.
  const slotsView = slotViews(plan, meals, now.getHours());
  const todayMeals: TodayMealInput[] = slotsView.map((v) => ({
    slot: v.slot,
    state: v.state,
    plannedName: v.planned ? mealTitle(v.planned) : null,
    loggedLine: v.logged ? `${Math.round(v.logged.calories ?? 0)} kcal, ${Math.round(v.logged.protein_g ?? 0)} g protein` : null,
  }));
  const sessionItem = sessionPlanned && today
    ? { name: today.focus, minutes: sessionMinutes, done: workoutToday.completed, usualMinutes: usualMinutesOf(usualTime), markLine: marks[0] ? `${marks[0].name} ${marks[0].newText}` : null }
    : null;
  const todayItems = todayLine({ nowMinutes: now.getHours() * 60 + now.getMinutes(), meals: todayMeals, session: sessionItem, sleepTargetHours: SLEEP_TARGET_HOURS });
  const sessionTileValue = sessionTile({ planned: sessionPlanned, done: workoutToday.completed, usualMinutes: usualMinutesOf(usualTime), name: today?.focus ?? '' });
  const usualMin = usualMinutesOf(usualTime);
  const sessionTimeLabel = usualMin !== null ? timeLabel(new Date(2000, 0, 1, Math.floor(usualMin / 60), usualMin % 60)) : undefined;
  useEffect(() => {
    // Premium F2: the home-screen widgets read this snapshot (lib/widgetSync.ts).
    const targets = targetProfile?.personalization_profile?.nutritionDefaults ?? null;
    const sum = (k: 'carbs_g' | 'fats_g') => meals.reduce((s, m) => s + (Number((m as unknown as Record<string, unknown>)[k]) || 0), 0);
    const next = slotViews(plan, meals, new Date().getHours()).find((v) => v.state === 'up_next' || v.state === 'later') ?? null;
    syncWidget({
      userId,
      day: dayKey(new Date()),
      kcal: consumedKcal,
      kcalTarget: targetKcal,
      protein: consumedProtein,
      proteinTarget: proteinTarget ?? targets?.protein_g ?? null,
      carbs: sum('carbs_g'),
      carbsTarget: targets?.carbs_g ?? null,
      fat: sum('fats_g'),
      fatTarget: targets?.fats_g ?? null,
      mealsLogged: meals.filter((m) => (m as { plan_status?: string }).plan_status !== 'skipped').length,
      nextMeal: next ? { slot: next.slot.charAt(0).toUpperCase() + next.slot.slice(1), name: next.planned ? mealTitle(next.planned) : null } : null,
      session: sessionPlanned && today ? (today.focus || today.day) : null,
      sessionDone: workoutToday.completed,
      sessionTime: sessionTimeLabel ?? null,
      streak,
      workoutPct,
      nutritionPct,
      recoveryPct: recoveryRingPct(recovery?.score) ?? 0,
      recoveryScore: recovery?.score ?? null,
      dailyPct: dailyGoalPct,
      steps: steps.steps,
      stepsGoal,
    });
  }, [userId, meals, plan, consumedKcal, consumedProtein, targetKcal, proteinTarget, targetProfile, sessionPlanned, today, workoutToday.completed, sessionTimeLabel, streak, workoutPct, nutritionPct, recovery?.score, dailyGoalPct, steps.steps, stepsGoal]);
  const penLineText = penLine({ sleepHours, sessionPlanned, sessionDone: workoutToday.completed, hour: now.getHours() });
  const typeOf = (slot: MealSlot) => (slot.charAt(0).toUpperCase() + slot.slice(1)) as MealType;
  const replanAfter = async (row: Awaited<ReturnType<typeof saveMeal>>) => {
    if (row && userId) replanToday(userId, [...meals, row]).then((p) => p && setPlan(p));
  };
  const ateAsPlanned = async (slot: MealSlot) => {
    const planned = plan?.meals.find((m) => m.meal === slot);
    if (!planned || logging) return;
    setLogging(true);
    const row = await saveMeal(typeOf(slot), plannedToMeal(planned));
    setLogging(false);
    await replanAfter(row);
    if (row) toast.show({ message: `Logged ${slot}`, actionLabel: 'Undo', onAction: () => { removeMeal(row.id); } });
  };
  const skipMeal = async (slot: MealSlot) => {
    if (logging) return;
    setLogging(true);
    const row = await saveMeal(typeOf(slot), SKIPPED);
    setLogging(false);
    await replanAfter(row);
  };
  const somethingElse = (slot: MealSlot) => {
    setSearchFor(typeOf(slot));
    setSearchOpen(true);
  };

  return (
    <View
      style={{
        paddingHorizontal: 16,
        paddingTop: insets.top + HEADER_CONTENT_HEIGHT + 8,
        paddingBottom: tabPad28,
        gap: 14,
      }}
    >
      <View style={{ gap: 2 }}>
        <Text
          numberOfLines={1}
          adjustsFontSizeToFit
          accessibilityRole="header"
          style={{ color: COLORS.fg, fontSize: 32, lineHeight: 38, letterSpacing: -0.9, fontFamily: BG[800], marginTop: 2 }}
        >
          {greeting}, {greetingName(userName)}
        </Text>
        <TouchableOpacity activeOpacity={sleepHours === null ? 0.7 : 1} onPress={sleepHours === null ? () => setSleepOpen(true) : undefined} accessibilityRole={sleepHours === null ? 'button' : 'text'}>
          <Text style={{ color: COLORS.textMuted, fontSize: 17, lineHeight: 24, marginTop: 6, fontFamily: BG[400] }}>
            {coach.map((seg, i) => (
              <Text key={i} style={seg.bold ? { color: '#fff', fontWeight: '700' } : undefined}>
                {seg.text}
              </Text>
            ))}
          </Text>
        </TouchableOpacity>
        {penLineText ? (
          <View style={{ marginTop: 6, transform: [{ rotate: '-1.5deg' }] }}>
            <WriteOn id={penLineText}>
              <Text style={{ color: COLORS.fg, fontSize: 24, lineHeight: 28, fontFamily: FONT_HAND, fontWeight: '700', textShadowColor: 'rgba(255,255,255,0.35)', textShadowRadius: 12 }}>{penLineText}</Text>
            </WriteOn>
          </View>
        ) : null}
      </View>

      {/* NG PHASE 1: the first real use of Surface (grain, top light, soft shadow). Data unchanged. */}
      <Animated.View entering={riseIn(0)}>
      <Surface padding={17} decoration={<TiltLight />}>
        <View style={{ flexDirection: 'row', alignItems: 'baseline', justifyContent: 'space-between', marginBottom: 14 }}>
          <Text style={{ color: COLORS.fg, fontSize: 17, fontFamily: BG[800] }}>Daily progress</Text>
          <Text style={{ color: COLORS.textMuted, fontSize: 13, fontVariant: ['tabular-nums'], fontFamily: BG[700] }}>{dailyGoalPct}% of today</Text>
        </View>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 18 }}>
          <ProgressRing
            size={164}
            rings={
              RINGS_V1
                ? [
                    { r: 72, strokeWidth: 7, color: AREA_COLORS.recovery, pct: recoveryPct },
                    { r: 57, strokeWidth: 7, color: AREA_COLORS.sleep, pct: sleepPct },
                    { r: 42, strokeWidth: 7, color: AREA_COLORS.nutrition, pct: nutritionPctRaw },
                  ]
                : [
                    { r: 72, strokeWidth: 9, color: AREA_COLORS.burned, pct: burnedPctValue, track: tint(AREA_COLORS.burned, 0.16) },
                    { r: 56, strokeWidth: 9, color: AREA_COLORS.nutrition, pct: nutritionPctRaw, track: tint(AREA_COLORS.nutrition, 0.16) },
                    { r: 40, strokeWidth: 9, color: AREA_COLORS.recovery, pct: recoveryPct, track: tint(AREA_COLORS.recovery, 0.16) },
                  ]
            }
            trackColor="rgba(255,255,255,0.055)"
          >
            <CountUp id="home.dailyGoal" value={dailyGoalPct} format={(n) => `${Math.round(n)}%`} textStyle={{ color: '#fff', fontSize: 28, fontVariant: ['tabular-nums'], fontFamily: BG[800] }} />
            <Text style={{ color: '#A1A1AA', fontSize: 11, marginTop: 3, fontFamily: BG[400] }}>Daily goal</Text>
          </ProgressRing>
          <View style={{ flex: 1, gap: 11 }}>
            {(RINGS_V1
              ? [
                  { label: 'Recovery', value: recovery ? `${recovery.score}` : '—', sub: '/ 100', pct: recoveryPct, color: AREA_COLORS.recovery, note: null as string | null },
                  {
                    label: 'Sleep',
                    value: sleepHours !== null ? `${Math.round(sleepHours * 10) / 10}` : '—',
                    sub: `/ ${SLEEP_TARGET_HOURS} h`,
                    pct: sleepPct,
                    color: AREA_COLORS.sleep,
                    note: null as string | null,
                  },
                  { label: 'Nutrition', value: `${Math.round(consumedKcal)}`, sub: targetKcal === null ? 'no target set' : `/ ${targetKcal} kcal`, pct: nutritionPct, color: AREA_COLORS.nutrition, note: null as string | null },
                ]
              : [
                  {
                    label: 'Burned',
                    value: burn.burned.kcal !== null ? burn.burned.kcal.toLocaleString('en-IN') : '—',
                    sub: burn.goal !== null ? `/ ${burn.goal.toLocaleString('en-IN')} kcal` : 'kcal',
                    pct: burnedPctValue,
                    color: AREA_COLORS.burned,
                    note: (burn.burned.kcal === null ? 'not tracked yet' : burn.burned.source === 'health-connect' ? 'active, from your watch or phone' : 'estimated from steps and training') as string | null,
                  },
                  {
                    label: 'Eaten',
                    value: Math.round(consumedKcal).toLocaleString('en-IN'),
                    sub: targetKcal === null ? 'no target set' : `/ ${targetKcal.toLocaleString('en-IN')} kcal`,
                    pct: nutritionPct,
                    color: AREA_COLORS.nutrition,
                    note: nutritionNote(meals.map((m) => m.meal_type ?? '').filter(Boolean)) as string | null,
                  },
                  {
                    label: 'Recovery',
                    value: recovery ? `${recovery.score}` : '—',
                    sub: '/ 100',
                    pct: recoveryPct,
                    color: AREA_COLORS.recovery,
                    note: (sleepHours !== null ? `sleep ${Math.round(sleepHours * 10) / 10} h counts in this` : 'log sleep to sharpen this') as string | null,
                  },
                ]
            ).map((s) => (
              <TouchableOpacity key={s.label} activeOpacity={s.label === 'Burned' ? 0.7 : 1} disabled={s.label !== 'Burned'} onPress={() => setBurnSheet(true)} accessibilityRole={s.label === 'Burned' ? 'button' : undefined} accessibilityLabel={s.label === 'Burned' ? 'Burned goal. Tap to change it.' : undefined}>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 4 }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5 }}>
                    <View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: s.color }} />
                    <Text style={{ color: '#A1A1AA', fontSize: 11, fontFamily: BG[400] }}>{s.label}</Text>
                  </View>
                  {(s.label === 'Nutrition' || s.label === 'Eaten') && kcalPending ? (
                    <Skeleton width={90} height={12} borderRadius={4} />
                  ) : (
                    <Text style={{ fontFamily: BG[400], flexShrink: 1 }} numberOfLines={1}>
                      <Text style={{ color: '#fff', fontSize: 13, fontWeight: '700', fontVariant: ['tabular-nums'] }}>{s.value} </Text>
                      <Text style={{ color: COLORS.textMuted, fontSize: 11 }}>{s.sub}</Text>
                    </Text>
                  )}
                </View>
                <ProgressBar pct={s.pct} color={s.color} />
              </TouchableOpacity>
            ))}
          </View>
        </View>
        <View style={{ height: 1, backgroundColor: COLORS.border, marginTop: 16, marginBottom: 14 }} />
        <HomeStatTiles
          userId={userId}
          steps={steps}
          streak={streak}
          session={{ ...sessionTileValue, pct: workoutToday.setsPlanned > 0 ? (workoutToday.setsDone / workoutToday.setsPlanned) * 100 : 0, onPress: () => router.push(sessionPlanned ? { pathname: '/(tabs)/workouts', params: { day: String(todayIndex) } } : '/(tabs)/workouts') }}
        />
      </Surface>
      </Animated.View>

      <Animated.View entering={riseIn(1)}>
      <SessionCard
        state={workoutToday.completed ? 'done' : sessionPlanned ? 'training' : 'rest'}
        name={today?.focus ?? ''}
        timeLabel={sessionTimeLabel}
        exercises={today?.exercises.length}
        minutes={today ? dayMinutes(today) : undefined}
        sets={workoutToday.setsPlanned || undefined}
        setsDone={workoutToday.setsDone}
        progression={marks[0] ? { name: marks[0].name, oldText: marks[0].oldText, newText: marks[0].newText } : null}
        note={marks[0]?.note ?? null}
        onStart={() => router.push({ pathname: '/(tabs)/workouts', params: { day: String(todayIndex) } })}
        onOpen={() => router.push({ pathname: '/(tabs)/workouts', params: { day: String(todayIndex) } })}
        onLogWalk={async () => {
          if (!userId) return;
          const ok = await logActivity(userId, 'Long walk', 20);
          toast.show({ message: ok ? 'Logged a 20 minute walk' : 'Could not log the walk' });
        }}
      />
      </Animated.View>

      {/* Premium H8: the marks live behind the pen button in the title bar (Your week, marked up). */}

      <TodayLine
        items={todayItems}
        logging={logging}
        onAteAsPlanned={ateAsPlanned}
        onSomethingElse={somethingElse}
        onSkipped={skipMeal}
        onStart={() => router.push({ pathname: '/(tabs)/workouts', params: { day: String(todayIndex) } })}
        onPlan={() => router.push('/(tabs)/workouts')}
      />

      <WaterRow userId={userId} />

      {todaySleep ? null : <SleepRow />}
      <SleepLogModal visible={sleepOpen} onClose={() => setSleepOpen(false)} />

      <FoodSearchSheet
        visible={searchOpen}
        mealType={searchFor ?? 'Snack'}
        recent={[]}
        planned={!!searchFor && !!plan?.meals.find((m) => m.meal === searchFor.toLowerCase())}
        onClose={() => {
          setSearchOpen(false);
          setSearchFor(null);
        }}
        onLogged={(row) => {
          setSearchOpen(false);
          setSearchFor(null);
          replanAfter(row);
        }}
      />

      <BottomSheet visible={burnSheet} onClose={() => setBurnSheet(false)}>
        <View style={{ paddingHorizontal: 20, paddingBottom: 12, gap: 14 }}>
          <Text style={{ color: COLORS.fg, fontSize: 20, fontFamily: BG[800] }}>Burned goal</Text>
          <Text style={{ color: COLORS.textMuted, fontSize: 15, lineHeight: 22, fontFamily: BG[400] }}>
            Active calories you aim to burn in a day, on top of resting energy. It starts from how your calorie goal was set.
          </Text>
          <Stepper
            value={(burn.goal ?? BURN_GOAL_FLOOR).toLocaleString('en-IN')}
            unit="kcal a day"
            label="Burned goal"
            onDecrement={() => burn.setGoal(stepBurnedGoal(burn.goal ?? BURN_GOAL_FLOOR, -1))}
            onIncrement={() => burn.setGoal(stepBurnedGoal(burn.goal ?? BURN_GOAL_FLOOR, 1))}
            decrementDisabled={(burn.goal ?? BURN_GOAL_FLOOR) <= BURN_GOAL_FLOOR}
            incrementDisabled={(burn.goal ?? BURN_GOAL_FLOOR) >= BURN_GOAL_MAX}
          />
        </View>
      </BottomSheet>
    </View>
  );
}

export default function HomeTab() {
  const { loading, hasPlan } = useAppState();
  const hideBar = useHideBarOnScroll();
  const pull = usePullToRefresh('#3B82F6');
  return (
    <ScrollView {...hideBar} key={pull.key} refreshControl={pull.refreshControl} style={{ flex: 1, backgroundColor: '#050505' }} showsVerticalScrollIndicator={false}>
      {loading ? <HomeLoadingSkeleton /> : hasPlan ? <HomePopulated /> : <HomeEmptyState />}
    </ScrollView>
  );
}
