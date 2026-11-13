import React, { useEffect, useMemo } from 'react';
import { Text, View } from 'react-native';
import Animated, { Easing, useAnimatedStyle, useReducedMotion, useSharedValue, withDelay, withTiming } from 'react-native-reanimated';
import { COLORS, AREA_COLORS, FONT_HAND, tint, BG } from '../../lib/theme';
import type { TrackerData } from '../../lib/trackerData';
import { MAJOR_MUSCLES } from '../../lib/muscleRecovery';
import {
  WEEKLY_SETS_TARGET,
  averageCalories,
  buildInsight,
  consistencyGrid,
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
import { CountUp } from '../ui/CountUp';
import { Icon } from '../ui/Icon';
import { Rise } from '../ui/Rise';
import { Empty, TrackerCard } from './TrackerCard';

export type ChartKind = 'strength' | 'recovery' | 'sets' | 'consistency' | 'records' | 'steps' | 'nutrition' | 'sleep';

const BLUE = AREA_COLORS.workouts;
const TEAL = AREA_COLORS.recovery;
const GOLD = AREA_COLORS.activity;
const EASE = Easing.bezier(0.23, 1, 0.32, 1);
const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);
const DAY_LETTERS = ['M', 'T', 'W', 'T', 'F', 'S', 'S'];

/** A bar that grows from empty to `pct` once, staggered by `index`, so a list of bars fills in like a ring does. */
function GrowBar({ pct, color, index, height = 8 }: { pct: number; color: string; index: number; height?: number }) {
  const reduced = useReducedMotion();
  const w = useSharedValue(reduced ? pct : 0);
  useEffect(() => {
    w.set(reduced ? pct : withDelay(index * 45, withTiming(pct, { duration: 650, easing: EASE })));
  }, [pct, index, reduced, w]);
  const style = useAnimatedStyle(() => ({ width: `${w.get()}%` }));
  return (
    <View style={{ flex: 1, height, borderRadius: height / 2, backgroundColor: tint(color, 0.14), overflow: 'hidden' }}>
      <Animated.View style={[{ height: '100%', borderRadius: height / 2, backgroundColor: color }, style]} />
    </View>
  );
}

/** The score's band colour: teal when recovered, amber while it comes back, orange when it is still low. */
function recoveryTone(score: number): string {
  return score >= 75 ? TEAL : score >= 50 ? COLORS.amber : AREA_COLORS.burned;
}

/** One line of handwriting under the week, chosen from the numbers. */
function weekLine(sessions: number): string {
  if (sessions === 0) return 'the first session of the week starts it';
  if (sessions < 3) return 'good start, keep it going';
  return 'strong week, own it';
}

export interface TrackerBodyProps {
  data: TrackerData;
  /** Steps for the last 7 days (oldest first), or null when step counting isn't available. */
  steps: number[] | null;
  stepsGoal: number;
  onOpen: (kind: ChartKind) => void;
  now?: Date;
}

