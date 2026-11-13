import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Animated, { Easing, FadeIn, FadeInDown, FadeOut, Keyframe, ReduceMotion, useAnimatedStyle, useReducedMotion, useSharedValue, withDelay, withRepeat, withTiming } from 'react-native-reanimated';
import { AREA_COLORS, COLORS, FONT_HAND, BG, tint } from '../../lib/theme';
import { pickQuote } from '../../lib/workoutQuotes';
import * as haptics from '../../lib/haptics';
import { BodyMap, MUSCLES, type Muscle } from '../BodyMap';

// Before the timer starts: a line from your coach, the muscles you are about to work lighting up one by one on the
// body map, then 3, 2, 1 and Go. The session clock only starts at Go (the player calls restartClock then). A tap skips
// straight to Go. With Reduce motion on it is a still line for a moment and then Go.

const BLUE = AREA_COLORS.workouts;
const EASE = Easing.bezier(0.23, 1, 0.32, 1);
const COUNT_IN = new Keyframe({
  0: { opacity: 0, transform: [{ scale: 1.7 }] },
  100: { opacity: 1, transform: [{ scale: 1 }], easing: EASE },
})
  .duration(240)
  .reduceMotion(ReduceMotion.System);

const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

function Ring({ delay, size }: { delay: number; size: number }) {
  const t = useSharedValue(0);
  useEffect(() => {
    t.set(withDelay(delay, withRepeat(withTiming(1, { duration: 2400, easing: Easing.out(Easing.quad) }), -1)));
  }, [delay, t]);
  const style = useAnimatedStyle(() => ({ opacity: (1 - t.get()) * 0.4, transform: [{ scale: 0.7 + t.get() * 0.9 }] }));
  return <Animated.View pointerEvents="none" style={[{ position: 'absolute', width: size, height: size, borderRadius: size / 2, borderWidth: 2, borderColor: BLUE }, style]} />;
}

export interface SessionIntroProps {
  /** "Push B". */
  title: string;
  /** The plan day's focus, for choosing the line. */
  focus: string;
  /** The primary muscle of each exercise, as the catalog names them (unknown names are ignored). */
  muscles: (string | null | undefined)[];
  onDone: () => void;
}

