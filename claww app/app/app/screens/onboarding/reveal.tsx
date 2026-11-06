import React, { useEffect, useRef, useState } from 'react';
import { cleanStyles, cleanWeekdays, equipmentFromStyles, goalOption } from '../../../lib/onboardingChoices';
import { WEEKDAY_NAMES } from '../../../lib/trainingWeek';
import { Animated, Image, Text, View } from 'react-native';
import Svg, { Circle, Defs, RadialGradient, Stop } from 'react-native-svg';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { COLORS, FONT } from '../../../lib/theme';
import { OnboardingTopBar } from '../../../components/OnboardingTopBar';
import { Button } from '../../../components/ui/Button';
import { Icon } from '../../../components/ui/Icon';
import { PressScale } from '../../../components/ui/PressScale';
import { Surface } from '../../../components/ui/Surface';
import { supabase } from '../../../lib/supabase';
import { useAppState } from '../../../lib/appState';
import { MEDICAL_DISCLAIMER_ACK_LABEL, MEDICAL_DISCLAIMER_BODY } from '../../../lib/medicalDisclaimer';
import { track, AnalyticsEvent } from '../../../lib/analytics';
import { invalidateProfile } from '../../../lib/profileStore';


export default function OnboardingReveal() {
  const router = useRouter();
  const { name, age, gender, goalChoice, styles, days } = useLocalSearchParams<{ name: string; age: string; gender: string; goalChoice: string; styles: string; days?: string }>();
  const { setUserName } = useAppState();
  const [saving, setSaving] = useState(false);
  const [disclaimerAcked, setDisclaimerAcked] = useState(false);

  const tileScale = useRef(new Animated.Value(0.6)).current;

  useEffect(() => {
    Animated.spring(tileScale, { toValue: 1, useNativeDriver: true, speed: 12, bounciness: 12 }).start();
  }, []);

  const handleEnter = async () => {
    if (saving || !disclaimerAcked) return;
    setSaving(true);

    setUserName((name ?? '').trim());
    const trainStyles = cleanStyles((styles ?? '').split(',').filter(Boolean));
    // The weekdays picked on the train screen (Monday 0), saved so the setup after this does not ask for days again.
    const dayIdx = cleanWeekdays((days ?? '').split(',').filter(Boolean).map(Number));
    const trainingDays = dayIdx.map((i) => WEEKDAY_NAMES[i]);

    // Persist to Supabase when a session exists; onboarding currently runs
    // before sign-up, so skip silently otherwise.
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (user) {
        const personalizationProfile = {
          name: name ?? '',
          age: age ? Number(age) : null,
          gender: gender ?? null,
          // Polish step 2: the goal and how the user trains were asked first; setup then asks days, time and injuries.
          goalChoice: goalOption(goalChoice)?.id ?? 'muscle',
          workoutDefaults: {
            modalities: ['strength' as const],
            activityLevel: 'moderate' as const,
            styles: trainStyles,
            ...(trainingDays.length >= 2 ? { daysPerWeek: trainingDays.length, trainingDays } : {}),
          },
          nutritionDefaults: null,
        };
        const { error } = await supabase
          .from('profiles')
          .update({
            name: name ?? '',
            age: age ? Number(age) : null,
            gender: gender ?? null,
            goal: goalOption(goalChoice)?.goal ?? 'muscle_gain',
            equipment: equipmentFromStyles(trainStyles),
            personalization_profile: personalizationProfile,
            medical_disclaimer_acknowledged_at: new Date().toISOString(),
          })
          .eq('id', user.id);
        invalidateProfile();
        if (error) console.warn('[Claww] Failed to save onboarding profile:', error.message);
      } else {
        console.warn('[Claww] No authenticated user; skipping profile write until sign-up is wired in.');
      }
    } catch (e) {
      console.warn('[Claww] Profile save error:', e);
    }

    track(AnalyticsEvent.OnboardingCompleted);
    // Then days, time and anything that hurts (the same setup screen, goal and place already answered), then the
    // reminder soft-ask (V2 PHASE 3.2) from the schedule screen.
    router.replace({ pathname: '/workout-setup', params: { onboarding: '1' } });
  };

  const genderLabel = gender ? gender.charAt(0).toUpperCase() + gender.slice(1) : null;

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: COLORS.bg }}>
      <OnboardingTopBar step={5} totalSteps={6} accent={COLORS.blue} />
      <View style={{ flex: 1, paddingHorizontal: 20, paddingBottom: 20, alignItems: 'center', justifyContent: 'center' }}>
        <Animated.View style={{ width: 180, height: 180, alignItems: 'center', justifyContent: 'center', marginBottom: 14, transform: [{ scale: tileScale }] }}>
          <Svg width={180} height={180} viewBox="0 0 200 200" style={{ position: 'absolute' }}>
            <Defs>
              <RadialGradient id="revealHalo" cx="50%" cy="50%" r="50%">
                <Stop offset="0" stopColor={COLORS.blue} stopOpacity="0.5" />
                <Stop offset="0.45" stopColor={COLORS.blue} stopOpacity="0.12" />
                <Stop offset="1" stopColor={COLORS.blue} stopOpacity="0" />
              </RadialGradient>
            </Defs>
            <Circle cx="100" cy="100" r="95" fill="url(#revealHalo)" />
          </Svg>
          <Image source={require('../../../assets/logo-mark.png')} style={{ width: 84, height: 80 }} resizeMode="contain" />
        </Animated.View>

        <Text style={{ color: COLORS.textMuted, fontSize: 13, marginBottom: 6, fontFamily: FONT }}>Your profile is ready</Text>
        <Text style={{ color: COLORS.fg, fontSize: 32, fontWeight: '900', letterSpacing: -0.8, marginBottom: 8, textAlign: 'center', lineHeight: 38, fontFamily: FONT }}>
          You're in, {(name ?? '').trim() || 'there'}.
        </Text>
        <Text style={{ color: COLORS.textMuted, fontSize: 15, marginBottom: 24, lineHeight: 22, maxWidth: 300, textAlign: 'center', fontFamily: FONT }}>
          Training and nutrition targets are tuned for a {age ?? '—'}-year-old{genderLabel ? `, ${genderLabel.toLowerCase()}` : ''}.
        </Text>

        <Surface padding={16} style={{ width: '100%', marginBottom: 18 }}>
          <Text style={{ color: COLORS.textMuted, fontSize: 13, lineHeight: 19, fontFamily: FONT, marginBottom: 14 }}>{MEDICAL_DISCLAIMER_BODY}</Text>
          <PressScale onPress={() => setDisclaimerAcked((v) => !v)} accessibilityRole="checkbox" accessibilityState={{ checked: disclaimerAcked }} accessibilityLabel={MEDICAL_DISCLAIMER_ACK_LABEL}>
            <View style={{ minHeight: 44, flexDirection: 'row', alignItems: 'center', gap: 12 }}>
              <View
                style={{
                  width: 24,
                  height: 24,
                  borderRadius: 7,
                  borderWidth: 1.5,
                  borderColor: disclaimerAcked ? COLORS.blue : 'rgba(255,255,255,0.25)',
                  backgroundColor: disclaimerAcked ? COLORS.blue : 'transparent',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                {disclaimerAcked ? <Icon name="check" size={14} color="#fff" strokeWidth={3} /> : null}
              </View>
              <Text style={{ flex: 1, color: COLORS.fg, fontSize: 14, fontWeight: '600', fontFamily: FONT }}>{MEDICAL_DISCLAIMER_ACK_LABEL}</Text>
            </View>
          </PressScale>
        </Surface>

        <Button variant="primary" size="lg" fullWidth onPress={handleEnter} disabled={saving || !disclaimerAcked}>
          Enter CLAWW
        </Button>
      </View>
    </SafeAreaView>
  );
}
