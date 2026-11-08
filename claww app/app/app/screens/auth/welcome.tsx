import React from 'react';
import { Image, ScrollView, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Svg, { Circle, Defs, RadialGradient, Stop } from 'react-native-svg';
import { useRouter } from 'expo-router';
import { COLORS, FONT, FONT_HAND, BG, bg } from '../../../lib/theme';
import { Button } from '../../../components/ui/Button';

// Polish step 9 (board "Welcome"): the white logo on black with the blue glow behind it, one promise, one pen note,
// two buttons. The same logo animation plays at app start (components/SplashIntro.tsx); this screen is its resting state.
export default function WelcomeScreen() {
  const router = useRouter();

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: COLORS.bg }}>
      <ScrollView contentContainerStyle={{ flexGrow: 1, paddingHorizontal: 20, paddingBottom: 28 }} showsVerticalScrollIndicator={false}>
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', gap: 28, paddingVertical: 24 }}>
          <View style={{ width: 200, height: 200, alignItems: 'center', justifyContent: 'center' }} accessibilityRole="image" accessibilityLabel="CLAWW logo">
            <Svg width={200} height={200} viewBox="0 0 200 200" style={{ position: 'absolute' }}>
              <Defs>
                <RadialGradient id="welcomeHalo" cx="50%" cy="50%" r="50%">
                  <Stop offset="0" stopColor={COLORS.blue} stopOpacity="0.5" />
                  <Stop offset="0.45" stopColor={COLORS.blue} stopOpacity="0.12" />
                  <Stop offset="1" stopColor={COLORS.blue} stopOpacity="0" />
                </RadialGradient>
              </Defs>
              <Circle cx="100" cy="100" r="85" fill="url(#welcomeHalo)" opacity={0.8} />
            </Svg>
            <Image source={require('../../../assets/logo-mark.png')} style={{ width: 112, height: 106 }} resizeMode="contain" />
          </View>

          <View style={{ gap: 12, alignItems: 'center' }}>
            <Text style={{ color: COLORS.fg, fontSize: 34, fontVariant: ['tabular-nums'], letterSpacing: -1, lineHeight: 40, textAlign: 'center', fontFamily: BG[800] }}>
              Your coach that{'\n'}fits your real day
            </Text>
            <Text style={{ color: COLORS.textMuted, fontSize: 17, lineHeight: 24, textAlign: 'center', fontFamily: BG[400] }}>
              Workouts and meals planned around your gym, home or hostel. It changes when you do.
            </Text>
          </View>

          <Text style={{ color: COLORS.pen, fontSize: 28, fontFamily: FONT_HAND, transform: [{ rotate: '-2deg' }] }}>about a minute a day</Text>
        </View>

        <View style={{ gap: 12 }}>
          <Button variant="primary" size="lg" fullWidth onPress={() => router.push('/screens/auth/sign-up')}>
            Create my plan
          </Button>
          <Button variant="secondary" size="lg" fullWidth onPress={() => router.push('/screens/auth/sign-in')}>
            I already have an account
          </Button>
          <Text style={{ color: COLORS.textFaint, fontSize: 13, lineHeight: 18, textAlign: 'center', marginTop: 4, fontFamily: BG[400] }}>
            By continuing you agree to the Terms and Privacy Policy.
          </Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
