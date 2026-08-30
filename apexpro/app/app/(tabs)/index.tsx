import React, { useCallback, useState } from 'react';
import { ScrollView, Text, TouchableOpacity, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { useFocusEffect } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { COLORS, FONT, HEADER_CONTENT_HEIGHT, TAB_BAR_CONTENT_HEIGHT } from '../../lib/theme';
import { useAppState } from '../../lib/appState';
import { getActivityStreak, getLatestWorkout, getProfile, getUserXp, type WorkoutRow } from '../../lib/data';
import { Icon } from '../../components/ui/Icon';
import { Button } from '../../components/ui/Button';
import { SectionLabel } from '../../components/ui/SectionLabel';
import { StatCard } from '../../components/ui/StatCard';
import { ProgressBar } from '../../components/ui/ProgressBar';
import { ProgressRing } from '../../components/ui/ProgressRing';
import { SleepArcDial } from '../../components/SleepArcDial';
import { WaterWidget } from '../../components/WaterWidget';
import { Display } from '../../components/ui/Typography';

function AiCard({ children }: { children: React.ReactNode }) {
  return (
    <View
      style={{
        backgroundColor: '#151517',
        borderWidth: 1,
        borderColor: 'rgba(168,85,247,0.22)',
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
            backgroundColor: 'rgba(168,85,247,0.15)',
            borderWidth: 1,
            borderColor: 'rgba(168,85,247,0.3)',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <Icon name="sparkles" size={14} color={COLORS.purple} />
        </View>
        <Text style={{ color: '#fff', fontSize: 12, fontWeight: '700', fontFamily: FONT }}>CLAWW AI</Text>
      </View>
      <Text style={{ color: '#A1A1AA', fontSize: 12.5, lineHeight: 19, fontFamily: FONT }}>{children}</Text>
    </View>
  );
}

function HomeEmptyState() {
  const { userId, userName, sleepLogged, logSleep } = useAppState();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [streak, setStreak] = useState(0);

  useFocusEffect(
    useCallback(() => {
      if (!userId) return;
      let cancelled = false;
      getActivityStreak(userId).then((s) => {
        if (!cancelled) setStreak(s);
      });
      return () => {
        cancelled = true;
      };
    }, [userId])
  );

  return (
    <View
      style={{
        paddingHorizontal: 16,
        paddingTop: insets.top + HEADER_CONTENT_HEIGHT + 8,
        paddingBottom: Math.max(insets.bottom, 20) + TAB_BAR_CONTENT_HEIGHT + 28,
        gap: 14,
      }}
    >
      <View>
        <SectionLabel color={COLORS.blue}>DAY ONE</SectionLabel>
        <Display style={{ marginTop: 4 }}>
          Welcome,{'\n'}{userName || 'there'}.
        </Display>
        <Text style={{ color: '#71717A', fontSize: 12, marginTop: 6, lineHeight: 18, fontFamily: FONT }}>
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
          <Text style={{ color: '#fff', fontSize: 15, fontWeight: '800', marginBottom: 4, fontFamily: FONT }}>
            Nothing logged yet — that's normal
          </Text>
          <Text style={{ color: '#71717A', fontSize: 12.5, lineHeight: 19, maxWidth: 260, textAlign: 'center', fontFamily: FONT }}>
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
          Generate My First Plan
        </Button>
      </View>

      <View style={{ flexDirection: 'row', gap: 8 }}>
        <StatCard label="Steps" value="—" sub="no data yet" color="#A1A1AA" icon={<Icon name="footprints" size={16} color="#A1A1AA" />} />
        <StatCard label="Burned" value="—" sub="no data yet" color="#71717A" icon={<Icon name="flame" size={16} color="#71717A" />} />
        <StatCard label="Streak" value={String(streak)} sub="days" color="#71717A" icon={<Icon name="trending-up" size={16} color="#71717A" />} />
      </View>

      <WaterWidget compact onOpenFull={() => router.push('/(tabs)/nutrition')} />

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
          <Text style={{ color: '#fff', fontSize: 13, fontWeight: '700', marginBottom: 2, fontFamily: FONT }}>
            {sleepLogged ? 'Recovery is calculating…' : "Log tonight's sleep"}
          </Text>
          <Text style={{ color: '#71717A', fontSize: 11.5, lineHeight: 16, fontFamily: FONT }}>
            {sleepLogged
              ? "You'll see your Recovery Score here tomorrow morning."
              : 'Unlocks your Recovery Score and a personalised readiness read each morning.'}
          </Text>
        </View>
        {!sleepLogged ? (
          <TouchableOpacity
            activeOpacity={0.8}
            onPress={() => {
              // Quick-log default (7.5h) — the full SleepArcDial on the
              // populated Home lets them adjust hours before logging.
              const wakeTime = new Date();
              const bedtime = new Date(wakeTime.getTime() - 7.5 * 60 * 60 * 1000);
              logSleep(7.5, bedtime, wakeTime);
            }}
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
            <Text style={{ color: COLORS.indigo, fontSize: 12, fontWeight: '700', fontFamily: FONT }}>Log sleep</Text>
          </TouchableOpacity>
        ) : (
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5 }}>
            <Icon name="check" size={13} color={COLORS.green} strokeWidth={3} />
            <Text style={{ color: COLORS.green, fontSize: 12, fontWeight: '700', fontFamily: FONT }}>Logged</Text>
          </View>
        )}
      </View>

      <AiCard>
        Your coach is still warming up — <Text style={{ color: '#fff', fontWeight: '700' }}>generate a plan and log a few days</Text> and
        insights will start showing up here.
      </AiCard>
    </View>
  );
}

function HomePopulated() {
  const { userId, userName, recovery, meals } = useAppState();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const recoveryColor = recovery?.band === 'Low' ? COLORS.danger : recovery?.band === 'High' ? COLORS.green : COLORS.amber;

  const [streak, setStreak] = useState(0);
  const [xp, setXp] = useState(0);
  const [latestWorkout, setLatestWorkout] = useState<WorkoutRow | null>(null);
  const [targetKcal, setTargetKcal] = useState(2000); // generic fallback until user sets real targets, matches Nutrition tab

  useFocusEffect(
    useCallback(() => {
      if (!userId) return;
      let cancelled = false;
      Promise.all([getActivityStreak(userId), getUserXp(userId), getLatestWorkout(userId), getProfile(userId)]).then(
        ([s, x, w, profile]) => {
          if (cancelled) return;
          setStreak(s);
          setXp(x);
          setLatestWorkout(w);
          const targets = profile?.personalization_profile?.nutritionDefaults;
          if (targets) setTargetKcal(targets.calories);
        }
      );
      return () => {
        cancelled = true;
      };
    }, [userId])
  );

  // Nutrition-today, derived from real meal logs against the user's real
  // (or generic fallback) targets — same numbers the Nutrition tab shows.
  const consumedKcal = meals.reduce((s, m) => s + (m.calories ?? 0), 0);
  const nutritionPct = Math.min((consumedKcal / targetKcal) * 100, 100);

  const sleepPct = recovery ? Math.min((recovery.score / 100) * 100, 100) : 0; // recovery score already IS the sleep-driven composite
  const recoveryPct = recovery?.score ?? 0;
  const dailyGoalPct = recovery ? Math.round((recoveryPct + nutritionPct + sleepPct) / 3) : 0;

  const today = latestWorkout?.plan.days[0];

  return (
    <View
      style={{
        paddingHorizontal: 16,
        paddingTop: insets.top + HEADER_CONTENT_HEIGHT + 8,
        paddingBottom: Math.max(insets.bottom, 20) + TAB_BAR_CONTENT_HEIGHT + 28,
        gap: 14,
      }}
    >
      <View>
        <SectionLabel color={COLORS.green}>TODAY</SectionLabel>
        <Display style={{ marginTop: 4 }}>
          Good morning,{'\n'}{userName || 'there'}.
        </Display>
        <Text style={{ color: '#71717A', fontSize: 12, marginTop: 6, lineHeight: 18, fontFamily: FONT }}>
          {recovery ? (
            <>
              Recovery score{' '}
              <Text style={{ color: recoveryColor, fontWeight: '700' }}>
                {recovery.score} · {recovery.band}
              </Text>{' '}
              — {recovery.band === 'Low' ? 'take it easy today.' : recovery.band === 'High' ? 'great day to push hard.' : 'a solid day for moderate work.'}
            </>
          ) : (
            'Recovery score not available yet — log a night of sleep to unlock it.'
          )}
        </Text>
      </View>

      <View
        style={{
          backgroundColor: '#151517',
          borderWidth: 1,
          borderColor: 'rgba(255,255,255,0.14)',
          borderRadius: 20,
          paddingHorizontal: 18,
          paddingVertical: 16,
        }}
      >
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
          <Text style={{ color: '#fff', fontSize: 13, fontWeight: '700', fontFamily: FONT }}>Daily Progress</Text>
          <View
            style={{
              backgroundColor: 'rgba(245,158,11,0.14)',
              borderWidth: 1,
              borderColor: 'rgba(245,158,11,0.28)',
              borderRadius: 7,
              paddingHorizontal: 9,
              paddingVertical: 3,
            }}
          >
            <Text style={{ fontSize: 10, fontWeight: '700', color: COLORS.amber, fontFamily: FONT }}>✦ {xp} CLAWW</Text>
          </View>
        </View>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 18 }}>
          <ProgressRing
            size={164}
            rings={[
              { r: 72, strokeWidth: 7, color: COLORS.blue, pct: recoveryPct },
              { r: 57, strokeWidth: 7, color: '#FFFFFF', pct: sleepPct },
              { r: 42, strokeWidth: 7, color: COLORS.green, pct: nutritionPct },
            ]}
            trackColor="rgba(255,255,255,0.055)"
          >
            <Text style={{ color: '#fff', fontSize: 26, fontWeight: '900', fontFamily: FONT }}>{dailyGoalPct}%</Text>
            <Text style={{ color: '#A1A1AA', fontSize: 9.5, marginTop: 3, fontFamily: FONT }}>Daily Goal</Text>
          </ProgressRing>
          <View style={{ flex: 1, gap: 11 }}>
            {[
              { label: 'Recovery', value: recovery ? `${recovery.score}` : '—', sub: '/ 100', pct: recoveryPct, color: COLORS.blue },
              { label: 'Sleep', value: recovery ? `${recovery.score}` : '—', sub: '/ 100', pct: sleepPct, color: '#FFFFFF' },
              { label: 'Nutrition', value: `${Math.round(consumedKcal)}`, sub: `/ ${targetKcal} kcal`, pct: nutritionPct, color: COLORS.green },
            ].map((s) => (
              <View key={s.label}>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 }}>
                  <Text style={{ color: '#A1A1AA', fontSize: 10.5, fontFamily: FONT }}>{s.label}</Text>
                  <Text style={{ fontFamily: FONT }}>
                    <Text style={{ color: '#fff', fontSize: 12, fontWeight: '700' }}>{s.value} </Text>
                    <Text style={{ color: '#71717A', fontSize: 10 }}>{s.sub}</Text>
                  </Text>
                </View>
                <ProgressBar pct={s.pct} color={s.color} />
              </View>
            ))}
          </View>
        </View>
      </View>

      <View style={{ flexDirection: 'row', gap: 8 }}>
        <StatCard label="Steps" value="—" sub="needs phone sensors" color="#71717A" icon={<Icon name="footprints" size={16} color="#71717A" />} />
        <StatCard label="Burned" value="—" sub="not tracked yet" color="#71717A" icon={<Icon name="flame" size={16} color="#71717A" />} />
        <StatCard label="Streak" value={String(streak)} sub="days" pct={Math.min(streak * 14, 100)} color={COLORS.green} icon={<Icon name="trending-up" size={16} color={COLORS.green} />} />
      </View>

      <WaterWidget compact onOpenFull={() => router.push('/(tabs)/nutrition')} />

      <SleepArcDial />

      <TouchableOpacity activeOpacity={0.85} onPress={() => router.push('/(tabs)/workouts')}>
        <LinearGradient
          colors={['#0F172A', '#1E3A5F', '#1D4ED8']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={{
            borderRadius: 20,
            borderWidth: 1,
            borderColor: 'rgba(59,130,246,0.35)',
            paddingHorizontal: 18,
            paddingVertical: 16,
          }}
        >
          <Text style={{ color: 'rgba(255,255,255,0.7)', fontSize: 10, fontWeight: '700', letterSpacing: 0.9, fontFamily: FONT }}>
            {today ? `YOUR PLAN · ${today.day.toUpperCase()}` : 'YOUR PLAN'}
          </Text>
          <Text style={{ color: '#fff', fontSize: 18, fontWeight: '800', letterSpacing: -0.3, marginTop: 6, marginBottom: 8, fontFamily: FONT }}>
            {today ? today.focus : 'No plan yet — tap to generate one'}
          </Text>
          {today ? (
            <Text style={{ color: 'rgba(255,255,255,0.7)', fontSize: 11, fontFamily: FONT }}>
              {today.exercises.length} exercise{today.exercises.length === 1 ? '' : 's'} · tap to open
            </Text>
          ) : null}
        </LinearGradient>
      </TouchableOpacity>

      <AiCard>
        {recovery ? (
          <>
            Your <Text style={{ color: '#fff', fontWeight: '700' }}>recovery score of {recovery.score}</Text> puts you in{' '}
            <Text style={{ color: recoveryColor, fontWeight: '700' }}>{recovery.band.toLowerCase()}</Text> readiness today
            {streak > 0 ? (
              <>
                , and you're on a <Text style={{ color: COLORS.purple, fontWeight: '700' }}>{streak}-day streak</Text>
              </>
            ) : null}
            .
          </>
        ) : (
          <>
            Log a night of sleep and your <Text style={{ color: '#fff', fontWeight: '700' }}>Recovery Score</Text> will start showing
            up here each morning.
          </>
        )}
      </AiCard>
    </View>
  );
}

export default function HomeTab() {
  const { isNewUser } = useAppState();
  return (
    <ScrollView style={{ flex: 1, backgroundColor: '#050505' }} showsVerticalScrollIndicator={false}>
      {isNewUser ? <HomeEmptyState /> : <HomePopulated />}
    </ScrollView>
  );
}
