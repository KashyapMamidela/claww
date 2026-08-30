import React, { useEffect, useState } from 'react';
import { Text, TouchableOpacity, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';
import { usePathname } from 'expo-router';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, {
  interpolate,
  Extrapolation,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  runOnJS,
} from 'react-native-reanimated';
import { COLORS, FONT } from '../lib/theme';
import { useWorkoutSession } from '../lib/workoutSession';
import { Icon } from './ui/Icon';
import { PressScale } from './ui/PressScale';

function formatClock(totalSeconds: number): string {
  const mm = String(Math.floor(totalSeconds / 60)).padStart(2, '0');
  const ss = String(totalSeconds % 60).padStart(2, '0');
  return `${mm}:${ss}`;
}

// Apple's "Drawer / sheet" spring values (damping 0.8, response 0.3s),
// expressed in Reanimated's duration+dampingRatio spring API.
const SHEET_SPRING = { duration: 300, dampingRatio: 0.8 };
// Full drag distance (px) that swings progress across one full state (-1, 0, or 1).
const DRAG_RANGE = 100;
// Soft resistance past the [-1,1] ends, so dragging past a bound slows
// instead of stopping dead (apple-design rubber-banding).
function rubberband(overshoot: number, dimension: number, constant = 0.55) {
  'worklet';
  return (overshoot * dimension * constant) / (dimension + constant * Math.abs(overshoot));
}
// Momentum projection (apple-design §6) — where the gesture's velocity
// would carry it, so a fast flick snaps to the next state even with little travel.
function projectDistance(velocityPxPerSec: number, decelerationRate = 0.998) {
  'worklet';
  return (velocityPxPerSec / 1000) * decelerationRate / (1 - decelerationRate);
}
// Nearest of the three resting states to a (possibly out-of-range) value.
function nearestSnapPoint(value: number): -1 | 0 | 1 {
  'worklet';
  if (value <= -0.5) return -1;
  if (value >= 0.5) return 1;
  return 0;
}

interface LiveWorkoutPlayerProps {
  bottomOffset?: number;
}

export function LiveWorkoutPlayer({ bottomOffset = 10 }: LiveWorkoutPlayerProps) {
  const {
    status,
    workout,
    dayIndex,
    exerciseIndex,
    setNumber,
    elapsedSeconds,
    restRemaining,
    isPaused,
    weight,
    togglePause,
    setWeight,
    finishSet,
    skipExercise,
    skipRest,
    endSession,
  } = useWorkoutSession();

  const [expanded, setExpanded] = useState(false);
  const [minimized, setMinimized] = useState(false);
  // -1 = minimized to a corner pill, 0 = collapsed bar, 1 = expanded with exercise list.
  const progress = useSharedValue(0);
  const contentHeight = useSharedValue(0);
  const dragStartProgress = useSharedValue(0);

  const setUiState = (target: -1 | 0 | 1) => {
    setExpanded(target === 1);
    setMinimized(target === -1);
  };

  // Called from JS (a plain button tap) — sets state directly, no worklet involved.
  const animateTo = (target: -1 | 0 | 1) => {
    progress.value = withSpring(target, SHEET_SPRING);
    setUiState(target);
  };

  // Called from the UI thread (gesture worklet) — must hop back to JS for setState.
  const snapTo = (target: -1 | 0 | 1) => {
    'worklet';
    progress.value = withSpring(target, SHEET_SPRING);
    runOnJS(setUiState)(target);
  };

  // The Workouts tab is where the live session actually belongs on screen —
  // landing there while minimized to the corner pill would defeat the point
  // of being on that page. Restore to the full bar automatically; leave
  // every other tab alone (that's exactly where minimizing helps).
  const pathname = usePathname();
  useEffect(() => {
    if (pathname === '/workouts' && minimized) {
      animateTo(0);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pathname]);

  const panGesture = Gesture.Pan()
    .onStart(() => {
      dragStartProgress.value = progress.value;
    })
    .onUpdate((e) => {
      let next = dragStartProgress.value - e.translationY / DRAG_RANGE;
      if (next < -1) next = -1 - rubberband(-1 - next, 1);
      else if (next > 1) next = 1 + rubberband(next - 1, 1);
      progress.value = next;
    })
    .onEnd((e) => {
      const rawProjected = progress.value - projectDistance(e.velocityY) / DRAG_RANGE;
      // A degenerate velocity (e.g. a release with no prior movement) can
      // produce a non-finite projection — fall back to raw position rather
      // than let a broken number silently resolve to the wrong snap point.
      const projected = Number.isFinite(rawProjected) ? rawProjected : progress.value;
      snapTo(nearestSnapPoint(projected));
    });

  const contentStyle = useAnimatedStyle(() => ({
    height: Math.max(0, Math.min(1, progress.value)) * contentHeight.value,
    opacity: Math.max(0, Math.min(1, progress.value * 1.3)),
  }));

  const chevronStyle = useAnimatedStyle(() => ({
    transform: [{ rotate: `${Math.max(0, Math.min(1, progress.value)) * 180}deg` }],
  }));

  // Bar shrinks + fades out as progress heads toward -1 (minimizing).
  const barStyle = useAnimatedStyle(() => {
    const t = interpolate(progress.value, [-1, 0], [0, 1], Extrapolation.CLAMP);
    return {
      opacity: t,
      transform: [{ scale: interpolate(t, [0, 1], [0.85, 1]) }],
    };
  });

  // Pill grows + fades in as progress heads toward -1.
  const pillStyle = useAnimatedStyle(() => {
    const t = interpolate(progress.value, [-1, 0], [1, 0], Extrapolation.CLAMP);
    return {
      opacity: t,
      transform: [{ scale: interpolate(t, [0, 1], [0.6, 1]) }],
    };
  });

  // Scrim behind the expanded sheet — fades in only over the [0,1] (collapsed
  // -> expanded) range, so it stays fully hidden while collapsed or minimized.
  const scrimStyle = useAnimatedStyle(() => ({
    opacity: interpolate(progress.value, [0, 1], [0, 1], Extrapolation.CLAMP),
  }));

  if (status === 'idle' || status === 'completed' || !workout) return null;

  const today = workout.plan.days[dayIndex];
  if (!today) return null;
  const exercises = today.exercises;
  const current = exercises[exerciseIndex];
  if (!current) return null;

  const isResting = status === 'resting';

  const ctl = (icon: string, size: number, box: number, onPress: () => void, strong = false) => (
    <TouchableOpacity
      activeOpacity={0.8}
      onPress={onPress}
      style={{
        width: box,
        height: box,
        borderRadius: box > 34 ? 11 : 9,
        backgroundColor: strong ? 'rgba(255,255,255,0.18)' : 'rgba(255,255,255,0.10)',
        borderWidth: 1,
        borderColor: strong ? 'rgba(255,255,255,0.28)' : 'rgba(255,255,255,0.16)',
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      <Icon name={icon} size={size} color={strong ? '#fff' : 'rgba(255,255,255,0.75)'} />
    </TouchableOpacity>
  );

  const progressPct = ((exercises.slice(0, exerciseIndex).reduce((s, e) => s + e.sets, 0) + (setNumber - 1)) / exercises.reduce((s, e) => s + e.sets, 0)) * 100;

  return (
    <>
      {/* Scrim behind the expanded sheet — dims + blurs the rest of the screen,
          tap to collapse back to the bar (standard sheet-with-scrim pattern). */}
      <Animated.View
        pointerEvents={expanded ? 'auto' : 'none'}
        style={[{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 }, scrimStyle]}
      >
        <TouchableOpacity activeOpacity={1} onPress={() => animateTo(0)} style={{ flex: 1 }}>
          <BlurView intensity={30} tint="dark" style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.35)' }} />
        </TouchableOpacity>
      </Animated.View>

      <View style={{ position: 'absolute', bottom: bottomOffset, left: 0, right: 0, height: 0 }} pointerEvents="box-none">
      {/* Minimized pill — small, corner-docked, doesn't cover other screens' content. */}
      <Animated.View
        pointerEvents={minimized ? 'auto' : 'none'}
        style={[{ position: 'absolute', bottom: 0, right: 12 }, pillStyle]}
      >
        <PressScale onPress={() => animateTo(0)} scaleTo={0.92}>
          <LinearGradient
            colors={['#0F2044', 'rgba(29,78,216,0.95)']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={{
              width: 52,
              height: 52,
              borderRadius: 26,
              borderWidth: 1,
              borderColor: 'rgba(59,130,246,0.45)',
              alignItems: 'center',
              justifyContent: 'center',
            }}
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

      {/* Full bar — collapsed or expanded. */}
      <Animated.View pointerEvents={minimized ? 'none' : 'auto'} style={[{ position: 'absolute', bottom: 0, left: 12, right: 12 }, barStyle]}>
        <LinearGradient
          colors={['#0A1628', '#0F2044', 'rgba(29,78,216,0.92)']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={{
            borderRadius: 18,
            borderWidth: 1,
            borderColor: 'rgba(59,130,246,0.40)',
            paddingHorizontal: 14,
            paddingTop: 6,
            paddingBottom: 10,
          }}
        >
          <GestureDetector gesture={panGesture}>
            <View style={{ alignItems: 'center', paddingVertical: 6 }}>
              <View style={{ width: 34, height: 4, borderRadius: 2, backgroundColor: 'rgba(255,255,255,0.25)' }} />
            </View>
          </GestureDetector>

          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
            <View
              style={{
                width: 8,
                height: 8,
                borderRadius: 4,
                backgroundColor: isResting ? COLORS.amber : '#fff',
                opacity: isPaused ? 0.35 : 1,
              }}
            />
            <View style={{ flex: 1, minWidth: 0 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                <Text style={{ color: 'rgba(255,255,255,0.6)', fontSize: 9.5, fontWeight: '700', letterSpacing: 0.7, fontFamily: FONT }}>
                  {isResting ? `RESTING · ${formatClock(restRemaining)}` : isPaused ? 'PAUSED' : `LIVE · ${formatClock(elapsedSeconds)}`}
                </Text>
                <View style={{ backgroundColor: 'rgba(255,255,255,0.12)', borderRadius: 3, paddingHorizontal: 5, paddingVertical: 1 }}>
                  <Text style={{ fontSize: 8.5, fontWeight: '700', color: 'rgba(255,255,255,0.65)', fontFamily: FONT }}>
                    Set {setNumber}/{current.sets}
                  </Text>
                </View>
              </View>
              <Text numberOfLines={1} style={{ color: '#fff', fontSize: 13, fontWeight: '800', fontFamily: FONT }}>
                {current.name}
              </Text>
              <Text style={{ color: 'rgba(255,255,255,0.55)', fontSize: 10.5, fontFamily: FONT }}>
                {current.reps} reps · {weight > 0 ? `${weight}kg` : 'bodyweight'}
              </Text>
            </View>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
              {!isResting && ctl(isPaused ? 'play' : 'pause', 15, 34, togglePause)}
              <TouchableOpacity onPress={() => animateTo(expanded ? 0 : 1)} style={{ width: 26, height: 26, alignItems: 'center', justifyContent: 'center' }}>
                <Animated.View style={chevronStyle}>
                  <Icon name="chevron-up" size={14} color="rgba(255,255,255,0.5)" />
                </Animated.View>
              </TouchableOpacity>
              <TouchableOpacity onPress={endSession} style={{ width: 22, height: 22, alignItems: 'center', justifyContent: 'center' }}>
                <Icon name="x" size={12} color="rgba(255,255,255,0.35)" />
              </TouchableOpacity>
            </View>
          </View>

          <View style={{ marginTop: 8, height: 2, backgroundColor: 'rgba(255,255,255,0.12)', borderRadius: 100, overflow: 'hidden' }}>
            <View style={{ height: '100%', borderRadius: 100, width: `${Math.max(0, Math.min(100, progressPct))}%`, backgroundColor: 'rgba(255,255,255,0.75)' }} />
          </View>

          {!isPaused && (
            <View style={{ marginTop: 10, flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              {isResting ? (
                <TouchableOpacity
                  activeOpacity={0.85}
                  onPress={skipRest}
                  style={{ flex: 1, height: 40, borderRadius: 12, backgroundColor: 'rgba(245,158,11,0.22)', borderWidth: 1, borderColor: 'rgba(245,158,11,0.4)', alignItems: 'center', justifyContent: 'center', flexDirection: 'row', gap: 6 }}
                >
                  <Icon name="skip-forward" size={14} color={COLORS.amber} />
                  <Text style={{ color: COLORS.amber, fontSize: 12.5, fontWeight: '800', fontFamily: FONT }}>Skip Rest</Text>
                </TouchableOpacity>
              ) : (
                <>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                    {ctl('chevron-left', 12, 26, () => setWeight(weight - 2.5))}
                    <Text style={{ color: '#fff', fontSize: 12, fontWeight: '700', width: 46, textAlign: 'center', fontFamily: FONT }}>
                      {weight}kg
                    </Text>
                    {ctl('chevron-right', 12, 26, () => setWeight(weight + 2.5))}
                  </View>
                  <TouchableOpacity
                    activeOpacity={0.85}
                    onPress={finishSet}
                    style={{ flex: 1, height: 40, borderRadius: 12, backgroundColor: '#fff', alignItems: 'center', justifyContent: 'center', flexDirection: 'row', gap: 6 }}
                  >
                    <Icon name="check" size={15} color={COLORS.blueDeep} strokeWidth={3} />
                    <Text style={{ color: COLORS.blueDeep, fontSize: 12.5, fontWeight: '800', fontFamily: FONT }}>Finish Set</Text>
                  </TouchableOpacity>
                  {ctl('skip-forward', 14, 34, skipExercise)}
                </>
              )}
            </View>
          )}

          <Animated.View style={[{ overflow: 'hidden' }, contentStyle]}>
            <View
              style={{ marginTop: 12, gap: 6, position: 'absolute', top: 0, left: 0, right: 0 }}
              onLayout={(e) => {
                contentHeight.value = e.nativeEvent.layout.height;
              }}
            >
              {exercises.map((ex, i) => {
                const done = i < exerciseIndex;
                const isCurr = i === exerciseIndex;
                return (
                  <View
                    key={`${ex.name}-${i}`}
                    style={{
                      flexDirection: 'row',
                      alignItems: 'center',
                      gap: 10,
                      paddingHorizontal: 10,
                      paddingVertical: 8,
                      borderRadius: 10,
                      backgroundColor: isCurr ? 'rgba(255,255,255,0.10)' : 'rgba(255,255,255,0.04)',
                      borderWidth: 1,
                      borderColor: isCurr ? 'rgba(255,255,255,0.20)' : 'rgba(255,255,255,0.06)',
                      opacity: done ? 0.45 : 1,
                    }}
                  >
                    <View
                      style={{
                        width: 20,
                        height: 20,
                        borderRadius: 10,
                        backgroundColor: done ? 'rgba(34,197,94,0.20)' : isCurr ? 'rgba(255,255,255,0.18)' : 'rgba(255,255,255,0.07)',
                        borderWidth: 1,
                        borderColor: done ? 'rgba(34,197,94,0.45)' : isCurr ? 'rgba(255,255,255,0.35)' : 'rgba(255,255,255,0.12)',
                        alignItems: 'center',
                        justifyContent: 'center',
                      }}
                    >
                      <Text style={{ color: done ? COLORS.green : 'rgba(255,255,255,0.65)', fontSize: 10, fontWeight: '700', fontFamily: FONT }}>
                        {done ? '✓' : i + 1}
                      </Text>
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text
                        style={{
                          color: done ? 'rgba(255,255,255,0.45)' : isCurr ? '#fff' : 'rgba(255,255,255,0.75)',
                          fontSize: 12,
                          fontWeight: isCurr ? '700' : '500',
                          textDecorationLine: done ? 'line-through' : 'none',
                          fontFamily: FONT,
                        }}
                      >
                        {ex.name}
                      </Text>
                      <Text style={{ color: 'rgba(255,255,255,0.4)', fontSize: 10, fontFamily: FONT }}>
                        {ex.sets} × {ex.reps}
                      </Text>
                    </View>
                  </View>
                );
              })}
            </View>
          </Animated.View>
        </LinearGradient>
      </Animated.View>
      </View>
    </>
  );
}
