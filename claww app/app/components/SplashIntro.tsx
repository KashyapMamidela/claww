import React, { useEffect, useRef } from 'react';
import { AccessibilityInfo, Animated, Easing, Text, View } from 'react-native';
import Svg, { Defs, Path, RadialGradient, Stop, Circle } from 'react-native-svg';
import { COLORS, FONT } from '../lib/theme';
import { LOGO_PIECES, LOGO_VIEWBOX } from '../lib/logoPieces';

// Polish step 9 (board "Welcome"): the logo's three pieces fly in and lock together, one band of light crosses the logo
// once, and the blue glow behind it swells a little and settles. White on black; blue appears only as the glow. No rings.

interface SplashIntroProps {
  onFinish: () => void;
}

const HOLD_MS = 900;
const FADE_OUT_MS = 320;
const LOGO_W = 112;
const LOGO_H = Math.round((LOGO_W * LOGO_VIEWBOX.height) / LOGO_VIEWBOX.width);
const AnimatedPath = Animated.createAnimatedComponent(Path);

// Where each piece starts (relative to its place) and how it is turned.
const FLIGHT: Record<string, { x: number; y: number; rot: number }> = {
  top: { x: 0, y: -140, rot: -38 },
  left: { x: -140, y: 90, rot: 40 },
  right: { x: 140, y: 110, rot: -30 },
};

export function SplashIntro({ onFinish }: SplashIntroProps) {
  const fly = useRef(LOGO_PIECES.map(() => new Animated.Value(0))).current;
  const glow = useRef(new Animated.Value(0)).current;
  const flash = useRef(new Animated.Value(0)).current; // JS-driven: it animates the fill colour
  const wordmark = useRef(new Animated.Value(0)).current;
  const tagline = useRef(new Animated.Value(0)).current;
  const screen = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    let cancelled = false;
    AccessibilityInfo.isReduceMotionEnabled()
      .catch(() => false)
      .then((reduce) => {
        if (cancelled) return;
        if (reduce) {
          fly.forEach((v) => v.setValue(1));
          glow.setValue(0.8);
          wordmark.setValue(1);
          tagline.setValue(1);
          Animated.sequence([Animated.delay(700), Animated.timing(screen, { toValue: 0, duration: FADE_OUT_MS, useNativeDriver: true })]).start(() => onFinish());
          return;
        }
        const flights = fly.map((v, i) => Animated.timing(v, { toValue: 1, duration: 700, delay: i * 80, easing: Easing.bezier(0.2, 0.9, 0.25, 1), useNativeDriver: true }));
        Animated.sequence([
          Animated.parallel(flights),
          // Locked: the glow swells a little and settles, one band of light crosses the logo.
          Animated.parallel([
            Animated.sequence([
              Animated.timing(glow, { toValue: 1, duration: 360, easing: Easing.out(Easing.cubic), useNativeDriver: true }),
              Animated.timing(glow, { toValue: 0.8, duration: 500, useNativeDriver: true }),
            ]),
            Animated.sequence([
              Animated.timing(flash, { toValue: 1, duration: 360, easing: Easing.inOut(Easing.cubic), useNativeDriver: false }),
              Animated.timing(flash, { toValue: 0, duration: 420, easing: Easing.inOut(Easing.cubic), useNativeDriver: false }),
            ]),
            Animated.timing(wordmark, { toValue: 1, duration: 320, delay: 200, easing: Easing.out(Easing.cubic), useNativeDriver: true }),
          ]),
          Animated.timing(tagline, { toValue: 1, duration: 300, useNativeDriver: true }),
          Animated.delay(HOLD_MS),
          Animated.timing(screen, { toValue: 0, duration: FADE_OUT_MS, easing: Easing.in(Easing.cubic), useNativeDriver: true }),
        ]).start(() => onFinish());
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const fill = flash.interpolate({ inputRange: [0, 1], outputRange: [COLORS.fg, COLORS.blueTint] });

  return (
    <Animated.View style={{ flex: 1, backgroundColor: COLORS.bg, alignItems: 'center', justifyContent: 'center', opacity: screen }}>
      <View style={{ width: 200, height: 200, alignItems: 'center', justifyContent: 'center' }} accessibilityLabel="CLAWW" accessibilityRole="image">
        <Animated.View
          pointerEvents="none"
          style={{
            position: 'absolute',
            opacity: glow,
            transform: [{ scale: glow.interpolate({ inputRange: [0, 1], outputRange: [0.6, 1.1] }) }],
          }}
        >
          <Svg width={200} height={200} viewBox="0 0 200 200">
            <Defs>
              <RadialGradient id="halo" cx="50%" cy="50%" r="50%">
                <Stop offset="0" stopColor={COLORS.blue} stopOpacity="0.5" />
                <Stop offset="0.45" stopColor={COLORS.blue} stopOpacity="0.12" />
                <Stop offset="1" stopColor={COLORS.blue} stopOpacity="0" />
              </RadialGradient>
            </Defs>
            <Circle cx="100" cy="100" r="100" fill="url(#halo)" />
          </Svg>
        </Animated.View>
        {LOGO_PIECES.map((piece, i) => {
          const f = FLIGHT[piece.id];
          const v = fly[i];
          return (
            <Animated.View
              key={piece.id}
              style={{
                position: 'absolute',
                width: LOGO_W,
                height: LOGO_H,
                opacity: v.interpolate({ inputRange: [0, 0.45, 1], outputRange: [0, 1, 1] }),
                transform: [
                  { translateX: v.interpolate({ inputRange: [0, 1], outputRange: [f.x, 0] }) },
                  { translateY: v.interpolate({ inputRange: [0, 1], outputRange: [f.y, 0] }) },
                  { rotate: v.interpolate({ inputRange: [0, 1], outputRange: [`${f.rot}deg`, '0deg'] }) },
                  { scale: v.interpolate({ inputRange: [0, 1], outputRange: [0.7, 1] }) },
                ],
              }}
            >
              <Svg width={LOGO_W} height={LOGO_H} viewBox={`0 0 ${LOGO_VIEWBOX.width} ${LOGO_VIEWBOX.height}`}>
                <AnimatedPath d={piece.d} fill={fill} fillRule="evenodd" />
              </Svg>
            </Animated.View>
          );
        })}
      </View>

      <Animated.View style={{ marginTop: 4, opacity: wordmark, transform: [{ translateY: wordmark.interpolate({ inputRange: [0, 1], outputRange: [8, 0] }) }] }}>
        <Text style={{ color: '#fff', fontSize: 28, fontWeight: '900', fontVariant: ['tabular-nums'], letterSpacing: -0.5, fontFamily: FONT }}>
          CLAW
          <Text style={{ color: COLORS.fgGray }}>W</Text>
        </Text>
      </Animated.View>

      <Animated.Text style={{ marginTop: 8, color: COLORS.textMuted, fontSize: 13, fontWeight: '600', letterSpacing: 0.4, fontFamily: FONT, opacity: tagline }}>
        Train smarter, every day.
      </Animated.Text>
    </Animated.View>
  );
}
