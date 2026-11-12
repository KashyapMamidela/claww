import React, { useState } from 'react';
import { EndWorkoutSheet } from './EndWorkoutSheet';
import { Modal, Pressable, ScrollView, Text, View } from 'react-native';
import * as Haptics from 'expo-haptics';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Gesture, GestureDetector, GestureHandlerRootView } from 'react-native-gesture-handler';
import Animated, { useAnimatedStyle, useReducedMotion, useSharedValue, withSpring } from 'react-native-reanimated';
import { scheduleOnRN } from 'react-native-worklets';
import { AREA_COLORS, COLORS, FONT, FONT_HAND, SURFACES, BG, bg } from '../../lib/theme';
import { useWorkoutSession } from '../../lib/workoutSession';
import {
  currentSetIndex,
  exerciseProgress,
  exerciseVolume,
  isExerciseComplete,
  lastFor,
  nextExerciseWithWork,
  repsText,
  rowHint,
  stepValue,
  tickTap,
} from '../../lib/sessionPlan';
import { markSetTap, useRenderCount, useSetLatency } from '../../lib/perf';
import { setDone } from '../../lib/haptics';
import { useAppState } from '../../lib/appState';
import { useProfile } from '../../lib/profile';
import { Icon } from '../ui/Icon';
import { PressScale } from '../ui/PressScale';
import { Button } from '../ui/Button';
import { BottomSheet } from '../ui/BottomSheet';
import { Stepper } from '../ui/Stepper';
import { TickButton } from '../ui/TickButton';
import { ElapsedClock, KcalText } from './clocks';
import { TargetCard } from './TargetCard';
import { SwapSheet } from './SwapSheet';
import { TimedBlock } from './TimedBlock';
import { isTimedModality, targetMinutes, usesDistance } from '../../lib/timedExercise';
import { Chip } from '../ui/Chip';
import { isBarbellLift, targetDiffers, warmupSets } from '../../lib/plateMath';
import { RestSheet } from './RestView';
import { FormStrip } from './FormStrip';
import { ExerciseGuideSheet } from '../ExerciseGuideSheet';
import { ValuePickerSheet, type PickerKind } from './ValuePickerSheet';

// The live player, v3 layout (NG PHASE 3.1, screen 07). Ticking the current set's row logs it
// exactly as planned; the bottom sheet's steppers change the current set first, then Done
// logs it. Swipe left to skip an exercise, right to go back (kept from V2 2.3).

const A = COLORS.blue;
/** V2 PHASE 6.3: optional reps-left-in-the-tank chip, saved with the set for the engine. */
const RIR_CHIP_ENABLED = true;
const SWIPE_DISTANCE = 90;
const SWIPE_VELOCITY = 800;
const DEFAULT_KG_STEP = 2.5;

