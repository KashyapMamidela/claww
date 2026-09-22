import React, { useEffect, useRef } from 'react';
import { Animated, Easing, Image, Text, View } from 'react-native';
import { COLORS, FONT } from '../lib/theme';

interface SplashIntroProps {
  onFinish: () => void;
}

const HOLD_MS = 1000;
const FADE_OUT_MS = 320;

export function SplashIntro({ onFinish }: SplashIntroProps) {
  const markScale = useRef(new Animated.Value(0.5)).current;
  const markOpacity = useRef(new Animated.Value(0)).current;
  const wordmarkOpacity = useRef(new Animated.Value(0)).current;
  const wordmarkTranslate = useRef(new Animated.Value(8)).current;
  const glowOpacity = useRef(new Animated.Value(0)).current;
  const taglineOpacity = useRef(new Animated.Value(0)).current;
  const screenOpacity = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    Animated.sequence([
      Animated.parallel([
        Animated.spring(markScale, { toValue: 1, useNativeDriver: true, speed: 14, bounciness: 10 }),
        Animated.timing(markOpacity, { toValue: 1, duration: 380, easing: Easing.out(Easing.cubic), useNativeDriver: true }),
        Animated.timing(glowOpacity, { toValue: 1, duration: 500, delay: 80, useNativeDriver: true }),
      ]),
      Animated.parallel([
        Animated.timing(wordmarkOpacity, { toValue: 1, duration: 320, easing: Easing.out(Easing.cubic), useNativeDriver: true }),
        Animated.timing(wordmarkTranslate, { toValue: 0, duration: 320, easing: Easing.out(Easing.cubic), useNativeDriver: true }),
      ]),
      Animated.timing(taglineOpacity, { toValue: 1, duration: 300, useNativeDriver: true }),
      Animated.delay(HOLD_MS),
      Animated.timing(screenOpacity, { toValue: 0, duration: FADE_OUT_MS, easing: Easing.in(Easing.cubic), useNativeDriver: true }),
    ]).start(() => onFinish());
  }, []);

  return (
    <Animated.View
      style={{
        flex: 1,
        backgroundColor: COLORS.bg,
        alignItems: 'center',
        justifyContent: 'center',
        opacity: screenOpacity,
      }}
    >
      <Animated.View
        style={{
          position: 'absolute',
          width: 220,
          height: 220,
          borderRadius: 110,
          backgroundColor: '#FFFFFF',
          opacity: glowOpacity.interpolate({ inputRange: [0, 1], outputRange: [0, 0.1] }),
          transform: [{ scale: markScale }],
        }}
      />
      <Animated.View
        style={{
          width: 76,
          height: 76,
          borderRadius: 22,
          backgroundColor: COLORS.card,
          alignItems: 'center',
          justifyContent: 'center',
          borderWidth: 1,
          borderColor: 'rgba(255,255,255,0.28)',
          opacity: markOpacity,
          transform: [{ scale: markScale }],
          shadowColor: '#FFFFFF',
          shadowOffset: { width: 0, height: 10 },
          shadowOpacity: 0.18,
          shadowRadius: 24,
          elevation: 12,
        }}
      >
        <Image source={require('../assets/logo-mark.png')} style={{ width: 40, height: 40 }} resizeMode="contain" />
      </Animated.View>

      <Animated.View
        style={{
          marginTop: 20,
          opacity: wordmarkOpacity,
          transform: [{ translateY: wordmarkTranslate }],
        }}
      >
        <Text style={{ color: '#fff', fontSize: 26, fontWeight: '900', letterSpacing: -0.5, fontFamily: FONT }}>
          CLAW
          <Text style={{ color: COLORS.fgGray }}>W</Text>
        </Text>
      </Animated.View>

      <Animated.Text
        style={{
          marginTop: 8,
          color: '#71717A',
          fontSize: 12.5,
          fontWeight: '600',
          letterSpacing: 0.4,
          fontFamily: FONT,
          opacity: taglineOpacity,
        }}
      >
        Train smarter, every day.
      </Animated.Text>
    </Animated.View>
  );
}
