import React, { useEffect, useRef, useState } from 'react';
import { Animated, Image, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { COLORS, FONT } from '../../../lib/theme';
import { OnboardingTopBar } from '../../../components/OnboardingTopBar';
import { Button } from '../../../components/ui/Button';
import { supabase } from '../../../lib/supabase';
import { useAppState } from '../../../lib/appState';

const GENDER_ACCENTS: Record<string, string> = {
  male: '#3B82F6',
  female: '#EC4899',
  other: '#A855F7',
};

export default function OnboardingReveal() {
  const router = useRouter();
  const { name, age, gender } = useLocalSearchParams<{ name: string; age: string; gender: string }>();
  const { setUserName } = useAppState();
  const [saving, setSaving] = useState(false);

  const accent = GENDER_ACCENTS[gender ?? ''] ?? COLORS.blue;
  const tileScale = useRef(new Animated.Value(0.6)).current;

  useEffect(() => {
    Animated.spring(tileScale, { toValue: 1, useNativeDriver: true, speed: 12, bounciness: 12 }).start();
  }, []);

  const handleEnter = async () => {
    if (saving) return;
    setSaving(true);

    setUserName((name ?? '').trim());

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
          workoutDefaults: null,
          nutritionDefaults: null,
        };
        const { error } = await supabase
          .from('profiles')
          .update({
            name: name ?? '',
            age: age ? Number(age) : null,
            gender: gender ?? null,
            personalization_profile: personalizationProfile,
          })
          .eq('id', user.id);
        if (error) console.warn('[Claww] Failed to save onboarding profile:', error.message);
      } else {
        console.warn('[Claww] No authenticated user; skipping profile write until sign-up is wired in.');
      }
    } catch (e) {
      console.warn('[Claww] Profile save error:', e);
    }

    router.replace('/(tabs)');
  };

  const genderLabel = gender ? gender.charAt(0).toUpperCase() + gender.slice(1) : null;

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#050505' }}>
      <OnboardingTopBar step={3} accent={accent} />
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

        <Text style={{ color: accent, fontSize: 10.5, fontWeight: '700', letterSpacing: 1.2, marginBottom: 8, fontFamily: FONT }}>
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
            color: '#71717A',
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

        <Button variant="primary" accent={accent} accentDeep={accent} size="lg" fullWidth onPress={handleEnter} disabled={saving}>
          ENTER CLAWW 🦅
        </Button>
      </View>
    </SafeAreaView>
  );
}
