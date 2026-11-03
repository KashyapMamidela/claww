import React, { useEffect, useMemo, useState } from 'react';
import { Modal, ScrollView, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { AREA_COLORS, FONT, tint } from '../../lib/theme';
import type { TrackerData } from '../../lib/trackerData';
import { MAJOR_MUSCLES } from '../../lib/muscleRecovery';
import { getStepsInRanges } from '../../lib/steps';
import {
  WEEKLY_SETS_TARGET,
  bucketsForRange,
  consistencyGrid,
  formatHours,
  nutritionByBucket,
  personalRecords,
  pickMainLifts,
  proteinPerDay,
  setsPerMuscle,
  sleepByBucket,
  strengthSeries,
  totalSetsByBucket,
  type Range,
} from '../../lib/trackerMath';
import { BarChart } from '../charts/BarChart';
import { LineChart } from '../charts/LineChart';
import { HeatGrid } from '../charts/HeatGrid';
import { BodyMap, type Muscle } from '../BodyMap';
import { Icon } from '../ui/Icon';
import { PressScale } from '../ui/PressScale';
import { Skeleton } from '../ui/Skeleton';
import type { ChartKind } from './TrackerBody';

const BLUE = AREA_COLORS.workouts;
const TEAL = AREA_COLORS.recovery;
const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

const TITLES: Record<ChartKind, { title: string; color: string }> = {
  strength: { title: 'Strength · estimated 1-rep max', color: BLUE },
  recovery: { title: 'Muscle recovery', color: TEAL },
  sets: { title: 'Sets per week', color: BLUE },
  consistency: { title: 'Consistency', color: BLUE },
  records: { title: 'Personal records', color: BLUE },
  steps: { title: 'Steps', color: AREA_COLORS.steps },
  nutrition: { title: 'Protein per day', color: AREA_COLORS.nutrition },
  sleep: { title: 'Sleep', color: AREA_COLORS.sleep },
};

const RANGED: ChartKind[] = ['strength', 'sets', 'consistency', 'steps', 'nutrition', 'sleep'];
const RANGE_LABEL: Record<Range, string> = { week: 'Week', month: 'Month', all: 'All' };
const RANGE_NOTE: Record<Range, string> = { week: 'Last 7 days', month: 'Last 5 weeks', all: 'Last 12 months' };

function Segment({ value, onChange }: { value: Range; onChange: (r: Range) => void }) {
  return (
    <View style={{ flexDirection: 'row', backgroundColor: 'rgba(255,255,255,0.05)', borderRadius: 10, padding: 3 }}>
      {(['week', 'month', 'all'] as Range[]).map((r) => (
        <PressScale key={r} onPress={() => onChange(r)} style={{ flex: 1 }} accessibilityRole="button" accessibilityState={{ selected: value === r }}>
          <View style={{ height: 34, borderRadius: 8, alignItems: 'center', justifyContent: 'center', backgroundColor: value === r ? 'rgba(255,255,255,0.1)' : 'transparent' }}>
            <Text style={{ color: value === r ? '#fff' : '#71717A', fontSize: 13, fontWeight: '700', fontFamily: FONT }}>{RANGE_LABEL[r]}</Text>
          </View>
        </PressScale>
      ))}
    </View>
  );
}

export interface TrackerChartScreenProps {
  kind: ChartKind;
  data: TrackerData;
  stepsGoal: number;
  onClose: () => void;
}

/**
 * The full-screen chart behind each Tracker card (V2 PHASE 9) with Week,
 * Month and All ranges. All ranges are computed from the data the Tracker
 * already loaded; only steps ask the phone for the range's counts.
 */
export function TrackerChartScreen({ kind, data, stepsGoal, onClose }: TrackerChartScreenProps) {
  const [range, setRange] = useState<Range>('month');
  const [steps, setSteps] = useState<number[] | null | undefined>(undefined);
  const now = useMemo(() => new Date(), []);
  const buckets = useMemo(() => bucketsForRange(range, now), [range, now]);
  const { title, color } = TITLES[kind];
  const ranged = RANGED.includes(kind);

  useEffect(() => {
    if (kind !== 'steps') return;
    let cancelled = false;
    setSteps(undefined);
    getStepsInRanges(buckets.map((b) => ({ start: b.start, end: b.end }))).then((r) => {
      if (!cancelled) setSteps(r);
    });
    return () => {
      cancelled = true;
    };
  }, [kind, buckets]);

  const labels = buckets.map((b) => b.label);
  const first = buckets[0].label;
  const last = buckets[buckets.length - 1].label;

  const body = (() => {
    switch (kind) {
      case 'strength': {
        const lifts = pickMainLifts(data.logs, data.catalog, 5);
        const series = strengthSeries(data.logs, lifts, buckets);
        if (series.every((s) => s.last === null)) return <Text style={{ color: '#71717A', fontSize: 13, fontFamily: FONT }}>No weighted sets in this range yet.</Text>;
        const shades = [BLUE, tint(BLUE, 0.75), tint(BLUE, 0.55), tint(BLUE, 0.4), tint(BLUE, 0.3)];
        return (
          <>
            <LineChart series={series.map((s, i) => ({ values: s.values, color: shades[i] }))} height={240} labels={[first, last]} />
            <View style={{ gap: 8 }}>
              {series.map((s, i) => (
                <View key={s.name} style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                  <View style={{ width: 9, height: 9, borderRadius: 5, backgroundColor: shades[i] }} />
                  <Text numberOfLines={1} style={{ flex: 1, color: '#fff', fontSize: 14, fontWeight: '700', fontFamily: FONT }}>{s.name}</Text>
                  <Text style={{ color: '#D4D4D8', fontSize: 13, fontFamily: FONT }}>
                    {s.last !== null ? `${s.last} kg` : '—'}
                    {s.delta !== null ? `  ${s.delta >= 0 ? '+' : ''}${s.delta}` : ''}
                  </Text>
                </View>
              ))}
            </View>
          </>
        );
      }
      case 'sets': {
        const totals = totalSetsByBucket(data.logs, data.catalog, buckets);
        const thisWeek = setsPerMuscle(data.logs, data.catalog, bucketsForRange('month', now)[4].start, bucketsForRange('month', now)[4].end);
        return (
          <>
            <Text style={{ color: '#A1A1AA', fontSize: 12, fontFamily: FONT }}>Effective sets across all muscles (a set counts once for its main muscle and half for each helper).</Text>
            <BarChart values={totals} color={BLUE} height={220} labels={labels} />
            <Text style={{ color: '#fff', fontSize: 14, fontWeight: '800', fontFamily: FONT }}>This week by muscle</Text>
            <View style={{ gap: 6 }}>
              {MAJOR_MUSCLES.map((m) => (
                <View key={m} style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                  <Text style={{ color: '#D4D4D8', fontSize: 13, fontFamily: FONT }}>{cap(m)}</Text>
                  <Text style={{ color: (thisWeek[m] ?? 0) >= WEEKLY_SETS_TARGET ? BLUE : '#A1A1AA', fontSize: 13, fontWeight: '700', fontFamily: FONT }}>
                    {thisWeek[m] ?? 0} / {WEEKLY_SETS_TARGET}
                  </Text>
                </View>
              ))}
            </View>
          </>
        );
      }
      case 'consistency': {
        const weeks = range === 'week' ? 1 : range === 'month' ? 5 : 26;
        const g = consistencyGrid(data.logs, now, weeks);
        return (
          <>
            <Text style={{ color: '#fff', fontSize: 28, fontWeight: '900', fontFamily: FONT }}>
              {g.sessions}
              <Text style={{ color: '#71717A', fontSize: 13, fontWeight: '500' }}> training day{g.sessions === 1 ? '' : 's'}</Text>
            </Text>
            <HeatGrid weeks={g.weeks} color={BLUE} maxCell={range === 'all' ? 12 : 30} />
            <Text style={{ color: '#71717A', fontSize: 11.5, fontFamily: FONT }}>Each column is a week, Monday at the top. A bright square is a day you logged sets.</Text>
          </>
        );
      }
      case 'records': {
        const records = personalRecords(data.logs, 12);
        if (records.length === 0) return <Text style={{ color: '#71717A', fontSize: 13, fontFamily: FONT }}>Your best sets show up here as you log them.</Text>;
        return (
          <View style={{ gap: 12 }}>
            {records.map((r) => (
              <View key={r.exerciseName} style={{ gap: 2 }}>
                <Text style={{ color: '#fff', fontSize: 15, fontWeight: '800', fontFamily: FONT }}>{r.exerciseName}</Text>
                <Text style={{ color: BLUE, fontSize: 13.5, fontWeight: '700', fontFamily: FONT }}>
                  {r.weight > 0 ? `${r.weight} kg × ${r.reps}` : `Bodyweight × ${r.reps}`}
                  <Text style={{ color: '#71717A', fontWeight: '500' }}>
                    {r.weight > 0 ? `  ·  est. 1RM ${r.score} kg` : ''}  ·  {new Date(r.achievedAt).toLocaleDateString([], { day: 'numeric', month: 'short', year: 'numeric' })}
                  </Text>
                </Text>
              </View>
            ))}
          </View>
        );
      }
      case 'recovery': {
        const rows = MAJOR_MUSCLES.map((m) => data.recovery[m]).filter((r) => r && r.score !== null);
        if (rows.length === 0) return <Text style={{ color: '#71717A', fontSize: 13, fontFamily: FONT }}>Recovery appears once you have logged a workout.</Text>;
        return (
          <>
            <View style={{ alignItems: 'center', paddingVertical: 12, borderRadius: 16, backgroundColor: '#0B0B0D' }}>
              <BodyMap height={260} color={TEAL} muscles={rows.map((r) => ({ muscle: r.muscle as Muscle, intensity: (r.score as number) / 100 }))} />
            </View>
            <View style={{ gap: 10 }}>
              {rows.map((r) => (
                <View key={r.muscle} style={{ gap: 4 }}>
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                    <Text style={{ color: '#fff', fontSize: 14, fontWeight: '700', fontFamily: FONT }}>{cap(r.muscle)}</Text>
                    <Text style={{ color: TEAL, fontSize: 13.5, fontWeight: '800', fontFamily: FONT }}>
                      {r.score} <Text style={{ color: '#A1A1AA', fontWeight: '500' }}>{r.band} · {r.confidence} confidence</Text>
                    </Text>
                  </View>
                  <View style={{ height: 4, borderRadius: 2, backgroundColor: tint(TEAL, 0.14) }}>
                    <View style={{ height: 4, width: `${r.score ?? 0}%`, borderRadius: 2, backgroundColor: TEAL }} />
                  </View>
                </View>
              ))}
            </View>
            <Text style={{ color: '#71717A', fontSize: 11.5, lineHeight: 17, fontFamily: FONT }}>
              An estimate from your recent sets, time since you trained each muscle, and the soreness and readiness you report before a session. Missing answers lower the confidence.
            </Text>
          </>
        );
      }
      case 'steps': {
        if (steps === undefined) return <Skeleton height={220} borderRadius={14} />;
        if (steps === null) return <Text style={{ color: '#71717A', fontSize: 13, lineHeight: 19, fontFamily: FONT }}>Step counting isn't connected on this device. Open Steps on Home to connect it.</Text>;
        const days = range === 'week' ? 1 : range === 'month' ? 7 : 30;
        const goalForBucket = stepsGoal * days;
        return (
          <>
            <BarChart values={steps} color={AREA_COLORS.steps} height={220} goal={goalForBucket} labels={labels} />
            <Text style={{ color: '#A1A1AA', fontSize: 12.5, fontFamily: FONT }}>
              {range === 'week' ? 'Steps per day' : range === 'month' ? 'Steps per week' : 'Steps per month'} · the dashed line is your goal ({stepsGoal.toLocaleString()} a day).
            </Text>
          </>
        );
      }
      case 'nutrition': {
        const n = nutritionByBucket(data.meals, buckets);
        const p = proteinPerDay(n);
        if (!n.some((d) => d.logged)) return <Text style={{ color: '#71717A', fontSize: 13, fontFamily: FONT }}>No meals logged in this range.</Text>;
        return (
          <>
            <BarChart values={p.map((x) => x ?? 0)} color={AREA_COLORS.nutrition} height={220} goal={data.proteinTargetG} labels={labels} />
            <Text style={{ color: '#A1A1AA', fontSize: 12.5, fontFamily: FONT }}>
              Protein in grams, {range === 'week' ? 'per day' : 'averaged over the days you logged'}.
              {data.proteinTargetG ? ` The dashed line is your ${data.proteinTargetG} g target.` : ''}
            </Text>
          </>
        );
      }
      case 'sleep': {
        const hours = sleepByBucket(data.sleep, buckets);
        const known = hours.filter((h): h is number => h !== null);
        if (known.length === 0) return <Text style={{ color: '#71717A', fontSize: 13, fontFamily: FONT }}>No sleep logged in this range.</Text>;
        const avg = known.reduce((a, b) => a + b, 0) / known.length;
        return (
          <>
            <Text style={{ color: '#fff', fontSize: 28, fontWeight: '900', fontFamily: FONT }}>
              {formatHours(avg)}
              <Text style={{ color: '#71717A', fontSize: 13, fontWeight: '500' }}> average</Text>
            </Text>
            <BarChart values={hours.map((h) => h ?? 0)} color={AREA_COLORS.sleep} height={200} goal={8} labels={labels} />
          </>
        );
      }
    }
  })();

  return (
    <Modal visible animationType="slide" onRequestClose={onClose} statusBarTranslucent>
      <SafeAreaView style={{ flex: 1, backgroundColor: '#050505' }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 16, paddingTop: 8, paddingBottom: 8 }}>
          <PressScale onPress={onClose} accessibilityRole="button" accessibilityLabel="Close chart">
            <View style={{ width: 40, height: 40, borderRadius: 12, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(255,255,255,0.06)' }}>
              <Icon name="chevron-down" size={20} color="#A1A1AA" />
            </View>
          </PressScale>
          <Text style={{ flex: 1, color, fontSize: 12, fontWeight: '800', letterSpacing: 0.7, fontFamily: FONT }}>{title.toUpperCase()}</Text>
        </View>
        <ScrollView contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 32, gap: 16 }} showsVerticalScrollIndicator={false}>
          {ranged ? (
            <>
              <Segment value={range} onChange={setRange} />
              <Text style={{ color: '#71717A', fontSize: 11.5, fontFamily: FONT }}>{RANGE_NOTE[range]}</Text>
            </>
          ) : null}
          {body}
        </ScrollView>
      </SafeAreaView>
    </Modal>
  );
}
