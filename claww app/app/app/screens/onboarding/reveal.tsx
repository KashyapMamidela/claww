import React, { useEffect, useRef, useState } from 'react';
import { cleanStyles, equipmentFromStyles, goalOption } from '../../../lib/onboardingChoices';
import { Animated, Image, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { COLORS, FONT } from '../../../lib/theme';
import { OnboardingTopBar } from '../../../components/OnboardingTopBar';
import { Button } from '../../../components/ui/Button';
import { Icon } from '../../../components/ui/Icon';
import { supabase } from '../../../lib/supabase';
import { useAppState } from '../../../lib/appState';
import { MEDICAL_DISCLAIMER_ACK_LABEL, MEDICAL_DISCLAIMER_BODY } from '../../../lib/medicalDisclaimer';
import { track, AnalyticsEvent } from '../../../lib/analytics';
import { invalidateProfile } from '../../../lib/profileStore';

const GENDER_ACCENTS: Record<string, string> = {
  male: '#3B82F6',
  female: '#EC4899',
  other: '#A855F7',
};

export default function OnboardingReveal() {
  const router = useRouter();
  const { name, age, gender, goalChoice, styles } = useLocalSearchParams<{ name: string; age: string; gender: string; goalChoice: string; styles: string }>();
  const { setUserName } = useAppState();
  const [saving, setSaving] = useState(false);
  const [disclaimerAcked, setDisclaimerAcked] = useState(false);

  const accent = GENDER_ACCENTS[gender ?? ''] ?? COLORS.blue;
  const tileScale = useRef(new Animated.Value(0.6)).current;

  useEffect(() => {
    Animated.spring(tileScale, { toValue: 1, useNativeDriver: true, speed: 12, bounciness: 12 }).start();
  }, []);

  const handleEnter = async () => {
    if (saving || !disclaimerAcked) return;
    setSaving(true);

    setUserName((name ?? '').trim());
    const trainStyles = cleanStyles((styles ?? '').split(',').filter(Boolean));

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
          workoutDefaults: { modalities: ['strength' as const], activityLevel: 'moderate' as const, styles: trainStyles },
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
    <SafeAreaView style={{ flex: 1, backgroundColor: '#050505' }}>
      <OnboardingTopBar step={5} totalSteps={6} accent={accent} />
      <View style={{ flex: 1, paddingHorizontal: 24, paddingBottom: 30, alignItems: 'center', justifyContent: 'center' }}>
        <Animated.View
          style={{
            width: 84,
            height: 84,
            borderRadius: 22,
            backgroundColor: accent,
            alignItems: 'center',
            justifyContent: 'center',
            marginBottom: 26,
            transform: [{ scale: tileScale }],
            shadowColor: accent,
            shadowOffset: { width: 0, height: 8 },
            shadowOpacity: 0.35,
            shadowRadius: 17,
            elevation: 10,
          }}
        >
          <Image source={require('../../../assets/logo-mark.png')} style={{ width: 46, height: 46 }} resizeMode="contain" />
        </Animated.View>

        <Text style={{ color: accent, fontSize: 11, fontWeight: '700', letterSpacing: 1.2, marginBottom: 8, fontFamily: FONT }}>
          PROFILE READY
        </Text>
        <Text
          style={{
            color: '#fff',
            fontSize: 28,
            fontWeight: '900',
            letterSpacing: -0.6,
            marginBottom: 8,
            textAlign: 'center',
            lineHeight: 32,
            fontFamily: FONT,
          }}
        >
          You're in, {(name ?? '').trim() || 'there'}.
        </Text>
        <Text
          style={{
            color: COLORS.textMuted,
            fontSize: 13,
            marginBottom: 34,
            lineHeight: 20,
            maxWidth: 280,
            textAlign: 'center',
            fontFamily: FONT,
          }}
        >
          Training and nutrition targets are tuned for a {age ?? '—'}-year-old
          {genderLabel ? ` — ${genderLabel.toLowerCase()}` : ''}. Ready to start?
        </Text>

        <View
          style={{
            width: '100%',
            backgroundColor: '#151517',
            borderWidth: 1,
            borderColor: 'rgba(255,255,255,0.08)',
            borderRadius: 14,
            padding: 14,
            marginBottom: 18,
          }}
        >
          <Text style={{ color: '#A1A1AA', fontSize: 12, lineHeight: 17, fontFamily: FONT, marginBottom: 12 }}>
            {MEDICAL_DISCLAIMER_BODY}
          </Text>
          <TouchableOpacity
            activeOpacity={0.8}
            onPress={() => setDisclaimerAcked((v) => !v)}
            style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}
          >
            <View
              style={{
                width: 20,
                height: 20,
                borderRadius: 6,
                borderWidth: 1.5,
                borderColor: disclaimerAcked ? accent : 'rgba(255,255,255,0.25)',
                backgroundColor: disclaimerAcked ? accent : 'transparent',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              {disclaimerAcked ? <Icon name="check" size={13} color="#fff" strokeWidth={3} /> : null}
            </View>
            <Text style={{ flex: 1, color: '#fff', fontSize: 13, fontWeight: '600', fontFamily: FONT }}>
              {MEDICAL_DISCLAIMER_ACK_LABEL}
            </Text>
          </TouchableOpacity>
        </View>

        <Button
          variant="primary"
          accent={accent}
          accentDeep={accent}
          size="lg"
          fullWidth
          onPress={handleEnter}
          disabled={saving || !disclaimerAcked}
        >
          Enter CLAWW
        </Button>
      </View>
    </SafeAreaView>
  );
}
