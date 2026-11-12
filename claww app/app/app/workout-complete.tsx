import React, { useEffect, useMemo, useRef, useState } from 'react';
import { PrMoment } from '../components/PrMoment';
import { Pressable, ScrollView, Share, Switch, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { captureRef } from 'react-native-view-shot';
import * as Sharing from 'expo-sharing';
import { AREA_COLORS, COLORS, FONT, FONT_HAND, tint, BG, bg } from '../lib/theme';
import { syncPenMarks } from '../lib/penData';
import { useAppState } from '../lib/appState';
import { useWorkoutSession } from '../lib/workoutSession';
import { getCompletedSessionDates, getCompletedWorkoutDays, getLatestWorkout, getProfile, saveExamWeek, setRatingPromptShown } from '../lib/data';
import { getPastSets } from '../lib/adaptiveData';
import { bestRecords, previousVolume } from '../lib/recapData';
import { examWeekActive, examWeekFrom, dateKey, planStreak, streakSentence, type ExamWeek } from '../lib/planStreak';
import { FEEL_OPTIONS, feelNote, newBest, newBestText, sessionTitle, totalVolume, volumeDelta, type Feel } from '../lib/sessionRecap';
import { shareCaptureOptions, shareFileName } from '../lib/shareCard';
import { sessionKcal } from '../lib/sessionPlan';
import { weekdayIndex } from '../lib/trainingWeek';
import { notificationsSupported } from '../lib/notifications';
import { requestAppReview } from '../lib/rating';
import { Button } from '../components/ui/Button';
import { sessionName } from '../lib/format';
import { Hero } from '../components/ui/Hero';
import { Icon } from '../components/ui/Icon';
import { Segmented } from '../components/ui/Segmented';
import { Surface } from '../components/ui/Surface';
import { ProgressRing } from '../components/ui/ProgressRing';
import { CountUp } from '../components/ui/CountUp';
import * as haptics from '../lib/haptics';
import { NotificationPromptCard } from '../components/NotificationPromptCard';
import { ShareCard } from '../components/workouts/ShareCard';
import { track, AnalyticsEvent } from '../lib/analytics';

const RATING_PROMPT_AT_WORKOUTS = 3; // same milestone as Tracker's own unlock threshold

const A = COLORS.blue;

/** The session-complete card (screen 10): reward hero, new best, how it felt, streak, share, done. */
export default function WorkoutCompleteScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { userId, userName, streakStats, refreshStreak } = useAppState();
  const { lastSummary: summary, applyFeel } = useWorkoutSession();
  const [showNotificationPrompt, setShowNotificationPrompt] = useState(false);
  const [feel, setFeel] = useState<Feel>('just_right');
  const [targets, setTargets] = useState(summary?.nextTargets ?? {});
  const [volumePrev, setVolumePrev] = useState<number | null>(null);
  const [bests, setBests] = useState<ReturnType<typeof bestRecords>>([]);
  const [completedDates, setCompletedDates] = useState<Set<string>>(new Set());
  const [plannedWeekdays, setPlannedWeekdays] = useState<number[] | null>(null);
  const [examWeek, setExamWeek] = useState<ExamWeek | null>(null);
  const [bodyKg, setBodyKg] = useState<number | null>(null);
  const [sharing, setSharing] = useState(false);
  const cardRef = useRef<View>(null);
  const now = useMemo(() => new Date(), []);
  const today = dateKey(now);

  // NG PHASE 11: the trend reader runs after each session (the limits keep it to 3 new marks a day).
  useEffect(() => {
    if (userId) syncPenMarks(userId, true).catch(() => {});
  }, [userId]);

  useEffect(() => {
    track(AnalyticsEvent.WorkoutCompleted);
    const t = setTimeout(refreshStreak, 1200); // after the completed-day event has been written
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // The numbers the card compares against: earlier sessions of the same exercises, the streak inputs, the profile.
  useEffect(() => {
    if (!userId || !summary) return;
    let cancelled = false;
    (async () => {
      const names = Array.from(new Set(summary.doneSets.map((s) => s.name)));
      const [past, dates, profile, workout] = await Promise.all([
        getPastSets(userId, names, summary.startedAtIso),
        getCompletedSessionDates(userId),
        getProfile(userId),
        getLatestWorkout(userId),
      ]);
      if (cancelled) return;
      setVolumePrev(previousVolume(past));
      setBests(bestRecords(past));
      setCompletedDates(new Set([...dates, today]));
      setExamWeek(profile?.personalization_profile?.examWeek ?? null);
      setBodyKg(profile?.weight ?? null);
      const labels = workout?.plan.days.map((d) => d.day) ?? [];
      const idx = labels.map((l) => weekdayIndex(l));
      setPlannedWeekdays(labels.length > 0 && idx.every((i) => i !== null) ? (idx as number[]) : null);
    })();
    return () => {
      cancelled = true;
    };
  }, [userId, summary, today]);

  // SHIP PHASE 8.3 + item #31 — at most one soft-ask on this screen. The notification prompt takes priority;
  // the rating prompt only fires when it isn't showing, once ever, on the 3rd completed workout.
  useEffect(() => {
    if (!userId) return;
    let cancelled = false;
    getProfile(userId).then(async (profile) => {
      if (cancelled || !profile) return;
      if (notificationsSupported && !profile.notification_prompt_shown_at && !profile.notifications_enabled) {
        setShowNotificationPrompt(true);
        return;
      }
      if (profile.rating_prompt_shown_at) return;
      const workoutCount = await getCompletedWorkoutDays(userId);
      if (cancelled || workoutCount < RATING_PROMPT_AT_WORKOUTS) return;
      setRatingPromptShown(userId);
      requestAppReview();
    });
    return () => {
      cancelled = true;
    };
  }, [userId]);

  const volume = summary ? totalVolume(summary.doneSets) : 0;
  // A bodyweight session lifts no kg: its ring counts reps instead of showing a big 0.
  const repsDone = summary ? summary.doneSets.reduce((n, x) => n + (x.reps || 0), 0) : 0;
  const byReps = volume === 0 && repsDone > 0;
  const delta = byReps ? null : volumeDelta(volume, volumePrev);
  const best = summary ? newBest(summary.doneSets, bests) : null;
  const bestNext = best && targets[best.name]?.weightKg ? targets[best.name].weightKg : null;
  const kcal = summary ? sessionKcal(summary.elapsedSeconds * 1000, bodyKg) : 0;
  const minutes = summary ? Math.max(1, Math.round(summary.elapsedSeconds / 60)) : 0;
  const localStreak = planStreak({ today, plannedWeekdays, completedDates, examWeek });
  // The shared streak (the same number Home and the Tracker show) once it has loaded; the local read until then.
  const streak = streakStats ? { days: streakStats.current, since: streakStats.since } : localStreak;
  const examOn = examWeekActive(examWeek, today);
  const title = summary ? sessionTitle(summary.setsCompleted, summary.totalSetsPlanned) : 'Session done';
  const setsLine = summary ? (summary.setsCompleted >= summary.totalSetsPlanned ? 'all done' : `of ${summary.totalSetsPlanned}`) : '';
  const dayName = now.toLocaleDateString('en-US', { weekday: 'long' }).toUpperCase();
  const timeText = now.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });

  const chooseFeel = async (value: Feel) => {
    setFeel(value);
    const next = await applyFeel(value);
    if (next) setTargets(next);
  };

  const toggleExam = async (on: boolean) => {
    if (!userId) return;
    const week = on ? examWeekFrom(now) : null;
    setExamWeek(week);
    await saveExamWeek(userId, week);
    refreshStreak();
  };

  const shareData = {
    name: userName ?? '',
    title,
    focus: summary?.focus || 'Workout',
    minutes,
    setsText: summary ? `${summary.setsCompleted} sets` : '0 sets',
    volumeText: byReps ? `${repsDone} reps` : `${volume.toLocaleString('en-IN')} kg`,
    kcal,
    bestLine: best ? `${best.name}: ${newBestText(best)}` : null,
    streakText: streak.days > 1 ? `${streak.days}-day streak` : null,
    dateText: now.toLocaleDateString('en-US', { weekday: 'long', day: 'numeric', month: 'long' }),
  };

  const share = async () => {
    if (sharing || !cardRef.current) return;
    setSharing(true);
    try {
      const uri = await captureRef(cardRef, shareCaptureOptions());
      if (await Sharing.isAvailableAsync()) {
        await Sharing.shareAsync(uri, { mimeType: 'image/png', dialogTitle: shareFileName(now), UTI: 'public.png' });
      } else {
        await Share.share({ message: `${title}: ${summary?.setsCompleted ?? 0} sets, ${byReps ? `${repsDone} reps` : `${volume} kg`}, ${minutes} min. Trained with CLAWW.` });
      }
    } catch {
      // The user closing the share sheet is not an error; a failed capture just leaves the card as it was.
    } finally {
      setSharing(false);
    }
  };

  const handleDone = () => router.dismissTo('/(tabs)');

  // Premium X6: the new best gets its own moment first, once.
  const [prOpen, setPrOpen] = useState(false);
  const prShown = useRef(false);
  useEffect(() => {
    if (best && !prShown.current) {
      prShown.current = true;
      setPrOpen(true);
    }
  }, [best]);

  // The app's one big moment: the sets ring closes once (700 ms) while the volume counts up in its middle, then a
  // single haptic lands with it. A new best has its own moment (PrMoment), so it doesn't buzz twice.
  const volumeId = useRef(`complete.volume.${Date.now()}`).current;
  const setsPct = summary && summary.totalSetsPlanned > 0 ? Math.min(100, (summary.setsCompleted / summary.totalSetsPlanned) * 100) : summary ? 100 : 0;
  const buzzed = useRef(false);
  useEffect(() => {
    if (!summary || buzzed.current || best) return;
    buzzed.current = true;
    const t = setTimeout(() => (setsPct >= 100 ? haptics.success() : haptics.setDone()), 700);
    return () => clearTimeout(t);
  }, [summary, best, setsPct]);
  const stat = (value: string, label: string) => (
    <View>
      <Text style={{ color: '#fff', fontSize: 20, letterSpacing: -0.4, fontVariant: ['tabular-nums'], fontFamily: BG[800] }}>{value}</Text>
      <Text style={{ color: 'rgba(255,255,255,0.72)', fontSize: 13, fontFamily: BG[400] }}>{label}</Text>
    </View>
  );

  return (
    <View style={{ flex: 1, backgroundColor: COLORS.bg }}>
      <ScrollView contentContainerStyle={{ paddingTop: insets.top + 12, paddingHorizontal: 16, paddingBottom: 24, gap: 14 }} showsVerticalScrollIndicator={false}>
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
            <View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: A }} />
            <Text style={{ color: A, fontSize: 13, letterSpacing: 0.9, fontFamily: BG[700] }}>{`${dayName} · ${timeText}`}</Text>
          </View>
          <Pressable onPress={handleDone} accessibilityRole="button" accessibilityLabel="Close" style={{ width: 44, height: 44, alignItems: 'center', justifyContent: 'center' }}>
            <Icon name="x" size={22} color={COLORS.textMuted} />
          </Pressable>
        </View>

        <Hero variant="blue" accessibilityLabel={`${title}. ${minutes} minutes, ${summary?.setsCompleted ?? 0} sets`}>
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
            <Text style={{ color: 'rgba(255,255,255,0.78)', fontSize: 13, letterSpacing: 0.9, flex: 1, fontFamily: BG[700] }}>
              {`${(summary?.focus ? sessionName(summary.focus) : 'Workout').toUpperCase()} · COMPLETE`}
            </Text>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, borderRadius: 12, borderWidth: 1, borderColor: 'rgba(245,158,11,0.55)', backgroundColor: 'rgba(245,158,11,0.16)', paddingHorizontal: 10, paddingVertical: 5 }}>
              <Icon name="sparkles" size={13} color={COLORS.amber} />
              <Text style={{ color: COLORS.amber, fontSize: 13, fontFamily: BG[800] }}>+{summary?.xpEarned ?? 0} XP</Text>
            </View>
          </View>
          <Text style={{ color: '#fff', fontSize: 34, fontVariant: ['tabular-nums'], letterSpacing: -0.8, lineHeight: 38, marginTop: 14, fontFamily: BG[800] }}>
            {title},{'\n'}{userName ? userName.charAt(0).toUpperCase() + userName.slice(1) : 'you'}.
          </Text>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 20, marginTop: 18 }}>
            <ProgressRing size={140} rings={[{ r: 62, strokeWidth: 10, color: '#FFFFFF', pct: setsPct, track: 'rgba(255,255,255,0.16)' }]} trackColor="rgba(255,255,255,0.16)">
              <CountUp id={volumeId} value={byReps ? repsDone : volume} format={(n) => Math.round(n).toLocaleString('en-IN')} textStyle={{ color: '#fff', fontSize: 26, letterSpacing: -0.6, fontVariant: ['tabular-nums'], fontFamily: BG[800] }} />
              <Text style={{ color: 'rgba(255,255,255,0.78)', fontSize: 13, fontFamily: BG[400] }}>{byReps ? 'reps done' : 'kg lifted'}</Text>
              {delta ? <Text style={{ color: '#fff', fontSize: 13, marginTop: 2, fontVariant: ['tabular-nums'], fontFamily: BG[700] }}>{delta.text} vs last</Text> : null}
            </ProgressRing>
            <View style={{ flex: 1, gap: 12 }}>
              {stat(`${summary?.setsCompleted ?? 0} ${summary?.setsCompleted === 1 ? 'set' : 'sets'}`, setsLine)}
              {stat(`${minutes} min`, 'time')}
              {stat(`${kcal} kcal`, 'burned, estimated')}
            </View>
          </View>
        </Hero>

        {best ? (
          <View style={{ borderRadius: 20, borderWidth: 1, borderColor: tint(COLORS.amber, 0.5), backgroundColor: tint(COLORS.amber, 0.10), padding: 16, gap: 12 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
              <View style={{ width: 44, height: 44, borderRadius: 12, alignItems: 'center', justifyContent: 'center', backgroundColor: tint(COLORS.amber, 0.18), borderWidth: 1, borderColor: tint(COLORS.amber, 0.4) }}>
                <Icon name="trophy" size={20} color={COLORS.amber} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={{ color: COLORS.fg, fontSize: 17, fontFamily: BG[800] }}>New best · {best.name}</Text>
                <Text style={{ color: COLORS.textMuted, fontSize: 15, fontFamily: BG[400] }}>{newBestText(best)}</Text>
              </View>
            </View>
            {bestNext ? (
              <View style={{ borderTopWidth: 1, borderTopColor: COLORS.border, paddingTop: 10, flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                <Text style={{ color: COLORS.fg, fontSize: 22, fontFamily: FONT_HAND }}>
                  next {summary?.focus ? sessionName(summary.focus) : 'session'}: {Math.round(bestNext * 100) / 100} kg
                </Text>
                <Icon name="arrow-up-right" size={16} color={COLORS.fg} />
              </View>
            ) : null}
          </View>
        ) : null}

        <Surface padding={16}>
          <Text style={{ color: COLORS.fg, fontSize: 17, fontFamily: BG[800] }}>How did that feel?</Text>
          <Text style={{ color: COLORS.textMuted, fontSize: 15, marginTop: 2, marginBottom: 12, fontFamily: BG[400] }}>This decides how the next session is marked.</Text>
          <Segmented options={FEEL_OPTIONS} value={feel} onChange={chooseFeel} accessibilityLabel="How did that feel" />
          <Text style={{ color: COLORS.fg, fontSize: 20, marginTop: 10, fontFamily: FONT_HAND }}>{feelNote(feel)}</Text>
        </Surface>

        <View style={{ borderRadius: 20, borderWidth: 1, borderColor: tint(AREA_COLORS.streak, 0.4), backgroundColor: tint(AREA_COLORS.streak, 0.08), padding: 16, gap: 12 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
            <View style={{ width: 44, height: 44, borderRadius: 12, alignItems: 'center', justifyContent: 'center', backgroundColor: tint(AREA_COLORS.streak, 0.18), borderWidth: 1, borderColor: tint(AREA_COLORS.streak, 0.4) }}>
              <Icon name="zap" size={20} color={AREA_COLORS.streak} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={{ color: COLORS.fg, fontSize: 17, fontFamily: BG[800] }}>{streak.days}-day streak</Text>
              <Text style={{ color: COLORS.textMuted, fontSize: 15, fontFamily: BG[400] }}>{streakSentence(streak, today)}</Text>
            </View>
          </View>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, borderTopWidth: 1, borderTopColor: COLORS.border, paddingTop: 10 }}>
            <View style={{ flex: 1 }}>
              <Text style={{ color: COLORS.fg, fontSize: 15, fontFamily: BG[700] }}>Exam week</Text>
              <Text style={{ color: COLORS.textMuted, fontSize: 13, fontFamily: BG[400] }}>Protects your streak for 7 days if you miss sessions.</Text>
            </View>
            <Switch value={examOn} onValueChange={toggleExam} accessibilityLabel="Exam week" trackColor={{ true: AREA_COLORS.streak, false: '#3F3F46' }} thumbColor="#FFFFFF" />
          </View>
        </View>

        {showNotificationPrompt && userId ? <NotificationPromptCard userId={userId} onDismiss={() => setShowNotificationPrompt(false)} /> : null}

        <View style={{ height: 84 }} />
      </ScrollView>

      {/* Share and Done stay pinned at the bottom, so the way out is always in reach. */}
      <View style={{ position: 'absolute', left: 0, right: 0, bottom: 0, paddingHorizontal: 16, paddingTop: 12, paddingBottom: Math.max(insets.bottom, 12), backgroundColor: 'rgba(5,5,5,0.94)', borderTopWidth: 1, borderTopColor: COLORS.border }}>
        <View style={{ flexDirection: 'row', gap: 12 }}>
          <View style={{ flex: 0.9 }}>
            <Button variant="secondary" size="lg" fullWidth onPress={share} saving={sharing} icon={<Icon name="share-2" size={16} color={A} />}>
              Share card
            </Button>
          </View>
          <View style={{ flex: 1.1 }}>
            <Button variant="primary" accent={A} accentDeep={COLORS.blueDeep} size="lg" fullWidth onPress={handleDone}>
              Done
            </Button>
          </View>
        </View>
      </View>

      {best ? (
        <PrMoment
          visible={prOpen}
          name={best.name}
          detail={newBestText(best)}
          next={bestNext ? `next: ${bestNext} kg` : null}
          onShare={() => {
            setPrOpen(false);
            setTimeout(share, 400);
          }}
          onClose={() => setPrOpen(false)}
        />
      ) : null}

      {/* The share image is laid out at its real 1080 x 1920 pixels, invisible and behind everything, only to be captured. */}
      <View pointerEvents="none" style={{ position: 'absolute', left: 0, top: 0, opacity: 0.01 }} accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
        <ShareCard ref={cardRef} data={shareData} />
      </View>
    </View>
  );
}
