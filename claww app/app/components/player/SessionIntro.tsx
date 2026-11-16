import React, { useEffect, useMemo, useRef, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Svg, { Circle } from 'react-native-svg';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Animated, { Easing, FadeIn, FadeInDown, FadeOut, Keyframe, ReduceMotion, useAnimatedProps, useAnimatedStyle, useReducedMotion, useSharedValue, withDelay, withRepeat, withTiming } from 'react-native-reanimated';
import { AREA_COLORS, COLORS, FONT_HAND, BG, tint } from '../../lib/theme';
import { pickQuote } from '../../lib/workoutQuotes';
import * as haptics from '../../lib/haptics';
import { Icon } from '../ui/Icon';
import { Button } from '../ui/Button';
import { BodyMap, MUSCLES, type Muscle } from '../BodyMap';

// Before the timer starts, three beats:
//  1. Loading: a ring fills while the real steps tick off (plan, last session's numbers, today's weights). It waits for
//     the numbers to actually arrive, with a short minimum so it never flashes.
//  2. Briefing: the muscles light up on the body map, today in three numbers and your coach's line. The first time
//     ever, a three-tip how-to shows too. Start (or a short wait) moves on.
//  3. 3, 2, 1, Go. The session clock only starts at Go (the player calls restartClock then).
// With Reduce motion on, the ring and the words are still and the beats are short.

const BLUE = AREA_COLORS.workouts;
const EASE = Easing.bezier(0.23, 1, 0.32, 1);
const COUNT_IN = new Keyframe({
  0: { opacity: 0, transform: [{ scale: 1.7 }] },
  100: { opacity: 1, transform: [{ scale: 1 }], easing: EASE },
})
  .duration(240)
  .reduceMotion(ReduceMotion.System);

const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);
const AnimatedCircle = Animated.createAnimatedComponent(Circle);
const TIPS_KEY = 'claww.playerTipsSeen';
const LOAD_MIN_MS = 1500;
const RING = 168;
const STROKE = 8;
const R = (RING - STROKE) / 2;
const CIRC = 2 * Math.PI * R;

type Beat = 'load' | 'brief' | 'count';

const STEPS = ["Reading today's plan", "Pulling up last time's numbers", 'Setting your weights'];
const TIPS: { icon: string; text: string }[] = [
  { icon: 'arrow-left-right', text: 'Slide the kg and reps rulers to dial a set' },
  { icon: 'check', text: 'Tap Done to log the set' },
  { icon: 'skip-forward', text: 'Swipe above the rulers to change exercise' },
];

function Ring({ delay, size }: { delay: number; size: number }) {
  const t = useSharedValue(0);
  useEffect(() => {
    t.set(withDelay(delay, withRepeat(withTiming(1, { duration: 2400, easing: Easing.out(Easing.quad) }), -1)));
  }, [delay, t]);
  const style = useAnimatedStyle(() => ({ opacity: (1 - t.get()) * 0.4, transform: [{ scale: 0.7 + t.get() * 0.9 }] }));
  return <Animated.View pointerEvents="none" style={[{ position: 'absolute', width: size, height: size, borderRadius: size / 2, borderWidth: 2, borderColor: BLUE }, style]} />;
}

function LoadRing({ progress, reduced }: { progress: number; reduced: boolean }) {
  const p = useSharedValue(0);
  const spin = useSharedValue(0);
  useEffect(() => {
    p.set(reduced ? progress : withTiming(progress, { duration: 380, easing: EASE }));
  }, [progress, reduced, p]);
  useEffect(() => {
    if (!reduced) spin.set(withRepeat(withTiming(1, { duration: 1800, easing: Easing.linear }), -1));
  }, [reduced, spin]);
  const arc = useAnimatedProps(() => ({ strokeDashoffset: CIRC * (1 - p.get()) }));
  const spinStyle = useAnimatedStyle(() => ({ transform: [{ rotate: `${spin.get() * 360}deg` }] }));
  return (
    <View style={{ width: RING, height: RING, alignItems: 'center', justifyContent: 'center' }}>
      {!reduced ? (
        <>
          <Ring delay={0} size={RING + 30} />
          <Ring delay={1200} size={RING + 30} />
        </>
      ) : null}
      <Svg width={RING} height={RING} style={{ position: 'absolute' }}>
        <Circle cx={RING / 2} cy={RING / 2} r={R} stroke="rgba(255,255,255,0.07)" strokeWidth={STROKE} fill="none" />
      </Svg>
      <Animated.View style={[{ position: 'absolute', width: RING, height: RING }, spinStyle]}>
        <Svg width={RING} height={RING}>
          <AnimatedCircle
            cx={RING / 2}
            cy={RING / 2}
            r={R}
            stroke={BLUE}
            strokeWidth={STROKE}
            strokeLinecap="round"
            fill="none"
            strokeDasharray={`${CIRC}`}
            animatedProps={arc}
            transform={`rotate(-90 ${RING / 2} ${RING / 2})`}
          />
        </Svg>
      </Animated.View>
      <Icon name="dumbbell" size={40} color="#fff" strokeWidth={2} />
    </View>
  );
}

