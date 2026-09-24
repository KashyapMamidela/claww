import React, { useCallback, useEffect, useState } from 'react';
import { ScrollView, Text, TouchableOpacity, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { useFocusEffect } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { COLORS, FONT, HEADER_CONTENT_HEIGHT, TAB_BAR_CONTENT_HEIGHT } from '../../lib/theme';
import { useAppState } from '../../lib/appState';
import { useWorkoutSession } from '../../lib/workoutSession';
import {
  generateWorkoutPlan,
  getLatestWorkout,
  getProfile,
  getSuggestedDayIndex,
  getTodayWorkoutStats,
  getWorkoutDayEvents,
  logWorkoutDayEvent,
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
  const { userId, bumpXp } = useAppState();
  const insets = useSafeAreaInsets();
  const { status: sessionStatus, startSession } = useWorkoutSession();
  const [workout, setWorkout] = useState<WorkoutRow | null>(null);
  const [events, setEvents] = useState<WorkoutDayEvent[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [selectedDay, setSelectedDay] = useState(0);
  const [skipping, setSkipping] = useState(false);
  const [showRegenCard, setShowRegenCard] = useState(false);
  const [regenerating, setRegenerating] = useState(false);
  const [regenError, setRegenError] = useState<string | null>(null);
  const [lastReason, setLastReason] = useState<RegenerationReason | null>(null);
  const [todayStats, setTodayStats] = useState<TodayWorkoutStats | null>(null);

  useFocusEffect(
    useCallback(() => {
      if (!userId) return;
      let cancelled = false;
      getLatestWorkout(userId).then(async (w) => {
        if (cancelled) return;
        setWorkout(w);
        if (w) {
          const dayEvents = await getWorkoutDayEvents(userId, w.id);
          if (cancelled) return;
          setEvents(dayEvents);
          setSelectedDay(getSuggestedDayIndex(w.plan, dayEvents));
        }
        setLoaded(true);
      });
      getProfile(userId).then((p) => {
        if (cancelled) return;
        getTodayWorkoutStats(userId, p?.weight ?? null).then((s) => {
          if (!cancelled) setTodayStats(s);
        });
      });
      return () => {
        cancelled = true;
      };
    }, [userId])
  );

  // Re-suggest whenever a session finishes (status flips through 'completed'
  // then back to 'idle') so returning to this tab reflects the new progress.
  useEffect(() => {
    if (!userId || !workout || sessionStatus !== 'idle') return;
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

  const handleSkip = async () => {
    if (!userId || skipping) return;
    setSkipping(true);
    await logWorkoutDayEvent(userId, workout.id, day.day, day.focus, 'skipped');
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
                const suggested = i === suggestedDay;
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
                    {suggested && !active ? <View style={{ width: 5, height: 5, borderRadius: 3, backgroundColor: A }} /> : null}
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
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                    <Icon name="circle" size={20} color="#71717A" />
                    <View style={{ flex: 1 }}>
                      <Text style={{ color: '#fff', fontSize: 13, fontWeight: '700', fontFamily: FONT }}>{ex.name}</Text>
                      <Text style={{ color: '#71717A', fontSize: 11, marginTop: 2, fontFamily: FONT }}>
                        {ex.sets} sets · {ex.reps} reps
                      </Text>
                    </View>
                  </View>
                </View>
              ))}
            </View>
          </View>

          {workout.plan.notes ? (
            <Text style={{ color: '#71717A', fontSize: 11.5, lineHeight: 17, fontStyle: 'italic', fontFamily: FONT }}>
              {workout.plan.notes}
            </Text>
          ) : null}

          {sessionStatus === 'idle' ? (
            <View style={{ gap: 8 }}>
              <Button
                variant="primary"
                accent={A}
                accentDeep={A3}
                size="lg"
                fullWidth
                onPress={() => startSession(workout, selectedDay)}
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
        </View>
      </ScrollView>
    </View>
  );
}
