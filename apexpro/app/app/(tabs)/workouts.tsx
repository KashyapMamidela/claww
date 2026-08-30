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
  getLatestWorkout,
  getSuggestedDayIndex,
  getWorkoutDayEvents,
  logWorkoutDayEvent,
  type WorkoutDayEvent,
  type WorkoutRow,
} from '../../lib/data';
import { Icon } from '../../components/ui/Icon';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
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
  const { userId } = useAppState();
  const insets = useSafeAreaInsets();
  const { status: sessionStatus, startSession } = useWorkoutSession();
  const [workout, setWorkout] = useState<WorkoutRow | null>(null);
  const [events, setEvents] = useState<WorkoutDayEvent[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [selectedDay, setSelectedDay] = useState(0);
  const [skipping, setSkipping] = useState(false);

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
  }, [sessionStatus, userId, workout]);

  if (!loaded) {
    return <View style={{ flex: 1, backgroundColor: '#050505' }} />;
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
          <View>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 3 }}>
              <View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: A }} />
              <Text style={{ color: A, fontSize: 10, fontWeight: '700', letterSpacing: 0.9, fontFamily: FONT }}>YOUR PLAN</Text>
            </View>
            <Display>Workouts</Display>
          </View>

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
