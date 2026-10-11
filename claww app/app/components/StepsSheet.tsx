import React, { useEffect, useState } from 'react';
import { Platform, ScrollView, Text, View } from 'react-native';
import { AREA_COLORS, FONT, tint } from '../lib/theme';
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
            <Text style={{ color: value === r ? '#fff' : '#71717A', fontSize: 12.5, fontWeight: '700', fontFamily: FONT }}>{r[0].toUpperCase() + r.slice(1)}</Text>
          </View>
        </PressScale>
      ))}
    </View>
  );
}

/** Steps detail sheet (V2 PHASE 4.2): ring against the goal, distance, calories, and Day/Week/Month bars. */
export function StepsSheet({ visible, onClose, steps, goal, onGoalChange, weightKg, heightCm }: StepsSheetProps) {
  const [range, setRange] = useState<Range>('day');
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
  const kcal = steps.caloriesBurned ?? estimateCaloriesFromSteps(steps.steps, weightKg);

  return (
    <BottomSheet visible={visible} onClose={onClose}>
      <ScrollView contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 12, gap: 18 }}>
        <Text style={{ color: C, fontSize: 12, fontWeight: '800', letterSpacing: 0.8, fontFamily: FONT }}>STEPS</Text>

        {!steps.available ? (
          <View style={{ gap: 12 }}>
            <Text style={{ color: '#fff', fontSize: 18, fontWeight: '800', fontFamily: FONT }}>Connect your step count</Text>
            <Text style={{ color: '#A1A1AA', fontSize: 13.5, lineHeight: 20, fontFamily: FONT }}>
              With steps connected you get today's count against a daily goal, distance, calories from walking, and your hour-by-hour,
              weekly and monthly trend.
              {Platform.OS === 'android'
                ? ' On Android CLAWW reads steps from Health Connect (read-only — nothing leaves your phone).'
                : ' On iPhone CLAWW reads the Motion & Fitness step count (read-only — nothing leaves your phone).'}
            </Text>
            {Platform.OS === 'android' ? (
              <PressScale onPress={openHealthConnectInstall} accessibilityRole="button">
                <View style={{ height: 50, borderRadius: 14, backgroundColor: C, alignItems: 'center', justifyContent: 'center' }}>
                  <Text style={{ color: '#050505', fontSize: 14, fontWeight: '800', fontFamily: FONT }}>
                    {steps.needsHealthConnectInstall ? 'Install Health Connect' : 'Open Health Connect'}
                  </Text>
                </View>
              </PressScale>
            ) : (
              <Text style={{ color: '#71717A', fontSize: 12.5, lineHeight: 18, fontFamily: FONT }}>
                Allow Motion & Fitness for CLAWW in the Settings app, then come back here.
              </Text>
            )}
          </View>
        ) : (
          <>
            <View style={{ alignItems: 'center', gap: 12 }}>
              <ProgressRing size={190} rings={[{ r: 82, strokeWidth: 16, color: C, pct: goal > 0 ? (steps.steps / goal) * 100 : 0 }]} trackColor={tint(C, 0.15)}>
                <Text style={{ color: '#fff', fontSize: 32, fontWeight: '900', fontVariant: ['tabular-nums'], fontFamily: FONT }}>{steps.steps.toLocaleString()}</Text>
                <Text style={{ color: '#71717A', fontSize: 11.5, fontFamily: FONT }}>of {goal.toLocaleString()}</Text>
              </ProgressRing>
              <View style={{ flexDirection: 'row', gap: 6 }}>
                {GOAL_CHOICES.map((g) => (
                  <PressScale key={g} onPress={() => onGoalChange(g)} accessibilityRole="button" accessibilityState={{ selected: g === goal }} hitSlop={4}>
                    <View style={{ paddingHorizontal: 12, height: 30, borderRadius: 15, alignItems: 'center', justifyContent: 'center', backgroundColor: g === goal ? tint(C, 0.22) : 'rgba(255,255,255,0.05)' }}>
                      <Text style={{ color: g === goal ? C : '#A1A1AA', fontSize: 12, fontWeight: '700', fontFamily: FONT }}>{g / 1000}k</Text>
                    </View>
                  </PressScale>
                ))}
              </View>
            </View>

            <View style={{ flexDirection: 'row', gap: 10 }}>
              {[
                { label: 'DISTANCE', value: `${stepsToKm(steps.steps, heightCm)} km`, sub: 'estimated' },
                { label: 'CALORIES', value: `${kcal} kcal`, sub: steps.caloriesBurned !== null ? 'active, from Health Connect' : 'estimated from steps' },
              ].map((s) => (
                <View key={s.label} style={{ flex: 1, padding: 12, borderRadius: 14, backgroundColor: 'rgba(255,255,255,0.04)' }}>
                  <Text style={{ color: '#71717A', fontSize: 9.5, fontWeight: '800', letterSpacing: 0.6, fontFamily: FONT }}>{s.label}</Text>
                  <Text style={{ color: '#fff', fontSize: 17, fontWeight: '800', marginTop: 2, fontFamily: FONT }}>{s.value}</Text>
                  <Text style={{ color: '#52525B', fontSize: 10, fontFamily: FONT }}>{s.sub}</Text>
                </View>
              ))}
            </View>

            <Segment value={range} onChange={setRange} />
            {series[range] ? (
              <BarChart values={series[range] as number[]} color={C} goal={range === 'day' ? null : goal} labels={labels[range]} height={130} />
            ) : (
              <Text style={{ color: '#71717A', fontSize: 12.5, fontFamily: FONT }}>Loading…</Text>
            )}
            {range !== 'day' ? (
              <Text style={{ color: '#52525B', fontSize: 10.5, fontFamily: FONT }}>Dashed line: your {goal.toLocaleString()}-step goal.</Text>
            ) : null}
          </>
        )}
      </ScrollView>
    </BottomSheet>
  );
}
