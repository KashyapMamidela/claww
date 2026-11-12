import { Surface } from '../../components/ui/Surface';
import { SectionHeader } from '../../components/ui/SectionHeader';
import { sessionName } from '../../lib/format';
import { Rise } from '../../components/ui/Rise';
import { usePullToRefresh } from '../../lib/usePullToRefresh';
import { getLastWeights } from '../../lib/adaptiveData';
import { BodyMap, MUSCLES, type Muscle } from '../../components/BodyMap';
import { PressScale } from '../../components/ui/PressScale';
import { BottomSheet } from '../../components/ui/BottomSheet';
import { useHideBarOnScroll } from '../../lib/tabBarVisibility';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { ScrollView, Text, TouchableOpacity, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useFocusEffect } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTabBottomPad } from '../../lib/useTabBottomPad';
import { COLORS, FONT, FONT_HAND, HEADER_CONTENT_HEIGHT, TAB_BAR_CONTENT_HEIGHT, BG, bg } from '../../lib/theme';
import { useAppState } from '../../lib/appState';
import { useWorkoutSession } from '../../lib/workoutSession';
import {
  addExerciseToDay,
  generateWorkoutPlan,
  getLatestWorkout,
  getProfile,
  getSuggestedDayIndex,
  getTodayWorkoutStats,
  getWorkoutDayEvents,
  logWorkoutDayEvent,
  type CatalogExercise,
  type Equipment,
  type RegenerationReason,
  type TodayWorkoutStats,
  type WorkoutDayEvent,
  type WorkoutRow,
} from '../../lib/data';
import { Icon } from '../../components/ui/Icon';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
import { ErrorCard } from '../../components/ui/ErrorCard';
import { Skeleton } from '../../components/ui/Skeleton';
import { Display, LargeTitle } from '../../components/ui/Typography';
import { ExercisePickerModal } from '../../components/ExercisePickerModal';
import { LogSessionModal } from '../../components/LogSessionModal';
import { CompletedDayCard, MissedDayCard, SkippedDayCard } from '../../components/PastDayCards';
import { computeDayStates } from '../../lib/workoutDayState';
import { computeWeekdayStates, heroKicker } from '../../lib/trainingWeek';
import { useRenderCount } from '../../lib/perf';
import { refreshReminders } from '../../lib/reminderSync';
import { beginSession } from '../../lib/sessionStart';
import { ExerciseGuideSheet } from '../../components/ExerciseGuideSheet';
import { getCatalog, getRecentLoggedSets, saveExerciseProgress } from '../../lib/adaptiveData';
import { catalogKey, MAJOR_MUSCLES, muscleScores } from '../../lib/muscleRecovery';
import { computeRepRange, startingPrescription } from '../../lib/engine';
import { newStateFor, type PrescribedExercise } from '../../lib/sessionPrescription';
import { Hero } from '../../components/ui/Hero';
import { WeekStripView } from '../../components/workouts/WeekStripView';
import { ExerciseRow } from '../../components/workouts/ExerciseRow';
import { ActivityCard } from '../../components/workouts/ActivityCard';
import { weekStrip } from '../../lib/weekStrip';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { OLD_PLAN_CARD_KEY, showOldPlanCard } from '../../lib/planAge';
import { marksFor } from '../../lib/planMarks';
import { loadDayPrescription } from '../../lib/todayPlan';
import { BLUEPRINTS } from '../../lib/engine';
import { blueprintDayMinutes } from '../../lib/engine';
import { WEEKDAY_NAMES } from '../../lib/trainingWeek';

const A = COLORS.blue;
const A2 = COLORS.blueMid;
const A3 = COLORS.blueDeep;