export function SessionIntro({ title, focus, muscles, onDone }: SessionIntroProps) {
  const insets = useSafeAreaInsets();
  const reduced = useReducedMotion();
  const quote = useRef(pickQuote(focus || title)).current;
  const words = useMemo(() => quote.split(' '), [quote]);
  const worked = useMemo(() => Array.from(new Set(muscles.filter((m): m is Muscle => !!m && (MUSCLES as string[]).includes(m)))), [muscles]);

  // 0 = quote, 3/2/1 = the count, -1 = Go.
  const [count, setCount] = useState<number | null>(null);
  const [lit, setLit] = useState(0);
  const finished = useRef(false);

  const finish = () => {
    if (finished.current) return;
    finished.current = true;
    onDone();
  };

  // The muscles light up one by one.
  useEffect(() => {
    if (reduced) {
      setLit(worked.length);
      return;
    }
    const id = setInterval(() => setLit((n) => (n >= worked.length ? n : n + 1)), 260);
    return () => clearInterval(id);
  }, [worked.length, reduced]);

  // The timeline: the line is read, then 3, 2, 1, Go, then the player.
  const timers = useRef<ReturnType<typeof setTimeout>[]>([]);
  const goNow = () => {
    timers.current.forEach(clearTimeout);
    timers.current = [];
    setCount(-1);
    haptics.stamp();
    timers.current.push(setTimeout(finish, reduced ? 200 : 420));
  };
  useEffect(() => {
    if (reduced) {
      timers.current.push(setTimeout(goNow, 1800));
    } else {
      [3, 2, 1].forEach((n, i) => {
        timers.current.push(
          setTimeout(() => {
            setCount(n);
            haptics.tick();
          }, 2300 + i * 480)
        );
      });
      timers.current.push(setTimeout(goNow, 2300 + 3 * 480));
    }
    return () => {
      timers.current.forEach(clearTimeout);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <Animated.View entering={FadeIn.duration(reduced ? 0 : 200)} exiting={FadeOut.duration(reduced ? 0 : 260)} style={StyleSheet.absoluteFill}>
      <Pressable onPress={goNow} accessibilityRole="button" accessibilityLabel="Skip the intro and start" style={StyleSheet.absoluteFill}>
        <LinearGradient colors={['#0A1632', '#06080F', '#050508']} style={StyleSheet.absoluteFill} />
        <View style={{ flex: 1, alignItems: 'center', paddingTop: insets.top + 36, paddingBottom: insets.bottom + 28, paddingHorizontal: 28 }}>
          <Animated.Text entering={FadeInDown.delay(reduced ? 0 : 150).duration(reduced ? 0 : 300).reduceMotion(ReduceMotion.System)} style={{ color: tint(BLUE, 0.95), fontSize: 15, letterSpacing: 1, fontFamily: BG[800] }}>
            {title.toUpperCase()}
          </Animated.Text>

          <View style={{ width: 230, height: 230, marginTop: 30, alignItems: 'center', justifyContent: 'center' }}>
            {!reduced ? (
              <>
                <Ring delay={0} size={210} />
                <Ring delay={1200} size={210} />
              </>
            ) : null}
            <BodyMap height={190} color={BLUE} muscles={worked.slice(0, lit).map((m) => ({ muscle: m, intensity: 1 }))} />
          </View>

          {worked.length > 0 ? (
            <Animated.Text entering={FadeIn.delay(reduced ? 0 : 500).duration(reduced ? 0 : 300).reduceMotion(ReduceMotion.System)} style={{ color: COLORS.textMuted, fontSize: 15, fontFamily: BG[600], marginTop: 6, textAlign: 'center' }}>
              {worked.slice(0, 4).map(cap).join(' · ')}
            </Animated.Text>
          ) : null}

          <View style={{ flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', marginTop: 26, columnGap: 8 }} accessibilityLabel={quote}>
            {words.map((w, i) => (
              <Animated.Text
                key={`${w}-${i}`}
                entering={FadeInDown.delay(reduced ? 0 : 450 + i * 75).duration(reduced ? 0 : 280).reduceMotion(ReduceMotion.System)}
                style={{ color: '#fff', fontSize: 28, lineHeight: 34, letterSpacing: -0.5, fontFamily: BG[800] }}
              >
                {w}
              </Animated.Text>
            ))}
          </View>
          <Animated.Text entering={FadeIn.delay(reduced ? 0 : 450 + words.length * 75 + 100).duration(reduced ? 0 : 300).reduceMotion(ReduceMotion.System)} style={{ color: COLORS.pen, fontSize: 24, fontFamily: FONT_HAND, fontWeight: '700', marginTop: 10, opacity: 0.9 }}>
            your coach
          </Animated.Text>

          <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', minHeight: 110 }}>
            {count !== null && count > 0 ? (
              <Animated.Text key={count} entering={COUNT_IN} style={{ color: '#fff', fontSize: 84, lineHeight: 92, letterSpacing: -2, fontVariant: ['tabular-nums'], fontFamily: BG[800] }}>
                {count}
              </Animated.Text>
            ) : null}
            {count === -1 ? (
              <Animated.Text entering={COUNT_IN} style={{ color: BLUE, fontSize: 72, lineHeight: 80, letterSpacing: -1.5, fontFamily: BG[800] }}>
                Go
              </Animated.Text>
            ) : null}
          </View>
          <Text style={{ color: COLORS.textFaint, fontSize: 13, fontFamily: BG[500] }}>Tap to start now</Text>
        </View>
      </Pressable>
    </Animated.View>
  );
}
