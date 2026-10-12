import React, { useMemo } from 'react';
import { Text, View } from 'react-native';
import { AREA_COLORS, FONT, tint } from '../../lib/theme';
import type { TrackerData } from '../../lib/trackerData';
import { MAJOR_MUSCLES } from '../../lib/muscleRecovery';
import {
  WEEKLY_SETS_TARGET,
  averageCalories,
  buildInsight,
  consistencyGrid,
  formatHours,
  makeBuckets,
  nutritionByBucket,
  personalRecords,
  pickMainLifts,
  proteinHitDays,
  proteinPerDay,
  setsPerMuscle,
  sleepByBucket,
  strengthSeries,
  summarizeSleep,
} from '../../lib/trackerMath';
import { estimateCaloriesFromSteps } from '../../lib/steps';
import { BarChart } from '../charts/BarChart';
import { LineChart } from '../charts/LineChart';
import { HeatGrid } from '../charts/HeatGrid';
import { BodyMap, type Muscle } from '../BodyMap';
import { Empty, Headline, TrackerCard } from './TrackerCard';

export type ChartKind = 'strength' | 'recovery' | 'sets' | 'consistency' | 'records' | 'steps' | 'nutrition' | 'sleep';

const BLUE = AREA_COLORS.workouts;
const TEAL = AREA_COLORS.recovery;
const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

export interface TrackerBodyProps {
  data: TrackerData;
  /** Steps for the last 7 days (oldest first), or null when step counting isn't available. */
  steps: number[] | null;
  stepsGoal: number;
  onOpen: (kind: ChartKind) => void;
  now?: Date;
}

/**
 * The Tracker's cards (V2 PHASE 9). Cards stay black; each area's color goes
 * only on its label and data (blue workouts, teal recovery, amber steps,
 * orange burned, green nutrition, indigo sleep, purple insight). Every number
 * and the insight line come from lib/trackerMath.ts.
 */
