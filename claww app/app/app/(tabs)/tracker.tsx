import React, { useCallback, useMemo, useState } from 'react';
import { ScrollView, Share, Text, View } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { AREA_COLORS, FONT, HEADER_CONTENT_HEIGHT, TAB_BAR_CONTENT_HEIGHT } from '../../lib/theme';
import { useAppState } from '../../lib/appState';
import { getCompletedWorkoutDays, getLevelInfo, getTotalVolume } from '../../lib/data';
import { loadTrackerData, type TrackerData } from '../../lib/trackerData';
import { dailyRanges } from '../../lib/activityMath';
import { getStepsInRanges } from '../../lib/steps';
import { Icon } from '../../components/ui/Icon';
import { Button } from '../../components/ui/Button';
import { ProgressRing } from '../../components/ui/ProgressRing';
import { Display } from '../../components/ui/Typography';
import { Skeleton } from '../../components/ui/Skeleton';
import { TrackerBody, type ChartKind } from '../../components/tracker/TrackerBody';
import { TrackerChartScreen } from '../../components/tracker/TrackerChartScreen';

// V2 PHASE 9: the Tracker is a performance page. Cards stay black; each area's
// color (AREA_COLORS) goes only on its label and data, and the CLAWW Score
// stays white because it isn't one area's data. Charts are Skia.
const W = '#FFFFFF';
const GD = '#52525B';
const UNLOCK_AT = 3;

function EmptyData(): TrackerData {
  return { logs: [], catalog: {}, meals: [], sleep: [], proteinTargetG: null, weightKg: null, stepsGoal: 8000, recovery: {} };
}

function TrackerLoadingSkeleton() {
  const insets = useSafeAreaInsets();
  return (
    <View
      style={{
        paddingHorizontal: 16,
        paddingTop: insets.top + HEADER_CONTENT_HEIGHT + 8,
        paddingBottom: Math.max(insets.bottom, 20) + TAB_BAR_CONTENT_HEIGHT + 32,
        gap: 12,
      }}
    >
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <View style={{ gap: 8 }}>
          <Skeleton width={90} height={10} borderRadius={4} />
          <Skeleton width={170} height={26} borderRadius={6} />
        </View>
        <Skeleton width={68} height={68} borderRadius={34} />
      </View>
      <Skeleton height={190} borderRadius={16} />
      <Skeleton height={150} borderRadius={16} />
      <Skeleton height={130} borderRadius={16} />
    </View>
  );
}

interface HeaderProps {
  title: string;
  line: string;
  score: number;
  locked: boolean;
}

function Header({ title, line, score, locked }: HeaderProps) {
  return (
    <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' }}>
      <View style={{ flex: 1, paddingRight: 12 }}>
        <Text style={{ color: GD, fontSize: 9.5, fontWeight: '700', letterSpacing: 1.1, fontFamily: FONT }}>{title}</Text>
        <Display style={{ marginTop: 6 }}>CLAWW Tracker</Display>
        <Text style={{ color: GD, fontSize: 11.5, marginTop: 5, fontFamily: FONT }}>{line}</Text>
      </View>
      <ProgressRing size={68} rings={[{ r: 31, strokeWidth: 6, color: W, pct: locked ? 0 : (score / 1000) * 100 }]} trackColor="rgba(255,255,255,0.07)">
        <Text style={{ color: W, fontSize: 16, fontWeight: '900', fontFamily: FONT }}>{score}</Text>
        <Text style={{ color: GD, fontSize: 7.5, fontFamily: FONT }}>/1000</Text>
      </ProgressRing>
    </View>
  );
}

