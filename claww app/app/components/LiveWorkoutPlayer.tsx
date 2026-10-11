import React, { useEffect, useRef, useState } from 'react';
import { Text, TouchableOpacity, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';
import { usePathname } from 'expo-router';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, { interpolate, Extrapolation, useAnimatedStyle, useSharedValue, withSpring } from 'react-native-reanimated';
import { scheduleOnRN } from 'react-native-worklets';
import { COLORS, FONT } from '../lib/theme';
import { useWorkoutSession } from '../lib/workoutSession';
import { Icon } from './ui/Icon';
import { PressScale } from './ui/PressScale';
import { markSetTap, useRenderCount } from '../lib/perf';
import { ElapsedClock, RestCountdown } from './player/clocks';
import { FullPlayer } from './player/FullPlayer';

const clockLabelStyle = { color: 'rgba(255,255,255,0.6)', fontSize: 9.5, fontWeight: '700', letterSpacing: 0.7, fontFamily: FONT } as const;

// Apple's "Drawer / sheet" spring values (damping 0.8, response 0.3s),
// expressed in Reanimated's duration+dampingRatio spring API.
const SHEET_SPRING = { duration: 300, dampingRatio: 0.8 };
// Full drag distance (px) that swings progress across one full state.
const DRAG_RANGE = 100;
// Soft resistance past the ends, so dragging past a bound slows instead of
// stopping dead (apple-design rubber-banding).
function rubberband(overshoot: number, dimension: number, constant = 0.55) {
  'worklet';
  return (overshoot * dimension * constant) / (dimension + constant * Math.abs(overshoot));
}
// Momentum projection (apple-design §6) — where the gesture's velocity
// would carry it, so a fast flick snaps to the next state even with little travel.
function projectDistance(velocityPxPerSec: number, decelerationRate = 0.998) {
  'worklet';
  return ((velocityPxPerSec / 1000) * decelerationRate) / (1 - decelerationRate);
}

type Mode = 'full' | 'bar' | 'pill';

interface LiveWorkoutPlayerProps {
  bottomOffset?: number;
}

/**
 * Hosts the live session in one of three forms: the full-screen set-row
 * player (V2 PHASE 2.3, opens when a session starts), a slim bar above the
 * tab bar, or a corner pill. Drag the bar down to minimize it to the pill,
 * up to go back to full screen.
 */
export function LiveWorkoutPlayer({ bottomOffset = 10 }: LiveWorkoutPlayerProps) {
  useRenderCount('LiveWorkoutPlayer');
  const { status, workout, dayIndex, exerciseIndex, setIndex, plan, clock, isPaused, logSet, skipRest, endSession } = useWorkoutSession();

  const [mode, setMode] = useState<Mode>('full');
  // -1 = pill, 0 = bar. Dragging the bar upward past the threshold opens full screen.
  const progress = useSharedValue(0);
  const dragStart = useSharedValue(0);

  // Every new session opens full screen.
  const prevStatus = useRef(status);
  useEffect(() => {
    if (prevStatus.current === 'idle' && status !== 'idle') {
      progress.set(0);
      setMode('full');
    }
    prevStatus.current = status;
  }, [status, progress]);

  const toMode = (m: Mode) => {
    if (m !== 'full') progress.set(withSpring(m === 'pill' ? -1 : 0, SHEET_SPRING));
    setMode(m);
  };

  // Landing on the Workouts tab while minimized to the pill brings the bar back.
  const pathname = usePathname();
  useEffect(() => {
    if (pathname === '/workouts' && mode === 'pill') toMode('bar');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pathname]);

  const pan = Gesture.Pan()
    .onStart(() => {
      dragStart.set(progress.get());
    })
    .onUpdate((e) => {
      let next = dragStart.get() - e.translationY / DRAG_RANGE;
      if (next < -1) next = -1 - rubberband(-1 - next, 1);
      else if (next > 1) next = 1 + rubberband(next - 1, 1);
      progress.set(next);
    })
    .onEnd((e) => {
      const raw = progress.get() - projectDistance(e.velocityY) / DRAG_RANGE;
      const projected = Number.isFinite(raw) ? raw : progress.get();
      if (projected >= 0.5) {
        progress.set(withSpring(0, SHEET_SPRING));
        scheduleOnRN(setMode, 'full');
      } else if (projected <= -0.5) {
        progress.set(withSpring(-1, SHEET_SPRING));
        scheduleOnRN(setMode, 'pill');
      } else {
        progress.set(withSpring(0, SHEET_SPRING));
        scheduleOnRN(setMode, 'bar');
      }
    });

  const barStyle = useAnimatedStyle(() => {
    const t = interpolate(progress.get(), [-1, 0], [0, 1], Extrapolation.CLAMP);
    const lift = interpolate(progress.get(), [0, 1], [0, -18], Extrapolation.CLAMP);
    return { opacity: t, transform: [{ translateY: lift }, { scale: interpolate(t, [0, 1], [0.85, 1]) }] };
  });

  const pillStyle = useAnimatedStyle(() => {
    const t = interpolate(progress.get(), [-1, 0], [1, 0], Extrapolation.CLAMP);
    return { opacity: t, transform: [{ scale: interpolate(t, [0, 1], [0.6, 1]) }] };
  });

  if (status === 'idle' || status === 'completed' || !workout) return null;
  const today = workout.plan.days[dayIndex];
  const current = today?.exercises[exerciseIndex];
  const state = plan[exerciseIndex];
  if (!today || !current || !state) return null;

  const isResting = status === 'resting';
  const row = setIndex >= 0 ? state.rows[setIndex] : null;
  const totalRows = plan.reduce((s, ex) => s + ex.rows.length, 0);
  const doneRows = plan.reduce((s, ex) => s + ex.rows.filter((r) => r.done).length, 0);
  const progressPct = totalRows > 0 ? (doneRows / totalRows) * 100 : 0;

  const onBarDone = () => {
    if (!row) return;
    markSetTap();
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
    logSet();
  };

  return (
    <>
      <FullPlayer visible={mode === 'full'} onMinimize={() => toMode('bar')} />

      <View style={{ position: 'absolute', bottom: bottomOffset, left: 0, right: 0, height: 0 }} pointerEvents="box-none">
        {/* Minimized pill — corner-docked, doesn't cover other screens' content. */}
        <Animated.View pointerEvents={mode === 'pill' ? 'auto' : 'none'} style={[{ position: 'absolute', bottom: 0, right: 12 }, pillStyle]}>
          <PressScale onPress={() => toMode('bar')} scaleTo={0.92} accessibilityLabel="Show workout" accessibilityRole="button">
            <LinearGradient
              colors={['#0F2044', 'rgba(29,78,216,0.95)']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={{ width: 52, height: 52, borderRadius: 26, borderWidth: 1, borderColor: 'rgba(59,130,246,0.45)', alignItems: 'center', justifyContent: 'center' }}
            >
              <Icon name="activity" size={20} color="#fff" />
              <View
                style={{
                  position: 'absolute',
                  top: 6,
                  right: 6,
                  width: 8,
                  height: 8,
                  borderRadius: 4,
                  backgroundColor: isResting ? COLORS.amber : COLORS.green,
                  borderWidth: 1.5,
                  borderColor: '#0F2044',
                  opacity: isPaused ? 0.4 : 1,
                }}
              />
            </LinearGradient>
          </PressScale>
        </Animated.View>

        {/* Bar */}
        <Animated.View pointerEvents={mode === 'bar' ? 'auto' : 'none'} style={[{ position: 'absolute', bottom: 0, left: 12, right: 12 }, barStyle]}>
          <LinearGradient
            colors={['#0A1628', '#0F2044', 'rgba(29,78,216,0.92)']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={{ borderRadius: 18, borderWidth: 1, borderColor: 'rgba(59,130,246,0.40)', paddingHorizontal: 14, paddingTop: 6, paddingBottom: 10 }}
          >
            <GestureDetector gesture={pan}>
              <View style={{ alignItems: 'center', paddingVertical: 6 }}>
                <View style={{ width: 34, height: 4, borderRadius: 2, backgroundColor: 'rgba(255,255,255,0.25)' }} />
              </View>
            </GestureDetector>

            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
              <TouchableOpacity activeOpacity={0.8} onPress={() => toMode('full')} style={{ flex: 1, minWidth: 0 }} accessibilityRole="button" accessibilityLabel="Open workout">
                {isPaused || !clock ? (
                  <Text style={clockLabelStyle}>PAUSED</Text>
                ) : isResting ? (
                  <RestCountdown clock={clock} style={clockLabelStyle} prefix="RESTING · " />
                ) : (
                  <ElapsedClock clock={clock} style={clockLabelStyle} prefix="LIVE · " />
                )}
                <Text numberOfLines={1} style={{ color: '#fff', fontSize: 13, fontWeight: '800', fontFamily: FONT }}>
                  {current.name}
                </Text>
                <Text style={{ color: 'rgba(255,255,255,0.55)', fontSize: 10.5, fontFamily: FONT }}>
                  {row ? `Set ${setIndex + 1}/${state.rows.length} · ${row.reps}${row.weight > 0 ? ` × ${row.weight} kg` : ' reps'}` : 'Exercise done'}
                </Text>
              </TouchableOpacity>
              {isResting ? (
                <PressScale onPress={skipRest} accessibilityRole="button" accessibilityLabel="Skip rest">
                  <View style={{ height: 40, paddingHorizontal: 14, borderRadius: 12, backgroundColor: 'rgba(245,158,11,0.22)', alignItems: 'center', justifyContent: 'center' }}>
                    <Text style={{ color: COLORS.amber, fontSize: 12.5, fontWeight: '800', fontFamily: FONT }}>Skip rest</Text>
                  </View>
                </PressScale>
              ) : row ? (
                <PressScale onPress={onBarDone} accessibilityRole="button" accessibilityLabel="Done, log this set">
                  <View style={{ height: 40, paddingHorizontal: 14, borderRadius: 12, backgroundColor: '#fff', alignItems: 'center', justifyContent: 'center', flexDirection: 'row', gap: 6 }}>
                    <Icon name="check" size={15} color={COLORS.blueDeep} strokeWidth={3} />
                    <Text style={{ color: COLORS.blueDeep, fontSize: 12.5, fontWeight: '800', fontFamily: FONT }}>Done</Text>
                  </View>
                </PressScale>
              ) : null}
              <TouchableOpacity onPress={() => toMode('full')} hitSlop={8} accessibilityLabel="Expand player" accessibilityRole="button">
                <Icon name="chevron-up" size={16} color="rgba(255,255,255,0.6)" />
              </TouchableOpacity>
              <TouchableOpacity onPress={endSession} hitSlop={8} accessibilityLabel="End workout" accessibilityRole="button">
                <Icon name="x" size={13} color="rgba(255,255,255,0.35)" />
              </TouchableOpacity>
            </View>

            <View style={{ marginTop: 8, height: 2, backgroundColor: 'rgba(255,255,255,0.12)', borderRadius: 100, overflow: 'hidden' }}>
              <View style={{ height: '100%', borderRadius: 100, width: `${Math.max(0, Math.min(100, progressPct))}%`, backgroundColor: 'rgba(255,255,255,0.75)' }} />
            </View>
          </LinearGradient>
        </Animated.View>
      </View>
    </>
  );
}
