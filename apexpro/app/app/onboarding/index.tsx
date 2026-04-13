import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Animated,
  Easing,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import QuestionCard from './components/QuestionCard';

// ─────────────────────────────────────────────────────────────────────────────
// Config
// ─────────────────────────────────────────────────────────────────────────────

const STEPS = [
  {
    id: 'goal',
    question: "What are you building towards?",
    subtitle: "This shapes everything we design for you.",
    options: ['Build Muscle', 'Lose Fat', 'Stay Fit', 'Improve Endurance'],
  },
  {
    id: 'location',
    question: 'Where do you usually train?',
    subtitle: 'We tailor exercises to your environment.',
    options: ['Gym', 'Home', 'Outdoors', 'Mixed'],
  },
  {
    id: 'experience',
    question: 'How experienced are you?',
    subtitle: "We'll match the intensity to your level.",
    options: ['Beginner', 'Intermediate', 'Advanced'],
  },
  {
    id: 'frequency',
    question: 'How many days can you commit weekly?',
    subtitle: 'Consistency beats intensity.',
    options: ['2-3 days', '3-4 days', '5+ days', 'Every day'],
  },
];

const TOTAL = STEPS.length;

// ─────────────────────────────────────────────────────────────────────────────
// Animated Background Glow
// ─────────────────────────────────────────────────────────────────────────────

function BackgroundGlow() {
  const pulseAnim = useRef(new Animated.Value(0.3)).current;

  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 0.5,
          duration: 3000,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 0.3,
          duration: 3000,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: true,
        }),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, []);

  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="none">
      {/* Primary lime glow - center */}
      <Animated.View
        style={[
          styles.glowOrb,
          styles.glowOrbPrimary,
          { opacity: pulseAnim },
        ]}
      />
      {/* Secondary subtle red accent - top right */}
      <Animated.View
        style={[
          styles.glowOrb,
          styles.glowOrbAccent,
          { opacity: Animated.multiply(pulseAnim, 0.4) },
        ]}
      />
    </View>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Screen
// ─────────────────────────────────────────────────────────────────────────────

