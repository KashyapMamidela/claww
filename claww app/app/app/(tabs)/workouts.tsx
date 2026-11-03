import React, { useCallback, useEffect, useRef, useState } from 'react';
import { ScrollView, Text, TouchableOpacity, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useFocusEffect } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { COLORS, FONT, HEADER_CONTENT_HEIGHT, TAB_BAR_CONTENT_HEIGHT } from '../../lib/theme';
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
import { WorkoutCalendar } from '../../components/WorkoutCalendar';
import { Display } from '../../components/ui/Typography';
import { ExercisePickerModal } from '../../components/ExercisePickerModal';
import { LogSessionModal } from '../../components/LogSessionModal';
import { CompletedDayCard, MissedDayCard, SkippedDayCard } from '../../components/PastDayCards';
import { computeDayStates } from '../../lib/workoutDayState';
import { computeWeekdayStates } from '../../lib/trainingWeek';
import { useRenderCount } from '../../lib/perf';
import { refreshReminders } from '../../lib/reminderSync';
import { SessionStartFlow } from '../../components/SessionStartFlow';
import { ExerciseGuideSheet } from '../../components/ExerciseGuideSheet';
import { getCatalog, getRecentLoggedSets, saveExerciseProgress } from '../../lib/adaptiveData';
import { catalogKey, MAJOR_MUSCLES, muscleScores } from '../../lib/muscleRecovery';
import { computeRepRange, startingPrescription } from '../../lib/engine';
import { newStateFor } from '../../lib/sessionPrescription';

const A = COLORS.blue;
const A2 = COLORS.blueMid;
const A3 = COLORS.blueDeep;

function WorkoutsEmptyState() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  return (
    <View
      style={{
        paddingHorizontal: 16,
        paddingTop: insets.top + HEADER_CONTENT_HEIGHT + 8,
        paddingBottom: Math.max(insets.bottom, 20) + TAB_BAR_CONTENT_HEIGHT + 40,
        gap: 16,
      }}
    >
      <View>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 3 }}>
          <View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: A }} />
          <Text style={{ color: A, fontSize: 10, fontWeight: '700', letterSpacing: 0.9, fontFamily: FONT }}>WORKOUTS</Text>
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
          <Text style={{ color: '#fff', fontSize: 18, fontWeight: '800', marginBottom: 8, fontFamily: FONT }}>
            Your training plan lives here
          </Text>
          <Text style={{ color: '#71717A', fontSize: 13, lineHeight: 20, maxWidth: 280, textAlign: 'center', fontFamily: FONT }}>
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
          Generate My First Plan
        </Button>
      </View>
    </View>
  );
}