/**
 * The Tracker's training cards (V2 PHASE 9, redone to match the cards above them): each is a glowing tile with its
 * area's stamp, big numbers that count up, bars that grow in, and a week hero first. Colour goes on data and glow; every
 * number and the insight line come from lib/trackerMath.ts.
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
    return { weeks8, lifts, strength, thisWeekSets, grid, records, days7, nutrition, protein, hits, nights, sleep, insight, low };
  }, [data, now]);

  const top = v.strength[0];
  const lineTints = [BLUE, tint(BLUE, 0.65), tint(BLUE, 0.4)];
  const recoveryMuscles = MAJOR_MUSCLES.filter((m) => data.recovery[m]?.score !== null && data.recovery[m]?.score !== undefined);

  // The week hero: this week's trained days (Monday first), sessions and sets.
  const weekDays = v.grid.weeks[v.grid.weeks.length - 1] ?? [];
  const todayIdx = (now.getDay() + 6) % 7;
  const weekSessions = weekDays.filter(Boolean).length;
  const weekSets = MAJOR_MUSCLES.reduce((s, m) => s + (v.thisWeekSets[m] ?? 0), 0);
  const loggedDays = v.nutrition.filter((d) => d.logged).length;
  const avgKcal = averageCalories(v.nutrition);
  const newBestDays = 7;

  return (
    <View style={{ gap: 12 }}>
      <Rise i={0}>
        <TrackerCard label="THIS WEEK" color={BLUE} stamp="dumbbell" right={`${v.grid.sessions} in 12 weeks`}>
          <View style={{ flexDirection: 'row', gap: 28 }}>
            <View>
              <Text style={{ color: '#fff', fontSize: 44, lineHeight: 48, letterSpacing: -1, fontVariant: ['tabular-nums'], fontFamily: BG[800] }}>
                <CountUp id="progress.week.sessions" value={weekSessions} textStyle={{ color: '#fff', fontSize: 44, lineHeight: 48, letterSpacing: -1, fontVariant: ['tabular-nums'], fontFamily: BG[800] }} />
              </Text>
              <Text style={{ color: COLORS.textMuted, fontSize: 15, fontFamily: BG[500] }}>{weekSessions === 1 ? 'session' : 'sessions'}</Text>
            </View>
            <View>
              <Text style={{ color: '#fff', fontSize: 44, lineHeight: 48, letterSpacing: -1, fontVariant: ['tabular-nums'], fontFamily: BG[800] }}>
                <CountUp id="progress.week.sets" value={weekSets} textStyle={{ color: '#fff', fontSize: 44, lineHeight: 48, letterSpacing: -1, fontVariant: ['tabular-nums'], fontFamily: BG[800] }} />
              </Text>
              <Text style={{ color: COLORS.textMuted, fontSize: 15, fontFamily: BG[500] }}>sets</Text>
            </View>
          </View>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between' }} accessibilityLabel={`${weekSessions} training days this week`}>
            {DAY_LETTERS.map((d, i) => {
              const on = weekDays[i] === true;
              const today = i === todayIdx;
              return (
                <View key={i} style={{ alignItems: 'center', gap: 6 }}>
                  <View style={{ width: 34, height: 34, borderRadius: 17, alignItems: 'center', justifyContent: 'center', backgroundColor: on ? BLUE : tint(BLUE, 0.1), borderWidth: today ? 2 : 0, borderColor: '#fff' }}>
                    {on ? <Icon name="check" size={16} color="#fff" strokeWidth={3.2} /> : null}
                  </View>
                  <Text style={{ color: today ? '#fff' : COLORS.textMuted, fontSize: 13, fontFamily: BG[today ? 800 : 600] }}>{d}</Text>
                </View>
              );
            })}
          </View>
          <Text style={{ color: COLORS.pen, fontSize: 22, lineHeight: 26, fontFamily: FONT_HAND, fontWeight: '700' }}>{weekLine(weekSessions)}</Text>
        </TrackerCard>
      </Rise>

      <Rise i={1}>
        <TrackerCard label="STRENGTH" color={BLUE} stamp="trending-up" right="8 weeks" onPress={() => onOpen('strength')}>
          {top && top.last !== null ? (
            <>
              <View>
                <Text numberOfLines={1} style={{ color: COLORS.textMuted, fontSize: 15, fontFamily: BG[600] }}>{`${top.name} · estimated best`}</Text>
                <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: 10, marginTop: 2 }}>
                  <Text style={{ color: '#fff', fontSize: 44, lineHeight: 48, letterSpacing: -1, fontVariant: ['tabular-nums'], fontFamily: BG[800] }}>
                    <CountUp id="progress.strength.top" value={top.last} format={(n) => (Math.round(n * 10) / 10).toString()} textStyle={{ color: '#fff', fontSize: 44, lineHeight: 48, letterSpacing: -1, fontVariant: ['tabular-nums'], fontFamily: BG[800] }} />
                    <Text style={{ color: COLORS.textMuted, fontSize: 20, letterSpacing: 0, fontFamily: BG[600] }}> kg</Text>
                  </Text>
                  {top.delta !== null && top.delta !== 0 ? (
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 10, height: 28, borderRadius: 14, backgroundColor: tint(top.delta > 0 ? COLORS.green : COLORS.amber, 0.16) }}>
                      <Icon name={top.delta > 0 ? 'arrow-up-right' : 'trending-up'} size={14} color={top.delta > 0 ? COLORS.green : COLORS.amber} strokeWidth={2.6} />
                      <Text style={{ color: top.delta > 0 ? COLORS.green : COLORS.amber, fontSize: 15, fontVariant: ['tabular-nums'], fontFamily: BG[800] }}>{`${top.delta > 0 ? '+' : ''}${top.delta} kg`}</Text>
                    </View>
                  ) : null}
                </View>
              </View>
              {/* A trend needs two points. With one, a lone dot in an empty grid looks broken, so say what's next instead. */}
              {v.strength.some((s) => s.values.filter((x) => x !== null).length >= 2) ? (
                <LineChart series={v.strength.map((s, i) => ({ values: s.values, color: lineTints[i] ?? BLUE }))} labels={[v.weeks8[0].label, v.weeks8[7].label]} connectGaps />
              ) : (
                <Text style={{ color: COLORS.pen, fontSize: 22, lineHeight: 26, fontFamily: FONT_HAND, fontWeight: '700' }}>log this lift again next week and your trend line starts here</Text>
              )}
              {v.strength.length > 1 ? (
                <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 12 }}>
                  {v.strength.map((s, i) => (
                    <View key={s.name} style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                      <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: lineTints[i] ?? BLUE }} />
                      <Text style={{ color: COLORS.textMuted, fontSize: 13, fontFamily: BG[500] }}>{`${s.name}${s.last !== null ? ` ${s.last}` : ''}`}</Text>
                    </View>
                  ))}
                </View>
              ) : null}
            </>
          ) : (
            <Empty>Log sets with a weight on your main lifts and their estimated best shows up here.</Empty>
          )}
        </TrackerCard>
      </Rise>

      <Rise i={2}>
        <TrackerCard label="RECOVERY BY MUSCLE" color={TEAL} stamp="heart" onPress={() => onOpen('recovery')}>
          {recoveryMuscles.length > 0 ? (
            <>
              {v.low && v.low.score !== null ? (
                <Text style={{ color: COLORS.pen, fontSize: 22, lineHeight: 26, fontFamily: FONT_HAND, fontWeight: '700' }}>{`${cap(v.low.muscle)} is the one to go easy on, ${v.low.score} %`}</Text>
              ) : null}
              <View style={{ alignItems: 'center' }}>
                <BodyMap height={150} color={TEAL} muscles={recoveryMuscles.map((m) => ({ muscle: m as Muscle, intensity: (data.recovery[m].score as number) / 100 }))} />
              </View>
              <View>
                <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
                  {recoveryMuscles.map((m) => {
                    const score = data.recovery[m].score as number;
                    const tone = recoveryTone(score);
                    return (
                      <View key={m} style={{ flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 10, height: 30, borderRadius: 15, backgroundColor: tint(tone, 0.14), borderWidth: 1, borderColor: tint(tone, 0.35) }}>
                        <View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: tone }} />
                        <Text style={{ color: '#fff', fontSize: 13, fontVariant: ['tabular-nums'], fontFamily: BG[700] }}>{`${cap(m)} ${score}`}</Text>
                      </View>
                    );
                  })}
                </View>
              </View>
            </>
          ) : (
            <Empty>Recovery appears once you have logged a workout.</Empty>
          )}
        </TrackerCard>
      </Rise>

      <Rise i={3}>
        <TrackerCard label="SETS THIS WEEK" color={BLUE} stamp="activity" right={`goal ${WEEKLY_SETS_TARGET} each`} onPress={() => onOpen('sets')}>
          {/* One row per muscle with its full name; the bar grows in, and turns green with a tick at the target. */}
          <View style={{ gap: 10 }}>
            {MAJOR_MUSCLES.map((m, i) => {
              const n = v.thisWeekSets[m] ?? 0;
              const met = n >= WEEKLY_SETS_TARGET;
              return (
                <View key={m} style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }} accessibilityLabel={`${cap(m)}: ${Math.round(n)} of ${WEEKLY_SETS_TARGET} sets this week`}>
                  <Text style={{ width: 96, color: COLORS.fgGray, fontSize: 15, fontFamily: BG[500] }}>{cap(m)}</Text>
                  <GrowBar pct={Math.min(100, (n / WEEKLY_SETS_TARGET) * 100)} color={met ? COLORS.green : BLUE} index={i} />
                  <View style={{ width: 34, alignItems: 'flex-end' }}>
                    {met ? <Icon name="check" size={16} color={COLORS.green} strokeWidth={3} /> : <Text style={{ color: n > 0 ? COLORS.fg : COLORS.textFaint, fontSize: 15, fontVariant: ['tabular-nums'], fontFamily: BG[700] }}>{Math.round(n)}</Text>}
                  </View>
                </View>
              );
            })}
          </View>
        </TrackerCard>
      </Rise>

      <Rise i={4}>
        <TrackerCard label="CONSISTENCY" color={BLUE} stamp="calendar" right="12 weeks" onPress={() => onOpen('consistency')}>
          <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: 8 }}>
            <Text style={{ color: '#fff', fontSize: 34, lineHeight: 38, letterSpacing: -0.8, fontVariant: ['tabular-nums'], fontFamily: BG[800] }}>
              <CountUp id="progress.consistency" value={v.grid.sessions} textStyle={{ color: '#fff', fontSize: 34, lineHeight: 38, letterSpacing: -0.8, fontVariant: ['tabular-nums'], fontFamily: BG[800] }} />
            </Text>
            <Text style={{ color: COLORS.textMuted, fontSize: 15, fontFamily: BG[500] }}>{v.grid.sessions === 1 ? 'session' : 'sessions'}</Text>
          </View>
          <HeatGrid weeks={v.grid.weeks} color={BLUE} maxCell={40} />
        </TrackerCard>
      </Rise>

      <Rise i={5}>
        <TrackerCard label="PERSONAL BESTS" color={GOLD} stamp="trophy" onPress={() => onOpen('records')}>
          {v.records.length > 0 ? (
            <View style={{ gap: 12 }}>
              {v.records.map((r) => {
                const fresh = now.getTime() - new Date(r.achievedAt).getTime() < newBestDays * 86_400_000;
                return (
                  <View key={r.exerciseName} style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                    <View style={{ width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center', backgroundColor: tint(GOLD, 0.16), borderWidth: 1.5, borderColor: tint(GOLD, 0.55) }}>
                      <Icon name="trophy" size={20} color={GOLD} />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text numberOfLines={1} style={{ color: '#fff', fontSize: 17, fontFamily: BG[800] }}>{r.exerciseName}</Text>
                      <Text style={{ color: COLORS.textMuted, fontSize: 13, fontFamily: BG[500] }}>{new Date(r.achievedAt).toLocaleDateString([], { day: 'numeric', month: 'short' })}</Text>
                    </View>
                    {fresh ? (
                      <View style={{ paddingHorizontal: 8, height: 22, borderRadius: 11, justifyContent: 'center', backgroundColor: tint(GOLD, 0.2) }}>
                        <Text style={{ color: GOLD, fontSize: 11, fontFamily: BG[800] }}>New</Text>
                      </View>
                    ) : null}
                    <Text style={{ color: GOLD, fontSize: 17, fontVariant: ['tabular-nums'], fontFamily: BG[800] }}>{r.weight > 0 ? `${r.weight} kg × ${r.reps}` : `${r.reps} reps`}</Text>
                  </View>
                );
              })}
            </View>
          ) : (
            <Empty>Your best sets show up here as you log them.</Empty>
          )}
        </TrackerCard>
      </Rise>

      <Rise i={6}>
        <TrackerCard label="NUTRITION" color={AREA_COLORS.nutrition} stamp="utensils" right={data.proteinTargetG ? `protein goal ${data.proteinTargetG} g` : '7 days'} onPress={() => onOpen('nutrition')}>
          {loggedDays > 0 ? (
            <>
              <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 10 }}>
                {avgKcal !== null ? (
                  <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: 6 }}>
                    <Text style={{ color: '#fff', fontSize: 34, lineHeight: 38, letterSpacing: -0.8, fontVariant: ['tabular-nums'], fontFamily: BG[800] }}>
                      <CountUp id="progress.nutrition.avg" value={avgKcal} format={(n) => Math.round(n).toLocaleString('en-IN')} textStyle={{ color: '#fff', fontSize: 34, lineHeight: 38, letterSpacing: -0.8, fontVariant: ['tabular-nums'], fontFamily: BG[800] }} />
                    </Text>
                    <Text style={{ color: COLORS.textMuted, fontSize: 15, fontFamily: BG[500] }}>kcal a day</Text>
                  </View>
                ) : <View />}
                {v.hits !== null ? (
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 10, height: 30, borderRadius: 15, backgroundColor: tint(AREA_COLORS.nutrition, 0.16) }}>
                    {v.hits > 0 ? <Icon name="check" size={14} color={COLORS.green} strokeWidth={3} /> : null}
                    <Text style={{ color: '#fff', fontSize: 13, fontFamily: BG[700] }}>{`Protein ${v.hits} of ${loggedDays} days`}</Text>
                  </View>
                ) : null}
              </View>
              <BarChart values={v.protein.map((p) => p ?? 0)} color={AREA_COLORS.nutrition} height={84} goal={data.proteinTargetG} labels={v.days7.map((b) => b.label)} />
            </>
          ) : (
            <Empty>No meals logged in the last 7 days. Log a meal on the Food tab to see trends here.</Empty>
          )}
        </TrackerCard>
      </Rise>

      <Rise i={7}>
        <TrackerCard label="INSIGHT" color={AREA_COLORS.engine} stamp="sparkles">
          <Text style={{ color: '#fff', fontSize: 17, lineHeight: 24, fontFamily: BG[600] }}>{v.insight.text}</Text>
        </TrackerCard>
      </Rise>
    </View>
  );
}
