import React, { useRef, useEffect } from 'react';
import { View, Text, TouchableOpacity, SafeAreaView, Animated, Easing, StyleSheet, ScrollView, Image } from 'react-native';
import Svg, { Defs, RadialGradient, Stop, Circle } from 'react-native-svg';
import { useRouter } from 'expo-router';
import { COLORS, FONT } from '../../../lib/theme';
import { Button } from '../../../components/ui/Button';
import { SectionLabel } from '../../../components/ui/SectionLabel';
import { Icon } from '../../../components/ui/Icon';

const ACCENT = COLORS.blue;
const ACCENT_DEEP = COLORS.blueDeep;

// "Science-Backed" was dropped as a blanket trust badge (SHIP PHASE 7.4):
// defensible for the deterministic rep-range/volume tables, not for the
// injury filter (a documented best-effort heuristic, see SHIP PHASE 10.1) or
// photo calorie estimates. "Adapts To You" is real and live-verified —
// SHIP PHASE 1.5's adaptive loop actually feeds logged performance back into
// the next generated plan.
const TRUST_SIGNALS = ['100% Personalized', 'Privacy-First', 'Adapts To You'];

export default function WelcomeScreen() {
  const router = useRouter();

  const glowPulse = useRef(new Animated.Value(0.7)).current;
  const logoScale = useRef(new Animated.Value(0.8)).current;

  const headlineOpacity = useRef(new Animated.Value(0)).current;
  const headlineTranslateY = useRef(new Animated.Value(30)).current;

  const subOpacity = useRef(new Animated.Value(0)).current;
  const subTranslateY = useRef(new Animated.Value(30)).current;

  const bodyOpacity = useRef(new Animated.Value(0)).current;
  const bodyTranslateY = useRef(new Animated.Value(30)).current;

  const trustOpacity = useRef(new Animated.Value(0)).current;
  const trustTranslateY = useRef(new Animated.Value(20)).current;

  const btnOpacity = useRef(new Animated.Value(0)).current;
  const btnTranslateY = useRef(new Animated.Value(30)).current;

  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(glowPulse, { toValue: 1, duration: 3500, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
        Animated.timing(glowPulse, { toValue: 0.7, duration: 3500, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
      ])
    ).start();

    Animated.spring(logoScale, { toValue: 1, tension: 50, friction: 7, useNativeDriver: true }).start();

    Animated.stagger(80, [
      Animated.parallel([
        Animated.timing(headlineOpacity, { toValue: 1, duration: 400, delay: 100, easing: Easing.out(Easing.ease), useNativeDriver: true }),
        Animated.timing(headlineTranslateY, { toValue: 0, duration: 400, delay: 100, easing: Easing.out(Easing.ease), useNativeDriver: true }),
      ]),
      Animated.parallel([
        Animated.timing(subOpacity, { toValue: 1, duration: 400, delay: 100, easing: Easing.out(Easing.ease), useNativeDriver: true }),
        Animated.timing(subTranslateY, { toValue: 0, duration: 400, delay: 100, easing: Easing.out(Easing.ease), useNativeDriver: true }),
      ]),
      Animated.parallel([
        Animated.timing(bodyOpacity, { toValue: 1, duration: 400, delay: 100, easing: Easing.out(Easing.ease), useNativeDriver: true }),
        Animated.timing(bodyTranslateY, { toValue: 0, duration: 400, delay: 100, easing: Easing.out(Easing.ease), useNativeDriver: true }),
      ]),
      Animated.parallel([
        Animated.timing(trustOpacity, { toValue: 1, duration: 350, delay: 100, easing: Easing.out(Easing.ease), useNativeDriver: true }),
        Animated.timing(trustTranslateY, { toValue: 0, duration: 350, delay: 100, easing: Easing.out(Easing.ease), useNativeDriver: true }),
      ]),
      Animated.parallel([
        Animated.timing(btnOpacity, { toValue: 1, duration: 400, delay: 100, easing: Easing.out(Easing.ease), useNativeDriver: true }),
        Animated.timing(btnTranslateY, { toValue: 0, duration: 400, delay: 100, easing: Easing.out(Easing.ease), useNativeDriver: true }),
      ]),
    ]).start();
  }, []);

  const handleGetStarted = () => router.push('/screens/auth/sign-up');
  const handleLogIn = () => router.push('/screens/auth/sign-in');

  return (
    <View style={styles.root}>
      <Animated.View style={[styles.glowWrap, { opacity: glowPulse }]} pointerEvents="none">
        <Svg width={480} height={480} viewBox="0 0 480 480">
          <Defs>
            <RadialGradient id="heroGlow" cx="50%" cy="50%" r="50%">
              <Stop offset="0%" stopColor={ACCENT} stopOpacity="0.5" />
              <Stop offset="55%" stopColor={ACCENT} stopOpacity="0.14" />
              <Stop offset="100%" stopColor={ACCENT} stopOpacity="0" />
            </RadialGradient>
          </Defs>
          <Circle cx={240} cy={240} r={240} fill="url(#heroGlow)" />
        </Svg>
      </Animated.View>

      <SafeAreaView style={styles.safeArea}>
        <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false} bounces={false}>
          <View style={styles.logoSection}>
            <Animated.View style={[styles.logoContainer, { transform: [{ scale: logoScale }] }]}>
              <Image source={require('../../../assets/logo-mark.png')} style={styles.logoMark} resizeMode="contain" />
            </Animated.View>
          </View>

          <Animated.View style={{ alignItems: 'center', opacity: headlineOpacity, transform: [{ translateY: headlineTranslateY }] }}>
            <SectionLabel color={ACCENT}>WELCOME TO</SectionLabel>
            <Text style={styles.wordmark}>
              CLAW<Text style={{ color: ACCENT }}>W</Text>
            </Text>
          </Animated.View>

          <Animated.View style={{ opacity: subOpacity, transform: [{ translateY: subTranslateY }] }}>
            <Text style={styles.subheading}>Your Personalized Fitness Coach</Text>
          </Animated.View>

          <Animated.View style={{ opacity: bodyOpacity, transform: [{ translateY: bodyTranslateY }] }}>
            <Text style={styles.bodyText}>Personalized workouts and nutrition, adapted to what you actually do.</Text>
          </Animated.View>

          <Animated.View style={[styles.trustSignalsRow, { opacity: trustOpacity, transform: [{ translateY: trustTranslateY }] }]}>
            {TRUST_SIGNALS.map((t) => (
              <View key={t} style={styles.trustBadge}>
                <Icon name="check" size={11} color={COLORS.green} strokeWidth={3} />
                <Text style={styles.trustText}>{t}</Text>
              </View>
            ))}
          </Animated.View>

          <View style={styles.spacer} />

          <Animated.View style={[styles.bottomSection, { opacity: btnOpacity, transform: [{ translateY: btnTranslateY }] }]}>
            <Button variant="primary" accent={ACCENT} accentDeep={ACCENT_DEEP} size="lg" fullWidth onPress={handleGetStarted}>
              Get Started
            </Button>

            <Button variant="ghost" size="lg" fullWidth onPress={handleLogIn} style={styles.logInButton}>
              Log in instead
            </Button>

            <View style={styles.bottomTrustContainer}>
              <Icon name="lock" size={11} color={COLORS.fgGrayDim} />
              <Text style={styles.bottomTrustText}>Privacy-Protected — Your data stays private</Text>
            </View>
          </Animated.View>
        </ScrollView>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: COLORS.bg,
    overflow: 'hidden',
  },
  glowWrap: {
    position: 'absolute',
    top: -60,
    left: 0,
    right: 0,
    alignItems: 'center',
  },
  safeArea: { flex: 1 },
  scrollContent: {
    flexGrow: 1,
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingTop: 48,
    paddingBottom: 32,
  },

  logoSection: {
    marginBottom: 24,
  },
  logoContainer: {
    width: 84,
    height: 84,
    borderRadius: 22,
    backgroundColor: ACCENT,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.15)',
    shadowColor: ACCENT,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.35,
    shadowRadius: 17,
    elevation: 10,
  },
  logoMark: { width: 46, height: 46 },

  wordmark: {
    fontFamily: FONT,
    fontSize: 48,
    fontWeight: '900',
    color: COLORS.fg,
    textAlign: 'center',
    letterSpacing: -1.6,
    marginTop: 6,
  },
  subheading: {
    fontFamily: FONT,
    fontSize: 17,
    fontWeight: '700',
    color: COLORS.fg,
    textAlign: 'center',
    letterSpacing: -0.2,
    marginTop: 14,
  },
  bodyText: {
    fontFamily: FONT,
    fontSize: 13,
    fontWeight: '400',
    color: COLORS.fgGrayDim,
    textAlign: 'center',
    lineHeight: 20,
    maxWidth: 300,
    marginTop: 10,
  },

  trustSignalsRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 24,
  },
  trustBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: 'rgba(255,255,255,0.045)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.09)',
    borderRadius: 100,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  trustText: { fontFamily: FONT, fontSize: 11, fontWeight: '600', color: COLORS.fgGray },

  spacer: { flex: 1, minHeight: 40 },

  bottomSection: { width: '100%', alignItems: 'center' },
  logInButton: { marginTop: 10 },

  bottomTrustContainer: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 20, opacity: 0.8 },
  bottomTrustText: { fontFamily: FONT, fontSize: 10.5, fontWeight: '600', color: COLORS.fgGrayDim },
});