function setText(weight: number, reps: string): string {
  return weight > 0 ? `${weight} kg × ${reps}` : `${reps} reps`;
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

/** 150 → "2:30", 45 → "45 s". */
function restText(sec: number): string {
  return sec >= 60 ? `${Math.floor(sec / 60)}:${String(sec % 60).padStart(2, '0')}` : `${sec} s`;
}

export function FullPlayer({ visible, onMinimize, reason }: FullPlayerProps) {
  useRenderCount('FullPlayer');
  const insets = useSafeAreaInsets();
  const reduced = useReducedMotion();
  const { userId } = useAppState();
  const { profile } = useProfile(userId);
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
    prescriptionFor,
    restSecondsForExercise,
    swapExercise,
    modalityFor,
    logTimedExercise,
  } = useWorkoutSession();
  useSetLatency(`${exerciseIndex}:${setIndex}`);

  const [picker, setPicker] = useState<PickerTarget | null>(null);
  const [listOpen, setListOpen] = useState(false);
  const [endOpen, setEndOpen] = useState(false);
  const [guideName, setGuideName] = useState<string | null>(null);
  const [swapOpen, setSwapOpen] = useState(false);
  const [moreOpen, setMoreOpen] = useState(false);
  const [rir, setRir] = useState<number | null>(null);
  // Warm-up ticks are only a reminder for the lifter: they are never logged as work sets.
  const [warmDone, setWarmDone] = useState<Record<string, boolean[]>>({});
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

  const rx = prescriptionFor(exercise.name);
  const repMin = rx?.repMin ?? null;
  const repMax = rx?.repMax ?? null;
  const kgStep = rx?.incrementKg && rx.incrementKg > 0 ? rx.incrementKg : DEFAULT_KG_STEP;
  const muscle = forms[exercise.name]?.primaryMuscle ?? null;
  const plannedReps = repsText(exercise.reps, repMin, repMax);
  // NG PHASE 3.6: cardio, yoga and mobility are done against a clock, not in sets of reps.
  const modality = modalityFor(exercise.name);
  const timed = isTimedModality(modality);
  const timedTarget = timed ? targetMinutes(modality, exercise.sets, exercise.reps) : 0;
  const metaLine = timed
    ? [muscle, `${timedTarget} min`, modality === 'cardio' ? 'cardio' : modality].filter(Boolean).join(' · ')
    : [muscle ? muscle.charAt(0).toUpperCase() + muscle.slice(1) : null, `${state.rows.length} × ${plannedReps}`, `${restText(restSecondsForExercise(exercise.name))} rest`].filter(Boolean).join(' · ');
  const barbell = isBarbellLift(exercise.name);
  const barKg = profile?.bar_weight_kg && profile.bar_weight_kg > 0 ? profile.bar_weight_kg : 20;
  const markShown = !!rx && targetDiffers(rx.planWeightKg, rx.todayWeightKg);
  // The pen mark carries the engine's reason; without a mark, the reason stays as a line under the meta.
  const reasonLine = markShown ? null : reason || rx?.reason || null;
  const workDoneAny = state.rows.some((r) => r.done);
  const firstWorkKg = state.rows[0]?.weight ?? 0;
  const warmups = rx?.role === 'main' && !workDoneAny && !state.skipped ? warmupSets(firstWorkKg, barbell ? barKg : 0) : [];
  const warmTicks = warmDone[exercise.name] ?? [];

  const currentRow = setIndex >= 0 ? state.rows[setIndex] : null;
  const exerciseDone = isExerciseComplete(state);
  const upNextIdx = nextExerciseWithWork(plan, exerciseIndex);
  const upNext = upNextIdx >= 0 && upNextIdx !== exerciseIndex ? exercises[upNextIdx] : null;
  const upNextRow = upNextIdx >= 0 ? plan[upNextIdx]?.rows[Math.max(0, currentSetIndex(plan[upNextIdx]))] : null;
  const showKgStepper = !!currentRow && (currentRow.weight > 0 || currentRow.prescribedWeight > 0 || (rx?.incrementKg ?? 0) > 0);

  const logCurrent = () => {
    if (!currentRow) return;
    markSetTap();
    setDone();
    logSet(undefined, undefined, rir);
    setRir(null);
  };

  // Screen 07: a tick logs that row exactly as planned, current row only (lib/sessionPlan.ts tickTap).
  const onTick = (s: number) => {
    if (tickTap(plan, exerciseIndex, s) !== 'log') return;
    logCurrent();
  };

  const pickerRow = picker ? plan[picker.exIdx]?.rows[picker.setIdx] : null;
  const pickerLast = picker ? lastFor(lastTime, exercises[picker.exIdx]?.name ?? '', picker.setIdx) : null;

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onMinimize} statusBarTranslucent>
      <GestureHandlerRootView style={{ flex: 1, backgroundColor: COLORS.bg }}>
        <View style={{ flex: 1, paddingTop: insets.top + 6 }}>
          {/* Header: close, session, exercise n of N with the elapsed clock, kcal, and the exercise list */}
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 10 }}>
            <PressScale onPress={onMinimize} accessibilityRole="button" accessibilityLabel="Close the player (the workout keeps running)">
              <View style={{ width: 44, height: 44, alignItems: 'center', justifyContent: 'center' }}>
                <Icon name="x" size={22} color={COLORS.fgGray} strokeWidth={2} />
              </View>
            </PressScale>
            <View style={{ flex: 1, minWidth: 0 }}>
              <Text numberOfLines={1} style={{ color: COLORS.fg, fontSize: 17, fontFamily: BG[800] }}>
                {today.focus || today.day}
              </Text>
              <View style={{ flexDirection: 'row' }}>
                <Text style={{ color: COLORS.textMuted, fontSize: 13, fontFamily: BG[400] }}>
                  Exercise {exerciseIndex + 1} of {exercises.length} ·{' '}
                </Text>
                {clock && !isPaused ? (
                  <ElapsedClock clock={clock} style={{ color: COLORS.textMuted, fontSize: 13, fontFamily: BG[400], fontVariant: ['tabular-nums'] }} />
                ) : (
                  <Text style={{ color: COLORS.amber, fontSize: 13, fontFamily: BG[700] }}>Paused</Text>
                )}
              </View>
            </View>
            {clock ? (
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 10, height: 34, borderRadius: 12, borderWidth: 1, borderColor: COLORS.blueBorder, backgroundColor: COLORS.blueDim }}>
                <Icon name="flame" size={14} color="#93C5FD" />
                <KcalText clock={clock} weightKg={profile?.weight ?? null} style={{ color: '#93C5FD', fontSize: 13, fontFamily: BG[800], fontVariant: ['tabular-nums'] }} />
              </View>
            ) : null}
            <PressScale onPress={() => setListOpen(true)} accessibilityRole="button" accessibilityLabel="All exercises, pause or end the workout">
              <View style={{ width: 44, height: 44, alignItems: 'center', justifyContent: 'center' }}>
                <Icon name="layout-grid" size={19} color={COLORS.fgGray} />
              </View>
            </PressScale>
          </View>

          {/* Segmented progress, one segment per exercise */}
          <View style={{ flexDirection: 'row', gap: 4, paddingHorizontal: 16, marginTop: 8 }} accessibilityLabel={`Exercise ${exerciseIndex + 1} of ${exercises.length}`}>
            {exercises.map((ex, i) => (
              <View key={`${ex.name}-${i}`} style={{ flex: 1, height: 4, borderRadius: 2, backgroundColor: 'rgba(255,255,255,0.10)', overflow: 'hidden' }}>
                <View style={{ width: `${Math.round(exerciseProgress(plan[i]) * 100)}%`, height: '100%', backgroundColor: A }} />
              </View>
            ))}
          </View>

          {/* NG PHASE 3.2: rest no longer replaces the screen; the rows stay and the sheet shows the rest. */}
          <>
              <GestureDetector gesture={swipe}>
                <Animated.View style={[{ flex: 1 }, contentStyle]}>
                  <ScrollView contentContainerStyle={{ paddingHorizontal: 16, paddingTop: 20, paddingBottom: 24, gap: 12 }}>
                    <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 8 }}>
                      <View style={{ flex: 1 }}>
                        <Text style={{ color: COLORS.fg, fontSize: 28, fontVariant: ['tabular-nums'], letterSpacing: -0.6, lineHeight: 32, fontFamily: BG[800] }}>{exercise.name}</Text>
                        <Text style={{ color: COLORS.textMuted, fontSize: 13, marginTop: 4, fontFamily: BG[400] }}>{metaLine}</Text>
                        {reasonLine ? <Text style={{ color: COLORS.fg, fontSize: 20, lineHeight: 24, marginTop: 6, fontFamily: FONT_HAND, fontWeight: '700' }}>{reasonLine}</Text> : null}
                      </View>
                      {/* Premium X5: How to, Swap and editing the numbers sit behind one button so the screen has one job. */}
                      <PressScale onPress={() => setMoreOpen(true)} accessibilityRole="button" accessibilityLabel="More for this exercise: how to, swap, change numbers" hitSlop={4}>
                        <View style={{ width: 44, height: 44, borderRadius: 14, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(255,255,255,0.07)' }}>
                          <Icon name="more-horizontal" size={20} color={COLORS.fgGray} />
                        </View>
                      </PressScale>
                    </View>

                    {timed ? (
                      state.rows.every((r) => r.done) ? null : (
                        <TimedBlock
                          key={`${exerciseIndex}-${exercise.name}`}
                          exerciseName={exercise.name}
                          targetMinutes={timedTarget}
                          withDistance={usesDistance(exercise.name)}
                          onDone={(input) => logTimedExercise(exerciseIndex, input)}
                        />
                      )
                    ) : (
                      <>
                    {currentRow || markShown ? (
                      <TargetCard
                        currentKg={currentRow?.weight ?? firstWorkKg}
                        planKg={rx?.planWeightKg ?? null}
                        todayKg={rx?.todayWeightKg ?? null}
                        note={rx?.pill ?? ''}
                        reason={reason || rx?.reason || ''}
                        barKg={barKg}
                        barbell={barbell}
                        onUsePlan={() => {
                          if (rx?.planWeightKg && setIndex >= 0) updateSetRow(exerciseIndex, setIndex, { weight: rx.planWeightKg });
                        }}
                      />
                    ) : null}


                    {/* Premium X5: the current set is the screen: its number is huge, everything else is a slim row. */}
                    {currentRow ? (
                      <View style={{ alignItems: 'center', gap: 6, paddingVertical: 8 }}>
                        <Text style={{ color: COLORS.textMuted, fontSize: 12, letterSpacing: 0.96, fontFamily: BG[800] }}>
                          SET {setIndex + 1} OF {state.rows.length}
                          {rowHint(currentRow, true, repMax) ? ` \u00b7 ${rowHint(currentRow, true, repMax)!.toUpperCase()}` : ''}
                        </Text>
                        <Pressable
                          onPress={() => setPicker({ kind: currentRow.weight > 0 ? 'kg' : 'reps', exIdx: exerciseIndex, setIdx: setIndex })}
                          accessibilityRole="button"
                          accessibilityLabel={`Set ${setIndex + 1}: ${setText(currentRow.weight, `${currentRow.reps}`)}. Change`}
                          style={{ minHeight: 64, justifyContent: 'center' }}
                        >
                          <Text style={{ color: COLORS.fg, fontSize: 52, lineHeight: 58, letterSpacing: -1.5, fontVariant: ['tabular-nums'], fontFamily: BG[800] }} numberOfLines={1} adjustsFontSizeToFit>
                            {currentRow.weight > 0 ? `${currentRow.weight}` : ''}
                            {currentRow.weight > 0 ? <Text style={{ color: COLORS.textMuted, fontSize: 24, fontWeight: '700' }}> kg  </Text> : null}
                            {currentRow.weight > 0 ? '\u00d7 ' : ''}
                            {currentRow.reps}
                            {currentRow.weight > 0 ? '' : <Text style={{ color: COLORS.textMuted, fontSize: 24, fontWeight: '700' }}> reps</Text>}
                          </Text>
                        </Pressable>
                      </View>
                    ) : null}

                    <View style={{ flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'center', gap: 8 }} accessibilityLabel={`${state.rows.filter((r) => r.done).length} of ${state.rows.length} sets done`}>
                      {warmups.map((w, i) => {
                        const done = !!warmTicks[i];
                        return (
                          <Pressable
                            key={`warm-${i}`}
                            onPress={() => setWarmDone((m) => ({ ...m, [exercise.name]: Object.assign([...(m[exercise.name] ?? [])], { [i]: true }) }))}
                            accessibilityRole="button"
                            accessibilityLabel={done ? `Warm-up ${i + 1} done` : `Mark warm-up ${i + 1} done, ${setText(w.weight, `${w.reps}`)}. Not logged as a work set`}
                            style={{ minHeight: 40, paddingHorizontal: 14, borderRadius: 20, flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: done ? 'rgba(255,255,255,0.04)' : 'rgba(255,255,255,0.08)', opacity: done ? 0.55 : 1 }}
                          >
                            {done ? <Icon name="check" size={13} color={COLORS.green} strokeWidth={3} /> : null}
                            <Text style={{ color: COLORS.fgGray, fontSize: 13, fontVariant: ['tabular-nums'], fontFamily: BG[700] }}>Warm-up {setText(w.weight, `${w.reps}`)}</Text>
                          </Pressable>
                        );
                      })}
                      {state.rows.map((row, s) => {
                        const isCurrent = s === setIndex;
                        return (
                          <Pressable
                            key={s}
                            disabled={row.done}
                            onPress={() => setPicker({ kind: row.weight > 0 ? 'kg' : 'reps', exIdx: exerciseIndex, setIdx: s })}
                            accessibilityRole="button"
                            accessibilityLabel={`Set ${s + 1}: ${setText(row.weight, row.done || isCurrent ? `${row.reps}` : plannedReps)}${row.done ? ', logged' : isCurrent ? ', now' : ''}`}
                            style={{
                              minHeight: 40,
                              minWidth: 40,
                              paddingHorizontal: 14,
                              borderRadius: 20,
                              alignItems: 'center',
                              justifyContent: 'center',
                              flexDirection: 'row',
                              gap: 6,
                              backgroundColor: row.done ? 'rgba(59,130,246,0.22)' : 'rgba(255,255,255,0.05)',
                              borderWidth: isCurrent ? 2 : 0,
                              borderColor: COLORS.blue,
                            }}
                          >
                            {row.done ? <Icon name="check" size={13} color="#93C5FD" strokeWidth={3} /> : null}
                            <Text style={{ color: row.done ? '#93C5FD' : isCurrent ? COLORS.fg : COLORS.textMuted, fontSize: 15, fontVariant: ['tabular-nums'], fontFamily: BG[800] }}>
                              {row.done ? setText(row.weight, `${row.reps}`) : `Set ${s + 1}`}
                            </Text>
                          </Pressable>
                        );
                      })}
                    </View>

                    {RIR_CHIP_ENABLED && currentRow ? (
                      <View style={{ gap: 6 }}>
                        <Text style={{ color: COLORS.textMuted, fontSize: 11, fontFamily: BG[400] }}>Reps left in the tank · optional</Text>
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
                                <Text style={{ color: COLORS.fg, fontFamily: BG[700] }}>{v}</Text>
                              </View>
                            </PressScale>
                          ))}
                        </View>
                      </View>
                    ) : null}
                      </>
                    )}

                    {upNext ? (
                      <PressScale onPress={() => goToExercise(upNextIdx)} accessibilityRole="button" accessibilityLabel={`Up next: ${upNext.name}`}>
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 14, minHeight: 48, borderRadius: 14, backgroundColor: SURFACES.cardBottom, borderWidth: 1, borderColor: COLORS.border }}>
                          <Text style={{ color: COLORS.textFaint, fontSize: 11, letterSpacing: 0.7, fontFamily: BG[800] }}>UP NEXT</Text>
                          <Text numberOfLines={1} style={{ flex: 1, color: COLORS.fg, fontSize: 15, fontFamily: BG[700] }}>
                            {upNext.name}
                          </Text>
                          {upNextRow ? (
                            <Text style={{ color: COLORS.fgGray, fontSize: 13, fontFamily: BG[400] }}>
                              {upNextRow.weight > 0 ? `${upNextRow.weight} kg × ${upNextRow.reps}` : `${upNext.sets} × ${repsText(upNext.reps, prescriptionFor(upNext.name)?.repMin ?? null, prescriptionFor(upNext.name)?.repMax ?? null)}`}
                            </Text>
                          ) : null}
                        </View>
                      </PressScale>
                    ) : null}
                  </ScrollView>
                </Animated.View>
              </GestureDetector>

              {/* Bottom sheet: the current set's steppers and Done, or "Exercise done" with Next */}
              {timed && !exerciseDone ? null : (
              <LinearGradient
                colors={[SURFACES.sheetTop, SURFACES.sheetBottom]}
                style={{
                  borderTopLeftRadius: 26,
                  borderTopRightRadius: 26,
                  borderTopWidth: 1,
                  borderColor: COLORS.border,
                  paddingHorizontal: 16,
                  paddingTop: 10,
                  paddingBottom: Math.max(insets.bottom, 16) + 4,
                  gap: 12,
                  boxShadow: '0px -10px 30px rgba(0,0,0,0.45)',
                }}
              >
                <View style={{ alignSelf: 'center', width: 40, height: 4, borderRadius: 2, backgroundColor: 'rgba(255,255,255,0.18)' }} />
                {status === 'resting' ? (
                  <RestSheet />
                ) : currentRow ? (
                  <>
                    <View style={{ flexDirection: 'row', gap: 10 }}>
                      {showKgStepper ? (
                        <View style={{ flex: 1 }}>
                          <Stepper
                            label="Weight"
                            value={`${currentRow.weight}`}
                            unit="kg"
                            onDecrement={() => updateSetRow(exerciseIndex, setIndex, { weight: stepValue(currentRow.weight, -1, kgStep) })}
                            onIncrement={() => updateSetRow(exerciseIndex, setIndex, { weight: stepValue(currentRow.weight, 1, kgStep) })}
                            decrementDisabled={currentRow.weight <= 0}
                          />
                        </View>
                      ) : null}
                      <View style={{ flex: 1 }}>
                        <Stepper
                          label="Reps"
                          value={`${currentRow.reps}`}
                          unit="reps"
                          onDecrement={() => updateSetRow(exerciseIndex, setIndex, { reps: stepValue(currentRow.reps, -1, 1, 1) })}
                          onIncrement={() => updateSetRow(exerciseIndex, setIndex, { reps: stepValue(currentRow.reps, 1, 1, 1) })}
                          decrementDisabled={currentRow.reps <= 1}
                        />
                      </View>
                    </View>
                    <Button size="lg" fullWidth accent={A} accentDeep={COLORS.blueDeep} onPress={logCurrent} icon={<Icon name="check" size={18} color="#fff" strokeWidth={3} />}>
                      {`Done · set ${setIndex + 1}`}
                    </Button>
                  </>
                ) : exerciseDone ? (
                  <>
                    <Text style={{ color: COLORS.fg, fontSize: 15, fontFamily: BG[800] }}>
                      Exercise done
                      <Text style={{ color: COLORS.textMuted, fontWeight: '600' }}>
                        {exerciseVolume(state) > 0 ? ` · ${exerciseVolume(state).toLocaleString('en-IN')} kg volume` : ` · ${state.rows.length} sets`}
                      </Text>
                    </Text>
                    {upNext ? (
                      <Button size="lg" fullWidth accent={A} accentDeep={COLORS.blueDeep} onPress={() => goToExercise(upNextIdx)} icon={<Icon name="chevron-right" size={18} color="#fff" strokeWidth={2.6} />}>
                        {`Next · ${upNext.name}`}
                      </Button>
                    ) : null}
                  </>
                ) : null}
              </LinearGradient>
              )}
          </>
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

        <BottomSheet visible={moreOpen} onClose={() => setMoreOpen(false)} maxHeightFraction={0.5}>
          <View style={{ paddingHorizontal: 20, paddingBottom: 12, gap: 8 }}>
            <Text style={{ color: COLORS.fg, fontSize: 22, fontFamily: BG[800], marginBottom: 6 }} numberOfLines={1}>{exercise.name}</Text>
            {forms[exercise.name] ? (
              <Button variant="secondary" size="lg" fullWidth accent={A} icon={<Icon name="play" size={14} color={A} />} onPress={() => { setMoreOpen(false); setGuideName(exercise.name); }}>
                How to do it
              </Button>
            ) : null}
            {!timed && !workDoneAny && !state.skipped ? (
              <Button variant="secondary" size="lg" fullWidth accent={A} icon={<Icon name="repeat" size={15} color={A} />} onPress={() => { setMoreOpen(false); setSwapOpen(true); }}>
                Swap, equipment taken
              </Button>
            ) : null}
            {currentRow ? (
              <Button variant="secondary" size="lg" fullWidth accent={A} icon={<Icon name="pencil" size={15} color={A} />} onPress={() => { setMoreOpen(false); setPicker({ kind: currentRow.weight > 0 ? 'kg' : 'reps', exIdx: exerciseIndex, setIdx: setIndex }); }}>
                Change the numbers
              </Button>
            ) : null}
          </View>
        </BottomSheet>
        <SwapSheet
          visible={swapOpen}
          exerciseName={exercise.name}
          todayNames={exercises.map((x) => x.name)}
          onClose={() => setSwapOpen(false)}
          onPick={(entry) => {
            setSwapOpen(false);
            setWarmDone((m) => {
              const { [exercise.name]: _dropped, ...rest } = m;
              return rest;
            });
            swapExercise(exerciseIndex, entry);
          }}
        />

        {guideName && forms[guideName] ? <ExerciseGuideSheet name={guideName} form={forms[guideName]} onClose={() => setGuideName(null)} /> : null}

        {listOpen ? (
          <Modal visible transparent animationType="fade" onRequestClose={() => setListOpen(false)} statusBarTranslucent>
            <Pressable onPress={() => setListOpen(false)} style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'flex-end' }}>
              <Pressable onPress={() => {}} style={{ backgroundColor: COLORS.card, borderTopLeftRadius: 22, borderTopRightRadius: 22, padding: 16, paddingBottom: 28, gap: 8, maxHeight: '80%' }}>
                <View style={{ flexDirection: 'row', gap: 8, marginBottom: 6 }}>
                  <View style={{ flex: 1 }}>
                    <Button
                      variant="secondary"
                      size="md"
                      fullWidth
                      accent={COLORS.amber}
                      onPress={() => {
                        togglePause();
                        setListOpen(false);
                      }}
                      icon={<Icon name={isPaused ? 'play' : 'pause'} size={16} color={COLORS.amber} />}
                    >
                      {isPaused ? 'Resume' : 'Pause'}
                    </Button>
                  </View>
                  <View style={{ flex: 1 }}>
                    <Button
                      variant="ghost"
                      size="md"
                      fullWidth
                      onPress={() => {
                        setListOpen(false);
                        setEndOpen(true);
                      }}
                      icon={<Icon name="x" size={16} color={COLORS.fgGray} />}
                    >
                      End workout
                    </Button>
                  </View>
                </View>
                <Text style={{ color: COLORS.fg, fontSize: 15, marginBottom: 4, fontFamily: BG[800] }}>Exercises</Text>
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
                        accessibilityRole="button"
                        accessibilityLabel={`${ex.name}, ${st?.skipped ? 'skipped' : `${logged} of ${st?.rows.length ?? ex.sets} sets`}`}
                      >
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, minHeight: 48, paddingHorizontal: 12, borderRadius: 12, backgroundColor: i === exerciseIndex ? 'rgba(59,130,246,0.14)' : 'rgba(255,255,255,0.04)' }}>
                          <Icon name={done ? 'check-circle-2' : st?.skipped ? 'skip-forward' : 'circle'} size={18} color={done ? COLORS.green : st?.skipped ? '#71717A' : '#A1A1AA'} />
                          <Text numberOfLines={1} style={{ flex: 1, color: COLORS.fg, fontSize: 15, fontFamily: BG[700] }}>
                            {ex.name}
                          </Text>
                          <Text style={{ color: COLORS.textMuted, fontSize: 13, fontFamily: BG[400] }}>{st?.skipped ? 'Skipped' : `${logged}/${st?.rows.length ?? ex.sets}`}</Text>
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
      <EndWorkoutSheet visible={endOpen} onClose={() => setEndOpen(false)} />
    </Modal>
  );
}
