import React, { useEffect, useState } from 'react';
import { Platform, ScrollView, Text, View } from 'react-native';
import { COLORS, AREA_COLORS, FONT, tint, BG, bg } from '../lib/theme';
import { dailyRanges, hourlyRanges, stepsToKm } from '../lib/activityMath';
import { estimateCaloriesFromSteps, getStepsInRanges, openHealthConnectInstall, type StepsResult } from '../lib/steps';
import { BottomSheet } from './ui/BottomSheet';
import { ProgressRing } from './ui/ProgressRing';
import { PressScale } from './ui/PressScale';
import { BarChart } from './charts/BarChart';

const C = AREA_COLORS.steps;
const GOAL_CHOICES = [6000, 8000, 10000, 12000];
type Range = 'day' | 'week' | 'month';

export interface StepsSheetProps {
  visible: boolean;
  onClose: () => void;
  steps: StepsResult;
  goal: number;
  onGoalChange: (goal: number) => void;
  weightKg: number | null;
  heightCm: number | null;
}

function Segment({ value, onChange }: { value: Range; onChange: (r: Range) => void }) {
  return (
    <View style={{ flexDirection: 'row', backgroundColor: 'rgba(255,255,255,0.05)', borderRadius: 10, padding: 3 }}>
      {(['day', 'week', 'month'] as Range[]).map((r) => (
        <PressScale key={r} onPress={() => onChange(r)} style={{ flex: 1 }} accessibilityRole="button" accessibilityState={{ selected: value === r }}>
          <View style={{ height: 32, borderRadius: 8, alignItems: 'center', justifyContent: 'center', backgroundColor: value === r ? 'rgba(255,255,255,0.1)' : 'transparent' }}>
            <Text style={{ color: value === r ? '#fff' : COLORS.textMuted, fontSize: 13, fontFamily: BG[700] }}>{r[0].toUpperCase() + r.slice(1)}</Text>
          </View>
        </PressScale>
      ))}
    </View>
  );
}

