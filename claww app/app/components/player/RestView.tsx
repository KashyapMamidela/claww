import React from 'react';
import { Text, View } from 'react-native';
import * as Haptics from 'expo-haptics';
import { COLORS, FONT } from '../../lib/theme';
import { useWorkoutSession } from '../../lib/workoutSession';
import { useNow } from '../../lib/useNow';
import { restFractionRemaining, restRemainingSeconds } from '../../lib/sessionClock';
import { useRenderCount } from '../../lib/perf';
import { ProgressRing } from '../ui/ProgressRing';
import { PressScale } from '../ui/PressScale';
import { formatRest } from './clocks';

// Rest inside the player's bottom sheet (NG PHASE 3.2, screen 08). Replaced the V2 2.4 full-screen
// RestView: the set rows now stay visible during rest.

const SHEET_RING = 132;
const SHEET_STROKE = 9;

/** The ring and time in the sheet. The only part that re-renders while the rest runs (4 times a second). */
function SheetRestRing() {
  useRenderCount('SheetRestRing');
  const { clock } = useWorkoutSession();
  const active = !!clock && clock.restEndsAt !== null && clock.pausedAt === null;
  const now = useNow(250, active);
  if (!clock) return null;
  const remaining = restRemainingSeconds(clock, now);
  const fraction = restFractionRemaining(clock, now);
  return (
    <ProgressRing
      size={SHEET_RING}
      rings={[{ r: (SHEET_RING - SHEET_STROKE) / 2, strokeWidth: SHEET_STROKE, color: COLORS.blue, pct: fraction * 100 }]}
      trackColor="rgba(255,255,255,0.07)"
    >
      <Text
        accessibilityLiveRegion="polite"
        accessibilityLabel={clock.pausedAt !== null ? `Rest paused, ${formatRest(remaining)} left` : `${formatRest(remaining)} of rest left`}
        style={{ color: '#fff', fontSize: 32, fontWeight: '900', letterSpacing: -0.5, fontVariant: ['tabular-nums'], fontFamily: FONT }}
      >
        {formatRest(remaining)}
      </Text>
    </ProgressRing>
  );
}

function RoundButton({ label, a11y, onPress }: { label: string; a11y: string; onPress: () => void }) {
  return (
    <PressScale onPress={onPress} scaleTo={0.92} accessibilityRole="button" accessibilityLabel={a11y}>
      <View style={{ width: 52, height: 52, borderRadius: 26, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: 'rgba(255,255,255,0.18)' }}>
        <Text style={{ color: '#fff', fontSize: 15, fontWeight: '800', fontFamily: FONT }}>{label}</Text>
      </View>
    </PressScale>
  );
}

/** Rest in the bottom sheet: what's next, the ring, ±15 s and Skip rest. The set rows stay visible above. */
export function RestSheet() {
  const { workout, dayIndex, exerciseIndex, setIndex, plan, adjustRest, skipRest } = useWorkoutSession();
  const exercise = workout?.plan.days[dayIndex]?.exercises[exerciseIndex];
  const nextRow = plan[exerciseIndex] && setIndex >= 0 ? plan[exerciseIndex].rows[setIndex] : null;
  const next = nextRow
    ? `SET ${setIndex + 1} · ${nextRow.weight > 0 ? `${nextRow.weight} KG × ${nextRow.reps}` : `${nextRow.reps} REPS`}`
    : exercise
      ? exercise.name.toUpperCase()
      : '';

  const nudge = (delta: number) => {
    Haptics.selectionAsync().catch(() => {});
    adjustRest(delta);
  };

  return (
    <View style={{ gap: 14, alignItems: 'center' }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
        <View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: COLORS.blue }} />
        <Text numberOfLines={1} style={{ color: COLORS.blue, fontSize: 11, fontWeight: '800', letterSpacing: 0.9, fontFamily: FONT }}>
          REST{next ? ` · NEXT: ${next}` : ''}
        </Text>
      </View>
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 28 }}>
        <RoundButton label="−15" a11y="Fifteen seconds less rest" onPress={() => nudge(-15)} />
        <SheetRestRing />
        <RoundButton label="+15" a11y="Fifteen seconds more rest" onPress={() => nudge(15)} />
      </View>
      <PressScale onPress={skipRest} style={{ alignSelf: 'stretch' }} accessibilityRole="button" accessibilityLabel="Skip rest">
        <View style={{ height: 54, borderRadius: 16, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: COLORS.blueBorder, backgroundColor: COLORS.blueDim }}>
          <Text style={{ color: '#93C5FD', fontSize: 16, fontWeight: '800', fontFamily: FONT }}>Skip rest</Text>
        </View>
      </PressScale>
    </View>
  );
}
