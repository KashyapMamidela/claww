import React, { useEffect, useRef, useState } from 'react';
import { Animated, ScrollView, Text, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { COLORS, FONT } from '../lib/theme';
import { useAppState } from '../lib/appState';
import { useWorkoutSession } from '../lib/workoutSession';
import { getProfile } from '../lib/data';
import { notificationsSupported } from '../lib/notifications';
import { Icon } from '../components/ui/Icon';
import { Button } from '../components/ui/Button';
import { NotificationPromptCard } from '../components/NotificationPromptCard';

const A = COLORS.blue;
const A3 = COLORS.blueDeep;

function formatClock(totalSeconds: number): string {
  const mm = String(Math.floor(totalSeconds / 60)).padStart(2, '0');
  const ss = String(totalSeconds % 60).padStart(2, '0');
  return `${mm}:${ss}`;
}

export default function WorkoutCompleteScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { userId, userName } = useAppState();
  const { lastSummary } = useWorkoutSession();
  const [showNotificationPrompt, setShowNotificationPrompt] = useState(false);

  const tileScale = useRef(new Animated.Value(0.5)).current;
  const tileOpacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.spring(tileScale, { toValue: 1, useNativeDriver: true, speed: 14, bounciness: 12 }),
      Animated.timing(tileOpacity, { toValue: 1, duration: 400, useNativeDriver: true }),
    ]).start();
  }, []);

  // SHIP PHASE 8.3 — the contextual moment the roadmap asks for: after a
  // user's first completed workout, never on cold start. Only shown if the
  // prompt has genuinely never been shown before (notification_prompt_shown_at
  // is null), which setNotificationPromptShown makes permanent either way
  // (enabled or declined) so this never nags twice.
  useEffect(() => {
    if (!userId || !notificationsSupported) return;
    let cancelled = false;
    getProfile(userId).then((profile) => {
      if (!cancelled && profile && !profile.notification_prompt_shown_at) {
        setShowNotificationPrompt(true);
      }
    });
    return () => {
      cancelled = true;
    };
  }, [userId]);

  const summary = lastSummary;
  const STATS = [
    { icon: 'clock', label: 'TIME TRAINED', value: summary ? formatClock(summary.elapsedSeconds) : '—' },
    { icon: 'dumbbell', label: 'EXERCISES', value: summary ? String(summary.exercisesCompleted) : '—', sub: summary ? `/ ${summary.totalExercises}` : undefined },
    {
      icon: 'check-circle-2',
      label: 'SETS COMPLETED',
      value: summary ? String(summary.setsCompleted) : '—',
      sub: summary ? `/ ${summary.totalSetsPlanned}` : undefined,
    },
    { icon: 'repeat', label: 'REPS COMPLETED', value: summary ? String(summary.repsCompleted) : '—' },
  ];
  const setsPct = summary && summary.totalSetsPlanned > 0 ? Math.round((summary.setsCompleted / summary.totalSetsPlanned) * 100) : null;

  const handleDone = () => {
    router.dismissTo('/(tabs)');
  };

  return (
    <View style={{ flex: 1, backgroundColor: '#050505' }}>
      <ScrollView contentContainerStyle={{ paddingTop: insets.top + 48, paddingHorizontal: 22, paddingBottom: 24, alignItems: 'center' }}>
        <Animated.View style={{ transform: [{ scale: tileScale }], opacity: tileOpacity, marginBottom: 22 }}>
          <LinearGradient
            colors={[A3, A]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={{
              width: 88,
              height: 88,
              borderRadius: 26,
              alignItems: 'center',
              justifyContent: 'center',
              shadowColor: A,
              shadowOffset: { width: 0, height: 10 },
              shadowOpacity: 0.35,
              shadowRadius: 20,
              elevation: 10,
            }}
          >
            <Icon name="check" size={44} color="#fff" strokeWidth={3} />
          </LinearGradient>
        </Animated.View>

        <Text style={{ color: A, fontSize: 11, fontWeight: '700', letterSpacing: 1.2, marginBottom: 8, fontFamily: FONT }}>
          SESSION COMPLETE
        </Text>
        <Text
          style={{
            color: '#fff',
            fontSize: 30,
            fontWeight: '900',
            letterSpacing: -0.6,
            marginBottom: 10,
            textAlign: 'center',
            lineHeight: 35,
            fontFamily: FONT,
          }}
        >
          Nice work{userName ? `, ${userName}` : ''}.
        </Text>

        <View
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            gap: 6,
            backgroundColor: 'rgba(245,158,11,0.12)',
            borderWidth: 1,
            borderColor: 'rgba(245,158,11,0.28)',
            borderRadius: 100,
            paddingHorizontal: 12,
            paddingVertical: 5,
            marginBottom: 18,
          }}
        >
          <Text style={{ fontSize: 13 }}>✦</Text>
          <Text style={{ color: COLORS.amber, fontSize: 12.5, fontWeight: '800', fontFamily: FONT }}>
            +{summary?.xpEarned ?? 0} CLAWW earned
          </Text>
        </View>

        <Text style={{ color: '#A1A1AA', fontSize: 13.5, lineHeight: 21, textAlign: 'center', maxWidth: 300, marginBottom: 26, fontFamily: FONT }}>
          {setsPct !== null ? (
            <>
              Great session — you completed{' '}
              <Text style={{ color: '#fff', fontWeight: '700' }}>
                {summary!.setsCompleted}/{summary!.totalSetsPlanned} sets
              </Text>{' '}
              (<Text style={{ color: A, fontWeight: '700' }}>{setsPct}%</Text> of planned volume).
            </>
          ) : (
            'Great session.'
          )}
        </Text>

        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10, width: '100%' }}>
          {STATS.map((s) => (
            <View
              key={s.label}
              style={{
                flexBasis: '47%',
                flexGrow: 1,
                backgroundColor: '#151517',
                borderWidth: 1,
                borderColor: 'rgba(59,130,246,0.22)',
                borderRadius: 16,
                paddingHorizontal: 14,
                paddingTop: 14,
                paddingBottom: 12,
              }}
            >
              <View
                style={{
                  width: 30,
                  height: 30,
                  borderRadius: 9,
                  backgroundColor: 'rgba(59,130,246,0.14)',
                  borderWidth: 1,
                  borderColor: 'rgba(59,130,246,0.28)',
                  alignItems: 'center',
                  justifyContent: 'center',
                  marginBottom: 10,
                }}
              >
                <Icon name={s.icon} size={15} color={A} />
              </View>
              <Text style={{ color: '#71717A', fontSize: 9.5, fontWeight: '700', letterSpacing: 0.5, marginBottom: 3, fontFamily: FONT }}>
                {s.label}
              </Text>
              <Text style={{ color: '#fff', fontSize: 22, fontWeight: '900', letterSpacing: -0.5, fontFamily: FONT }}>
                {s.value}
                {s.sub ? <Text style={{ color: '#71717A', fontSize: 11, fontWeight: '400', letterSpacing: 0 }}> {s.sub}</Text> : null}
              </Text>
            </View>
          ))}
        </View>

        {showNotificationPrompt && userId ? (
          <View style={{ width: '100%', marginTop: 16 }}>
            <NotificationPromptCard userId={userId} onDismiss={() => setShowNotificationPrompt(false)} />
          </View>
        ) : null}
      </ScrollView>

      <View style={{ paddingHorizontal: 22, paddingTop: 14, paddingBottom: Math.max(insets.bottom, 26) }}>
        <Button variant="primary" accent={A} accentDeep={A3} size="lg" fullWidth onPress={handleDone}>
          Back to Home
        </Button>
      </View>
    </View>
  );
}