/** Steps detail sheet (V2 PHASE 4.2): ring against the goal, distance, calories, and Day/Week/Month bars. */
export function StepsSheet({ visible, onClose, steps, goal, onGoalChange, weightKg, heightCm }: StepsSheetProps) {
  const [range, setRange] = useState<Range>('day');
  // Premium: a goal chip asks first instead of changing the goal on one tap.
  const [pendingGoal, setPendingGoal] = useState<number | null>(null);
  useEffect(() => { if (!visible) setPendingGoal(null); }, [visible]);
  const [series, setSeries] = useState<Record<Range, number[] | null>>({ day: null, week: null, month: null });

  useEffect(() => {
    if (!visible || !steps.available) return;
    let cancelled = false;
    const now = new Date();
    Promise.all([getStepsInRanges(hourlyRanges(now)), getStepsInRanges(dailyRanges(now, 7)), getStepsInRanges(dailyRanges(now, 30))]).then(
      ([day, week, month]) => {
        if (!cancelled) setSeries({ day, week, month });
      }
    );
    return () => {
      cancelled = true;
    };
  }, [visible, steps.available]);

  const now = new Date();
  const labels: Record<Range, string[]> = {
    day: hourlyRanges(now).map((r) => (r.start.getHours() % 6 === 0 ? `${r.start.getHours()}` : '')),
    week: dailyRanges(now, 7).map((r) => r.start.toLocaleDateString([], { weekday: 'narrow' })),
    month: dailyRanges(now, 30).map((r, i) => (i % 5 === 4 ? `${r.start.getDate()}` : '')),
  };
  // A 0 from Health Connect (no watch wrote any energy) falls back to the steps estimate, like Home's Burned.
  const fromHc = steps.caloriesBurned !== null && steps.caloriesBurned > 0;
  const kcal = fromHc ? (steps.caloriesBurned as number) : estimateCaloriesFromSteps(steps.steps, weightKg);

  return (
    <BottomSheet visible={visible} onClose={onClose}>
      <ScrollView contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 12, gap: 18 }}>
        <Text style={{ color: C, fontSize: 13, letterSpacing: 0.8, fontFamily: BG[800] }}>STEPS</Text>

        {!steps.available ? (
          <View style={{ gap: 12 }}>
            <Text style={{ color: '#fff', fontSize: 17, fontFamily: BG[800] }}>Connect your step count</Text>
            <Text style={{ color: '#A1A1AA', fontSize: 15, lineHeight: 20, fontFamily: BG[400] }}>
              With steps connected you get today's count against a daily goal, distance, calories from walking, and your hour-by-hour,
              weekly and monthly trend.
              {Platform.OS === 'android'
                ? ' On Android CLAWW reads steps from Health Connect (read-only — nothing leaves your phone).'
                : ' On iPhone CLAWW reads the Motion & Fitness step count (read-only — nothing leaves your phone).'}
            </Text>
            {Platform.OS === 'android' ? (
              <PressScale onPress={openHealthConnectInstall} accessibilityRole="button">
                <View style={{ height: 50, borderRadius: 25, backgroundColor: C, alignItems: 'center', justifyContent: 'center' }}>
                  <Text style={{ color: '#050505', fontSize: 15, fontFamily: BG[800] }}>
                    {steps.needsHealthConnectInstall ? 'Install Health Connect' : 'Open Health Connect'}
                  </Text>
                </View>
              </PressScale>
            ) : (
              <Text style={{ color: COLORS.textMuted, fontSize: 13, lineHeight: 18, fontFamily: BG[400] }}>
                Allow Motion & Fitness for CLAWW in the Settings app, then come back here.
              </Text>
            )}
          </View>
        ) : (
          <>
            <View style={{ alignItems: 'center', gap: 12 }}>
              <ProgressRing size={190} rings={[{ r: 82, strokeWidth: 16, color: C, pct: goal > 0 ? (steps.steps / goal) * 100 : 0 }]} trackColor={tint(C, 0.15)}>
                <Text style={{ color: '#fff', fontSize: 34, fontVariant: ['tabular-nums'], fontFamily: BG[800] }}>{steps.steps.toLocaleString()}</Text>
                <Text style={{ color: COLORS.textMuted, fontSize: 13, fontFamily: BG[400] }}>of {goal.toLocaleString()}</Text>
              </ProgressRing>
              <View style={{ flexDirection: 'row', gap: 6 }}>
                {GOAL_CHOICES.map((g) => (
                  <PressScale key={g} onPress={() => setPendingGoal(g === goal ? null : g)} accessibilityRole="button" accessibilityState={{ selected: g === goal }} hitSlop={4}>
                    <View style={{ paddingHorizontal: 12, height: 30, borderRadius: 15, alignItems: 'center', justifyContent: 'center', backgroundColor: g === goal ? tint(C, 0.22) : 'rgba(255,255,255,0.05)' }}>
                      <Text style={{ color: g === goal ? C : '#A1A1AA', fontSize: 13, fontFamily: BG[700] }}>{g / 1000}k</Text>
                    </View>
                  </PressScale>
                ))}
              </View>
              {pendingGoal !== null ? (
                <View style={{ alignSelf: 'stretch', flexDirection: 'row', alignItems: 'center', gap: 8, padding: 10, borderRadius: 14, backgroundColor: tint(C, 0.1) }}>
                  <Text style={{ flex: 1, color: '#fff', fontSize: 15, fontFamily: BG[400] }}>Set your goal to {pendingGoal.toLocaleString()} steps a day?</Text>
                  <PressScale onPress={() => setPendingGoal(null)} accessibilityRole="button" hitSlop={4}>
                    <View style={{ height: 36, paddingHorizontal: 12, justifyContent: 'center' }}>
                      <Text style={{ color: COLORS.textMuted, fontSize: 15, fontFamily: BG[700] }}>Cancel</Text>
                    </View>
                  </PressScale>
                  <PressScale onPress={() => { onGoalChange(pendingGoal); setPendingGoal(null); }} accessibilityRole="button" hitSlop={4}>
                    <View style={{ height: 36, paddingHorizontal: 14, borderRadius: 10, justifyContent: 'center', backgroundColor: C }}>
                      <Text style={{ color: '#000', fontSize: 15, fontFamily: BG[800] }}>Set goal</Text>
                    </View>
                  </PressScale>
                </View>
              ) : null}
            </View>

            <View style={{ flexDirection: 'row', gap: 10 }}>
              {[
                { label: 'DISTANCE', value: `${stepsToKm(steps.steps, heightCm)} km`, sub: 'estimated' },
                { label: 'CALORIES', value: `${kcal} kcal`, sub: fromHc ? 'active, from Health Connect' : 'estimated from steps' },
              ].map((s) => (
                <View key={s.label} style={{ flex: 1, padding: 12, borderRadius: 14, backgroundColor: 'rgba(255,255,255,0.04)' }}>
                  <Text style={{ color: COLORS.textMuted, fontSize: 11, letterSpacing: 0.6, fontFamily: BG[800] }}>{s.label}</Text>
                  <Text style={{ color: '#fff', fontSize: 17, marginTop: 2, fontFamily: BG[800] }}>{s.value}</Text>
                  <Text style={{ color: COLORS.textFaint, fontSize: 11, fontFamily: BG[400] }}>{s.sub}</Text>
                </View>
              ))}
            </View>

            <Segment value={range} onChange={setRange} />
            {series[range] ? (
              <BarChart values={series[range] as number[]} color={C} goal={range === 'day' ? null : goal} labels={labels[range]} height={130} />
            ) : (
              <Text style={{ color: COLORS.textMuted, fontSize: 13, fontFamily: BG[400] }}>Loading…</Text>
            )}
            {range !== 'day' ? (
              <Text style={{ color: COLORS.textFaint, fontSize: 11, fontFamily: BG[400] }}>Dashed line: your {goal.toLocaleString()}-step goal.</Text>
            ) : null}
          </>
        )}
      </ScrollView>
    </BottomSheet>
  );
}
