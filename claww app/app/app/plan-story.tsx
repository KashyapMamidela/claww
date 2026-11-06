import React, { useEffect, useMemo, useState } from 'react';
import { Pressable, ScrollView, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { AREA_COLORS, COLORS, FONT, FONT_HAND } from '../lib/theme';
import { useAppState } from '../lib/appState';
import { getLatestWorkout, type WorkoutRow } from '../lib/data';
import { ensureMealPlans, type StoredPlan } from '../lib/mealPlanData';
import { dayMinutes, firstSession, storyWeek, summaryLine, WATCH_LINES, type WeekKind } from '../lib/planStory';
import { notificationsSupported } from '../lib/notifications';
import { Button } from '../components/ui/Button';
import { Icon } from '../components/ui/Icon';
import { Surface } from '../components/ui/Surface';
import { Skeleton } from '../components/ui/Skeleton';

// Polish step 7 (board "Your plan arrives as stories"): four cards, tap through, one Adjust button on each.
const KIND_COLOR: Record<WeekKind, string> = { gym: AREA_COLORS.workouts, yoga: AREA_COLORS.recovery, mobility: AREA_COLORS.sleep, rest: COLORS.textFaint };
const STORY_COLORS = [AREA_COLORS.workouts, AREA_COLORS.workouts, AREA_COLORS.nutrition, AREA_COLORS.recovery];

export default function PlanStory() {
  const router = useRouter();
  const { onboarding } = useLocalSearchParams<{ onboarding?: string }>();
  const { userId } = useAppState();
  const [i, setI] = useState(0);
  const [workout, setWorkout] = useState<WorkoutRow | null>(null);
  const [meals, setMeals] = useState<StoredPlan | null>(null);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    if (!userId) return;
    let cancelled = false;
    Promise.all([getLatestWorkout(userId), ensureMealPlans(userId).catch(() => null)]).then(([w, m]) => {
      if (cancelled) return;
      setWorkout(w);
      setMeals(m);
      setLoaded(true);
    });
    return () => {
      cancelled = true;
    };
  }, [userId]);

  const days = workout?.plan.days ?? [];
  const week = useMemo(() => storyWeek(days), [days]);
  const first = useMemo(() => firstSession(days, new Date()), [days]);
  const color = STORY_COLORS[i];

  const finish = () => {
    if (onboarding === '1') router.replace(notificationsSupported ? '/screens/onboarding/reminders' : '/(tabs)');
    else router.dismissTo('/(tabs)/workouts');
  };
  const next = () => (i === 3 ? finish() : setI(i + 1));
  const back = () => (i === 0 ? router.back() : setI(i - 1));

  const adjust = () => {
    if (i === 0) router.push('/workout-setup');
    else if (i === 1) router.push('/(tabs)/workouts');
    else if (i === 2) router.push('/nutrition-setup');
    else router.push('/settings');
  };

  const title = ['Your week', 'Your first session', 'A day of food', 'What I keep an eye on'][i];
  const adjustLabel = ['Change days', 'Open it in Workouts', 'Change my meals', 'Reminders and settings'][i];

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: COLORS.bg }}>
      <View style={{ flexDirection: 'row', gap: 6, paddingHorizontal: 20, paddingTop: 14 }} accessibilityLabel={`Story ${i + 1} of 4`}>
        {[0, 1, 2, 3].map((n) => (
          <View key={n} style={{ flex: 1, height: 4, borderRadius: 2, backgroundColor: n <= i ? COLORS.fg : 'rgba(255,255,255,0.14)' }} />
        ))}
      </View>

      <ScrollView contentContainerStyle={{ paddingHorizontal: 20, paddingTop: 28, paddingBottom: 24, gap: 14 }}>
        <View style={{ gap: 6 }}>
          <Text style={{ color: COLORS.textMuted, fontSize: 13, fontFamily: FONT }}>Your plan · story {i + 1} of 4</Text>
          <Text style={{ color: COLORS.fg, fontSize: 32, fontWeight: '900', letterSpacing: -0.8, lineHeight: 38, fontFamily: FONT }}>{title}</Text>
        </View>

        {!loaded ? (
          <Skeleton height={260} borderRadius={20} />
        ) : i === 0 ? (
          <>
            <Text style={{ color: COLORS.textMuted, fontSize: 15, lineHeight: 22, fontFamily: FONT }}>{summaryLine(days)}</Text>
            <Surface padding={4}>
              {week.map((d, n) => (
                <View key={`${d.day}-${n}`} style={{ minHeight: 50, flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 14, borderBottomWidth: n < week.length - 1 ? 1 : 0, borderBottomColor: 'rgba(255,255,255,0.06)' }}>
                  <View style={{ width: 10, height: 10, borderRadius: 5, backgroundColor: KIND_COLOR[d.kind] }} />
                  <Text style={{ width: 44, color: COLORS.textMuted, fontSize: 15, fontFamily: FONT }}>{d.day}</Text>
                  <Text style={{ flex: 1, color: d.kind === 'rest' ? COLORS.textMuted : COLORS.fg, fontSize: 17, fontWeight: d.kind === 'rest' ? '500' : '700', fontFamily: FONT }}>{d.what}</Text>
                  {d.minutes ? <Text style={{ color: COLORS.textMuted, fontSize: 15, fontVariant: ['tabular-nums'], fontFamily: FONT }}>{d.minutes} min</Text> : null}
                </View>
              ))}
            </Surface>
          </>
        ) : i === 1 ? (
          first ? (
            <Surface padding={16}>
              <Text style={{ color: COLORS.fg, fontSize: 22, fontWeight: '800', fontFamily: FONT }}>{first.focus}</Text>
              <Text style={{ color: COLORS.textMuted, fontSize: 15, marginTop: 2, marginBottom: 10, fontFamily: FONT }}>{first.day} · about {dayMinutes(first)} min</Text>
              {first.exercises.map((e, n) => (
                <View key={`${e.name}-${n}`} style={{ minHeight: 48, flexDirection: 'row', alignItems: 'center', gap: 10, borderTopWidth: n === 0 ? 0 : 1, borderTopColor: 'rgba(255,255,255,0.06)' }}>
                  <Text style={{ flex: 1, color: COLORS.fg, fontSize: 17, fontFamily: FONT }}>{e.name}</Text>
                  <Text style={{ color: COLORS.textMuted, fontSize: 15, fontVariant: ['tabular-nums'], fontFamily: FONT }}>
                    {e.sets === 1 && Number(e.reps) >= 5 && /yoga|mobility/i.test(first.focus) ? `${e.reps} min` : `${e.sets} × ${e.reps}`}
                  </Text>
                </View>
              ))}
            </Surface>
          ) : (
            <Text style={{ color: COLORS.textMuted, fontSize: 15, fontFamily: FONT }}>Your plan has no sessions yet.</Text>
          )
        ) : i === 2 ? (
          meals ? (
            <Surface padding={16}>
              <Text style={{ color: COLORS.textMuted, fontSize: 15, marginBottom: 6, fontFamily: FONT }}>
                {Math.round(meals.totals.kcal).toLocaleString('en-IN')} kcal · {Math.round(meals.totals.protein)} g protein, from what you can get where you eat
              </Text>
              {meals.meals.map((m, n) => (
                <View key={m.meal} style={{ paddingVertical: 12, gap: 2, borderTopWidth: n === 0 ? 0 : 1, borderTopColor: 'rgba(255,255,255,0.06)' }}>
                  <Text style={{ color: COLORS.textMuted, fontSize: 13, fontFamily: FONT }}>{m.meal.charAt(0).toUpperCase() + m.meal.slice(1)}</Text>
                  <Text style={{ color: COLORS.fg, fontSize: 17, fontWeight: '700', fontFamily: FONT }}>{m.name}</Text>
                  <Text style={{ color: COLORS.textMuted, fontSize: 14, fontVariant: ['tabular-nums'], fontFamily: FONT }}>{m.kcal} kcal · P {Math.round(m.protein)} g</Text>
                </View>
              ))}
            </Surface>
          ) : (
            <Surface padding={16}>
              <Text style={{ color: COLORS.fg, fontSize: 17, fontWeight: '700', fontFamily: FONT }}>Meals are not set up yet</Text>
              <Text style={{ color: COLORS.textMuted, fontSize: 15, lineHeight: 22, marginTop: 4, fontFamily: FONT }}>Tell us where you eat and what you can get, and each day's three meals are planned around your protein target.</Text>
            </Surface>
          )
        ) : (
          <Surface padding={16}>
            {WATCH_LINES.map((w, n) => (
              <View key={w.title} style={{ paddingVertical: 12, gap: 3, borderTopWidth: n === 0 ? 0 : 1, borderTopColor: 'rgba(255,255,255,0.06)' }}>
                <Text style={{ color: COLORS.fg, fontSize: 17, fontWeight: '800', fontFamily: FONT }}>{w.title}</Text>
                <Text style={{ color: COLORS.textMuted, fontSize: 15, lineHeight: 22, fontFamily: FONT }}>{w.line}</Text>
              </View>
            ))}
          </Surface>
        )}

        <Pressable onPress={adjust} accessibilityRole="button" accessibilityLabel={adjustLabel} style={{ minHeight: 44, flexDirection: 'row', alignItems: 'center', gap: 6, alignSelf: 'flex-start' }}>
          <Icon name="pencil" size={15} color={color} />
          <Text style={{ color, fontSize: 15, fontWeight: '700', fontFamily: FONT }}>Adjust · {adjustLabel.toLowerCase()}</Text>
        </Pressable>
        {i === 3 ? <Text style={{ color: COLORS.pen, fontSize: 22, fontFamily: FONT_HAND, textAlign: 'center' }}>I mark every change on your plan in pen</Text> : null}
      </ScrollView>

      <View style={{ flexDirection: 'row', gap: 10, paddingHorizontal: 20, paddingBottom: 20 }}>
        <View style={{ flex: 1 }}>
          <Button variant="secondary" size="lg" fullWidth onPress={back}>
            {i === 0 ? 'Change days' : 'Back'}
          </Button>
        </View>
        <View style={{ flex: 1.4 }}>
          <Button variant="primary" size="lg" fullWidth onPress={next}>
            {i === 3 ? 'Start my plan' : 'Next'}
          </Button>
        </View>
      </View>
    </SafeAreaView>
  );
}
