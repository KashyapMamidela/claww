import React, { useEffect, useRef, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import Svg, { Circle, Line, Path } from 'react-native-svg';
import Animated, {
  Easing,
  FadeIn,
  FadeInDown,
  FadeOut,
  Keyframe,
  ReduceMotion,
  useAnimatedProps,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withDelay,
  withSequence,
  withTiming,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { AREA_COLORS, COLORS, FONT_HAND, BG, tint } from '../../lib/theme';
import { goalsCrossed, goalsMet, mealMomentTitle, onMoment, proteinToGo, type GoalHit, type Moment } from '../../lib/moments';
import { loadDayGoals } from '../../lib/momentData';
import * as haptics from '../../lib/haptics';
import { ActivityLogo } from '../activity/ActivityLogo';
import { CountUp } from '../ui/CountUp';
import { Icon } from '../ui/Icon';
import { ProgressRing } from '../ui/ProgressRing';

// The finish moments. A PhonePe or GPay confirmation takes the whole screen for about two seconds, draws one shape and
// lands a haptic on the same frame; CLAWW does the same with its own shapes. A saved workout stamps a dumbbell (the same
// stamp as on the cards) after the session ring closes; a logged meal draws a tick inside the day's calorie ring; an
// activity stamps its own logo in gold. Goals the action reached land last as small chips, or the coach's pen writes one
// line. Tapping skips it (after the first 0.7 s, so it can't be dismissed before it lands); Reduce motion shows the end
// state at once.

const EASE = Easing.bezier(0.23, 1, 0.32, 1);
const AnimatedPath = Animated.createAnimatedComponent(Path);

const CHIP_IN = new Keyframe({
  0: { opacity: 0, transform: [{ scale: 0.85 }, { translateY: 6 }] },
  100: { opacity: 1, transform: [{ scale: 1 }, { translateY: 0 }], easing: EASE },
})
  .duration(240)
  .reduceMotion(ReduceMotion.System);

interface Look {
  color: string;
  ground: [string, string];
  ink: string;
}
const LOOK = {
  workout: { color: AREA_COLORS.workouts, ground: ['#0A1632', '#050508'], ink: '#fff' },
  meal: { color: AREA_COLORS.nutrition, ground: ['#04200F', '#050505'], ink: '#fff' },
  activity: { color: AREA_COLORS.activity, ground: ['#241803', '#050505'], ink: '#fff' },
} as const satisfies Record<string, Look>;

const LAND_MS = 760;
const n = (v: number) => Math.round(v).toLocaleString('en-IN');

/** Twelve short rays that fly outward once when the emblem lands. */
function Burst({ size, color, delay }: { size: number; color: string; delay: number }) {
  const t = useSharedValue(0);
  useEffect(() => {
    t.set(withDelay(delay, withTiming(1, { duration: 520, easing: EASE })));
  }, [delay, t]);
  const style = useAnimatedStyle(() => ({ opacity: t.get() === 0 ? 0 : (1 - t.get()) * 0.9, transform: [{ scale: 0.78 + t.get() * 0.5 }] }));
  const c = size / 2;
  return (
    <Animated.View pointerEvents="none" style={[{ position: 'absolute', width: size, height: size }, style]}>
      <Svg width={size} height={size}>
        {Array.from({ length: 12 }, (_, i) => {
          const a = (i / 12) * Math.PI * 2;
          const r1 = c * 0.82;
          const r2 = c * 0.96;
          return <Line key={i} x1={c + Math.cos(a) * r1} y1={c + Math.sin(a) * r1} x2={c + Math.cos(a) * r2} y2={c + Math.sin(a) * r2} stroke={color} strokeWidth={3} strokeLinecap="round" />;
        })}
      </Svg>
    </Animated.View>
  );
}

/** A tick that draws itself in 420 ms. */
function Tick({ size, delay, reduced }: { size: number; delay: number; reduced: boolean }) {
  const t = useSharedValue(reduced ? 1 : 0);
  useEffect(() => {
    if (!reduced) t.set(withDelay(delay, withTiming(1, { duration: 420, easing: EASE })));
  }, [delay, reduced, t]);
  const props = useAnimatedProps(() => ({ strokeDashoffset: 60 * (1 - t.get()) }));
  return (
    <Svg width={size} height={size} viewBox="0 0 64 64">
      <AnimatedPath d="M17 34 L28 45 L47 21" stroke="#fff" strokeWidth={7} strokeLinecap="round" strokeLinejoin="round" fill="none" strokeDasharray={[60, 60]} animatedProps={props} />
    </Svg>
  );
}

function Chip({ hit, delay, color }: { hit: GoalHit; delay: number; color: string }) {
  return (
    <Animated.View entering={CHIP_IN.delay(delay)} style={{ flexDirection: 'row', alignItems: 'center', gap: 6, minHeight: 36, paddingHorizontal: 14, borderRadius: 18, backgroundColor: tint(color, 0.16), borderWidth: 1, borderColor: tint(color, 0.55) }}>
      <Icon name="check" size={14} color={color} strokeWidth={3.2} />
      <Text style={{ color: '#fff', fontSize: 15, fontFamily: BG[700] }}>{hit.label}</Text>
    </Animated.View>
  );
}

function View_({ moment, onClose }: { moment: Moment; onClose: () => void }) {
  const insets = useSafeAreaInsets();
  const reduced = useReducedMotion();
  const look = LOOK[moment.kind];
  const color = look.color;
  const rise = (delay: number) => FadeInDown.delay(reduced ? 0 : delay).duration(reduced ? 0 : 320).reduceMotion(ReduceMotion.System);

  // What the moment says besides its own action: today's goals.
  const [goals, setGoals] = useState<GoalHit[] | null>(null);
  const [line, setLine] = useState<string | null>(moment.kind === 'workout' ? moment.line : null);
  const [kcalToday, setKcalToday] = useState<{ eaten: number; target: number | null } | null>(null);
  useEffect(() => {
    let cancelled = false;
    loadDayGoals(moment.userId)
      .then(({ totals, targets }) => {
        if (cancelled) return;
        if (moment.kind === 'meal') {
          const before = { ...totals, kcal: Math.max(0, totals.kcal - moment.kcal), proteinG: Math.max(0, totals.proteinG - moment.proteinG) };
          setGoals(goalsCrossed(before, totals, targets));
          setKcalToday({ eaten: totals.kcal, target: targets.kcal });
          setLine(proteinToGo(totals, targets));
        } else if (moment.kind === 'workout') {
          const hits: GoalHit[] = [];
          if (moment.setsPlanned > 0 && moment.setsDone >= moment.setsPlanned) hits.push({ key: 'sets', label: 'All sets done' });
          setGoals([...hits, ...goalsMet(totals, targets)].slice(0, 3));
        } else {
          setGoals(goalsMet(totals, targets).filter((g) => g.key === 'steps'));
        }
      })
      .catch(() => !cancelled && setGoals([]));
    return () => {
      cancelled = true;
    };
  }, [moment]);

  // The landing: one haptic on the frame the emblem lands, a tick for each goal chip, then the auto close.
  const total = moment.kind === 'workout' ? 3300 : moment.kind === 'activity' ? 2900 : 2500;
  const openedAt = useRef(Date.now()).current;
  useEffect(() => {
    const land = setTimeout(() => (moment.kind === 'workout' ? haptics.stamp() : haptics.success()), reduced ? 0 : LAND_MS);
    const close = setTimeout(onClose, reduced ? 1600 : total);
    return () => {
      clearTimeout(land);
      clearTimeout(close);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  const chipsBuzzed = useRef(false);
  useEffect(() => {
    if (!goals || goals.length === 0 || chipsBuzzed.current) return;
    chipsBuzzed.current = true;
    const t = setTimeout(haptics.tick, Math.max(0, 1500 - (Date.now() - openedAt)));
    return () => clearTimeout(t);
  }, [goals, openedAt]);

  // The emblem lands: scale 1.5 to 1 and fade in over 240 ms, with a one-frame flash.
  const land = useSharedValue(reduced ? 1 : 0);
  const flash = useSharedValue(0);
  useEffect(() => {
    if (reduced) return;
    land.set(withDelay(LAND_MS, withTiming(1, { duration: 240, easing: EASE })));
    flash.set(withDelay(LAND_MS, withSequence(withTiming(0.22, { duration: 60 }), withTiming(0, { duration: 340 }))));
  }, [reduced, land, flash]);
  const emblem = useAnimatedStyle(() => ({ opacity: land.get(), transform: [{ scale: 1.5 - land.get() * 0.5 }, { rotate: moment.kind === 'meal' ? '0deg' : `${-12 * land.get()}deg` }] }));
  const flashStyle = useAnimatedStyle(() => ({ opacity: flash.get() }));

  const ringPct =
    moment.kind === 'workout'
      ? moment.setsPlanned > 0
        ? Math.min(100, (moment.setsDone / moment.setsPlanned) * 100)
        : 100
      : moment.kind === 'meal'
      ? kcalToday && kcalToday.target
        ? Math.min(100, (kcalToday.eaten / kcalToday.target) * 100)
        : 0
      : 100;
  const RING = 208;

  const title = moment.kind === 'workout' ? moment.title : moment.kind === 'meal' ? mealMomentTitle(moment.mealType) : `${moment.name} done`;
  const bigValue = moment.kind === 'workout' ? moment.big : moment.kind === 'meal' ? moment.kcal : moment.minutes;
  const bigPrefix = moment.kind === 'meal' ? '+' : '';
  const bigUnit = moment.kind === 'workout' ? moment.bigLabel : moment.kind === 'meal' ? 'kcal' : 'min';
  const sub =
    moment.kind === 'workout'
      ? `${moment.setsDone} of ${moment.setsPlanned} sets · ${moment.minutes} min`
      : moment.kind === 'meal'
      ? kcalToday
        ? `${n(kcalToday.eaten)}${kcalToday.target ? ` of ${n(kcalToday.target)}` : ''} kcal today`
        : ' '
      : `${moment.kcal} kcal · counts toward recovery`;
  const countId = useRef(`moment.${moment.kind}.${Date.now()}`).current;

  return (
    <Animated.View entering={FadeIn.duration(reduced ? 0 : 180)} exiting={FadeOut.duration(reduced ? 0 : 220)} style={StyleSheet.absoluteFill}>
      <Pressable
        onPress={() => Date.now() - openedAt > 700 && onClose()}
        accessibilityRole="button"
        accessibilityLabel={`${title}. Tap to continue`}
        style={StyleSheet.absoluteFill}
      >
        <LinearGradient colors={[look.ground[0], look.ground[1]]} start={{ x: 0.5, y: 0 }} end={{ x: 0.5, y: 1 }} style={StyleSheet.absoluteFill} />
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', paddingTop: insets.top, paddingBottom: insets.bottom + 24, paddingHorizontal: 28, gap: 0 }}>
          <View style={{ width: RING, height: RING, alignItems: 'center', justifyContent: 'center' }}>
            <ProgressRing size={RING} rings={[{ r: RING / 2 - 12, strokeWidth: 12, color, pct: ringPct, track: tint(color, 0.14) }]} trackColor={tint(color, 0.14)}>
              <View />
            </ProgressRing>
            <Burst size={RING + 40} color={color} delay={reduced ? 100000 : LAND_MS} />
            <Animated.View style={[{ position: 'absolute', alignItems: 'center', justifyContent: 'center' }, emblem]}>
              {moment.kind === 'meal' ? (
                <View style={{ width: 112, height: 112, borderRadius: 56, alignItems: 'center', justifyContent: 'center', backgroundColor: color }}>
                  <Tick size={76} delay={LAND_MS + 120} reduced={reduced} />
                </View>
              ) : (
                <View style={{ width: 112, height: 112, borderRadius: 56, alignItems: 'center', justifyContent: 'center', backgroundColor: tint(color, 0.16), borderWidth: 2, borderColor: tint(color, 0.7) }}>
                  {moment.kind === 'workout' ? <Icon name="dumbbell" size={58} color="#fff" strokeWidth={1.8} /> : <ActivityLogo name={moment.name} size={58} color={color} strokeWidth={1.8} />}
                </View>
              )}
            </Animated.View>
            <Animated.View pointerEvents="none" style={[{ position: 'absolute', width: 112, height: 112, borderRadius: 56, backgroundColor: '#fff' }, flashStyle]} />
          </View>

          <Animated.Text entering={rise(900)} style={{ color: look.ink, fontSize: 30, letterSpacing: -0.6, textAlign: 'center', fontFamily: BG[800], marginTop: 30 }}>
            {title}
          </Animated.Text>

          <Animated.View entering={rise(1000)} style={{ flexDirection: 'row', alignItems: 'baseline', gap: 8, marginTop: 10 }}>
            <Text style={{ color: '#fff', fontSize: 52, lineHeight: 58, letterSpacing: -1.5, fontVariant: ['tabular-nums'], fontFamily: BG[800] }}>
              {bigPrefix}
              <CountUp id={countId} value={bigValue} duration={reduced ? 0 : 650} format={(v) => n(v)} textStyle={{ color: '#fff', fontSize: 52, lineHeight: 58, letterSpacing: -1.5, fontVariant: ['tabular-nums'], fontFamily: BG[800] }} />
            </Text>
            <Text style={{ color: tint(color, 0.95), fontSize: 20, fontFamily: BG[700] }}>{bigUnit}</Text>
          </Animated.View>

          <Animated.Text entering={rise(1100)} style={{ color: COLORS.textMuted, fontSize: 17, marginTop: 6, textAlign: 'center', fontFamily: BG[500] }}>
            {sub}
          </Animated.Text>

          <View style={{ minHeight: 84, marginTop: 26, alignItems: 'center', justifyContent: 'flex-start', gap: 10 }}>
            {goals && goals.length > 0 ? (
              <>
                <Animated.Text entering={rise(1400)} style={{ color: COLORS.textMuted, fontSize: 13, fontFamily: BG[700] }}>Goal hit</Animated.Text>
                <View style={{ flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', gap: 8 }}>
                  {goals.map((g, i) => (
                    <Chip key={g.key} hit={g} color={color} delay={reduced ? 0 : 1500 + i * 160} />
                  ))}
                </View>
              </>
            ) : goals && line ? (
              <Animated.Text entering={rise(1500)} style={{ color: '#fff', fontSize: 26, lineHeight: 30, textAlign: 'center', fontFamily: FONT_HAND, fontWeight: '700' }}>
                {line}
              </Animated.Text>
            ) : null}
          </View>
        </View>
        <Animated.Text entering={rise(1800)} style={{ position: 'absolute', bottom: insets.bottom + 16, alignSelf: 'center', color: COLORS.textFaint, fontSize: 13, fontFamily: BG[500] }}>
          Tap to continue
        </Animated.Text>
      </Pressable>
    </Animated.View>
  );
}

/** Mounted once at the root. Anything can call showMoment() (lib/moments.ts); a second moment replaces the first. */
export function MomentHost() {
  const [current, setCurrent] = useState<{ moment: Moment; id: number } | null>(null);
  const seq = useRef(0);
  useEffect(
    () =>
      onMoment((m) => {
        seq.current += 1;
        setCurrent({ moment: m, id: seq.current });
      }),
    []
  );
  if (!current) return null;
  const { moment, id } = current;
  return (
    <View pointerEvents="box-none" style={[StyleSheet.absoluteFill, { zIndex: 1000, elevation: 1000 }]}>
      <View_
        key={id}
        moment={moment}
        onClose={() => {
          setCurrent((c) => (c && c.id === id ? null : c));
          if (moment.kind === 'workout') moment.onDone?.();
        }}
      />
    </View>
  );
}
