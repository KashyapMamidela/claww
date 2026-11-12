import { moveDayItemLabel } from '../lib/penDays';
import { Button } from '../components/ui/Button';
import { BackTile } from '../components/ui/BackTile';
import React, { useCallback, useMemo, useRef, useState } from 'react';
import { Pressable, ScrollView, Share, Text, View } from 'react-native';
import { captureRef } from 'react-native-view-shot';
import * as Sharing from 'expo-sharing';
import { useRouter } from 'expo-router';
import { useFocusEffect } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { COLORS, FONT, FONT_HAND, BG, bg } from '../lib/theme';
import { useAppState } from '../lib/appState';
import { getLatestWorkout, getMealLogsBetween, getProfile, getWorkoutDayEvents } from '../lib/data';
import { BLOCK_WEEKS, reviewCounts, type PenMark } from '../lib/engine';
import { usePenMarks } from '../lib/usePenMarks';
import { dateLine, isClimb, marksForReview, reviewLine, weekStart, type WeekFacts } from '../lib/weekReview';
import { Hero } from '../components/ui/Hero';
import { LetterCard } from '../components/LetterCard';
import { letterChanges, letterFileName, letterNumbers } from '../lib/letter';
import { SHARE_WIDTH, shareCaptureOptions } from '../lib/shareCard';
import { Icon } from '../components/ui/Icon';
import { Segmented } from '../components/ui/Segmented';
import { Skeleton } from '../components/ui/Skeleton';
import { Surface } from '../components/ui/Surface';
import { Rise } from '../components/ui/Rise';
import { Display } from '../components/ui/Typography';

// NG PHASE 11.5 (screen 03): "Your week, marked up". The week in one line with kept / undone counts, the workout and
// nutrition marks each with a Keep / Undo control, a short footnote and "Start week n". Undo puts the old plan back for
// that item; every mark comes from the user's own logs.