export function TrackerBody({ data, steps, stepsGoal, onOpen, now = new Date() }: TrackerBodyProps) {
  const v = useMemo(() => {
    const weeks8 = makeBuckets('week', 8, now);
    const lifts = pickMainLifts(data.logs, data.catalog);
    const strength = strengthSeries(data.logs, lifts, weeks8);

    const thisMonday = weeks8[7];
    const lastMonday = weeks8[6];
    const thisWeekSets = setsPerMuscle(data.logs, data.catalog, thisMonday.start, thisMonday.end);
    const lastWeekSets = setsPerMuscle(data.logs, data.catalog, lastMonday.start, lastMonday.end);

    const grid = consistencyGrid(data.logs, now, 12);
    const records = personalRecords(data.logs, 3);

    const days7 = makeBuckets('day', 7, now);
    const nutrition = nutritionByBucket(data.meals, days7);
    const protein = proteinPerDay(nutrition);
    const hits = proteinHitDays(nutrition, data.proteinTargetG);
    const nights = sleepByBucket(data.sleep, days7);
    const sleep = summarizeSleep(nights);

    const low = Object.values(data.recovery)
      .filter((m) => m.score !== null)
      .sort((a, b) => (a.score as number) - (b.score as number))[0];
    const fourWeeks = consistencyGrid(data.logs, now, 4);
    const insight = buildInsight({
      thisWeekSets,
      lastWeekSets,
      lowestMuscle: low ? { muscle: low.muscle, score: low.score as number } : null,
      proteinHits: hits,
      nutritionDaysLogged: nutrition.filter((d) => d.logged).length,
      sleep,
      sessionsLast4Weeks: fourWeeks.sessions,
    });
    return { weeks8, lifts, strength, thisWeekSets, grid, records, days7, nutrition, protein, hits, nights, sleep, insight };
  }, [data, now]);

  const top = v.strength[0];
  const stepsTotal = steps ? steps.reduce((a, b) => a + b, 0) : 0;
  const stepsHit = steps ? steps.filter((s) => s >= stepsGoal).length : 0;
  const burned = steps ? estimateCaloriesFromSteps(stepsTotal, data.weightKg) : null;
  const lineTints = [BLUE, tint(BLUE, 0.65), tint(BLUE, 0.4)];

  const recoveryMuscles = MAJOR_MUSCLES.filter((m) => data.recovery[m]?.score !== null && data.recovery[m]?.score !== undefined);

  return (
    <View style={{ gap: 10 }}>
      <TrackerCard label="STRENGTH · EST. 1-REP MAX" color={BLUE} right="8 wk" onPress={() => onOpen('strength')}>
        {top && top.last !== null ? (
          <>
            <Headline sub={top.delta !== null ? `${top.delta >= 0 ? '+' : ''}${top.delta} kg over 8 weeks` : undefined}>{`${top.name} ${top.last} kg`}</Headline>
            <LineChart series={v.strength.map((s, i) => ({ values: s.values, color: lineTints[i] ?? BLUE }))} labels={[v.weeks8[0].label, v.weeks8[7].label]} />
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10 }}>
              {v.strength.map((s, i) => (
                <View key={s.name} style={{ flexDirection: 'row', alignItems: 'center', gap: 5 }}>
                  <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: lineTints[i] ?? BLUE }} />
                  <Text style={{ color: '#A1A1AA', fontSize: 11, fontFamily: FONT }}>
                    {s.name}
                    {s.last !== null ? ` ${s.last}` : ''}
                  </Text>
                </View>
              ))}
            </View>
          </>
        ) : (
          <Empty>Log sets with a weight on your main lifts and their estimated 1-rep max trend shows up here.</Empty>
        )}
      </TrackerCard>

      <TrackerCard label="MUSCLE RECOVERY" color={TEAL} right="estimated" onPress={() => onOpen('recovery')}>
        {recoveryMuscles.length > 0 ? (
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 14 }}>
            <BodyMap
              height={120}
              color={TEAL}
              muscles={recoveryMuscles.map((m) => ({ muscle: m as Muscle, intensity: (data.recovery[m].score as number) / 100 }))}
            />
            <View style={{ flex: 1, flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>
              {recoveryMuscles.map((m) => (
                <View key={m} style={{ paddingHorizontal: 9, paddingVertical: 4, borderRadius: 100, backgroundColor: tint(TEAL, 0.12) }}>
                  <Text style={{ color: TEAL, fontSize: 11, fontWeight: '700', fontFamily: FONT }}>
                    {cap(m)} {data.recovery[m].score}
                  </Text>
                </View>
              ))}
            </View>
          </View>
        ) : (
          <Empty>Recovery appears once you have logged a workout.</Empty>
        )}
      </TrackerCard>

      <TrackerCard label="WEEKLY SETS PER MUSCLE" color={BLUE} right={`target ${WEEKLY_SETS_TARGET}`} onPress={() => onOpen('sets')}>
        <BarChart
          values={MAJOR_MUSCLES.map((m) => v.thisWeekSets[m] ?? 0)}
          color={BLUE}
          height={96}
          goal={WEEKLY_SETS_TARGET}
          allActive
          labels={MAJOR_MUSCLES.map((m) => cap(m).slice(0, 3))}
        />
      </TrackerCard>

      <TrackerCard label="CONSISTENCY · 12 WEEKS" color={BLUE} right={`${v.grid.sessions} sessions`} onPress={() => onOpen('consistency')}>
        <HeatGrid weeks={v.grid.weeks} color={BLUE} />
      </TrackerCard>

      <TrackerCard label="PERSONAL RECORDS" color={BLUE} onPress={() => onOpen('records')}>
        {v.records.length > 0 ? (
          <View style={{ gap: 8 }}>
            {v.records.map((r) => (
              <View key={r.exerciseName} style={{ flexDirection: 'row', justifyContent: 'space-between', gap: 10 }}>
                <Text numberOfLines={1} style={{ flex: 1, color: '#fff', fontSize: 13, fontWeight: '700', fontFamily: FONT }}>
                  {r.exerciseName}
                </Text>
                <Text style={{ color: BLUE, fontSize: 12.5, fontWeight: '700', fontFamily: FONT }}>
                  {r.weight > 0 ? `${r.weight} kg × ${r.reps}` : `BW × ${r.reps}`}
                  <Text style={{ color: '#71717A', fontWeight: '500' }}>{`  ${new Date(r.achievedAt).toLocaleDateString([], { day: 'numeric', month: 'short' })}`}</Text>
                </Text>
              </View>
            ))}
          </View>
        ) : (
          <Empty>Your best sets show up here as you log them.</Empty>
        )}
      </TrackerCard>

      <TrackerCard label="STEPS · 7 DAYS" color={AREA_COLORS.steps} right={`goal ${stepsGoal.toLocaleString()}`} onPress={() => onOpen('steps')}>
        {steps ? (
          <>
            <BarChart values={steps} color={AREA_COLORS.steps} height={80} goal={stepsGoal} labels={v.days7.map((b) => b.label)} />
            <Text style={{ color: '#A1A1AA', fontSize: 12, fontFamily: FONT }}>
              Avg {Math.round(stepsTotal / 7).toLocaleString()} steps · goal hit {stepsHit}/7
            </Text>
            {burned !== null ? (
              <Text style={{ color: AREA_COLORS.burned, fontSize: 12, fontWeight: '700', fontFamily: FONT }}>
                BURNED · about {burned.toLocaleString()} kcal this week
                <Text style={{ color: '#71717A', fontWeight: '500' }}> (estimate from steps)</Text>
              </Text>
            ) : null}
          </>
        ) : (
          <Empty>Step counting isn't connected on this device. Open Steps on Home to connect it.</Empty>
        )}
      </TrackerCard>

      <TrackerCard label="NUTRITION · 7 DAYS" color={AREA_COLORS.nutrition} right={data.proteinTargetG ? `protein target ${data.proteinTargetG} g` : undefined} onPress={() => onOpen('nutrition')}>
        {v.nutrition.some((d) => d.logged) ? (
          <>
            <BarChart values={v.protein.map((p) => p ?? 0)} color={AREA_COLORS.nutrition} height={80} goal={data.proteinTargetG} labels={v.days7.map((b) => b.label)} />
            <Text style={{ color: '#A1A1AA', fontSize: 12, fontFamily: FONT }}>
              {v.hits !== null ? `Protein target hit ${v.hits} of 7 days · ` : ''}avg {averageCalories(v.nutrition)?.toLocaleString()} kcal
            </Text>
          </>
        ) : (
          <Empty>No meals logged in the last 7 days. Log a meal on the Nutrition tab to see trends here.</Empty>
        )}
      </TrackerCard>

      <TrackerCard label="SLEEP · 7 NIGHTS" color={AREA_COLORS.sleep} right="goal 8 h" onPress={() => onOpen('sleep')}>
        {v.sleep.nightsLogged > 0 ? (
          <>
            <BarChart values={v.nights.map((n) => n ?? 0)} color={AREA_COLORS.sleep} height={80} goal={8} labels={v.days7.map((b) => b.label)} />
            <Text style={{ color: '#A1A1AA', fontSize: 12, fontFamily: FONT }}>
              Avg {formatHours(v.sleep.averageHours ?? 0)} · {v.sleep.nightsUnder} night{v.sleep.nightsUnder === 1 ? '' : 's'} under 6.5 h
            </Text>
          </>
        ) : (
          <Empty>No sleep logged this week. Log last night's sleep on Home.</Empty>
        )}
      </TrackerCard>

      <TrackerCard label="CLAWW INSIGHT" color={AREA_COLORS.engine} accentStripe>
        <Text style={{ color: '#fff', fontSize: 13.5, lineHeight: 20, fontWeight: '600', fontFamily: FONT }}>{v.insight.text}</Text>
      </TrackerCard>
    </View>
  );
}
