import React, { useEffect, useRef, useState } from 'react';
import { Text, View } from 'react-native';
import { COLORS, FONT } from '../../lib/theme';
import { useNow } from '../../lib/useNow';
import { loggedMinutes, stepKm, timerDisplay } from '../../lib/timedExercise';
import { success } from '../../lib/haptics';
import { Button } from '../ui/Button';
import { Icon } from '../ui/Icon';
import { ProgressRing } from '../ui/ProgressRing';
import { Stepper } from '../ui/Stepper';
import { Surface } from '../ui/Surface';

// NG PHASE 3.6: the player for cardio, running, cycling, yoga and mobility. No set rows: a big timer that
// counts down from the target (then up as "+m:ss over"), Start / Pause, an optional distance, and Done.
// Done without using the timer logs the target as planned, like ticking a set. The ring and the number are
// the only things that re-render while it runs.

const RING = 200;
const STROKE = 14;

export interface TimedBlockProps {
  exerciseName: string;
  targetMinutes: number;
  /** Show the optional distance stepper (running, cycling, walking and machines). */
  withDistance: boolean;
  onDone: (input: { minutes: number; distanceKm: number | null }) => void;
}

export function TimedBlock({ exerciseName, targetMinutes, withDistance, onDone }: TimedBlockProps) {
  const [startedAt, setStartedAt] = useState<number | null>(null);
  const [carried, setCarried] = useState(0); // ms from earlier run segments (before a pause)
  const [km, setKm] = useState(0);
  const running = startedAt !== null;
  const now = useNow(250, running);
  const targetMs = targetMinutes * 60_000;
  const elapsed = carried + (startedAt !== null ? Math.max(0, now - startedAt) : 0);
  const display = timerDisplay(elapsed, targetMs);
  const everStarted = elapsed > 0;

  // One success haptic when the target is first reached.
  const reached = useRef(false);
  useEffect(() => {
    if (display.over && !reached.current) {
      reached.current = true;
      success();
    }
  }, [display.over]);

  const toggle = () => {
    if (startedAt === null) setStartedAt(Date.now());
    else {
      setCarried((c) => c + (Date.now() - startedAt));
      setStartedAt(null);
    }
  };

  const done = () => {
    const total = carried + (startedAt !== null ? Date.now() - startedAt : 0);
    onDone({ minutes: loggedMinutes(total, targetMinutes), distanceKm: km > 0 ? km : null });
  };

  return (
    <Surface padding={20} grain={0.06}>
      <View style={{ alignItems: 'center', gap: 18 }}>
        <ProgressRing size={RING} rings={[{ r: (RING - STROKE) / 2, strokeWidth: STROKE, color: display.over ? COLORS.green : COLORS.blue, pct: display.fraction * 100 }]} trackColor="rgba(255,255,255,0.07)">
          <Text style={{ color: COLORS.textMuted, fontSize: 13, fontWeight: '800', letterSpacing: 1, fontFamily: FONT }}>
            {display.over ? 'TARGET REACHED' : running ? 'GO' : everStarted ? 'PAUSED' : `${targetMinutes} MIN`}
          </Text>
          <Text
            accessibilityLiveRegion="polite"
            accessibilityLabel={display.over ? `Target reached, ${display.text} over` : `${display.text} left`}
            style={{ color: display.over ? COLORS.green : COLORS.fg, fontSize: 48, fontWeight: '900', letterSpacing: -1.2, fontVariant: ['tabular-nums'], fontFamily: FONT }}
          >
            {display.text}
          </Text>
        </ProgressRing>

        <View style={{ alignSelf: 'stretch' }}>
          <Button
            variant={running ? 'secondary' : 'primary'}
            size="lg"
            fullWidth
            accent={COLORS.blue}
            accentDeep={COLORS.blueDeep}
            onPress={toggle}
            icon={<Icon name={running ? 'pause' : 'play'} size={18} color={running ? COLORS.blue : '#fff'} />}
          >
            {running ? 'Pause' : everStarted ? 'Resume' : 'Start'}
          </Button>
        </View>

        {withDistance ? (
          <View style={{ alignSelf: 'stretch', gap: 6 }}>
            <Text style={{ color: COLORS.textMuted, fontSize: 11, fontFamily: FONT }}>Distance · optional</Text>
            <Stepper label="Distance" value={km.toFixed(1)} unit="km" onDecrement={() => setKm((v) => stepKm(v, -1))} onIncrement={() => setKm((v) => stepKm(v, 1))} decrementDisabled={km <= 0} />
          </View>
        ) : null}

        <View style={{ alignSelf: 'stretch', gap: 8 }}>
          <Button variant={everStarted ? 'primary' : 'secondary'} size="lg" fullWidth accent={COLORS.green} accentDeep={COLORS.greenDeep} onPress={done} icon={<Icon name="check" size={18} color={everStarted ? '#fff' : COLORS.green} strokeWidth={3} />}>
            {everStarted ? `Done · ${exerciseName}` : `Done as planned · ${targetMinutes} min`}
          </Button>
        </View>
      </View>
    </Surface>
  );
}
