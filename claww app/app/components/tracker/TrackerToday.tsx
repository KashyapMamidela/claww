import React, { useCallback, useMemo, useState } from 'react';
import { sessionName } from '../../lib/format';
import { ActivitySheet } from '../workouts/ActivityCard';
import { LineChart } from '../charts/LineChart';
import { TintTile } from '../ui/TintTile';
import { Pressable, Text, TextInput, View } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { useRouter } from 'expo-router';
import Svg, { Polyline } from 'react-native-svg';
import { AREA_COLORS, COLORS, FONT, tint, BG, bg } from '../../lib/theme';
import { useAppState } from '../../lib/appState';
import {
  getLatestWorkout, getProfile, getRecentActivities, getSuggestedDayIndex, getTodayWorkoutStats, getTodaysWaterMl, getWeightLogs, getWorkoutDayEvents, logWeight,
  type LoggedActivity, type WeightLog,
} from '../../lib/data';
import { getRecentLoggedSets, getRecoveryInputs } from '../../lib/adaptiveData';
import { getTodaySteps, type StepsResult } from '../../lib/steps';
import { burnedKcal, stepsProgress, stepsSourceLine } from '../../lib/dayStats';
import { DEFAULT_STEPS_GOAL } from '../../lib/activityMath';
import { bedtimeFor, parseWeight, recoveryFactors, todayAction, smoothedWeights, weightDeltaText, weightTrend } from '../../lib/trackerToday';
import { BarChart } from '../charts/BarChart';
import { BottomSheet } from '../ui/BottomSheet';
import { Button } from '../ui/Button';
import { Icon } from '../ui/Icon';
import { PressScale } from '../ui/PressScale';
import { ProgressRing } from '../ui/ProgressRing';
import { Segmented } from '../ui/Segmented';
import { Surface } from '../ui/Surface';
import type { ChartKind } from './TrackerBody';

// NG PHASE 13 (screen 04): the Tracker's top cards. Steps with Day / Week and the source line, one recovery score
// with its factors and a Today line, sleep, water and weight, and the activities that are not your plan. Steps and
// Burned here come from the same functions Home's tiles use (lib/dayStats), so for the same day they are the same number.
// Wearable-only reads (resting heart rate, HRV, sleep stages) are not built yet and are not shown.

const C_STEPS = AREA_COLORS.steps;
const TARGET_WATER_ML = 2000;

export interface TrackerTodayProps {
  /** Steps for the last 7 days, oldest first (the Tracker loads this once); null when step counting is off. */
  weekSteps: number[] | null;
  weekLabels: string[];
  stepsGoal: number;
  onOpen: (kind: ChartKind) => void;
}

function Card({ color, label, right, onPress, children, glow }: { color: string; label: string; right?: React.ReactNode; onPress?: () => void; children: React.ReactNode; glow?: boolean }) {
  const body = (
    <TintTile color={color} padding={16} radius={20}>
    <View style={{ gap: 10 }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
          <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: color }} />
          <Text style={{ color, fontSize: 13, letterSpacing: 0.9, fontFamily: BG[800] }}>{label}</Text>
        </View>
        {right}
      </View>
      {children}
    </View>
    </TintTile>
  );
  return onPress ? (
    <PressScale onPress={onPress} accessibilityRole="button" accessibilityLabel={label}>
      {body}
    </PressScale>
  ) : (
    body
  );
}