function WorkoutsEmptyState() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const tabPad40 = useTabBottomPad(40);
  return (
    <View
      style={{
        paddingHorizontal: 16,
        paddingTop: insets.top + HEADER_CONTENT_HEIGHT + 8,
        paddingBottom: tabPad40,
        gap: 16,
      }}
    >
      <View>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 3 }}>
          <View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: A }} />
          <Text style={{ color: A, fontSize: 11, letterSpacing: 0.9, fontFamily: BG[700] }}>WORKOUTS</Text>
        </View>
        <Display>No plan yet</Display>
      </View>

      <View
        style={{
          backgroundColor: '#151517',
          borderWidth: 1,
          borderColor: 'rgba(59,130,246,0.30)',
          borderRadius: 20,
          paddingHorizontal: 24,
          paddingVertical: 32,
          alignItems: 'center',
          gap: 16,
        }}
      >
        <View
          style={{
            width: 72,
            height: 72,
            borderRadius: 20,
            backgroundColor: COLORS.blueDim,
            borderWidth: 1,
            borderColor: 'rgba(59,130,246,0.30)',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <Icon name="dumbbell" size={32} color={A} />
        </View>
        <View style={{ alignItems: 'center' }}>
          <Text style={{ color: '#fff', fontSize: 17, marginBottom: 8, fontFamily: BG[800] }}>
            Your training plan lives here
          </Text>
          <Text style={{ color: COLORS.textMuted, fontSize: 13, lineHeight: 20, maxWidth: 280, textAlign: 'center', fontFamily: BG[400] }}>
            CLAWW builds a personalised plan from your profile and recovery — exercises, sets, and rest all tuned to you, updating as
            you log more days.
          </Text>
        </View>
        <Button
          variant="primary"
          accent={A}
          accentDeep={A3}
          size="lg"
          fullWidth
          onPress={() => router.push('/workout-setup')}
          icon={<Icon name="wand-2" size={16} color="#fff" />}
          style={{ marginTop: 4 }}
        >
          Generate my first plan
        </Button>
      </View>
    </View>
  );
}

const MUSCLE_SET = new Set<string>(MUSCLES);