export default function OnboardingScreen() {
  const router = useRouter();
  const [step, setStep] = useState(0);
  const [answers, setAnswers] = useState<Record<string, string>>({});

  // Card transition
  const fadeAnim = useRef(new Animated.Value(1)).current;
  const slideAnim = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(1)).current;

  // Progress bar
  const progressAnim = useRef(new Animated.Value(1 / TOTAL)).current;

  // Continue button
  const btnScale = useRef(new Animated.Value(1)).current;
  const btnOpacity = useRef(new Animated.Value(0.35)).current;

  // Entry animation
  const entryAnim = useRef(new Animated.Value(0)).current;

  const currentStep = STEPS[step];
  const selected = answers[currentStep.id] ?? null;
  const isLast = step === TOTAL - 1;
  const canContinue = selected !== null;

  // ─── Entry animation on mount ──────────────────────────────────────────────

  useEffect(() => {
    Animated.timing(entryAnim, {
      toValue: 1,
      duration: 600,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    }).start();
  }, []);

  // ─── Animate progress bar ─────────────────────────────────────────────────

  useEffect(() => {
    Animated.timing(progressAnim, {
      toValue: (step + 1) / TOTAL,
      duration: 400,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: false,
    }).start();
  }, [step]);

  // ─── Animate button opacity ───────────────────────────────────────────────

  useEffect(() => {
    Animated.timing(btnOpacity, {
      toValue: canContinue ? 1 : 0.35,
      duration: 250,
      useNativeDriver: true,
    }).start();
  }, [canContinue]);

  // ─── Handlers ─────────────────────────────────────────────────────────────

  const handleSelect = useCallback((option: string) => {
    setAnswers((prev) => ({ ...prev, [currentStep.id]: option }));
  }, [currentStep.id]);

  const animateTransition = useCallback((direction: 'forward' | 'back', onMid: () => void) => {
    const exitX = direction === 'forward' ? -50 : 50;
    const enterX = direction === 'forward' ? 50 : -50;

    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 0,
        duration: 180,
        easing: Easing.in(Easing.quad),
        useNativeDriver: true,
      }),
      Animated.timing(slideAnim, {
        toValue: exitX,
        duration: 180,
        easing: Easing.in(Easing.quad),
        useNativeDriver: true,
      }),
      Animated.timing(scaleAnim, {
        toValue: 0.95,
        duration: 180,
        useNativeDriver: true,
      }),
    ]).start(() => {
      onMid();
      slideAnim.setValue(enterX);
      scaleAnim.setValue(0.95);

      Animated.parallel([
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 300,
          easing: Easing.out(Easing.cubic),
          useNativeDriver: true,
        }),
        Animated.timing(slideAnim, {
          toValue: 0,
          duration: 300,
          easing: Easing.out(Easing.cubic),
          useNativeDriver: true,
        }),
        Animated.spring(scaleAnim, {
          toValue: 1,
          useNativeDriver: true,
          speed: 20,
          bounciness: 4,
        }),
      ]).start();
    });
  }, [fadeAnim, slideAnim, scaleAnim]);

  const handleContinue = useCallback(() => {
    if (!canContinue) return;
    if (isLast) {
      router.replace('/');
      return;
    }
    animateTransition('forward', () => setStep((s) => s + 1));
  }, [canContinue, isLast, animateTransition, router]);

  const handleBack = useCallback(() => {
    if (step === 0) return;
    animateTransition('back', () => setStep((s) => s - 1));
  }, [step, animateTransition]);

  const handleBtnPressIn = () => {
    Animated.spring(btnScale, {
      toValue: 0.96,
      useNativeDriver: true,
      speed: 50,
      bounciness: 4,
    }).start();
  };

  const handleBtnPressOut = () => {
    Animated.spring(btnScale, {
      toValue: 1,
      useNativeDriver: true,
      speed: 50,
      bounciness: 8,
    }).start();
  };

  // ─── Interpolations ──────────────────────────────────────────────────────

  const progressWidth = progressAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['0%', '100%'],
  });

  const entryTranslateY = entryAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [30, 0],
  });

  // ─── Render ───────────────────────────────────────────────────────────────

  return (
    <View style={styles.root}>
      {/* Background */}
      <BackgroundGlow />

      <SafeAreaView style={styles.safe}>
        {/* ── Header ── */}
        <Animated.View
          style={[
            styles.header,
            {
              opacity: entryAnim,
              transform: [{ translateY: Animated.multiply(entryTranslateY, 0.5) }],
            },
          ]}
        >
          {step > 0 ? (
            <TouchableOpacity
              onPress={handleBack}
              style={styles.backBtn}
              activeOpacity={0.6}
            >
              <Text style={styles.backText}>Back</Text>
            </TouchableOpacity>
          ) : (
            <View style={styles.backBtn} />
          )}

          <View style={styles.stepLabelContainer}>
            <Text style={styles.stepNumber}>{step + 1}</Text>
            <Text style={styles.stepSeparator}>/</Text>
            <Text style={styles.stepTotal}>{TOTAL}</Text>
          </View>

          <View style={styles.backBtn} />
        </Animated.View>

        {/* ── Progress Bar ── */}
        <Animated.View
          style={[
            styles.progressTrack,
            { opacity: entryAnim },
          ]}
        >
          <Animated.View style={[styles.progressFill, { width: progressWidth }]}>
            <LinearGradient
              colors={['#D6FF00', '#B8E600']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={StyleSheet.absoluteFill}
            />
            {/* Glow dot */}
            <View style={styles.progressGlow} />
          </Animated.View>
        </Animated.View>

        {/* ── Card ── */}
        <View style={styles.content}>
          <Animated.View
            style={{
              opacity: Animated.multiply(fadeAnim, entryAnim),
              transform: [
                { translateX: slideAnim },
                { translateY: entryTranslateY },
                { scale: scaleAnim },
              ],
              width: '100%',
            }}
          >
            <QuestionCard
              question={currentStep.question}
              subtitle={currentStep.subtitle}
              options={currentStep.options}
              selected={selected}
              onSelect={handleSelect}
            />
          </Animated.View>
        </View>

        {/* ── Continue Button ── */}
        <Animated.View
          style={[
            styles.footer,
            {
              opacity: entryAnim,
              transform: [{ translateY: Animated.multiply(entryTranslateY, 0.3) }],
            },
          ]}
        >
          <Animated.View style={{ transform: [{ scale: btnScale }], opacity: btnOpacity, width: '100%' }}>
            <TouchableOpacity
              activeOpacity={0.85}
              onPress={handleContinue}
              onPressIn={handleBtnPressIn}
              onPressOut={handleBtnPressOut}
              disabled={!canContinue}
            >
              <LinearGradient
                colors={canContinue ? ['#D6FF00', '#C2EB00'] : ['#161616', '#121212']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={[styles.continueBtn, canContinue ? styles.continueBtnGlow : undefined]}
              >
                <Text style={[styles.continueBtnText, !canContinue ? styles.continueBtnTextDisabled : undefined]}>
                  {isLast ? 'Get Started' : 'Continue'}
                </Text>
              </LinearGradient>
            </TouchableOpacity>
          </Animated.View>
        </Animated.View>
      </SafeAreaView>
    </View>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Styles
// ─────────────────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: '#050505',
  },
  safe: {
    flex: 1,
    paddingHorizontal: 22,
  },

  // Background glow orbs
  glowOrb: {
    position: 'absolute',
    borderRadius: 999,
  },
  glowOrbPrimary: {
    width: 300,
    height: 300,
    backgroundColor: '#D6FF00',
    top: '25%',
    left: '10%',
    opacity: 0.04,
  },
  glowOrbAccent: {
    width: 200,
    height: 200,
    backgroundColor: '#FF3B3B',
    top: '8%',
    right: '-5%',
    opacity: 0.03,
  },

  // Header
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 6,
    paddingBottom: 16,
  },
  backBtn: {
    width: 60,
  },
  backText: {
    color: '#505050',
    fontSize: 15,
    fontWeight: '500',
    letterSpacing: 0.2,
  },
  stepLabelContainer: {
    flexDirection: 'row',
    alignItems: 'baseline',
  },
  stepNumber: {
    color: '#D6FF00',
    fontSize: 18,
    fontWeight: '700',
    letterSpacing: -0.5,
  },
  stepSeparator: {
    color: '#333',
    fontSize: 16,
    fontWeight: '300',
    marginHorizontal: 3,
  },
  stepTotal: {
    color: '#444',
    fontSize: 15,
    fontWeight: '500',
  },

  // Progress bar
  progressTrack: {
    height: 3,
    backgroundColor: 'rgba(255,255,255,0.04)',
    borderRadius: 4,
    marginBottom: 0,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: 4,
    flexDirection: 'row',
    justifyContent: 'flex-end',
    alignItems: 'center',
    overflow: 'hidden',
  },
  progressGlow: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#D6FF00',
    opacity: 0.7,
    marginRight: -3,
  },

  // Content
  content: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingBottom: 30,
  },

  // Footer
  footer: {
    paddingBottom: 20,
    paddingTop: 6,
    alignItems: 'center',
  },
  continueBtn: {
    borderRadius: 16,
    paddingVertical: 18,
    alignItems: 'center',
    width: '100%',
  },
  continueBtnGlow: {
    shadowColor: '#D6FF00',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 16,
    elevation: 8,
  },
  continueBtnText: {
    color: '#050505',
    fontSize: 17,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  continueBtnTextDisabled: {
    color: '#2A2A2A',
  },
});