function Stat({ value, label }: { value: string; label: string }) {
  return (
    <View style={{ flex: 1, alignItems: 'center', paddingVertical: 12, borderRadius: 18, backgroundColor: 'rgba(255,255,255,0.06)' }}>
      <Text style={{ color: '#fff', fontSize: 26, letterSpacing: -0.5, fontVariant: ['tabular-nums'], fontFamily: BG[800] }}>{value}</Text>
      <Text style={{ color: COLORS.textMuted, fontSize: 13, fontFamily: BG[600] }}>{label}</Text>
    </View>
  );
}

export interface SessionIntroStats {
  exercises: number;
  sets: number;
  minutes: number;
}

export interface SessionIntroProps {
  /** "Push B". */
  title: string;
  /** The plan day's focus, for choosing the line. */
  focus: string;
  /** The primary muscle of each exercise, as the catalog names them (unknown names are ignored). */
  muscles: (string | null | undefined)[];
  stats: SessionIntroStats;
  /** Last session's numbers have arrived, so the loading beat may end. */
  ready: boolean;
  onDone: () => void;
}

export function SessionIntro({ title, focus, muscles, stats, ready, onDone }: SessionIntroProps) {
  const insets = useSafeAreaInsets();
  const reduced = useReducedMotion();
  const quote = useRef(pickQuote(focus || title)).current;
  const words = useMemo(() => quote.split(' '), [quote]);
  const worked = useMemo(() => Array.from(new Set(muscles.filter((m): m is Muscle => !!m && (MUSCLES as string[]).includes(m)))), [muscles]);

  const [beat, setBeat] = useState<Beat>('load');
  const [step, setStep] = useState(0);
  const [minDone, setMinDone] = useState(false);
  const [lit, setLit] = useState(0);
  const [tips, setTips] = useState(false);
  const [count, setCount] = useState<number | null>(null);
  const finished = useRef(false);
  const counting = useRef(false);
  const timers = useRef<ReturnType<typeof setTimeout>[]>([]);
  const later = (fn: () => void, ms: number) => {
    timers.current.push(setTimeout(fn, ms));
  };

  const finish = () => {
    if (finished.current) return;
    finished.current = true;
    onDone();
  };

  // Beat 1: the steps tick one by one. It ends when they are all done, the minimum time has passed and the data is in.
  useEffect(() => {
    STEPS.forEach((_, i) =>
      later(() => {
        setStep(i + 1);
        haptics.tick();
      }, reduced ? 0 : 380 + i * 400)
    );
    later(() => setMinDone(true), reduced ? 300 : LOAD_MIN_MS);
    AsyncStorage.getItem(TIPS_KEY)
      .then((v) => setTips(v !== '1'))
      .catch(() => {});
    return () => timers.current.forEach(clearTimeout);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  useEffect(() => {
    if (beat === 'load' && minDone && ready && step >= STEPS.length) setBeat('brief');
  }, [beat, minDone, ready, step]);

  // Beat 3: 3, 2, 1, Go.
  const startCount = () => {
    if (counting.current) return;
    counting.current = true;
    timers.current.forEach(clearTimeout);
    timers.current = [];
    setBeat('count');
    if (tips) AsyncStorage.setItem(TIPS_KEY, '1').catch(() => {});
    if (reduced) {
      setCount(-1);
      haptics.stamp();
      later(finish, 250);
      return;
    }
    [3, 2, 1].forEach((n, i) =>
      later(() => {
        setCount(n);
        haptics.tick();
      }, i * 480)
    );
    later(() => {
      setCount(-1);
      haptics.stamp();
    }, 3 * 480);
    later(finish, 3 * 480 + 420);
  };

  // Beat 2: the muscles light up one by one, then the count starts by itself after the read.
  useEffect(() => {
    if (beat !== 'brief') return;
    if (reduced) setLit(worked.length);
    else {
      const id = setInterval(() => setLit((n) => (n >= worked.length ? n : n + 1)), 260);
      later(() => clearInterval(id), 260 * (worked.length + 1));
    }
    later(startCount, reduced ? 1800 : tips ? 7200 : 4400);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [beat]);

  const fade = (ms = 0) => FadeInDown.delay(reduced ? 0 : ms).duration(reduced ? 0 : 300).reduceMotion(ReduceMotion.System);

  return (
    <Animated.View entering={FadeIn.duration(reduced ? 0 : 200)} exiting={FadeOut.duration(reduced ? 0 : 260)} style={StyleSheet.absoluteFill}>
      <LinearGradient colors={['#0A1632', '#06080F', '#050508']} style={StyleSheet.absoluteFill} />
      <View style={{ flex: 1, alignItems: 'center', paddingTop: insets.top + 36, paddingBottom: insets.bottom + 24, paddingHorizontal: 24 }}>
        {beat === 'load' ? (
          <Animated.View key="load" exiting={FadeOut.duration(reduced ? 0 : 180)} style={{ flex: 1, alignItems: 'center', justifyContent: 'center', width: '100%' }}>
            <LoadRing progress={Math.min(1, step / STEPS.length)} reduced={reduced} />
            <Text style={{ color: '#fff', fontSize: 26, letterSpacing: -0.5, marginTop: 36, textAlign: 'center', fontFamily: BG[800] }}>{`Getting ${title} ready`}</Text>
            <View style={{ gap: 12, marginTop: 24, alignSelf: 'center' }}>
              {STEPS.map((t, i) => {
                const done = step > i;
                return (
                  <View key={t} style={{ flexDirection: 'row', alignItems: 'center', gap: 10, opacity: done ? 1 : 0.35 }}>
                    <View style={{ width: 22, height: 22, borderRadius: 11, alignItems: 'center', justifyContent: 'center', backgroundColor: done ? COLORS.green : 'rgba(255,255,255,0.12)' }}>
                      {done ? <Icon name="check" size={13} color="#fff" strokeWidth={3.2} /> : null}
                    </View>
                    <Text style={{ color: done ? '#fff' : COLORS.textMuted, fontSize: 16, fontFamily: BG[600] }}>{t}</Text>
                  </View>
                );
              })}
            </View>
          </Animated.View>
        ) : beat === 'brief' ? (
          <Animated.View key="brief" entering={FadeIn.duration(reduced ? 0 : 260)} style={{ flex: 1, alignItems: 'center', width: '100%' }}>
            <Animated.Text entering={fade(100)} style={{ color: tint(BLUE, 0.95), fontSize: 15, letterSpacing: 1, fontFamily: BG[800] }}>
              {title.toUpperCase()}
            </Animated.Text>
            <View style={{ width: 200, height: 200, marginTop: 14, alignItems: 'center', justifyContent: 'center' }}>
              {!reduced ? <Ring delay={0} size={190} /> : null}
              <BodyMap height={170} color={BLUE} muscles={worked.slice(0, lit).map((m) => ({ muscle: m, intensity: 1 }))} />
            </View>
            {worked.length > 0 ? (
              <Animated.Text entering={fade(400)} style={{ color: COLORS.textMuted, fontSize: 15, fontFamily: BG[600], textAlign: 'center' }}>
                {worked.slice(0, 4).map(cap).join(' · ')}
              </Animated.Text>
            ) : null}
            <Animated.View entering={fade(500)} style={{ flexDirection: 'row', gap: 10, marginTop: 18, alignSelf: 'stretch' }}>
              <Stat value={`${stats.exercises}`} label="exercises" />
              <Stat value={`${stats.sets}`} label="sets" />
              <Stat value={`~${stats.minutes}`} label="minutes" />
            </Animated.View>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', marginTop: 20, columnGap: 7 }} accessibilityLabel={quote}>
              {words.map((w, i) => (
                <Animated.Text key={`${w}-${i}`} entering={fade(700 + i * 70)} style={{ color: '#fff', fontSize: 24, lineHeight: 30, letterSpacing: -0.4, fontFamily: BG[800] }}>
                  {w}
                </Animated.Text>
              ))}
            </View>
            <Animated.Text entering={fade(700 + words.length * 70 + 100)} style={{ color: COLORS.pen, fontSize: 22, fontFamily: FONT_HAND, fontWeight: '700', marginTop: 6, opacity: 0.9 }}>
              your coach
            </Animated.Text>
            {tips ? (
              <Animated.View entering={fade(1500)} style={{ alignSelf: 'stretch', marginTop: 18, gap: 8 }}>
                {TIPS.map((t) => (
                  <View key={t.text} style={{ flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 14, minHeight: 42, borderRadius: 14, backgroundColor: 'rgba(255,255,255,0.06)' }}>
                    <Icon name={t.icon} size={17} color={BLUE} strokeWidth={2.4} />
                    <Text style={{ color: COLORS.fgGray, fontSize: 15, fontFamily: BG[600], flex: 1 }}>{t.text}</Text>
                  </View>
                ))}
              </Animated.View>
            ) : null}
            <View style={{ flex: 1 }} />
            <Animated.View entering={fade(600)} style={{ alignSelf: 'stretch' }}>
              <Button size="lg" fullWidth accent={BLUE} accentDeep={COLORS.blueDeep} onPress={startCount} icon={<Icon name="play" size={16} color="#fff" />}>
                Start
              </Button>
            </Animated.View>
          </Animated.View>
        ) : (
          <View key="count" style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
            {count !== null && count > 0 ? (
              <Animated.Text key={count} entering={COUNT_IN} style={{ color: '#fff', fontSize: 120, lineHeight: 128, letterSpacing: -3, fontVariant: ['tabular-nums'], fontFamily: BG[800] }}>
                {count}
              </Animated.Text>
            ) : null}
            {count === -1 ? (
              <Animated.Text entering={COUNT_IN} style={{ color: BLUE, fontSize: 96, lineHeight: 104, letterSpacing: -2, fontFamily: BG[800] }}>
                Go
              </Animated.Text>
            ) : null}
          </View>
        )}
      </View>
    </Animated.View>
  );
}
