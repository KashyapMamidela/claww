import React, { useState } from 'react';
import { Modal, Pressable, ScrollView, Text, View } from 'react-native';
import * as Haptics from 'expo-haptics';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Gesture, GestureDetector, GestureHandlerRootView } from 'react-native-gesture-handler';
import Animated, { useAnimatedStyle, useReducedMotion, useSharedValue, withSpring } from 'react-native-reanimated';
import { scheduleOnRN } from 'react-native-worklets';
import { COLORS, FONT } from '../../lib/theme';
import { useWorkoutSession } from '../../lib/workoutSession';
import { currentSetIndex, isExerciseComplete, lastFor, nextExerciseWithWork } from '../../lib/sessionPlan';
import { markSetTap, useRenderCount, useSetLatency } from '../../lib/perf';
import { Icon } from '../ui/Icon';
import { PressScale } from '../ui/PressScale';
import { ElapsedClock } from './clocks';
import { RestView } from './RestView';
import { FormStrip } from './FormStrip';
import { ExerciseGuideSheet } from '../ExerciseGuideSheet';
import { ValuePickerSheet, type PickerKind } from './ValuePickerSheet';

const A = COLORS.blue;
/** V2 PHASE 6.3 adds the column the reps-in-reserve chip saves to; until then the slot stays hidden. */
const RIR_CHIP_ENABLED = true;
const SWIPE_DISTANCE = 90;
const SWIPE_VELOCITY = 800;

function formatSet(reps: number, weight: number): string {
  return weight > 0 ? `${weight}×${reps}` : `${reps}`;
}