export default function TrackerTab() {
  const { userId, xp, streak } = useAppState();
  const insets = useSafeAreaInsets();
  const [loaded, setLoaded] = useState(false);
  const [workoutsCompleted, setWorkoutsCompleted] = useState(0);
  const [volume, setVolume] = useState(0);
  const [data, setData] = useState<TrackerData>(EmptyData());
  const [steps, setSteps] = useState<number[] | null>(null);
  const [chart, setChart] = useState<ChartKind | null>(null);

  // xp/streak come from AppState (live); the rest is loaded each time this tab gains focus.
  useFocusEffect(
    useCallback(() => {
      if (!userId) return;
      let cancelled = false;
      Promise.all([
        getCompletedWorkoutDays(userId),
        getTotalVolume(userId),
        loadTrackerData(userId),
        getStepsInRanges(dailyRanges(new Date(), 7)),
      ]).then(([count, v, tracker, stepsWeek]) => {
        if (cancelled) return;
        setWorkoutsCompleted(count);
        setVolume(v);
        setData(tracker);
        setSteps(stepsWeek);
        setLoaded(true);
      });
      return () => {
        cancelled = true;
      };
    }, [userId])
  );

  const locked = workoutsCompleted < UNLOCK_AT;
  const remaining = UNLOCK_AT - workoutsCompleted;
  // CLAWW Score is capped XP (the same number Profile and Home's badge show).
  const score = Math.min(1000, xp);
  const level = getLevelInfo(xp);
  const monthYear = new Date().toLocaleDateString(undefined, { month: 'short', year: 'numeric' }).toUpperCase();

  const reportText = useMemo(
    () =>
      `CLAWW Tracker Report — ${new Date().toLocaleDateString()}\n\n` +
      `CLAWW Score: ${score} / 1000 (Level ${level.level})\n` +
      `Streak: ${streak} days\n` +
      `Training days (all-time): ${workoutsCompleted}\n` +
      `Total volume: ${Math.round(volume).toLocaleString()} kg`,
    [score, level.level, streak, workoutsCompleted, volume]
  );
  const shareReport = useCallback(() => {
    Share.share({ message: reportText, title: 'CLAWW Tracker Report' });
  }, [reportText]);

  if (!loaded) {
    return (
      <ScrollView style={{ flex: 1, backgroundColor: '#050505' }} showsVerticalScrollIndicator={false}>
        <TrackerLoadingSkeleton />
      </ScrollView>
    );
  }

  return (
    <>
      <ScrollView style={{ flex: 1, backgroundColor: '#050505' }} showsVerticalScrollIndicator={false}>
        <View
          style={{
            paddingHorizontal: 16,
            paddingTop: insets.top + HEADER_CONTENT_HEIGHT + 8,
            paddingBottom: Math.max(insets.bottom, 20) + TAB_BAR_CONTENT_HEIGHT + 32,
            gap: 14,
          }}
        >
          <Header
            title={locked ? `${monthYear} · BUILDING YOUR BASELINE` : `${monthYear} · PERFORMANCE`}
            line={locked ? `${workoutsCompleted} of ${UNLOCK_AT} workout days logged` : `Level ${level.level} · ${level.xpForNextLevel - level.xpIntoLevel} XP to Level ${level.level + 1}`}
            score={score}
            locked={locked}
          />

          {locked ? (
            <View
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                gap: 10,
                padding: 14,
                borderRadius: 14,
                backgroundColor: '#151517',
                borderWidth: 1,
                borderColor: 'rgba(255,255,255,0.13)',
              }}
            >
              <Icon name="lock" size={16} color={AREA_COLORS.score} />
              <Text style={{ flex: 1, color: '#D4D4D8', fontSize: 12.5, lineHeight: 18, fontFamily: FONT }}>
                Unlocks after {UNLOCK_AT} workout days. {remaining} more to go. Here is a preview of what it will show.
              </Text>
            </View>
          ) : null}

          <View style={locked ? { opacity: 0.28 } : undefined} pointerEvents={locked ? 'none' : 'auto'} accessibilityElementsHidden={locked} importantForAccessibility={locked ? 'no-hide-descendants' : 'auto'}>
            <TrackerBody data={data} steps={steps} stepsGoal={data.stepsGoal} onOpen={setChart} />
          </View>

          <View style={{ flexDirection: 'row', gap: 8 }}>
            <Button variant={locked ? 'ghost' : 'inverted'} disabled={locked} onPress={shareReport} icon={<Icon name="download" size={16} color={locked ? GD : '#000'} />} style={{ flex: 2 }}>
              Export Report
            </Button>
            <Button variant="ghost" disabled={locked} onPress={shareReport} style={{ flex: 1 }} icon={<Icon name="share-2" size={15} color={locked ? GD : '#A1A1AA'} />}>
              Share
            </Button>
          </View>
        </View>
      </ScrollView>
      {chart ? <TrackerChartScreen kind={chart} data={data} stepsGoal={data.stepsGoal} onClose={() => setChart(null)} /> : null}
    </>
  );
}
