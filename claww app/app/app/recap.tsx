import React, { useCallback, useMemo, useState } from 'react';
import { Pressable, Share, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { useFocusEffect } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, { FadeIn, FadeInDown } from 'react-native-reanimated';
import { BG, COLORS, FONT_HAND, tint } from '../lib/theme';
import { useAppState } from '../lib/appState';
import { getLatestWorkout, getMealLogsBetween, getProfile, getWorkoutDayEvents } from '../lib/data';
import { supabase } from '../lib/supabase';
import { weekStart } from '../lib/weekReview';
import { buildRecap, recapShareText, type RecapFacts } from '../lib/recapStory';
import { tick } from '../lib/haptics';
import { Button } from '../components/ui/Button';
import { Icon } from '../components/ui/Icon';

// Premium F5: the weekly recap as a story. Four full-screen cards; tap the right half for the next, the left half for
// the previous, the cross to leave. Opened from "Your week, marked up" and the Sunday reminder.

const dayKey = (iso: string) => {
  const d = new Date(iso);
  return `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
};

export default function RecapScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { userId, streak } = useAppState();
  const [facts, setFacts] = useState<RecapFacts | null>(null);
  const [index, setIndex] = useState(0);

  useFocusEffect(
    useCallback(() => {
      if (!userId) return;
      let cancelled = false;
      (async () => {
        const start = weekStart(new Date());
        const [workout, meals, profile, sets] = await Promise.all([
          getLatestWorkout(userId),
          getMealLogsBetween(userId, start.toISOString(), new Date(Date.now() + 86_400_000).toISOString()),
          getProfile(userId),
          supabase.from('workout_logs').select('exercise_name, weight_achieved, reps_achieved').eq('user_id', userId).gte('completed_at', start.toISOString()),
        ]);
        const events = workout ? await getWorkoutDayEvents(userId, workout.id) : [];
        if (cancelled) return;
        const proteinTarget = profile?.personalization_profile?.nutritionDefaults?.protein_g ?? 0;
        const perDay = new Map<string, number>();
        for (const m of meals) if (m.plan_status !== 'skipped') perDay.set(dayKey(m.logged_at), (perDay.get(dayKey(m.logged_at)) ?? 0) + (m.protein_g ?? 0));
        let best: RecapFacts['bestLift'] = null;
        for (const r of (sets.data ?? []) as { exercise_name: string; weight_achieved: number | null; reps_achieved: number | null }[]) {
          const w = r.weight_achieved ?? 0;
          if (w > 0 && (!best || w > best.weightKg)) best = { name: r.exercise_name, weightKg: w, reps: r.reps_achieved ?? 0 };
        }
        setFacts({
          sessionsDone: events.filter((e) => e.status === 'completed' && new Date(e.createdAt) >= start).length,
          sessionsPlanned: workout?.plan.days.length ?? 0,
          proteinDays: proteinTarget > 0 ? [...perDay.values()].filter((p) => p >= proteinTarget * 0.9).length : 0,
          mealDays: perDay.size,
          bestLift: best,
          streakDays: streak,
        });
      })();
      return () => {
        cancelled = true;
      };
    }, [userId, streak])
  );

  const cards = useMemo(() => (facts ? buildRecap(facts) : []), [facts]);
  const card = cards[Math.min(index, Math.max(0, cards.length - 1))];
  const last = index >= cards.length - 1;
  const go = (d: number) => {
    const next = Math.max(0, Math.min(cards.length - 1, index + d));
    if (next !== index) {
      tick();
      setIndex(next);
    }
  };

  if (!card) {
    return (
      <View style={{ flex: 1, backgroundColor: '#050505', alignItems: 'center', justifyContent: 'center' }}>
        <Text style={{ color: COLORS.textMuted, fontFamily: BG[500], fontSize: 15 }}>Reading your week…</Text>
      </View>
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: '#050505' }}>
      <LinearGradient colors={[tint(card.color, 0.28), tint(card.color, 0)]} style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 460 }} pointerEvents="none" />
      <View style={{ flexDirection: 'row', gap: 4, paddingHorizontal: 16, paddingTop: insets.top + 10 }}>
        {cards.map((c, i) => (
          <View key={c.id} style={{ flex: 1, height: 4, borderRadius: 2, backgroundColor: i <= index ? '#fff' : 'rgba(255,255,255,0.18)' }} />
        ))}
      </View>
      <Pressable onPress={() => router.back()} accessibilityRole="button" accessibilityLabel="Close the recap" hitSlop={8} style={{ position: 'absolute', top: insets.top + 22, right: 12, width: 44, height: 44, alignItems: 'center', justifyContent: 'center', zIndex: 5 }}>
        <Icon name="x" size={22} color="#fff" />
      </Pressable>

      <View style={{ flex: 1, justifyContent: 'center', paddingHorizontal: 28 }} key={card.id}>
        <Animated.Text entering={FadeIn.duration(300)} style={{ color: card.color, fontSize: 14, letterSpacing: 1.6, fontFamily: BG[800] }}>
          {card.kicker}
        </Animated.Text>
        <Animated.Text entering={FadeInDown.delay(80).duration(420)} style={{ color: COLORS.fg, fontSize: 84, lineHeight: 92, letterSpacing: -2.5, fontFamily: BG[800], fontVariant: ['tabular-nums'], marginTop: 8 }} adjustsFontSizeToFit numberOfLines={1}>
          {card.big}
        </Animated.Text>
        <Animated.Text entering={FadeInDown.delay(160).duration(420)} style={{ color: COLORS.fgGray, fontSize: 26, fontFamily: BG[700] }}>
          {card.unit}
        </Animated.Text>
        <Animated.Text entering={FadeIn.delay(450).duration(500)} style={{ color: COLORS.fg, fontSize: 30, lineHeight: 34, marginTop: 22, fontFamily: FONT_HAND, fontWeight: '700', transform: [{ rotate: '-1.5deg' }] }}>
          {card.line}
        </Animated.Text>
      </View>

      {/* Left half goes back, right half goes forward, under the content. */}
      <View style={{ position: 'absolute', top: insets.top + 80, bottom: 130, left: 0, right: 0, flexDirection: 'row' }}>
        <Pressable style={{ flex: 1 }} onPress={() => go(-1)} accessibilityRole="button" accessibilityLabel="Previous card" />
        <Pressable style={{ flex: 1 }} onPress={() => go(1)} accessibilityRole="button" accessibilityLabel="Next card" />
      </View>

      <View style={{ paddingHorizontal: 20, paddingBottom: Math.max(insets.bottom, 16) + 8, gap: 8 }}>
        {last ? (
          <Button variant="primary" size="lg" fullWidth accent={card.color} onPress={() => Share.share({ message: recapShareText(cards) })} icon={<Icon name="share-2" size={17} color="#fff" />}>
            Share my week
          </Button>
        ) : (
          <Button variant="secondary" size="lg" fullWidth accent={card.color} onPress={() => go(1)}>
            Next
          </Button>
        )}
      </View>
    </View>
  );
}