function IconButton({ icon, onPress, label, tint = 'rgba(255,255,255,0.75)' }: { icon: string; onPress: () => void; label: string; tint?: string }) {
  return (
    <PressScale onPress={onPress} accessibilityLabel={label} accessibilityRole="button" hitSlop={6}>
      <View
        style={{
          width: 40,
          height: 40,
          borderRadius: 12,
          backgroundColor: 'rgba(255,255,255,0.07)',
          borderWidth: 1,
          borderColor: 'rgba(255,255,255,0.12)',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <Icon name={icon} size={17} color={tint} />
      </View>
    </PressScale>
  );
}

interface PickerTarget {
  kind: PickerKind;
  exIdx: number;
  setIdx: number;
}

export interface FullPlayerProps {
  visible: boolean;
  onMinimize: () => void;
  /** One-line reason for today's numbers, filled by the adaptive engine in V2 PHASE 7. */
  reason?: string | null;
}

/** The full-screen set-row player (V2 PHASE 2.3). One tap on Done logs a set that went as planned. */
export function FullPlayer({ visible, onMinimize, reason }: FullPlayerProps) {
  useRenderCount('FullPlayer');
  const insets = useSafeAreaInsets();
  const reduced = useReducedMotion();
  const {
    status,
    workout,
    dayIndex,
    exerciseIndex,
    setIndex,
    plan,
    lastTime,
    forms,
    lastTimeLoaded,
    clock,
    isPaused,
    togglePause,
    updateSetRow,
    logSet,
    skipExercise,
    goToExercise,
    previousExercise,
    endSession,
  } = useWorkoutSession();
  useSetLatency(`${exerciseIndex}:${setIndex}`);

  const [picker, setPicker] = useState<PickerTarget | null>(null);
  const [listOpen, setListOpen] = useState(false);
  const [guideName, setGuideName] = useState<string | null>(null);
  const [rir, setRir] = useState<number | null>(null);
  const translateX = useSharedValue(0);

  const onSwipeLeft = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
    skipExercise();
  };
  const onSwipeRight = () => {
    if (exerciseIndex === 0) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
    previousExercise();
  };

  const swipe = Gesture.Pan()
    .activeOffsetX([-24, 24])
    .failOffsetY([-14, 14])
    .onUpdate((e) => {
      if (!reduced) translateX.set(e.translationX * 0.55);
    })
    .onEnd((e) => {
      if (e.translationX < -SWIPE_DISTANCE || e.velocityX < -SWIPE_VELOCITY) scheduleOnRN(onSwipeLeft);
      else if (e.translationX > SWIPE_DISTANCE || e.velocityX > SWIPE_VELOCITY) scheduleOnRN(onSwipeRight);
      translateX.set(withSpring(0, { duration: 400, dampingRatio: 0.8, velocity: e.velocityX }));
    });

  const contentStyle = useAnimatedStyle(() => ({ transform: [{ translateX: translateX.get() }] }));

  const today = workout?.plan.days[dayIndex];
  const exercises = today?.exercises ?? [];
  const exercise = exercises[exerciseIndex];
  const state = plan[exerciseIndex];
  if (!workout || !today || !exercise || !state) return null;

  const currentRow = setIndex >= 0 ? state.rows[setIndex] : null;
  const exerciseDone = isExerciseComplete(state);
  const upNextIdx = nextExerciseWithWork(plan, exerciseIndex);
  const upNext = upNextIdx >= 0 && upNextIdx !== exerciseIndex ? exercises[upNextIdx] : null;
  const upNextRow = upNextIdx >= 0 ? plan[upNextIdx]?.rows[Math.max(0, currentSetIndex(plan[upNextIdx]))] : null;

  const onDone = () => {
    if (!currentRow) return;
    markSetTap();
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
    logSet(undefined, undefined, rir);
    setRir(null);
  };

  const onRowCheck = (s: number) => {
    markSetTap();
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
    logSet(exerciseIndex, s, s === setIndex ? rir : null);
    if (s === setIndex) setRir(null);
  };

  const pickerRow = picker ? plan[picker.exIdx]?.rows[picker.setIdx] : null;
  const pickerLast = picker ? lastFor(lastTime, exercises[picker.exIdx]?.name ?? '', picker.setIdx) : null;

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onMinimize} statusBarTranslucent>
      <GestureHandlerRootView style={{ flex: 1, backgroundColor: '#050505' }}>
        <View style={{ flex: 1, paddingTop: insets.top + 8 }}>
          {/* Header */}
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 16 }}>
            <IconButton icon="chevron-down" label="Minimize player" onPress={onMinimize} />
            <View style={{ flex: 1, minWidth: 0 }}>
              <Text numberOfLines={1} style={{ color: '#A1A1AA', fontSize: 12, fontWeight: '700', fontFamily: FONT }}>
                {today.focus} · {exerciseIndex + 1} of {exercises.length}
              </Text>
              {clock && !isPaused ? (
                <ElapsedClock clock={clock} style={{ color: '#fff', fontSize: 15, fontWeight: '800', fontFamily: FONT }} />
              ) : (
                <Text style={{ color: COLORS.amber, fontSize: 15, fontWeight: '800', fontFamily: FONT }}>Paused</Text>
              )}
            </View>
            <IconButton icon={isPaused ? 'play' : 'pause'} label={isPaused ? 'Resume' : 'Pause'} onPress={togglePause} />
            <IconButton icon="layout-grid" label="All exercises" onPress={() => setListOpen(true)} />
            <IconButton icon="x" label="End workout" onPress={endSession} tint="rgba(255,255,255,0.5)" />
          </View>

          {status === 'resting' ? (
            <View style={{ flex: 1, paddingBottom: Math.max(insets.bottom, 16) + 8 }}>
              <RestView onDemo={setGuideName} />
            </View>
          ) : (
          <>
          <GestureDetector gesture={swipe}>
            <Animated.View style={[{ flex: 1 }, contentStyle]}>
              <ScrollView contentContainerStyle={{ paddingHorizontal: 16, paddingTop: 18, paddingBottom: 24, gap: 14 }}>
                <View>
                  <Text style={{ color: '#fff', fontSize: 26, fontWeight: '900', letterSpacing: -0.5, fontFamily: FONT }}>{exercise.name}</Text>
                  {reason ? (
                    <Text style={{ color: A, fontSize: 12.5, fontWeight: '600', marginTop: 4, fontFamily: FONT }}>{reason}</Text>
                  ) : null}
                </View>

                <FormStrip
                  form={forms[exercise.name]}
                  setIndex={Math.max(0, setIndex)}
                  expanded={lastTimeLoaded && !lastTime[exercise.name]}
                  onDemo={() => setGuideName(exercise.name)}
                />

                {/* Set rows */}
                <View style={{ backgroundColor: '#111113', borderRadius: 16, borderWidth: 1, borderColor: 'rgba(255,255,255,0.08)', overflow: 'hidden' }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', paddingHorizontal: 12, paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.06)' }}>
                    {['SET', 'LAST', 'KG', 'REPS'].map((h, i) => (
                      <Text
                        key={h}
                        style={{ flex: i === 0 ? 0.6 : 1, color: '#52525B', fontSize: 10, fontWeight: '800', letterSpacing: 0.7, textAlign: i === 0 ? 'left' : 'center', fontFamily: FONT }}
                      >
                        {h}
                      </Text>
                    ))}
                    <View style={{ width: 44 }} />
                  </View>
                  {state.rows.map((row, s) => {
                    const isCurrent = s === setIndex;
                    const last = lastFor(lastTime, exercise.name, s);
                    const valueCell = (kind: PickerKind, text: string) => (
                      <Pressable
                        disabled={row.done}
                        onPress={() => setPicker({ kind, exIdx: exerciseIndex, setIdx: s })}
                        accessibilityRole="button"
                        accessibilityLabel={`${kind === 'kg' ? 'Weight' : 'Reps'} for set ${s + 1}: ${text}`}
                        hitSlop={4}
                        style={{ flex: 1, alignItems: 'center' }}
                      >
                        <View
                          style={{
                            minWidth: 64,
                            paddingVertical: 8,
                            borderRadius: 10,
                            alignItems: 'center',
                            backgroundColor: row.done ? 'transparent' : isCurrent ? 'rgba(59,130,246,0.14)' : 'rgba(255,255,255,0.05)',
                          }}
                        >
                          <Text style={{ color: row.done ? '#71717A' : '#fff', fontSize: 17, fontWeight: '800', fontFamily: FONT }}>{text}</Text>
                        </View>
                      </Pressable>
                    );
                    return (
                      <View
                        key={s}
                        style={{
                          flexDirection: 'row',
                          alignItems: 'center',
                          paddingHorizontal: 12,
                          paddingVertical: 8,
                          backgroundColor: isCurrent ? 'rgba(59,130,246,0.06)' : 'transparent',
                          borderTopWidth: s === 0 ? 0 : 1,
                          borderTopColor: 'rgba(255,255,255,0.05)',
                        }}
                      >
                        <Text style={{ flex: 0.6, color: isCurrent ? A : '#A1A1AA', fontSize: 15, fontWeight: '800', fontFamily: FONT }}>{s + 1}</Text>
                        <Text style={{ flex: 1, color: '#71717A', fontSize: 13, textAlign: 'center', fontFamily: FONT }}>{last ? formatSet(last.reps, last.weight) : '—'}</Text>
                        {valueCell('kg', row.weight > 0 ? `${row.weight}` : '—')}
                        {valueCell('reps', `${row.reps}`)}
                        <PressScale
                          disabled={row.done}
                          onPress={() => onRowCheck(s)}
                          accessibilityRole="button"
                          accessibilityLabel={row.done ? `Set ${s + 1} logged` : `Log set ${s + 1}`}
                          hitSlop={6}
                        >
                          <View
                            style={{
                              width: 36,
                              height: 36,
                              marginLeft: 8,
                              borderRadius: 18,
                              alignItems: 'center',
                              justifyContent: 'center',
                              backgroundColor: row.done ? COLORS.green : 'transparent',
                              borderWidth: row.done ? 0 : 1.5,
                              borderColor: isCurrent ? A : 'rgba(255,255,255,0.2)',
                            }}
                          >
                            <Icon name="check" size={17} color={row.done ? '#050505' : isCurrent ? A : 'rgba(255,255,255,0.35)'} strokeWidth={3} />
                          </View>
                        </PressScale>
                      </View>
                    );
                  })}
                </View>

                {RIR_CHIP_ENABLED ? (
                  <View style={{ gap: 6 }}>
                    <Text style={{ color: '#71717A', fontSize: 11, fontFamily: FONT }}>Reps left in the tank · optional</Text>
                    <View style={{ flexDirection: 'row', gap: 8 }}>
                      {['0', '1', '2', '3+'].map((v, i) => (
                        <PressScale
                          key={v}
                          style={{ flex: 1 }}
                          onPress={() => {
                            Haptics.selectionAsync().catch(() => {});
                            setRir((cur) => (cur === i ? null : i));
                          }}
                          accessibilityRole="button"
                          accessibilityLabel={`${v} reps left in the tank`}
                          accessibilityState={{ selected: rir === i }}
                        >
                          <View style={{ height: 44, borderRadius: 12, backgroundColor: rir === i ? A : 'rgba(255,255,255,0.06)', alignItems: 'center', justifyContent: 'center' }}>
                            <Text style={{ color: '#fff', fontWeight: '700', fontFamily: FONT }}>{v}</Text>
                          </View>
                        </PressScale>
                      ))}
                    </View>
                  </View>
                ) : null}

                {upNext ? (
                  <PressScale onPress={() => goToExercise(upNextIdx)} accessibilityRole="button" accessibilityLabel={`Up next: ${upNext.name}`}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 14, paddingVertical: 12, borderRadius: 14, backgroundColor: '#111113', borderWidth: 1, borderColor: 'rgba(255,255,255,0.08)' }}>
                      <Text style={{ color: '#52525B', fontSize: 10, fontWeight: '800', letterSpacing: 0.7, fontFamily: FONT }}>UP NEXT</Text>
                      <Text numberOfLines={1} style={{ flex: 1, color: '#fff', fontSize: 13.5, fontWeight: '700', fontFamily: FONT }}>
                        {upNext.name}
                      </Text>
                      {upNextRow ? (
                        <Text style={{ color: '#A1A1AA', fontSize: 12.5, fontFamily: FONT }}>
                          {upNextRow.weight > 0 ? `${upNextRow.weight} × ${upNextRow.reps}` : `${upNext.sets} × ${upNextRow.reps}`}
                        </Text>
                      ) : null}
                    </View>
                  </PressScale>
                ) : null}
              </ScrollView>
            </Animated.View>
          </GestureDetector>

          {/* Primary action */}
          <View style={{ paddingHorizontal: 16, paddingTop: 8, paddingBottom: Math.max(insets.bottom, 16) + 4, gap: 8 }}>
            {currentRow ? (
              <PressScale onPress={onDone} accessibilityRole="button" accessibilityLabel={`Done, ${currentRow.reps} reps${currentRow.weight > 0 ? ` at ${currentRow.weight} kilograms` : ''}`}>
                <View style={{ height: 64, borderRadius: 20, backgroundColor: A, alignItems: 'center', justifyContent: 'center', flexDirection: 'row', gap: 8 }}>
                  <Icon name="check" size={20} color="#fff" strokeWidth={3} />
                  <Text style={{ color: '#fff', fontSize: 18, fontWeight: '900', fontFamily: FONT }}>
                    Done · {currentRow.reps}
                    {currentRow.weight > 0 ? ` × ${currentRow.weight} kg` : ' reps'}
                  </Text>
                </View>
              </PressScale>
            ) : exerciseDone && upNextIdx >= 0 ? (
              <PressScale onPress={() => goToExercise(upNextIdx)} accessibilityRole="button">
                <View style={{ height: 64, borderRadius: 20, backgroundColor: 'rgba(255,255,255,0.08)', alignItems: 'center', justifyContent: 'center' }}>
                  <Text style={{ color: '#fff', fontSize: 16, fontWeight: '800', fontFamily: FONT }}>Next exercise</Text>
                </View>
              </PressScale>
            ) : null}
            <Text style={{ color: '#52525B', fontSize: 11, textAlign: 'center', fontFamily: FONT }}>Tap a number to change it · swipe left to skip, right to go back</Text>
          </View>
          </>
          )}
        </View>

        {picker && pickerRow ? (
          <ValuePickerSheet
            kind={picker.kind}
            title={`${picker.kind === 'kg' ? 'Weight' : 'Reps'} · set ${picker.setIdx + 1}`}
            value={picker.kind === 'kg' ? pickerRow.weight : pickerRow.reps}
            prescribed={picker.kind === 'kg' ? pickerRow.prescribedWeight : exercises[picker.exIdx]?.reps ?? pickerRow.reps}
            last={pickerLast ? (picker.kind === 'kg' ? pickerLast.weight : pickerLast.reps) : null}
            onPick={(v) => {
              updateSetRow(picker.exIdx, picker.setIdx, picker.kind === 'kg' ? { weight: v } : { reps: Math.round(v) });
              setPicker(null);
            }}
            onClose={() => setPicker(null)}
          />
        ) : null}

        {guideName && forms[guideName] ? (
          <ExerciseGuideSheet name={guideName} form={forms[guideName]} onClose={() => setGuideName(null)} />
        ) : null}

        {listOpen ? (
          <Modal visible transparent animationType="fade" onRequestClose={() => setListOpen(false)} statusBarTranslucent>
            <Pressable onPress={() => setListOpen(false)} style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'flex-end' }}>
              <Pressable onPress={() => {}} style={{ backgroundColor: COLORS.card, borderTopLeftRadius: 22, borderTopRightRadius: 22, padding: 16, paddingBottom: 28, gap: 8, maxHeight: '75%' }}>
                <Text style={{ color: '#fff', fontSize: 15, fontWeight: '800', marginBottom: 4, fontFamily: FONT }}>Exercises</Text>
                <ScrollView contentContainerStyle={{ gap: 6 }}>
                  {exercises.map((ex, i) => {
                    const st = plan[i];
                    const done = st ? isExerciseComplete(st) : false;
                    const logged = st ? st.rows.filter((r) => r.done).length : 0;
                    return (
                      <PressScale
                        key={`${ex.name}-${i}`}
                        onPress={() => {
                          goToExercise(i);
                          setListOpen(false);
                        }}
                      >
                        <View
                          style={{
                            flexDirection: 'row',
                            alignItems: 'center',
                            gap: 10,
                            padding: 12,
                            borderRadius: 12,
                            backgroundColor: i === exerciseIndex ? 'rgba(59,130,246,0.14)' : 'rgba(255,255,255,0.04)',
                          }}
                        >
                          <Icon name={done ? 'check-circle-2' : st?.skipped ? 'skip-forward' : 'circle'} size={18} color={done ? COLORS.green : st?.skipped ? '#71717A' : '#A1A1AA'} />
                          <Text numberOfLines={1} style={{ flex: 1, color: '#fff', fontSize: 13.5, fontWeight: '700', fontFamily: FONT }}>
                            {ex.name}
                          </Text>
                          <Text style={{ color: '#71717A', fontSize: 12, fontFamily: FONT }}>
                            {st?.skipped ? 'Skipped' : `${logged}/${st?.rows.length ?? ex.sets}`}
                          </Text>
                        </View>
                      </PressScale>
                    );
                  })}
                </ScrollView>
              </Pressable>
            </Pressable>
          </Modal>
        ) : null}
      </GestureHandlerRootView>
    </Modal>
  );
}
