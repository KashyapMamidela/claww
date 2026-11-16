import React, { useEffect, useRef, useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, { cancelAnimation, useAnimatedReaction, useAnimatedStyle, useSharedValue, withDecay, withDelay, withSpring, withTiming } from 'react-native-reanimated';
import { scheduleOnRN } from 'react-native-worklets';
import { COLORS, BG } from '../../lib/theme';
import { dialGrab, dialTick } from '../../lib/haptics';
import { dialTouching } from '../../lib/dialTouch';

// The set, as one big "62.5 × 8" and two rulers under it. Slide a ruler with your thumb, like the camera zoom dial: it
// ticks (a light haptic) at every mark and settles on the nearest one, and a flick coasts. The big numbers open the
// wheel when tapped. Sliding is horizontal inside the ruler only, so the rest of the player's swipes still work.

const BLUE = COLORS.blue;
const RULER_H = 74;
const SNAP = { duration: 260, dampingRatio: 1 };

interface RulerProps {
  label: string;
  value: number;
  min: number;
  max: number;
  /** Value change per tick. */
  step: number;
  /** A taller, labelled tick every this many ticks. */
  majorEvery: number;
  /** Pixels between two ticks. */
  spacing: number;
  /** The fastest a flick may coast, in ticks per second, so it stays controllable. */
  maxSpeed: number;
  /** Every mark passed, cheap: the dial's own numbers follow. */
  onLive: (v: number) => void;
  /** The ruler came to rest: the value is committed to the session once. */
  onSettle: (v: number) => void;
}

const round2 = (n: number) => Math.round(n * 100) / 100;

function Ruler({ label, value, min, max, step, majorEvery, spacing, maxSpeed, onLive, onSettle }: RulerProps) {
  const [width, setWidth] = useState(0);
  const minIdx = Math.round(min / step);
  const maxIdx = Math.round(max / step);
  const idxOf = (v: number) => Math.max(minIdx, Math.min(maxIdx, Math.round(v / step)));
  const pos = useSharedValue(idxOf(value)); // continuous index under the marker
  const startPos = useSharedValue(0);
  const dragging = useSharedValue(false);
  const lastIdx = useSharedValue(idxOf(value));

  // The value moved from outside (the picker, a "last time" tap): follow it. Our own echoes are ignored: they arrive a beat
  // late, and following them mid-coast would pull the ruler back.
  const emittedAt = useRef(0);
  const latest = useRef(idxOf(value));
  useEffect(() => {
    if (Date.now() - emittedAt.current < 450 || dragging.get()) return;
    lastIdx.set(idxOf(value));
    latest.current = idxOf(value);
    pos.set(withTiming(idxOf(value), { duration: 220 }));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value, step]);

  // Each mark: the haptic fires at once and only this small component updates. Committing to the session re-renders the
  // whole player (about 700 ms in a dev build), so that happens once, when the ruler comes to rest.
  const commit = (i: number) => {
    dialTick(i % majorEvery === 0);
    latest.current = i;
    emittedAt.current = Date.now();
    onLive(round2(i * step));
  };
  const settle = () => {
    emittedAt.current = Date.now();
    onSettle(round2(latest.current * step));
  };

  useAnimatedReaction(
    () => Math.round(pos.get()),
    (i, prev) => {
      if (prev === null || i === prev || i === lastIdx.get()) return;
      lastIdx.set(i);
      scheduleOnRN(commit, i);
    }
  );

  const pan = Gesture.Pan()
    .activeOffsetX([-6, 6])
    .failOffsetY([-18, 18])
    .onBegin(() => {
      dialTouching.set(1);
      cancelAnimation(pos);
      startPos.set(pos.get());
    })
    .onStart(() => {
      dragging.set(true);
      scheduleOnRN(dialGrab);
    })
    .onUpdate((e) => {
      pos.set(Math.max(minIdx, Math.min(maxIdx, startPos.get() - e.translationX / spacing)));
    })
    .onEnd((e) => {
      // Commit where the finger let go at once, so a quick Done tap can't log the old number; again when it comes to rest.
      scheduleOnRN(settle);
      pos.set(
        withDecay({ velocity: Math.max(-maxSpeed, Math.min(maxSpeed, -e.velocityX / spacing)), deceleration: 0.96, clamp: [minIdx, maxIdx] }, (fin) => {
          if (!fin) return;
          pos.set(
            withSpring(Math.round(pos.get()), SNAP, (fin2) => {
              if (fin2) scheduleOnRN(settle);
            })
          );
        })
      );
    })
    .onFinalize(() => {
      dragging.set(false);
      // Released a beat later, so the outer swipe, which ends in the same frame, still sees it.
      dialTouching.set(withDelay(250, withTiming(0, { duration: 0 })));
    });

  // Magnetic detents: the row is pulled toward the nearest mark, so it clicks from mark to mark instead of sliding.
  const rowStyle = useAnimatedStyle(() => {
    const p = pos.get();
    const r = Math.round(p);
    return { transform: [{ translateX: -(r + (p - r) * 0.4) * spacing }] };
  });

  // Built once: re-rendering a hundred tick views on every value change is what made the dial stall.
  const ticks = React.useMemo(() => {
    const out: React.ReactNode[] = [];
    for (let i = minIdx; i <= maxIdx; i++) {
      const major = i % majorEvery === 0;
      out.push(
      <View key={i} style={{ position: 'absolute', left: i * spacing - 1, top: 0, width: 2, alignItems: 'center' }}>
        <View style={{ marginTop: major ? 36 : 44, width: 2, height: major ? 24 : 14, borderRadius: 1, backgroundColor: major ? 'rgba(255,255,255,0.85)' : 'rgba(255,255,255,0.28)' }} />
        {major ? (
          <Text style={{ position: 'absolute', top: 14, width: 48, textAlign: 'center', color: COLORS.fgGray, fontSize: 13, fontFamily: BG[700], fontVariant: ['tabular-nums'] }}>{round2(i * step)}</Text>
        ) : null}
      </View>
    );
    }
    return out;
  }, [minIdx, maxIdx, majorEvery, spacing, step]);

  return (
    <GestureDetector gesture={pan}>
      <View
        onLayout={(e) => setWidth(e.nativeEvent.layout.width)}
        accessible
        accessibilityRole="adjustable"
        accessibilityLabel={label}
        accessibilityValue={{ text: `${value}` }}
        accessibilityActions={[{ name: 'increment' }, { name: 'decrement' }]}
        onAccessibilityAction={(e) => onSettle(round2(Math.max(min, Math.min(max, value + (e.nativeEvent.actionName === 'increment' ? step : -step)))))}
        style={{ height: RULER_H, borderRadius: 22, overflow: 'hidden', backgroundColor: 'rgba(255,255,255,0.05)', borderWidth: 1, borderColor: COLORS.border }}
      >
        {width > 0 ? (
          <Animated.View style={[{ position: 'absolute', left: width / 2, top: 0, bottom: 0, width: 1 }, rowStyle]}>{ticks}</Animated.View>
        ) : null}
        <LinearGradient pointerEvents="none" colors={['rgba(18,18,20,0.95)', 'rgba(18,18,20,0)']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={{ position: 'absolute', left: 0, top: 0, bottom: 0, width: 56 }} />
        <LinearGradient pointerEvents="none" colors={['rgba(18,18,20,0)', 'rgba(18,18,20,0.95)']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={{ position: 'absolute', right: 0, top: 0, bottom: 0, width: 56 }} />
        <Text pointerEvents="none" style={{ position: 'absolute', left: 14, top: 8, color: COLORS.textMuted, fontSize: 12, letterSpacing: 0.6, fontFamily: BG[800] }}>
          {label.toUpperCase()}
        </Text>
        <View pointerEvents="none" style={{ position: 'absolute', left: '50%', marginLeft: -1.5, top: 8, bottom: 8, width: 3, borderRadius: 2, backgroundColor: BLUE }} />
      </View>
    </GestureDetector>
  );
}

export interface SetDialProps {
  /** Null hides the weight ruler (a bodyweight exercise). */
  weight: number | null;
  reps: number;
  /** Weight change per tick, the exercise's load step. */
  kgStep: number;
  onWeightChange: (v: number) => void;
  onRepsChange: (v: number) => void;
  onOpenWeight: () => void;
  onOpenReps: () => void;
}

export function SetDial({ weight, reps, kgStep, onWeightChange, onRepsChange, onOpenWeight, onOpenReps }: SetDialProps) {
  const major = Math.max(1, Math.round(10 / kgStep));
  // The numbers shown follow the rulers at once; the session hears about it when a ruler settles.
  const [liveW, setLiveW] = useState(weight);
  const [liveR, setLiveR] = useState(reps);
  useEffect(() => setLiveW(weight), [weight]);
  useEffect(() => setLiveR(reps), [reps]);
  return (
    <View style={{ gap: 14 }}>
      <View style={{ alignItems: 'center' }}>
        <View style={{ flexDirection: 'row', alignItems: 'baseline', justifyContent: 'center', gap: 10 }}>
          {weight !== null ? (
            <>
              <Pressable onPress={onOpenWeight} accessibilityRole="button" accessibilityLabel={`Weight ${liveW} kilograms. Open the wheel`} hitSlop={8}>
                <Text numberOfLines={1} style={{ color: COLORS.fg, fontSize: 64, lineHeight: 70, letterSpacing: -2, fontVariant: ['tabular-nums'], fontFamily: BG[800] }}>
                  {liveW !== null && liveW > 0 ? liveW : 0}
                </Text>
              </Pressable>
              <Text style={{ color: COLORS.textMuted, fontSize: 28, fontFamily: BG[600] }}>×</Text>
            </>
          ) : null}
          <Pressable onPress={onOpenReps} accessibilityRole="button" accessibilityLabel={`Reps ${liveR}. Open the wheel`} hitSlop={8}>
            <Text numberOfLines={1} style={{ color: COLORS.fg, fontSize: 64, lineHeight: 70, letterSpacing: -2, fontVariant: ['tabular-nums'], fontFamily: BG[800] }}>
              {liveR}
            </Text>
          </Pressable>
        </View>
        <Text style={{ color: COLORS.textMuted, fontSize: 15, fontFamily: BG[700], marginTop: 2 }}>{weight !== null ? 'kg · reps' : 'reps'}</Text>
      </View>
      {weight !== null ? <Ruler label="kg" value={liveW ?? weight} min={0} max={300} step={kgStep} majorEvery={major} spacing={kgStep >= 2.5 ? 22 : 18} maxSpeed={14} onLive={setLiveW} onSettle={onWeightChange} /> : null}
      <Ruler label="reps" value={liveR} min={1} max={40} step={1} majorEvery={5} spacing={40} maxSpeed={6} onLive={setLiveR} onSettle={onRepsChange} />
    </View>
  );
}

/** One dot per set: logged, now and still to do. Tapping a logged dot opens its numbers to fix them. */
export function SetDots({ rows, current, onPick }: { rows: { done: boolean }[]; current: number; onPick: (i: number) => void }) {
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }} accessibilityLabel={`${rows.filter((r) => r.done).length} of ${rows.length} sets done`}>
      {rows.map((r, i) => {
        const now = i === current;
        return (
          <Pressable key={i} onPress={() => onPick(i)} hitSlop={10} accessibilityRole="button" accessibilityLabel={`Set ${i + 1}${r.done ? ', logged' : now ? ', now' : ''}`}>
            <View style={{ width: now ? 26 : 14, height: 14, borderRadius: 7, backgroundColor: r.done ? BLUE : now ? 'transparent' : 'rgba(255,255,255,0.14)', borderWidth: now ? 2 : 0, borderColor: BLUE }} />
          </Pressable>
        );
      })}
    </View>
  );
}