const hm = (iso: string | null | undefined) => (iso ? new Date(iso).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' }) : null);

export function TrackerToday({ weekSteps, weekLabels, stepsGoal, onOpen }: TrackerTodayProps) {
  const router = useRouter();
  const { userId, recovery, todaySleep } = useAppState();
  const [mode, setMode] = useState<'day' | 'week'>('day');
  const [today, setToday] = useState<StepsResult>({ steps: 0, available: false, caloriesBurned: null });
  const [weightKg, setWeightKg] = useState<number | null>(null);
  const [goal, setGoal] = useState(stepsGoal || DEFAULT_STEPS_GOAL);
  const [waterMl, setWaterMl] = useState(0);
  const [weights, setWeights] = useState<WeightLog[]>([]);
  const [activities, setActivities] = useState<LoggedActivity[]>([]);
  const [setsLast72h, setSetsLast72h] = useState(0);
  const [proteinPct, setProteinPct] = useState<number | null>(null);
  const [sessionFocus, setSessionFocus] = useState<string | null>(null);
  const [weightOpen, setWeightOpen] = useState(false);
  const [activityOpen, setActivityOpen] = useState(false);
  const [weightText, setWeightText] = useState('');
  const [savingWeight, setSavingWeight] = useState(false);
  const [syncedAt, setSyncedAt] = useState<Date | null>(null);
  // Calories of sessions and activities logged today: the same input Home's Burned tile uses, so the two agree.
  const [loggedKcal, setLoggedKcal] = useState(0);

  useFocusEffect(
    useCallback(() => {
      if (!userId) return;
      let cancelled = false;
      (async () => {
        const profile = await getProfile(userId);
        const [steps, water, logs, acts, sets, inputs, workout, todayStats] = await Promise.all([
          getTodaySteps(),
          getTodaysWaterMl(userId),
          getWeightLogs(userId),
          getRecentActivities(userId, profile?.weight ?? null),
          getRecentLoggedSets(userId, 72),
          getRecoveryInputs(userId),
          getLatestWorkout(userId),
          getTodayWorkoutStats(userId, profile?.weight ?? null),
        ]);
        const events = workout ? await getWorkoutDayEvents(userId, workout.id) : [];
        if (cancelled) return;
        setToday(steps);
        setLoggedKcal(todayStats.calorieBurn);
        setWeightKg(profile?.weight ?? null);
        setGoal(profile?.personalization_profile?.stepsGoal ?? DEFAULT_STEPS_GOAL);
        setWaterMl(water);
        setWeights(logs);
        setActivities(acts);
        setSetsLast72h(sets.length);
        // getRecoveryInputs returns a share (0.67); this card shows a percentage (67 %).
        setProteinPct(inputs.proteinPct === null ? null : inputs.proteinPct * 100);
        setSessionFocus(workout ? sessionName(workout.plan.days[getSuggestedDayIndex(workout.plan, events)]?.focus) || null : null);
        setSyncedAt(new Date());
      })();
      return () => {
        cancelled = true;
      };
    }, [userId])
  );

  const source = today.available ? (today.caloriesBurned !== null ? 'health-connect' : 'phone') : null;
  const burned = burnedKcal({ healthConnectKcal: today.available ? today.caloriesBurned : null, steps: today.available ? today.steps : null, loggedKcal, weightKg });
  const weekTotal = weekSteps ? weekSteps.reduce((a, b) => a + b, 0) : 0;
  const weekAvg = weekSteps ? Math.round(weekTotal / 7) : 0;
  const daysOver = weekSteps ? weekSteps.filter((s) => s >= goal).length : 0;

  const factors = recoveryFactors({ sleepHours: todaySleep?.hours ?? null, setsLast72h, proteinPct });
  const action = todayAction({
    band: recovery?.band ?? null,
    sleepHours: todaySleep?.hours ?? null,
    sessionFocus,
    sessionLighter: !!recovery && recovery.band !== 'High',
    wakeHHMM: todaySleep?.wake_time ? `${String(new Date(todaySleep.wake_time).getHours()).padStart(2, '0')}:${String(new Date(todaySleep.wake_time).getMinutes()).padStart(2, '0')}` : null,
  });
  const trend = weightTrend(weights);
  const smoothed = smoothedWeights(weights.map((w) => ({ weightKg: w.weightKg, loggedAt: w.loggedAt })));
  const latestWeight = trend?.latest ?? weightKg;
  const sleepHours = todaySleep?.hours ?? null;
  const waterL = Math.round((waterMl / 1000) * 10) / 10;
  const levelColor = (l: 'good' | 'ok' | 'low') => (l === 'good' ? COLORS.green : l === 'low' ? COLORS.amber : COLORS.textMuted);

  const saveWeight = async () => {
    const v = parseWeight(weightText);
    if (!userId || v === null || savingWeight) return;
    setSavingWeight(true);
    const ok = await logWeight(userId, v);
    setSavingWeight(false);
    if (ok) {
      setWeightOpen(false);
      setWeightText('');
      setWeights(await getWeightLogs(userId));
      setWeightKg(v);
    }
  };

  const spark = useMemo(() => {
    const pts = trend?.points ?? [];
    if (pts.length < 2) return null;
    const min = Math.min(...pts);
    const max = Math.max(...pts);
    const span = Math.max(0.5, max - min);
    return pts.map((p, i) => `${(i / (pts.length - 1)) * 100},${28 - ((p - min) / span) * 24}`).join(' ');
  }, [trend]);

  return (
    <View style={{ gap: 12 }}>
      {/* Steps */}
      <Card
        color={C_STEPS}
        label="STEPS"
        onPress={() => onOpen('steps')}
        right={
          <View style={{ width: 150 }}>
            <Segmented
              options={[{ value: 'day', label: 'Day' }, { value: 'week', label: 'Week' }]}
              value={mode}
              onChange={setMode}
              accent={C_STEPS}
              accentDeep="#B45309"
              accessibilityLabel="Steps range"
            />
          </View>
        }
      >
        {mode === 'day' ? (
          <>
            <Text style={{ color: '#fff', fontSize: 44, letterSpacing: -1, fontVariant: ['tabular-nums'], fontFamily: BG[800] }}>
              {today.available ? today.steps.toLocaleString('en-IN') : '—'}
              <Text style={{ color: COLORS.textMuted, fontSize: 15, letterSpacing: 0, fontFamily: BG[500] }}>  of {goal.toLocaleString('en-IN')} today</Text>
            </Text>
            <View style={{ height: 8, borderRadius: 4, backgroundColor: tint(C_STEPS, 0.16), overflow: 'hidden' }}>
              <View style={{ height: '100%', width: `${stepsProgress(today.available ? today.steps : null, goal)}%`, backgroundColor: C_STEPS, borderRadius: 4 }} />
            </View>
            <Text style={{ color: AREA_COLORS.burned, fontSize: 15, fontFamily: BG[700] }}>
              {burned.kcal !== null ? `${burned.kcal.toLocaleString('en-IN')} kcal ${burned.source === 'health-connect' ? 'active' : 'estimated'}` : 'Burned not tracked yet'}
            </Text>
          </>
        ) : weekSteps ? (
          <>
            <Text style={{ color: '#fff', fontSize: 44, letterSpacing: -1, fontVariant: ['tabular-nums'], fontFamily: BG[800] }}>
              {weekAvg.toLocaleString('en-IN')}
              <Text style={{ color: COLORS.textMuted, fontSize: 15, letterSpacing: 0, fontFamily: BG[500] }}>  a day this week · {daysOver} day{daysOver === 1 ? '' : 's'} over {Math.round(goal / 1000)}k</Text>
            </Text>
            <BarChart values={weekSteps} color={C_STEPS} height={84} goal={goal} labels={weekLabels} />
          </>
        ) : (
          <Text style={{ color: COLORS.textMuted, fontSize: 15, fontFamily: BG[400] }}>Step counting is not connected on this device. Open Steps on Home to connect it.</Text>
        )}
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, borderTopWidth: 1, borderTopColor: COLORS.border, paddingTop: 10 }}>
          <Icon name="shield-check" size={16} color={COLORS.textMuted} />
          <Text style={{ color: COLORS.textMuted, fontSize: 13, flex: 1, lineHeight: 18, fontFamily: BG[400] }}>{stepsSourceLine(source)}</Text>
        </View>
      </Card>

      {/* Recovery */}
      <Card color={AREA_COLORS.recovery} label="RECOVERY" onPress={() => onOpen('recovery')}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 16 }}>
          <ProgressRing size={96} rings={[{ r: 41, strokeWidth: 8, color: AREA_COLORS.recovery, pct: recovery?.score ?? 0 }]} trackColor="rgba(255,255,255,0.07)">
            <Text style={{ color: '#fff', fontSize: 28, fontVariant: ['tabular-nums'], fontFamily: BG[800] }}>{recovery ? recovery.score : '—'}</Text>
            <Text style={{ color: COLORS.textMuted, fontSize: 13, fontFamily: BG[400] }}>{recovery ? recovery.band.toLowerCase() : 'no data'}</Text>
          </ProgressRing>
          <View style={{ flex: 1, gap: 6 }}>
            {factors.map((f) => (
              <View key={f.label} style={{ flexDirection: 'row', justifyContent: 'space-between', gap: 8 }}>
                <Text style={{ color: COLORS.textMuted, fontSize: 15, fontFamily: BG[400], flexShrink: 1 }}>{f.label}</Text>
                <Text style={{ color: f.word ? levelColor(f.level) : COLORS.textMuted, fontSize: 15, fontFamily: BG[700] }}>{f.word || f.value}</Text>
              </View>
            ))}
          </View>
        </View>
        <Pressable
          onPress={() => router.push('/(tabs)/workouts')}
          accessibilityRole="button"
          accessibilityLabel={`Today: ${action}`}
          style={{ borderRadius: 14, borderWidth: 1, borderColor: tint(AREA_COLORS.recovery, 0.5), backgroundColor: tint(AREA_COLORS.recovery, 0.1), padding: 12, flexDirection: 'row', alignItems: 'center', gap: 10 }}
        >
          <Text style={{ color: COLORS.fg, fontSize: 15, lineHeight: 22, flex: 1, fontFamily: BG[400] }}>
            <Text style={{ fontWeight: '800', color: '#fff' }}>Today: </Text>
            {action}
          </Text>
          <Icon name="chevron-right" size={16} color={COLORS.textMuted} />
        </Pressable>
      </Card>

      {/* Sleep */}
      <Card
        color={AREA_COLORS.sleep}
        label="SLEEP"
        onPress={() => onOpen('sleep')}
        right={todaySleep?.bedtime && todaySleep.wake_time ? <Text style={{ color: COLORS.textMuted, fontSize: 13, fontFamily: BG[400] }}>{hm(todaySleep.bedtime)} – {hm(todaySleep.wake_time)}</Text> : null}
      >
        {sleepHours !== null ? (
          <>
            <Text style={{ color: '#fff', fontSize: 34, fontVariant: ['tabular-nums'], letterSpacing: -1, fontFamily: BG[800] }}>
              {Math.floor(sleepHours)} h {Math.round((sleepHours % 1) * 60)} min
              <Text style={{ color: COLORS.textMuted, fontSize: 15, letterSpacing: 0, fontFamily: BG[500] }}>  goal 8 h</Text>
            </Text>
            <View style={{ height: 10, borderRadius: 5, backgroundColor: tint(AREA_COLORS.sleep, 0.16), overflow: 'hidden' }}>
              <View style={{ height: '100%', width: `${Math.min(100, (sleepHours / 8) * 100)}%`, backgroundColor: AREA_COLORS.sleep, borderRadius: 5 }} />
            </View>
            <Text style={{ color: COLORS.textMuted, fontSize: 13, fontFamily: BG[400] }}>Connect a watch to see sleep stages.</Text>
          </>
        ) : (
          <Text style={{ color: COLORS.textMuted, fontSize: 15, fontFamily: BG[400] }}>Not logged yet. A bedtime of {bedtimeFor(null)} gives you 8 hours; log last night on Home.</Text>
        )}
      </Card>

      {/* Water and weight */}
      <View style={{ flexDirection: 'row', gap: 12 }}>
        <View style={{ flex: 1 }}>
          <Card color={AREA_COLORS.water} label="WATER">
            <Text style={{ color: '#fff', fontSize: 28, fontVariant: ['tabular-nums'], fontFamily: BG[800] }}>
              {waterL} L
            </Text>
            <Text style={{ color: COLORS.textMuted, fontSize: 15, fontFamily: BG[400] }}>of {TARGET_WATER_ML / 1000} L</Text>
            <View style={{ height: 8, borderRadius: 4, backgroundColor: tint(AREA_COLORS.water, 0.16), overflow: 'hidden' }}>
              <View style={{ height: '100%', width: `${Math.min(100, (waterMl / TARGET_WATER_ML) * 100)}%`, backgroundColor: AREA_COLORS.water, borderRadius: 4 }} />
            </View>
          </Card>
        </View>
        <View style={{ flex: 1 }}>
          <Card color="#D4D4D8" label="WEIGHT" onPress={() => setWeightOpen(true)}>
            <Text style={{ color: '#fff', fontSize: 28, fontVariant: ['tabular-nums'], fontFamily: BG[800] }}>{latestWeight !== null ? `${latestWeight} kg` : '—'}</Text>
            <Text style={{ color: trend?.deltaKg ? COLORS.green : COLORS.textMuted, fontSize: 15, fontFamily: BG[400] }}>{trend ? weightDeltaText(trend.deltaKg) : 'Log weight'}</Text>
            {spark ? (
              <Svg width="100%" height={30} viewBox="0 0 100 30" preserveAspectRatio="none">
                <Polyline points={spark} fill="none" stroke="#E4E4E7" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
              </Svg>
            ) : null}
          </Card>
        </View>
      </View>

      {/* What was recorded: activities outside the plan. They are logged on Workouts and Home, shown here. */}
      <Card color={AREA_COLORS.burned} label="ACTIVITIES RECORDED">
        {activities.length === 0 ? (
          // Premium D9: an empty state says what will appear and offers the one action that fills it.
          <View style={{ gap: 12 }}>
            <Text style={{ color: COLORS.textMuted, fontSize: 15, lineHeight: 20, fontFamily: BG[400] }}>Sports and long walks you log show up here. They count for calories and recovery.</Text>
            <Button variant="secondary" size="md" accent={AREA_COLORS.burned} onPress={() => setActivityOpen(true)} icon={<Icon name="zap" size={15} color={AREA_COLORS.burned} />}>
              Log an activity
            </Button>
          </View>
        ) : (
          activities.slice(0, 6).map((a) => (
            <View key={`${a.name}-${a.loggedAt}`} style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
              <View style={{ width: 44, height: 44, borderRadius: 12, alignItems: 'center', justifyContent: 'center', backgroundColor: tint(AREA_COLORS.burned, 0.16) }}>
                <Icon name="zap" size={20} color={AREA_COLORS.burned} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={{ color: COLORS.fg, fontSize: 17, fontFamily: BG[800] }}>{a.name}</Text>
                <Text style={{ color: COLORS.textMuted, fontSize: 15, fontFamily: BG[400] }}>
                  {new Date(a.loggedAt).toLocaleDateString(undefined, { weekday: 'short' })} · {a.minutes} min
                </Text>
              </View>
              <Text style={{ color: AREA_COLORS.burned, fontSize: 17, fontVariant: ['tabular-nums'], fontFamily: BG[800] }}>{a.kcal} kcal</Text>
            </View>
          ))
        )}
      </Card>

      {syncedAt ? <Text style={{ color: COLORS.textFaint, fontSize: 13, textAlign: 'right', fontFamily: BG[400] }}>Updated {syncedAt.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}</Text> : null}

      <ActivitySheet visible={activityOpen} userId={userId} onClose={() => setActivityOpen(false)} onLogged={() => {}} />

      <BottomSheet visible={weightOpen} onClose={() => setWeightOpen(false)}>
        <View style={{ padding: 20, gap: 14 }}>
          <Text style={{ color: COLORS.fg, fontSize: 20, fontFamily: BG[800] }}>Log your weight</Text>
          {/* Premium F8: the 7-day average (solid) over each day's weight (faint), so one salty day does not look like a change. */}
          {smoothed.length >= 2 ? (
            <View style={{ gap: 6 }}>
              <LineChart
                height={110}
                series={[
                  { values: smoothed.map((p) => p.raw), color: 'rgba(255,255,255,0.28)' },
                  { values: smoothed.map((p) => p.avg), color: COLORS.fg },
                ]}
                labels={[smoothed[0].day.slice(5).replace('-', '/'), smoothed[smoothed.length - 1].day.slice(5).replace('-', '/')]}
              />
              <Text style={{ color: COLORS.textMuted, fontSize: 13, fontFamily: BG[400] }}>7-day average {smoothed[smoothed.length - 1].avg} kg</Text>
            </View>
          ) : null}
          <TextInput
            value={weightText}
            onChangeText={setWeightText}
            placeholder={latestWeight ? String(latestWeight) : 'e.g. 68.4'}
            placeholderTextColor={COLORS.textFaint}
            keyboardType="decimal-pad"
            autoFocus
            accessibilityLabel="Weight in kilograms"
            style={{ height: 48, borderRadius: 12, borderWidth: 1, borderColor: weightText ? COLORS.borderStrong : COLORS.border, backgroundColor: COLORS.card, color: COLORS.fg, fontSize: 22, paddingHorizontal: 16, fontFamily: BG[800] }}
          />
          <Text style={{ color: COLORS.textMuted, fontSize: 13, fontFamily: BG[400] }}>Weigh yourself at the same time each week for a clean trend.</Text>
          <Button variant="primary" size="lg" fullWidth saving={savingWeight} disabled={parseWeight(weightText) === null} onPress={saveWeight}>
            Save weight
          </Button>
        </View>
      </BottomSheet>
    </View>
  );
}