export default function WorkoutsTab() {
  useRenderCount('WorkoutsTab');
  const { userId, bumpXp } = useAppState();
  const insets = useSafeAreaInsets();
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
  const [flowOpen, setFlowOpen] = useState(false);
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
      <ScrollView showsVerticalScrollIndicator={false}>
        <View
          style={{
            paddingHorizontal: 16,
            paddingTop: insets.top + HEADER_CONTENT_HEIGHT + 8,
            paddingBottom: Math.max(insets.bottom, 20) + TAB_BAR_CONTENT_HEIGHT + 48,
            gap: 16,
          }}
        >
          <View style={{ flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between' }}>
            <View>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 3 }}>
                <View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: A }} />
                <Text style={{ color: A, fontSize: 10, fontWeight: '700', letterSpacing: 0.9, fontFamily: FONT }}>YOUR PLAN</Text>
              </View>
              <Display>Workouts</Display>
            </View>
            {sessionStatus === 'idle' && !showRegenCard && !regenerating ? (
              <TouchableOpacity
                activeOpacity={0.8}
                onPress={() => {
                  setRegenError(null);
                  setShowRegenCard(true);
                }}
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  gap: 5,
                  paddingHorizontal: 11,
                  paddingVertical: 7,
                  borderRadius: 100,
                  backgroundColor: '#151517',
                  borderWidth: 1,
                  borderColor: 'rgba(255,255,255,0.12)',
                  marginTop: 4,
                }}
              >
                <Icon name="repeat" size={12} color="#A1A1AA" />
                <Text style={{ color: '#A1A1AA', fontSize: 11.5, fontWeight: '700', fontFamily: FONT }}>Regenerate</Text>
              </TouchableOpacity>
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
              <Text style={{ color: '#fff', fontSize: 13.5, fontWeight: '700', fontFamily: FONT }}>Rebuilding your plan…</Text>
              <Text style={{ color: '#71717A', fontSize: 11.5, fontFamily: FONT }}>Usually takes a few seconds</Text>
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
              <Text style={{ color: '#fff', fontSize: 13, fontWeight: '700', fontFamily: FONT }}>What should change?</Text>
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
                    <Text style={{ color: A, fontSize: 12.5, fontWeight: '700', fontFamily: FONT }}>{label}</Text>
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
                <Text style={{ color: '#71717A', fontSize: 12, fontWeight: '600', fontFamily: FONT }}>Cancel</Text>
              </TouchableOpacity>
            </View>
          ) : null}

          <View>
            <Text style={{ color: '#71717A', fontSize: 10.5, fontWeight: '700', letterSpacing: 0.7, marginBottom: 8, fontFamily: FONT }}>
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
                    <Text style={{ color: active ? '#fff' : '#A1A1AA', fontSize: 12.5, fontWeight: '700', fontFamily: FONT }}>{d.day}</Text>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          </View>

          <LinearGradient
            colors={[A3, A2, A]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={{ borderRadius: 20, borderWidth: 1, borderColor: 'rgba(59,130,246,0.48)', paddingHorizontal: 18, paddingTop: 18, paddingBottom: 16 }}
          >
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <Badge color="#fff">{day.day.toUpperCase()}</Badge>
              {isSuggested ? <Badge color={COLORS.amber}>TODAY'S PICK</Badge> : null}
            </View>
            <Text style={{ color: '#fff', fontSize: 21, fontWeight: '900', letterSpacing: -0.4, marginTop: 10, fontFamily: FONT }}>
              {day.focus}
            </Text>
            <Text style={{ color: 'rgba(255,255,255,0.75)', fontSize: 11, marginTop: 10, fontFamily: FONT }}>
              {day.exercises.length} exercise{day.exercises.length === 1 ? '' : 's'}
            </Text>
          </LinearGradient>

          {todayStats ? (
            <View style={{ flexDirection: 'row', gap: 8 }}>
              {[
                {
                  label: 'PROGRESS',
                  value: `${Math.min(
                    100,
                    Math.round((todayStats.setsCompleted / Math.max(1, day.exercises.reduce((s, ex) => s + ex.sets, 0))) * 100)
                  )}%`,
                  sub: `${todayStats.setsCompleted} sets today`,
                },
                { label: 'VOLUME', value: todayStats.volume >= 1000 ? `${(todayStats.volume / 1000).toFixed(1)}K` : String(Math.round(todayStats.volume)), sub: 'kg today' },
                { label: 'BURNED', value: todayStats.calorieBurn > 0 ? String(todayStats.calorieBurn) : '—', sub: 'kcal est.' },
              ].map((s) => (
                <View
                  key={s.label}
                  style={{
                    flex: 1,
                    backgroundColor: '#151517',
                    borderWidth: 1,
                    borderColor: 'rgba(255,255,255,0.1)',
                    borderRadius: 14,
                    paddingHorizontal: 12,
                    paddingVertical: 10,
                  }}
                >
                  <Text style={{ color: '#71717A', fontSize: 9, fontWeight: '700', letterSpacing: 0.6, fontFamily: FONT }}>{s.label}</Text>
                  <Text style={{ color: '#fff', fontSize: 18, fontWeight: '900', marginTop: 2, fontFamily: FONT }}>{s.value}</Text>
                  <Text style={{ color: '#52525B', fontSize: 9.5, marginTop: 1, fontFamily: FONT }}>{s.sub}</Text>
                </View>
              ))}
            </View>
          ) : null}

          <View>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
              <Text style={{ color: '#fff', fontSize: 14, fontWeight: '700', fontFamily: FONT }}>{day.day}'s Exercises</Text>
              <Badge color={A}>{day.exercises.length} total</Badge>
            </View>
            <View style={{ gap: 8 }}>
              {day.exercises.map((ex, i) => (
                <View
                  key={`${ex.name}-${i}`}
                  style={{
                    backgroundColor: '#151517',
                    borderWidth: 1,
                    borderColor: 'rgba(255,255,255,0.08)',
                    borderRadius: 14,
                    paddingHorizontal: 14,
                    paddingVertical: 12,
                  }}
                >
                  <TouchableOpacity
                    activeOpacity={0.8}
                    onPress={() => setGuideName(ex.name)}
                    accessibilityRole="button"
                    accessibilityLabel={`${ex.name}: how to do it`}
                    style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}
                  >
                    <Icon name="circle" size={20} color="#71717A" />
                    <View style={{ flex: 1 }}>
                      <Text style={{ color: '#fff', fontSize: 13, fontWeight: '700', fontFamily: FONT }}>{ex.name}</Text>
                      <Text style={{ color: '#71717A', fontSize: 11, marginTop: 2, fontFamily: FONT }}>
                        {ex.sets} sets · {ex.reps} reps
                      </Text>
                    </View>
                    <Icon name="info" size={16} color="#52525B" />
                  </TouchableOpacity>
                </View>
              ))}
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
              <Text style={{ color: '#A1A1AA', fontSize: 12.5, fontWeight: '700', fontFamily: FONT }}>Add Exercise</Text>
            </TouchableOpacity>
          </View>

          {workout.plan.notes ? (
            <Text style={{ color: '#71717A', fontSize: 11.5, lineHeight: 17, fontStyle: 'italic', fontFamily: FONT }}>
              {workout.plan.notes}
            </Text>
          ) : null}

          {sessionStatus === 'idle' && selectedState.state === 'completed' && selectedState.event && userId ? (
            <CompletedDayCard userId={userId} day={day} event={selectedState.event} />
          ) : sessionStatus === 'idle' && selectedState.state === 'skipped' && selectedState.event ? (
            <SkippedDayCard
              day={day}
              event={selectedState.event}
              onDoToday={() => setFlowOpen(true)}
              onKeepToday={() => setSelectedDay(suggestedDay)}
            />
          ) : sessionStatus === 'idle' && selectedState.state === 'missed' && 'date' in selectedState ? (
            <MissedDayCard
              day={day}
              date={(selectedState as { date: Date }).date}
              onDoToday={() => setFlowOpen(true)}
              onKeepToday={() => setSelectedDay(suggestedDay)}
            />
          ) : sessionStatus === 'idle' ? (
            <View style={{ gap: 8 }}>
              <Button
                variant="primary"
                accent={A}
                accentDeep={A3}
                size="lg"
                fullWidth
                onPress={() => setFlowOpen(true)}
                icon={<Icon name="play" size={14} color="#fff" />}
              >
                Begin Workout
              </Button>
              <TouchableOpacity activeOpacity={0.8} onPress={handleSkip} disabled={skipping} style={{ alignSelf: 'center', paddingVertical: 4 }}>
                <Text style={{ color: '#71717A', fontSize: 12.5, fontWeight: '600', fontFamily: FONT }}>
                  {skipping ? 'Skipping…' : "Not today — skip this workout"}
                </Text>
              </TouchableOpacity>
            </View>
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
              <Text style={{ color: A, fontSize: 13, fontWeight: '700', fontFamily: FONT }}>Workout in progress — see the player below</Text>
            </View>
          )}

          <WorkoutCalendar />

          <TouchableOpacity
            activeOpacity={0.8}
            onPress={() => setSessionModalOpen(true)}
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 6,
              paddingVertical: 13,
              borderRadius: 14,
              backgroundColor: '#151517',
              borderWidth: 1,
              borderColor: 'rgba(255,255,255,0.12)',
            }}
          >
            <Icon name="activity" size={14} color="#A1A1AA" />
            <Text style={{ color: '#A1A1AA', fontSize: 12.5, fontWeight: '700', fontFamily: FONT }}>Log a Session</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
      <ExercisePickerModal visible={pickerOpen} equipment={equipment} recoveryHints={recoveryHints} onSelect={handleAddExercise} onClose={() => setPickerOpen(false)} />
      {guideName ? <ExerciseGuideSheet name={guideName} onClose={() => setGuideName(null)} /> : null}
      <SessionStartFlow
        visible={flowOpen}
        userId={userId}
        workout={workout}
        dayIndex={selectedDay}
        onClose={() => setFlowOpen(false)}
        onBegin={(start) => {
          setFlowOpen(false);
          startSession(start ? start.workout : workout, selectedDay, start ? { sessionId: start.sessionId, prescribed: start.prescribed } : undefined);
        }}
      />
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
