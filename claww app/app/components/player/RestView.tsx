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

const RING = 230;
const STROKE = 16;

/** The ring and countdown. The only part of the rest screen that re-renders while the timer runs. */
function RestRing() {
  useRenderCount('RestRing');
  const { clock } = useWorkoutSession();
  const active = !!clock && clock.restEndsAt !== null && clock.pausedAt === null;
  const now = useNow(250, active);
  if (!clock) return null;
  const remaining = restRemainingSeconds(clock, now);
  const fraction = restFractionRemaining(clock, now);
  return (
    <ProgressRing size={RING} rings={[{ r: (RING - STROKE) / 2, strokeWidth: STROKE, color: COLORS.blue, pct: fraction * 100 }]} trackColor="rgba(255,255,255,0.07)">
      <Text style={{ color: '#71717A', fontSize: 12, fontWeight: '800', letterSpacing: 1, fontFamily: FONT }}>{clock.pausedAt !== null ? 'PAUSED' : 'REST'}</Text>
      <Text
        accessibilityLiveRegion="polite"
        style={{ color: '#fff', fontSize: 54, fontWeight: '900', letterSpacing: -1.5, fontVariant: ['tabular-nums'], fontFamily: FONT }}
      >
        {formatRest(remaining)}
      </Text>
    </ProgressRing>
  );
}

function RestButton({ label, onPress, strong = false }: { label: string; onPress: () => void; strong?: boolean }) {
  return (
    <PressScale onPress={onPress} style={{ flex: 1 }} accessibilityRole="button" accessibilityLabel={label}>
      <View
        style={{
          height: 56,
          borderRadius: 16,
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: strong ? COLORS.blue : 'rgba(255,255,255,0.07)',
          borderWidth: 1,
          borderColor: strong ? COLORS.blue : 'rgba(255,255,255,0.12)',
        }}
      >
        <Text style={{ color: '#fff', fontSize: 16, fontWeight: '800', fontFamily: FONT }}>{label}</Text>
      </View>
    </PressScale>
  );
}

/** Rest screen (V2 PHASE 2.4): a big ring readable from the bench, ±15 s, Skip, and the next set's numbers. */
export function RestView() {
  const { workout, dayIndex, exerciseIndex, setIndex, plan, lastCompletedSet, adjustRest, skipRest } = useWorkoutSession();
  const exercise = workout?.plan.days[dayIndex]?.exercises[exerciseIndex];
  const state = plan[exerciseIndex];
  const nextRow = state && setIndex >= 0 ? state.rows[setIndex] : null;
  const switchedExercise = !!lastCompletedSet && !!exercise && lastCompletedSet.exerciseName !== exercise.name;

  const nudge = (delta: number) => {
    Haptics.selectionAsync().catch(() => {});
    adjustRest(delta);
  };

  return (
    <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 16, gap: 24 }}>
      <RestRing />

      <View style={{ flexDirection: 'row', gap: 10, alignSelf: 'stretch' }}>
        <RestButton label="−15 s" onPress={() => nudge(-15)} />
        <RestButton label="Skip" onPress={skipRest} strong />
        <RestButton label="+15 s" onPress={() => nudge(15)} />
      </View>

      {exercise && nextRow && state ? (
        <View style={{ alignSelf: 'stretch', padding: 16, borderRadius: 16, backgroundColor: '#111113', borderWidth: 1, borderColor: 'rgba(255,255,255,0.08)', gap: 4 }}>
          <Text style={{ color: '#71717A', fontSize: 11, fontWeight: '800', letterSpacing: 0.7, fontFamily: FONT }}>
            NEXT · {switchedExercise ? exercise.name.toUpperCase() + ' · ' : ''}SET {setIndex + 1} OF {state.rows.length}
          </Text>
          <Text style={{ color: '#fff', fontSize: 22, fontWeight: '900', fontFamily: FONT }}>
            {nextRow.weight > 0 ? `${nextRow.weight} kg × ${nextRow.reps}` : `${nextRow.reps} reps`}
          </Text>
        </View>
      ) : null}

      {lastCompletedSet ? (
        <Text style={{ color: '#A1A1AA', fontSize: 13, textAlign: 'center', fontFamily: FONT }}>
          {lastCompletedSet.exerciseName} set {lastCompletedSet.setNumber}: {lastCompletedSet.reps} reps
          {lastCompletedSet.weight > 0 ? ` × ${lastCompletedSet.weight} kg` : ''} logged.
        </Text>
      ) : null}
    </View>
  );
}
