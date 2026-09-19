import React, { useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Animated,
  Dimensions,
  Image,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

interface WelcomeScreenProps {
  onGetStarted: () => void;
}

export default function WelcomeScreen({ onGetStarted }: WelcomeScreenProps) {
  // Animation values
  const logoOpacity = useRef(new Animated.Value(0)).current;
  const logoTranslateY = useRef(new Animated.Value(-20)).current;

  const headlineOpacity = useRef(new Animated.Value(0)).current;
  const headlineTranslateY = useRef(new Animated.Value(20)).current;

  const subheadingOpacity = useRef(new Animated.Value(0)).current;
  const subheadingTranslateY = useRef(new Animated.Value(20)).current;

  const bodyOpacity = useRef(new Animated.Value(0)).current;
  const bodyTranslateY = useRef(new Animated.Value(20)).current;

  const buttonOpacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    // Logo fades in from top (400ms)
    Animated.parallel([
      Animated.timing(logoOpacity, {
        toValue: 1,
        duration: 400,
        useNativeDriver: true,
      }),
      Animated.timing(logoTranslateY, {
        toValue: 0,
        duration: 400,
        useNativeDriver: true,
      }),
    ]).start();

    // Text elements fade in from bottom, staggered
    Animated.sequence([
      Animated.delay(100), // Start slightly after logo starts
      Animated.stagger(100, [
        Animated.parallel([
          Animated.timing(headlineOpacity, { toValue: 1, duration: 300, useNativeDriver: true }),
          Animated.timing(headlineTranslateY, { toValue: 0, duration: 300, useNativeDriver: true }),
        ]),
        Animated.parallel([
          Animated.timing(subheadingOpacity, { toValue: 1, duration: 300, useNativeDriver: true }),
          Animated.timing(subheadingTranslateY, { toValue: 0, duration: 300, useNativeDriver: true }),
        ]),
        Animated.parallel([
          Animated.timing(bodyOpacity, { toValue: 1, duration: 300, useNativeDriver: true }),
          Animated.timing(bodyTranslateY, { toValue: 0, duration: 300, useNativeDriver: true }),
        ]),
      ]),
      // Button appears last
      Animated.timing(buttonOpacity, {
        toValue: 1,
        duration: 200,
        useNativeDriver: true,
      }),
    ]).start();
  }, []);

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.topSection}>
        <Animated.View
          style={{
            opacity: logoOpacity,
            transform: [{ translateY: logoTranslateY }],
            alignItems: 'center',
            marginTop: 32, // Padding from safe area
          }}
        >
          {/* Logo Placeholder */}
          <View style={styles.logo}>
            <Text style={styles.logoText}>AP</Text>
          </View>
        </Animated.View>
      </View>

      <View style={styles.middleSection}>
        <Animated.Text
          style={[
            styles.headline,
            {
              opacity: headlineOpacity,
              transform: [{ translateY: headlineTranslateY }],
            },
          ]}
        >
          Welcome to Claww 🚀
        </Animated.Text>

        <Animated.Text
          style={[
            styles.subheading,
            {
              opacity: subheadingOpacity,
              transform: [{ translateY: subheadingTranslateY }],
            },
          ]}
        >
          Your AI-powered fitness coach tailored to YOUR body.
        </Animated.Text>

        <Animated.Text
          style={[
            styles.bodyText,
            {
              opacity: bodyOpacity,
              transform: [{ translateY: bodyTranslateY }],
            },
          ]}
        >
          Let's create your personalized fitness profile in just 2 minutes.
        </Animated.Text>
      </View>

      <View style={styles.bottomSection}>
        <Animated.View style={{ opacity: buttonOpacity, width: '100%' }}>
          <TouchableOpacity
            style={styles.button}
            activeOpacity={0.8}
            onPress={onGetStarted}
          >
            <Text style={styles.buttonText}>Get Started</Text>
          </TouchableOpacity>
        </Animated.View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0B0F14',
    paddingHorizontal: 24, // Assumed standard width padding
  },
  topSection: {
    alignItems: 'center',
    marginBottom: 40, // Logo to headline gap
  },
  logo: {
    width: 80,
    height: 80,
    backgroundColor: '#1E293B',
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  logoText: {
    color: '#FFFFFF',
    fontSize: 24,
    fontWeight: 'bold',
  },
  middleSection: {
    flex: 1,
    justifyContent: 'center',
  },
  headline: {
    color: '#FFFFFF',
    fontSize: 32,
    fontWeight: '700',
    fontFamily: 'Inter',
    marginBottom: 12,
  },
  subheading: {
    color: '#FFFFFF',
    fontSize: 20,
    fontWeight: '600',
    fontFamily: 'Inter',
    marginBottom: 12,
  },
  bodyText: {
    color: '#9CA3AF',
    fontSize: 16,
    fontWeight: '400',
    fontFamily: 'Inter',
    lineHeight: 24,
  },
  bottomSection: {
    paddingBottom: 32, // Bottom button padding
    alignItems: 'center',
  },
  button: {
    backgroundColor: '#2563EB',
    height: 48,
    width: '100%',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  buttonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
});