export default function WorkoutsTab() {
  useRenderCount('WorkoutsTab');
  const { userId, bumpXp } = useAppState();
  const insets = useSafeAreaInsets();
  const tabPad100 = useTabBottomPad(100);
  const hideBar = useHideBarOnScroll('workouts');
  const pull = usePullToRefresh('#3B82F6');
  const { status: sessionStatus, startSession } = useWorkoutSession();
  const router = useRouter();
  // Home's plan card links here with ?day=N so the same day it shows is the
  // one selected. Applied once, then cleared, so a later plain visit to the
  // tab falls back to the suggested day instead of a stale one.
  const { day: dayParam } = useLocalSearchParams<{ day?: string }>();
  const dayParamRef = useRef(dayParam);
  dayParamRef.current = dayParam;
  const [workout, setWorkout] = useState<WorkoutRow | null>(null);
  const [events, setEvents] = useState<WorkoutDayEvent[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [selectedDay, setSelectedDay] = useState(0);
  // Polish step 1: a plan made by the old builder gets a one-time offer to rebuild it.
  const [dismissedOldPlan, setDismissedOldPlan] = useState<string | null | undefined>(undefined);
  useEffect(() => {
    AsyncStorage.getItem(OLD_PLAN_CARD_KEY).then((v) => setDismissedOldPlan(v)).catch(() => setDismissedOldPlan(null));
  }, []);
  // Premium W4: the weight each exercise was last done at, shown in grey under today's number.
  const [lastKg, setLastKg] = useState<Record<string, number>>({});
  useEffect(() => {
    const names = workout?.plan.days[selectedDay]?.exercises.map((e) => e.name) ?? [];
    if (!userId || names.length === 0) {
      setLastKg({});
      return;
    }
    let cancelled = false;
    getLastWeights(userId, names).then((m) => { if (!cancelled) setLastKg(m); });
    return () => { cancelled = true; };
  }, [userId, workout, selectedDay]);
  const [starting, setStarting] = useState(false);
  const [guideName, setGuideName] = useState<string | null>(null);
  const [recoveryHints, setRecoveryHints] = useState<Record<string, string>>({});
  const [skipping, setSkipping] = useState(false);
  const [showRegenCard, setShowRegenCard] = useState(false);
  const [regenerating, setRegenerating] = useState(false);
  const [regenError, setRegenError] = useState<string | null>(null);
  const [lastReason, setLastReason] = useState<RegenerationReason | null>(null);
  const [todayStats, setTodayStats] = useState<TodayWorkoutStats | null>(null);
  const [equipment, setEquipment] = useState<Equipment>('gym');
  const [pickerOpen, setPickerOpen] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  // NG PHASE 12: what the engine would prescribe for the selected day, for the marks and weights in the list.
  const [prescribed, setPrescribed] = useState<PrescribedExercise[]>([]);
  const scrollRef = useRef<ScrollView>(null);
  const exercisesY = useRef(0);

  // Hints for the exercise picker: muscles that are Low or Very low today.
  useEffect(() => {
    if (!pickerOpen || !userId) return;
    let cancelled = false;
    (async () => {
      const sets = await getRecentLoggedSets(userId);
      const catalog = await getCatalog(Array.from(new Set(sets.map((x) => x.exerciseName))));
      const scores = muscleScores(MAJOR_MUSCLES, sets, catalog, new Date());
      const hints: Record<string, string> = {};
      for (const m of MAJOR_MUSCLES) {
        const sc = scores[m];
        if (sc?.score !== null && sc?.score !== undefined && (sc.band === 'Low' || sc.band === 'Very low')) {
          hints[m] = `${m.charAt(0).toUpperCase()}${m.slice(1)} is ${sc.band.toLowerCase()} today (${sc.score})`;
        }
      }
      if (!cancelled) setRecoveryHints(hints);
    })();
    return () => {
      cancelled = true;
    };
  }, [pickerOpen, userId]);
  const [sessionModalOpen, setSessionModalOpen] = useState(false);

  useFocusEffect(
    useCallback(() => {
      if (!userId) return;
      let cancelled = false;
      const requestedParam = dayParamRef.current;
      if (requestedParam !== undefined) router.setParams({ day: undefined });
      getLatestWorkout(userId).then(async (w) => {
        if (cancelled) return;
        setWorkout(w);
        if (w) {
          const dayEvents = await getWorkoutDayEvents(userId, w.id);
          if (cancelled) return;
          setEvents(dayEvents);
          const requested = requestedParam !== undefined ? Number(requestedParam) : NaN;
          const hasRequested = Number.isInteger(requested) && requested >= 0 && requested < w.plan.days.length;
          setSelectedDay(hasRequested ? requested : getSuggestedDayIndex(w.plan, dayEvents));
        }
        setLoaded(true);
      });
      getProfile(userId).then((p) => {
        if (cancelled) return;
        setEquipment(p?.equipment ?? 'gym');
        getTodayWorkoutStats(userId, p?.weight ?? null).then((s) => {
          if (!cancelled) setTodayStats(s);
        });
      });
      return () => {
        cancelled = true;
      };
    }, [userId, router])
  );

  // Re-suggest whenever a session finishes (status flips through 'completed'
  // then back to 'idle') so returning to this tab reflects the new progress.
  // Only on that transition: running on every workout change would also
  // override a day just chosen via Home's plan card.
  const prevSessionStatus = useRef(sessionStatus);
  useEffect(() => {
    const finished = prevSessionStatus.current !== 'idle' && sessionStatus === 'idle';
    prevSessionStatus.current = sessionStatus;
    if (!userId || !workout || !finished) return;
    getWorkoutDayEvents(userId, workout.id).then((dayEvents) => {
      setEvents(dayEvents);
      setSelectedDay(getSuggestedDayIndex(workout.plan, dayEvents));
    });
    getProfile(userId).then((p) => getTodayWorkoutStats(userId, p?.weight ?? null)).then(setTodayStats);
  }, [sessionStatus, userId, workout]);

  useEffect(() => {
    if (!userId || !workout) return;
    let cancelled = false;
    loadDayPrescription(userId, workout, selectedDay)
      .then((p) => {
        if (!cancelled) setPrescribed(p);
      })
      .catch(() => {
        if (!cancelled) setPrescribed([]);
      });
    return () => {
      cancelled = true;
    };
  }, [userId, workout, selectedDay, events.length]);

  if (!loaded) {
    return (
      <View
        style={{
          flex: 1,
          backgroundColor: '#050505',
          paddingHorizontal: 16,
          paddingTop: insets.top + HEADER_CONTENT_HEIGHT + 8,
          gap: 16,
        }}
      >
        <Skeleton width={90} height={12} borderRadius={4} />
        <Skeleton width={160} height={30} borderRadius={8} />
        <View style={{ flexDirection: 'row', gap: 7 }}>
          <Skeleton width={70} height={34} borderRadius={100} />
          <Skeleton width={70} height={34} borderRadius={100} />
          <Skeleton width={70} height={34} borderRadius={100} />
        </View>
        <Skeleton height={116} borderRadius={20} />
        <View style={{ gap: 8 }}>
          <Skeleton height={56} borderRadius={14} />
          <Skeleton height={56} borderRadius={14} />
          <Skeleton height={56} borderRadius={14} />
        </View>
        <Skeleton height={54} borderRadius={16} />
      </View>
    );
  }

  if (!workout) {
    return (
      <ScrollView style={{ flex: 1, backgroundColor: '#050505' }} showsVerticalScrollIndicator={false}>
        <WorkoutsEmptyState />
      </ScrollView>
    );
  }

  const suggestedDay = getSuggestedDayIndex(workout.plan, events);
  const day = workout.plan.days[selectedDay] ?? workout.plan.days[0];
  const isSuggested = selectedDay === suggestedDay;
  const dayLabels = workout.plan.days.map((d) => d.day);
  // Plans on real weekdays get week-aware states (and Missed); "Day 1, Day 2" plans keep the old ones.
  const dayStates = computeWeekdayStates(dayLabels, events, new Date()) ?? computeDayStates(dayLabels, events, suggestedDay);
  const selectedState = dayStates[selectedDay] ?? dayStates[0];

  // NG PHASE 12: week strip, blueprint line, numbers for the exercise list and the sticky Start label.
  const nowDate = new Date();
  const strip = weekStrip(workout.plan.days, events, nowDate);
  const marks = marksFor(prescribed);
  const markByName = new Map(marks.map((m) => [m.name, m]));
  const prescribedByName = new Map(prescribed.map((p) => [p.name, p]));
  const blueprint = BLUEPRINTS.find((b) => b.id === workout.blueprint_id) ?? null;
  const totalSets = day.exercises.reduce((n, ex) => n + (Number(ex.sets) || 0), 0);
  const dayMinutes = Math.round((totalSets * 130) / 60 + 5);
  const weekLabel = workout.block_week ? `WEEK ${workout.block_week} OF 6` : null;
  const todayName = WEEKDAY_NAMES[(nowDate.getDay() + 6) % 7].toUpperCase();
  const heroMuscles = (() => {
    const out: { muscle: Muscle; intensity: number }[] = [];
    const seen = new Set<string>();
    for (const ex of day.exercises) {
      const m = prescribedByName.get(ex.name)?.entry?.primaryMuscle;
      if (m && MUSCLE_SET.has(m) && !seen.has(m)) {
        seen.add(m);
        out.push({ muscle: m as Muscle, intensity: 1 });
      }
    }
    return out;
  })();
  const canStart = sessionStatus === 'idle' && (selectedState.state === 'suggested' || selectedState.state === 'upcoming');

  const handleSkip = async () => {
    if (!userId || skipping) return;
    setSkipping(true);
    await logWorkoutDayEvent(userId, workout.id, day.day, day.focus, 'skipped');
    refreshReminders(userId).catch(() => {}); // drops today's workout reminder
    const dayEvents = await getWorkoutDayEvents(userId, workout.id);
    setEvents(dayEvents);
    setSelectedDay(getSuggestedDayIndex(workout.plan, dayEvents));
    setSkipping(false);
  };

  const handleRegenerate = async (reason: RegenerationReason) => {
    if (!userId || regenerating) return;
    setRegenerating(true);
    setRegenError(null);
    setLastReason(reason);
    const { workout: newWorkout, error } = await generateWorkoutPlan(userId, reason);
    if (newWorkout) {
      setWorkout(newWorkout);
      const dayEvents = await getWorkoutDayEvents(userId, newWorkout.id);
      setEvents(dayEvents);
      setSelectedDay(getSuggestedDayIndex(newWorkout.plan, dayEvents));
      setShowRegenCard(false);
      bumpXp(50); // matches awardXp(userId, 50, 'plan_generated') in generateWorkoutPlan
    } else {
      setRegenError(error ?? 'Could not rebuild your plan — try again shortly.');
    }
    setRegenerating(false);
  };

  // V2 PHASE 7.4: a manually added exercise gets the same computed range and sets the
  // plan's own exercises get (by its role), not a fixed 3 x 10, and an engine row whose
  // first session is a calibration session.
  // Begin Workout starts straight away with the engine's prescription (the check-in and prescription live in the
  // Tracker's Adaptive card now). Any engine failure starts the plan as written.
  const startFromPlan = async () => {
    if (starting || !workout) return;
    setStarting(true);
    try {
      const start = userId ? await beginSession(userId, workout, selectedDay).catch(() => null) : null;
      startSession(start ? start.workout : workout, selectedDay, start ? { sessionId: start.sessionId, prescribed: start.prescribed } : undefined);
    } finally {
      setStarting(false);
    }
  };

  const handleAddExercise = async (exercise: CatalogExercise) => {
    setPickerOpen(false);
    let sets = 3;
    let reps = 10;
    let created: { exerciseId: string; state: ReturnType<typeof newStateFor> } | null = null;
    if (userId) {
      const [catalog, profile] = await Promise.all([getCatalog([exercise.name]), getProfile(userId)]);
      const entry = catalog[catalogKey(exercise.name)];
      if (entry && entry.modality === 'strength' && entry.primaryMuscle) {
        const range = computeRepRange(profile?.goal ?? null, profile?.experience_level ?? null, profile?.age ?? null);
        const start = startingPrescription(range, entry.role);
        sets = start.sets;
        reps = start.startReps;
        created = { exerciseId: exercise.id, state: newStateFor({ name: exercise.name, sets, reps }, entry, range, null) };
      }
    }
    const ok = await addExerciseToDay(workout.id, selectedDay, {
      exerciseId: exercise.id,
      name: exercise.name,
      sets,
      reps,
    });
    if (ok && created && userId) saveExerciseProgress(userId, exercise.name, created.exerciseId, created.state).catch(() => {});
    if (ok) {
      const refreshed = await getLatestWorkout(userId!);
      if (refreshed) setWorkout(refreshed);
    }
  };

  return (
    <View style={{ flex: 1, backgroundColor: '#050505' }}>
      <ScrollView ref={scrollRef} {...hideBar} key={pull.key} refreshControl={pull.refreshControl} showsVerticalScrollIndicator={false}>
        <View
          style={{
            paddingHorizontal: 16,
            paddingTop: insets.top + HEADER_CONTENT_HEIGHT + 8,
            paddingBottom: tabPad100,
            gap: 16,
          }}
        >
          <View style={{ flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between' }}>
            <View>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 3 }}>
                <View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: A }} />
                <Text style={{ color: A, fontSize: 11, letterSpacing: 0.9, fontFamily: BG[700] }}>{weekLabel ? `${todayName} \u00b7 ${weekLabel}` : 'YOUR PLAN'}</Text>
              </View>
            </View>
            {sessionStatus === 'idle' && !showRegenCard && !regenerating ? (
              <PressScale onPress={() => setMenuOpen(true)} accessibilityRole="button" accessibilityLabel="More options for your plan" hitSlop={4}>
                <Surface radius={12} padding={0} grain={0.06} shadow={false} style={{ width: 44, height: 44 }}>
                  <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
                    <Icon name="more-horizontal" size={20} color="#D4D4D8" />
                  </View>
                </Surface>
              </PressScale>
            ) : null}
          </View>

          {regenerating ? (
            <View
              style={{
                backgroundColor: '#151517',
                borderWidth: 1,
                borderColor: 'rgba(59,130,246,0.30)',
                borderRadius: 16,
                paddingHorizontal: 18,
                paddingVertical: 20,
                alignItems: 'center',
                gap: 6,
              }}
            >
              <Icon name="wand-2" size={22} color={A} />
              <Text style={{ color: '#fff', fontSize: 15, fontFamily: BG[700] }}>Rebuilding your plan…</Text>
              <Text style={{ color: COLORS.textMuted, fontSize: 13, fontFamily: BG[400] }}>Usually takes a few seconds</Text>
            </View>
          ) : showRegenCard ? (
            <View
              style={{
                backgroundColor: '#151517',
                borderWidth: 1,
                borderColor: 'rgba(255,255,255,0.12)',
                borderRadius: 16,
                paddingHorizontal: 16,
                paddingVertical: 14,
                gap: 10,
              }}
            >
              <Text style={{ color: '#fff', fontSize: 15, fontFamily: BG[700] }}>What should change?</Text>
              <Text style={{ color: COLORS.textMuted, fontSize: 13, lineHeight: 18, fontFamily: BG[400] }}>This replaces your current plan. Your logged sessions stay.</Text>
              {regenError ? (
                <ErrorCard message={regenError} onRetry={lastReason ? () => handleRegenerate(lastReason) : undefined} retrying={regenerating} />
              ) : null}
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
                {(
                  [
                    ['too_hard', 'Too hard'],
                    ['too_easy', 'Too easy'],
                    ['wrong_focus', 'Wrong focus'],
                  ] as [RegenerationReason, string][]
                ).map(([value, label]) => (
                  <TouchableOpacity
                    key={value}
                    activeOpacity={0.8}
                    onPress={() => handleRegenerate(value)}
                    style={{
                      paddingHorizontal: 14,
                      paddingVertical: 9,
                      borderRadius: 100,
                      backgroundColor: 'rgba(59,130,246,0.12)',
                      borderWidth: 1,
                      borderColor: 'rgba(59,130,246,0.35)',
                    }}
                  >
                    <Text style={{ color: A, fontSize: 13, fontFamily: BG[700] }}>{label}</Text>
                  </TouchableOpacity>
                ))}
              </View>
              <TouchableOpacity
                activeOpacity={0.8}
                onPress={() => {
                  setRegenError(null);
                  setShowRegenCard(false);
                }}
                style={{ alignSelf: 'flex-start' }}
              >
                <Text style={{ color: COLORS.textMuted, fontSize: 13, fontFamily: BG[600] }}>Cancel</Text>
              </TouchableOpacity>
            </View>
          ) : null}

          {dismissedOldPlan !== undefined && showOldPlanCard(workout, dismissedOldPlan) ? (
            <View style={{ minHeight: 48, flexDirection: 'row', alignItems: 'center', gap: 4, paddingLeft: 14, paddingRight: 2, borderRadius: 24, backgroundColor: 'rgba(59,130,246,0.10)' }}>
              <Text style={{ flex: 1, color: COLORS.fg, fontSize: 15, fontFamily: BG[400] }} numberOfLines={1}>Built with the old builder</Text>
              <Button variant="primary" size="sm" onPress={() => router.push('/workout-setup')}>Rebuild</Button>
              <PressScale
                onPress={() => {
                  setDismissedOldPlan(workout.id);
                  AsyncStorage.setItem(OLD_PLAN_CARD_KEY, workout.id).catch(() => {});
                }}
                accessibilityRole="button"
                accessibilityLabel="Dismiss"
                hitSlop={4}
              >
                <View style={{ width: 44, height: 44, alignItems: 'center', justifyContent: 'center' }}>
                  <Icon name="x" size={16} color={COLORS.textMuted} />
                </View>
              </PressScale>
            </View>
          ) : null}

          {strip ? (
            <Rise i={0}><WeekStripView strip={strip} selectedPlanIndex={selectedDay} onSelect={setSelectedDay} /></Rise>
          ) : (
            <View>
              <Text style={{ color: COLORS.textMuted, fontSize: 11, letterSpacing: 0.7, marginBottom: 8, fontFamily: BG[700] }}>
                PICK A DAY {isSuggested ? '· SUGGESTED IS HIGHLIGHTED' : ''}
              </Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 7 }}>
              {workout.plan.days.map((d, i) => {
                const active = i === selectedDay;
                const state = dayStates[i]?.state ?? 'upcoming';
                const suggested = state === 'suggested';
                return (
                  <TouchableOpacity
                    key={`${d.day}-${i}`}
                    activeOpacity={0.8}
                    onPress={() => setSelectedDay(i)}
                    style={{
                      paddingHorizontal: 14,
                      paddingVertical: 9,
                      borderRadius: 100,
                      backgroundColor: active ? A : '#151517',
                      borderWidth: 1,
                      borderColor: active ? A : suggested ? 'rgba(59,130,246,0.5)' : 'rgba(255,255,255,0.12)',
                      flexDirection: 'row',
                      alignItems: 'center',
                      gap: 5,
                    }}
                  >
                    {state === 'completed' ? (
                      <Icon name="check" size={12} color={active ? '#fff' : COLORS.green} strokeWidth={3} />
                    ) : state === 'skipped' || state === 'missed' ? (
                      <Icon name="x" size={12} color={active ? '#fff' : COLORS.danger} strokeWidth={3} />
                    ) : suggested && !active ? (
                      <View style={{ width: 5, height: 5, borderRadius: 3, backgroundColor: A }} />
                    ) : null}
                    <Text style={{ color: active ? '#fff' : '#A1A1AA', fontSize: 13, fontFamily: BG[700] }}>{d.day}</Text>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
            </View>
          )}

          <Rise i={1}>
          <Hero variant="blue" accessibilityLabel={`${day.day}: ${sessionName(day.focus)}`}>
            {/* Premium W3: the muscles this session works, lit on a small body map in the corner. */}
            {heroMuscles.length > 0 ? (
              <View pointerEvents="none" style={{ position: 'absolute', right: 14, top: 14, opacity: 0.9 }}>
                <BodyMap muscles={heroMuscles} height={84} color="#BFDBFE" views="both" />
              </View>
            ) : null}
            <Text style={{ color: 'rgba(255,255,255,0.75)', fontSize: 13, letterSpacing: 0.9, fontFamily: BG[700] }}>
              {heroKicker(dayLabels, day.day, day.focus, selectedState.state, isSuggested, nowDate)}
            </Text>
            <Text style={{ color: '#fff', fontSize: 28, fontVariant: ['tabular-nums'], letterSpacing: -0.5, marginTop: 6, paddingRight: heroMuscles.length > 0 ? 78 : 0, fontFamily: BG[800] }}>{sessionName(day.focus)}</Text>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 14 }}>
              {[`${day.exercises.length} exercise${day.exercises.length === 1 ? '' : 's'}`, `~${dayMinutes} min`, `${totalSets} sets`].map((t) => (
                <View key={t} style={{ borderRadius: 10, paddingHorizontal: 12, paddingVertical: 7, backgroundColor: 'rgba(255,255,255,0.12)' }}>
                  <Text style={{ color: '#fff', fontSize: 13, fontFamily: BG[700] }}>{t}</Text>
                </View>
              ))}
            </View>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 14 }}>
              <Icon name="shield-check" size={16} color="rgba(255,255,255,0.75)" />
              <Text style={{ color: 'rgba(255,255,255,0.78)', fontSize: 13, flex: 1, fontFamily: BG[400] }}>
                {blueprint ? `${blueprint.title.split(',')[0]} plan${blueprint.reviewed ? ' \u00b7 trainer reviewed' : ''}` : 'Your plan'}
              </Text>
              <TouchableOpacity onPress={() => scrollRef.current?.scrollTo({ y: Math.max(0, exercisesY.current - 12), animated: true })} accessibilityRole="button" accessibilityLabel="See the exercises" style={{ minHeight: 44, justifyContent: 'center' }}>
                <Text style={{ color: '#fff', fontSize: 15, fontFamily: BG[800] }}>Exercises {'\u203a'}</Text>
              </TouchableOpacity>
            </View>
            {sessionStatus === 'idle' && (canStart || selectedState.state === 'missed') ? (
              <View style={{ marginTop: 14 }}>
                <Button variant="inverted" size="lg" fullWidth onPress={() => startFromPlan()} icon={<Icon name="play" size={14} color="#000" />}>
                  {selectedState.state === 'missed' ? 'Do it today' : 'Start session'}
                </Button>
              </View>
            ) : null}
          </Hero>
          </Rise>

          <View onLayout={(e) => { exercisesY.current = e.nativeEvent.layout.y; }}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
              <SectionHeader>{heroKicker(dayLabels, day.day, day.focus, selectedState.state, isSuggested, nowDate).startsWith('TODAY') ? "Today's exercises" : `${day.day}'s exercises`}</SectionHeader>
              {marks.length > 0 ? <Text style={{ color: COLORS.textMuted, fontSize: 17, fontFamily: FONT_HAND }}>{marks.length} mark{marks.length === 1 ? '' : 's'} today</Text> : null}
            </View>
            <View style={{ gap: 10 }}>
              {day.exercises.map((ex, i) => {
                const p = prescribedByName.get(ex.name);
                const entry = p?.entry ?? null;
                const managed = !!p?.managed;
                const repMin = managed ? p!.state.repMin : ex.reps;
                const repMax = managed ? p!.state.repMax : ex.reps;
                const sets = managed ? p!.prescription.sets : ex.sets;
                const weight = managed ? p!.prescription.weightKg : null;
                const sub = entry?.primaryMuscle ? `${entry.primaryMuscle.charAt(0).toUpperCase()}${entry.primaryMuscle.slice(1)}${entry.secondaryMuscles?.[0] ? ` \u00b7 ${entry.secondaryMuscles[0]}` : ''}` : null;
                return (
                  <ExerciseRow
                    key={`${ex.name}-${i}`}
                    index={i + 1}
                    name={ex.name}
                    sub={sub}
                    setsText={`${sets} \u00d7 ${repMin === repMax ? repMin : `${repMin}\u2013${repMax}`}`}
                    weightText={weight !== null && weight > 0 ? `${Math.round(weight * 100) / 100} kg` : null}
                    muscle={entry?.primaryMuscle && MUSCLE_SET.has(entry.primaryMuscle) ? (entry.primaryMuscle as Muscle) : null}
                    lastText={(lastKg[catalogKey(ex.name)] ?? 0) > 0 ? `last: ${Math.round(lastKg[catalogKey(ex.name)] * 100) / 100} kg` : null}
                    mark={markByName.get(ex.name)}
                    onOpenGuide={() => setGuideName(ex.name)}
                  />
                );
              })}
            </View>
            <TouchableOpacity
              activeOpacity={0.8}
              onPress={() => setPickerOpen(true)}
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 6,
                marginTop: 8,
                paddingVertical: 12,
                borderRadius: 14,
                borderWidth: 1,
                borderStyle: 'dashed',
                borderColor: 'rgba(255,255,255,0.18)',
              }}
            >
              <Icon name="plus" size={14} color="#A1A1AA" />
              <Text style={{ color: '#A1A1AA', fontSize: 13, fontFamily: BG[700] }}>Add exercise</Text>
            </TouchableOpacity>
          </View>

          {workout.plan.notes ? (
            <Text style={{ color: COLORS.textMuted, fontSize: 13, lineHeight: 17, fontStyle: 'italic', fontFamily: BG[400] }}>
              {workout.plan.notes}
            </Text>
          ) : null}


          {sessionStatus === 'idle' && selectedState.state === 'completed' && selectedState.event && userId ? (
            <CompletedDayCard userId={userId} day={day} event={selectedState.event} />
          ) : sessionStatus === 'idle' && selectedState.state === 'skipped' && selectedState.event ? (
            <SkippedDayCard
              day={day}
              event={selectedState.event}
              onDoToday={() => startFromPlan()}
              onKeepToday={() => setSelectedDay(suggestedDay)}
            />
          ) : sessionStatus === 'idle' && selectedState.state === 'missed' && 'date' in selectedState ? (
            <MissedDayCard
              day={day}
              date={(selectedState as { date: Date }).date}
              onDoToday={() => startFromPlan()}
              onKeepToday={() => setSelectedDay(suggestedDay)}
            />
          ) : sessionStatus === 'idle' ? (
            <TouchableOpacity activeOpacity={0.8} onPress={handleSkip} disabled={skipping} style={{ alignSelf: 'center', minHeight: 44, justifyContent: 'center' }}>
              <Text style={{ color: COLORS.textMuted, fontSize: 15, fontFamily: BG[600] }}>
                {skipping ? 'Skipping…' : 'Not today? Skip this workout'}
              </Text>
            </TouchableOpacity>
          ) : (
            <View
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 8,
                height: 52,
                borderRadius: 16,
                backgroundColor: 'rgba(59,130,246,0.10)',
                borderWidth: 1,
                borderColor: 'rgba(59,130,246,0.28)',
              }}
            >
              <Icon name="activity" size={15} color={A} />
              <Text style={{ color: A, fontSize: 13, fontFamily: BG[700] }}>Workout in progress — see the player below</Text>
            </View>
          )}


          <Button variant="secondary" size="md" fullWidth accent={A} onPress={() => setSessionModalOpen(true)} icon={<Icon name="activity" size={15} color={A} />}>
            Log a session
          </Button>
        </View>
      </ScrollView>
      <ExercisePickerModal visible={pickerOpen} equipment={equipment} recoveryHints={recoveryHints} onSelect={handleAddExercise} onClose={() => setPickerOpen(false)} />
      <BottomSheet visible={menuOpen} onClose={() => setMenuOpen(false)} maxHeightFraction={0.5}>
        <View style={{ paddingHorizontal: 20, paddingBottom: 12, gap: 8 }}>
          <Text style={{ color: COLORS.fg, fontSize: 22, fontFamily: BG[800], marginBottom: 6 }}>Your plan</Text>
          <Button variant="secondary" size="lg" fullWidth accent={A} icon={<Icon name="calendar" size={16} color={A} />} onPress={() => { setMenuOpen(false); router.push('/workout-setup'); }}>
            Change days or goal
          </Button>
          <Button variant="secondary" size="lg" fullWidth accent={A} icon={<Icon name="plus" size={16} color={A} />} onPress={() => { setMenuOpen(false); setPickerOpen(true); }}>
            Add an exercise
          </Button>
          {/* Regenerating replaces the plan, so it is the quietest option and asks what to change first. */}
          <Button variant="ghost" size="lg" fullWidth icon={<Icon name="repeat" size={16} color="#A1A1AA" />} onPress={() => { setMenuOpen(false); setRegenError(null); setShowRegenCard(true); }}>
            Rebuild the plan
          </Button>
        </View>
      </BottomSheet>
      {guideName ? <ExerciseGuideSheet name={guideName} onClose={() => setGuideName(null)} /> : null}
      <LogSessionModal
        visible={sessionModalOpen}
        equipment={equipment}
        onClose={() => setSessionModalOpen(false)}
        onLogged={async () => {
          setSessionModalOpen(false);
          if (userId) {
            const p = await getProfile(userId);
            setTodayStats(await getTodayWorkoutStats(userId, p?.weight ?? null));
          }
        }}
      />
    </View>
  );
}