const dayKey = (iso: string) => {
  const d = new Date(iso);
  return `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
};

function itemOf(m: PenMark, planDays: { day: string; focus: string }[]): string {
  if (m.target.exercise) return m.target.exercise;
  if (m.target.meal) return `${m.target.meal.charAt(0).toUpperCase()}${m.target.meal.slice(1)}`;
  if (m.target.key === 'calories') return 'Calories';
  if (m.kind === 'move_day') return moveDayItemLabel(planDays, m.oldValue, m.newValue);
  return 'This week';
}

function Row({ m, planDays, onDecide }: { m: PenMark; planDays: { day: string; focus: string }[]; onDecide: (m: PenMark, s: 'kept' | 'undone') => void }) {
  const item = itemOf(m, planDays);
  return (
    <View style={{ paddingVertical: 14, gap: 8, borderTopWidth: 1, borderTopColor: COLORS.border }}>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline', gap: 10 }}>
        <Text style={{ color: COLORS.fg, fontSize: 17, fontFamily: BG[800], flexShrink: 1 }}>{item}</Text>
        <Text style={{ color: COLORS.fg, fontSize: 17, fontFamily: BG[400], flexShrink: 1, textAlign: 'right' }}>
          {m.oldValue ? <Text style={{ color: COLORS.textMuted, textDecorationLine: 'line-through' }}>{m.oldValue} </Text> : null}
          <Text style={{ fontWeight: '800', textDecorationLine: 'underline' }}>{m.newValue}</Text>
        </Text>
      </View>
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
        <Text style={{ color: COLORS.pen, fontSize: 20, fontFamily: FONT_HAND, flex: 1 }}>{m.note}</Text>
        <View style={{ width: 150 }}>
          <Segmented
            accent={COLORS.blue}
            accentDeep={COLORS.blueDeep}
            accessibilityLabel={`${item} mark`}
            options={[
              { value: 'kept', label: 'Keep' },
              { value: 'undone', label: 'Undo' },
            ]}
            value={m.status === 'undone' ? 'undone' : m.status === 'kept' ? 'kept' : null}
            onChange={(v) => onDecide(m, v)}
          />
        </View>
      </View>
    </View>
  );
}

export default function WeekReviewScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { userId } = useAppState();
  const pen = usePenMarks(10);
  const [facts, setFacts] = useState<Omit<WeekFacts, 'climbs'> | null>(null);
  const [blockWeek, setBlockWeek] = useState<number | null>(null);
  const [planDays, setPlanDays] = useState<{ day: string; focus: string }[]>([]);
  const now = useMemo(() => new Date(), []);
  const { userName } = useAppState();
  const letterRef = useRef<View>(null);
  const [sharing, setSharing] = useState(false);

  useFocusEffect(
    useCallback(() => {
      if (!userId) return;
      let cancelled = false;
      (async () => {
        const start = weekStart(new Date());
        const [workout, meals, profile] = await Promise.all([
          getLatestWorkout(userId),
          getMealLogsBetween(userId, start.toISOString(), new Date(Date.now() + 86_400_000).toISOString()),
          getProfile(userId),
        ]);
        const events = workout ? await getWorkoutDayEvents(userId, workout.id) : [];
        if (cancelled) return;
        const proteinTarget = profile?.personalization_profile?.nutritionDefaults?.protein_g ?? 0;
        const perDay = new Map<string, number>();
        for (const m of meals) if (m.plan_status !== 'skipped') perDay.set(dayKey(m.logged_at), (perDay.get(dayKey(m.logged_at)) ?? 0) + (m.protein_g ?? 0));
        setBlockWeek(workout?.block_week ?? null);
        setPlanDays(workout?.plan.days ?? []);
        setFacts({
          sessionsDone: events.filter((e) => e.status === 'completed' && new Date(e.createdAt) >= start).length,
          sessionsPlanned: workout?.plan.days.length ?? 0,
          proteinDays: proteinTarget > 0 ? [...perDay.values()].filter((p) => p >= proteinTarget * 0.9).length : 0,
          mealDays: perDay.size,
        });
      })();
      return () => {
        cancelled = true;
      };
    }, [userId])
  );

  const marks = useMemo(() => marksForReview(pen.marks, now), [pen.marks, now]);
  const counts = reviewCounts(marks);
  const workoutMarks = marks.filter((m) => m.area === 'workout');
  const foodMarks = marks.filter((m) => m.area === 'nutrition');
  const line = facts ? reviewLine({ ...facts, climbs: marks.filter((m) => m.status !== 'undone' && isClimb(m)).length }) : ' ';
  const next = blockWeek ? blockWeek + 1 : null;
  // Polish step 10: the Sunday letter, a 9:16 card of the week to share. It shows only counts and your own marks.
  const letterNumbersList = facts ? letterNumbers({ ...facts, climbs: marks.filter((m) => m.status !== 'undone' && isClimb(m)).length }) : [];
  const shareLetter = async () => {
    if (sharing || !letterRef.current) return;
    setSharing(true);
    try {
      const uri = await captureRef(letterRef, shareCaptureOptions());
      if (await Sharing.isAvailableAsync()) await Sharing.shareAsync(uri, { mimeType: 'image/png', dialogTitle: letterFileName(now), UTI: 'public.png' });
      else await Share.share({ message: `${line} Trained with CLAWW.` });
    } catch {
      // Closing the share sheet is not an error.
    } finally {
      setSharing(false);
    }
  };

  const sections = [
    { label: 'WORKOUTS', list: workoutMarks, color: COLORS.blue },
    { label: 'NUTRITION', list: foodMarks, color: COLORS.green },
  ];

  return (
    <View style={{ flex: 1, backgroundColor: COLORS.bg }}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingTop: insets.top + 12, paddingHorizontal: 16, paddingBottom: insets.bottom + 40, gap: 14 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
          <BackTile onPress={() => router.back()} />
          <View style={{ flex: 1 }}>
            <Display>Week review</Display>
            <Text style={{ color: COLORS.textMuted, fontSize: 15, fontFamily: BG[400] }}>{dateLine(now, blockWeek, BLOCK_WEEKS)}</Text>
          </View>
        </View>

        <Hero variant="green" accessibilityLabel="The week in one line">
          <Text style={{ color: 'rgba(255,255,255,0.75)', fontSize: 13, letterSpacing: 0.9, fontFamily: BG[700] }}>{blockWeek ? `WEEK ${blockWeek} IN ONE LINE` : 'THIS WEEK IN ONE LINE'}</Text>
          <Text style={{ color: '#fff', fontSize: 22, fontVariant: ['tabular-nums'], letterSpacing: -0.4, lineHeight: 30, marginTop: 8, fontFamily: BG[800] }}>{line}</Text>
          <View style={{ flexDirection: 'row', gap: 8, marginTop: 14 }}>
            {[`${counts.kept} kept`, `${counts.undone} undone`, ...(counts.active > 0 ? [`${counts.active} to decide`] : [])].map((t) => (
              <View key={t} style={{ minHeight: 34, paddingHorizontal: 14, borderRadius: 12, backgroundColor: 'rgba(255,255,255,0.14)', justifyContent: 'center' }}>
                <Text style={{ color: '#fff', fontSize: 15, fontFamily: BG[800] }}>{t}</Text>
              </View>
            ))}
          </View>
        </Hero>

        {!pen.loaded ? (
          <View style={{ gap: 12 }} accessibilityLabel="Loading your week">
            <Skeleton height={150} borderRadius={20} />
            <Skeleton height={180} borderRadius={20} />
          </View>
        ) : null}

        {marks.length === 0 && pen.loaded ? (
<Rise i={0}>
          <Surface padding={18}>
            <Text style={{ color: COLORS.fg, fontSize: 17, fontFamily: BG[800] }}>Nothing marked this week</Text>
            <Text style={{ color: COLORS.textMuted, fontSize: 15, lineHeight: 20, marginTop: 4, fontFamily: BG[400] }}>
              Your plan ran as written. Marks appear only when your own logs show a reason to change something.
            </Text>
          </Surface>
</Rise>
        ) : null}

        {sections.map(({ label, list, color }) =>
          list.length === 0 ? null : (
<Rise key={label} i={1}>
            <Surface padding={16}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                  <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: color }} />
                  <Text style={{ color, fontSize: 15, letterSpacing: 0.9, fontFamily: BG[800] }}>{label}</Text>
                </View>
                <Text style={{ color: COLORS.fg, fontSize: 17, fontFamily: FONT_HAND }}>{`${list.length} ${list.length === 1 ? 'mark' : 'marks'}`}</Text>
              </View>
              {list.map((m) => (
                <Row key={m.id} m={m} planDays={planDays} onDecide={pen.decide} />
              ))}
            </Surface>
</Rise>
          )
        )}

        <Text style={{ color: COLORS.textMuted, fontSize: 15, lineHeight: 20, fontFamily: BG[400] }}>
          Undo puts your old plan back for that item. Every mark is made from your own logs, never guessed.
        </Text>

        {/* Premium F5: the week as a four-card story. */}
        <Button variant="secondary" size="lg" fullWidth accent={COLORS.blue} icon={<Icon name="play" size={15} color={COLORS.blue} />} onPress={() => router.push('/recap')}>
          Watch your week
        </Button>

        <Pressable onPress={shareLetter} disabled={sharing || !facts} accessibilityRole="button" accessibilityLabel="Share your week as a picture" style={{ minHeight: 50, borderRadius: 25, borderWidth: 1, borderColor: COLORS.borderStrong, alignItems: 'center', justifyContent: 'center', flexDirection: 'row', gap: 8 }}>
          <Icon name="share-2" size={18} color={COLORS.fg} />
          <Text style={{ color: COLORS.fg, fontSize: 17, fontFamily: BG[800] }}>{sharing ? 'Preparing…' : 'Share your week'}</Text>
        </Pressable>

        <Pressable onPress={() => router.replace('/(tabs)')} accessibilityRole="button" style={{ minHeight: 50, borderRadius: 25, backgroundColor: '#fff', alignItems: 'center', justifyContent: 'center' }}>
          <Text style={{ color: '#0A0A0B', fontSize: 17, fontFamily: BG[800] }}>{next ? `Start week ${next}` : 'Start next week'}</Text>
        </Pressable>
      </ScrollView>
      <View pointerEvents="none" style={{ position: 'absolute', left: -SHARE_WIDTH * 2, top: 0 }} accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
        <LetterCard
          ref={letterRef}
          data={{ name: userName, dateText: now.toLocaleDateString('en-US', { weekday: 'long', day: 'numeric', month: 'long' }), line, numbers: letterNumbersList, changes: letterChanges(marks) }}
        />
      </View>
    </View>
  );
}
