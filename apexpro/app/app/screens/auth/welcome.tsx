import React, { useRef, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  SafeAreaView,
  Animated,
  Easing,
  StyleSheet,
  Dimensions,
  ScrollView,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';

// ULTIMATE NEXT-GEN Welcome Screen
export default function WelcomeScreen() {
  const router = useRouter();

  // ─── Animation Values ────────────────────────────────────────────────────────
  const glowPulse = useRef(new Animated.Value(0.06)).current;
  const logoScale = useRef(new Animated.Value(0.8)).current;

  const headlineOpacity = useRef(new Animated.Value(0)).current;
  const headlineTranslateY = useRef(new Animated.Value(40)).current;

  const subOpacity = useRef(new Animated.Value(0)).current;
  const subTranslateY = useRef(new Animated.Value(40)).current;

  const bodyOpacity = useRef(new Animated.Value(0)).current;
  const bodyTranslateY = useRef(new Animated.Value(40)).current;

  const trustOpacity = useRef(new Animated.Value(0)).current;
  const trustTranslateY = useRef(new Animated.Value(20)).current;

  const btnOpacity = useRef(new Animated.Value(0)).current;
  const btnTranslateY = useRef(new Animated.Value(40)).current;
  const btnScale = useRef(new Animated.Value(1)).current;

  // ─── Mount Animations ────────────────────────────────────────────────────────
  useEffect(() => {
    // 1. Background Glow pulsing loop
    Animated.loop(
      Animated.sequence([
        Animated.timing(glowPulse, {
          toValue: 0.15,
          duration: 3500,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.timing(glowPulse, {
          toValue: 0.06,
          duration: 3500,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
      ])
    ).start();

    // 2. Logo scale (Spring)
    Animated.spring(logoScale, {
      toValue: 1,
      tension: 50,
      friction: 7,
      useNativeDriver: true,
    }).start();

    // 3. Staggered fade + slide up
    Animated.stagger(80, [
      Animated.parallel([
        Animated.timing(headlineOpacity, { toValue: 1, duration: 500, delay: 100, easing: Easing.out(Easing.ease), useNativeDriver: true }),
        Animated.timing(headlineTranslateY, { toValue: 0, duration: 500, delay: 100, easing: Easing.out(Easing.ease), useNativeDriver: true }),
      ]),
      Animated.parallel([
        Animated.timing(subOpacity, { toValue: 1, duration: 500, delay: 100, easing: Easing.out(Easing.ease), useNativeDriver: true }),
        Animated.timing(subTranslateY, { toValue: 0, duration: 500, delay: 100, easing: Easing.out(Easing.ease), useNativeDriver: true }),
      ]),
      Animated.parallel([
        Animated.timing(bodyOpacity, { toValue: 1, duration: 500, delay: 100, easing: Easing.out(Easing.ease), useNativeDriver: true }),
        Animated.timing(bodyTranslateY, { toValue: 0, duration: 500, delay: 100, easing: Easing.out(Easing.ease), useNativeDriver: true }),
      ]),
      Animated.parallel([
        Animated.timing(trustOpacity, { toValue: 1, duration: 400, delay: 100, easing: Easing.out(Easing.ease), useNativeDriver: true }),
        Animated.timing(trustTranslateY, { toValue: 0, duration: 400, delay: 100, easing: Easing.out(Easing.ease), useNativeDriver: true }),
      ]),
      Animated.parallel([
        Animated.timing(btnOpacity, { toValue: 1, duration: 500, delay: 100, easing: Easing.out(Easing.ease), useNativeDriver: true }),
        Animated.timing(btnTranslateY, { toValue: 0, duration: 500, delay: 100, easing: Easing.out(Easing.ease), useNativeDriver: true }),
      ]),
    ]).start();
  }, []);

  // ─── Interaction Handlers ────────────────────────────────────────────────────
  const handlePressIn = () => {
    Animated.spring(btnScale, {
      toValue: 0.95,
      useNativeDriver: true,
      speed: 60,
      bounciness: 0,
    }).start();
  };

  const handlePressOut = () => {
    Animated.spring(btnScale, {
      toValue: 1,
      useNativeDriver: true,
      speed: 40,
      bounciness: 6,
    }).start();
  };

  const handlePress = () => {
    router.push('/screens/onboarding/name');
  };

  return (
    <LinearGradient
      colors={['#0A0B1A', '#050609']}
      start={{ x: 0, y: 0 }}
      end={{ x: 0, y: 1 }}
      style={styles.root}
    >
      {/* Dynamic Glow Orbs for Ultra-Premium Depth */}
      <Animated.View style={[styles.glowOrbTop, { opacity: glowPulse }]} />
      <Animated.View style={[styles.glowOrbBottom, { opacity: glowPulse }]} />

      <SafeAreaView style={styles.safeArea}>
        <View style={styles.container}>
          
          <ScrollView
            contentContainerStyle={styles.scrollContent}
            showsVerticalScrollIndicator={false}
            bounces={false}
          >
            {/* LOGO HERO SECTION */}
            <View style={styles.logoSection}>
              <Animated.View
                style={[styles.logoContainer, { transform: [{ scale: logoScale }] }]}
              >
                <LinearGradient
                  colors={['#A855F7', '#EC4899']} // Premium luxury gradient
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  style={styles.logoGradient}
                >
                  <View style={styles.logoInnerGlow}>
                    <Text style={styles.logoEmoji}>🚀</Text>
                  </View>
                </LinearGradient>
              </Animated.View>
            </View>

            {/* TEXT HEADINGS */}
            <Animated.View style={{ opacity: headlineOpacity, transform: [{ translateY: headlineTranslateY }] }}>
              <Text style={styles.headline}>WELCOME TO{'\n'}CLAWW</Text>
            </Animated.View>

            <Animated.View style={{ opacity: subOpacity, transform: [{ translateY: subTranslateY }] }}>
              <Text style={styles.subheading}>Your AI-Powered Fitness Coach</Text>
            </Animated.View>

            <Animated.View style={{ opacity: bodyOpacity, transform: [{ translateY: bodyTranslateY }] }}>
              <Text style={styles.bodyText}>
                Personalized workouts, nutrition, and AI coaching tailored to YOUR goals.
              </Text>
            </Animated.View>

            {/* TRUST SIGNALS */}
            <Animated.View style={[styles.trustSignalsRow, { opacity: trustOpacity, transform: [{ translateY: trustTranslateY }] }]}>
              <View style={styles.trustBadge}>
                <Text style={styles.trustCheck}>✓</Text>
                <Text style={styles.trustText}>100% Personalized</Text>
              </View>
              <View style={styles.trustBadge}>
                <Text style={styles.trustCheck}>✓</Text>
                <Text style={styles.trustText}>Privacy-First</Text>
              </View>
              <View style={styles.trustBadge}>
                <Text style={styles.trustCheck}>✓</Text>
                <Text style={styles.trustText}>Science-Backed</Text>
              </View>
            </Animated.View>
            
            <View style={styles.spacer} />

            {/* BOTTOM SECTION CTA */}
            <Animated.View
              style={[
                styles.bottomSection,
                { opacity: btnOpacity, transform: [{ translateY: btnTranslateY }] },
              ]}
            >
              <Animated.View style={[styles.buttonWrapper, { transform: [{ scale: btnScale }] }]}>
                <TouchableOpacity
                  activeOpacity={1}
                  onPressIn={handlePressIn}
                  onPressOut={handlePressOut}
                  onPress={handlePress}
                  style={styles.buttonShadow}
                >
                  <LinearGradient
                    colors={['#A855F7', '#EC4899']} // Premium
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                    style={styles.buttonGradient}
                  >
                    <Text style={styles.buttonText}>✨ Get Started</Text>
                  </LinearGradient>
                </TouchableOpacity>
              </Animated.View>

              {/* SECONDARY CTA */}
              <TouchableOpacity activeOpacity={0.6} style={styles.secondaryCtaContainer}>
                <Text style={styles.secondaryCtaText}>Log in instead</Text>
              </TouchableOpacity>

              {/* BOTTOM PRIVACY BADGE */}
              <View style={styles.bottomTrustContainer}>
                <Text style={styles.lockIcon}>🔒</Text>
                <Text style={styles.bottomTrustText}>Privacy-Protected — Your data stays private</Text>
              </View>
            </Animated.View>
          </ScrollView>

        </View>
      </SafeAreaView>
    </LinearGradient>
  );
}

const { width, height } = Dimensions.get('window');

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: '#0A0B1A',
  },
  glowOrbTop: {
    position: 'absolute',
    width: width * 1.5,
    height: width * 1.5,
    borderRadius: 999,
    backgroundColor: '#A855F7',
    top: '-30%',
    left: '-40%',
  },
  glowOrbBottom: {
    position: 'absolute',
    width: width * 1.2,
    height: width * 1.2,
    borderRadius: 999,
    backgroundColor: '#EC4899',
    bottom: '-20%',
    right: '-40%',
  },
  safeArea: {
    flex: 1,
  },
  container: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: 32,
    paddingBottom: 32,
  },
  
  // HERO LOGO
  logoSection: {
    height: height * 0.25,
    justifyContent: 'center',
    alignItems: 'center',
  },
  logoContainer: {
    width: 140,
    height: 140,
    borderRadius: 40,
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.15)',
    shadowColor: '#A855F7',
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.35,
    shadowRadius: 20,
    elevation: 12,
    overflow: 'hidden',
  },
  logoGradient: {
    flex: 1,
  },
  logoInnerGlow: {
    flex: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  logoEmoji: {
    fontSize: 60,
  },

  // TEXT TYPOGRAPHY
  headline: {
    fontFamily: 'Inter',
    fontSize: 44, // Adjusted slightly to fit naturally 
    fontWeight: '900',
    color: '#FFFFFF',
    textAlign: 'center',
    letterSpacing: -0.5,
    lineHeight: 52,
    marginTop: 20, // Reduced from 40 for optimal balance
  },
  subheading: {
    fontFamily: 'Inter',
    fontSize: 24,
    fontWeight: '700',
    color: '#FFFFFF',
    textAlign: 'center',
    letterSpacing: -0.2,
    lineHeight: 32,
    marginTop: 16,
  },
  bodyText: {
    fontFamily: 'Inter',
    fontSize: 16,
    fontWeight: '400',
    color: '#E5E7EB',
    textAlign: 'center',
    lineHeight: 25.6,
    maxWidth: 320,
    marginTop: 24,
  },

  // TRUST SIGNALS
  trustSignalsRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 12,
    marginTop: 24,
  },
  trustBadge: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  trustCheck: {
    fontSize: 12,
    color: '#10B981', // Growth Green
    fontWeight: '900',
    marginRight: 4,
  },
  trustText: {
    fontFamily: 'Inter',
    fontSize: 12,
    fontWeight: '600',
    color: '#818CF8', // Accent
  },
  
  spacer: {
    flex: 1,
    minHeight: 48,
  },

  // BOTTOM SECTION (CTA)
  bottomSection: {
    width: '100%',
    alignItems: 'center',
  },
  buttonWrapper: {
    width: '100%',
  },
  buttonShadow: {
    shadowColor: '#A855F7',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.5,
    shadowRadius: 16,
    elevation: 8,
    width: '100%',
  },
  buttonGradient: {
    width: '100%',
    height: 60,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    flexDirection: 'row',
  },
  buttonText: {
    fontFamily: 'Inter',
    fontSize: 18,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  
  // SECONDARY CTA
  secondaryCtaContainer: {
    marginTop: 16,
    paddingVertical: 8,
    paddingHorizontal: 16,
  },
  secondaryCtaText: {
    fontFamily: 'Inter',
    fontSize: 14,
    fontWeight: '600',
    color: '#818CF8',
    textDecorationLine: 'underline',
  },

  // BOTTOM TRUST MARK
  bottomTrustContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 24,
    opacity: 0.8,
  },
  lockIcon: {
    fontSize: 12,
    marginRight: 6,
  },
  bottomTrustText: {
    fontFamily: 'Inter',
    fontSize: 12,
    fontWeight: '600',
    color: '#9CA3AF',
  },
});
