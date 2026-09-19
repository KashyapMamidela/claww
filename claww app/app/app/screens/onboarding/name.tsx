import React, { useState } from 'react';
import { KeyboardAvoidingView, Platform, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { COLORS, FONT } from '../../../lib/theme';
import { OnboardingTopBar } from '../../../components/OnboardingTopBar';
import { Button } from '../../../components/ui/Button';

const A = COLORS.blue;

export default function OnboardingName() {
  const router = useRouter();
  const [name, setName] = useState('');
  const canAdvance = name.trim().length >= 2;

  const next = () => {
    if (!canAdvance) return;
    router.push({ pathname: '/screens/onboarding/age', params: { name: name.trim() } });
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#050505' }}>
      <OnboardingTopBar step={0} accent={A} />
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }}>
        <View style={{ flex: 1, paddingHorizontal: 24, paddingTop: 38, paddingBottom: 24 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 14 }}>
            <View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: COLORS.green }} />
            <Text style={{ color: COLORS.green, fontSize: 10, fontWeight: '700', letterSpacing: 1, fontFamily: FONT }}>
              LET'S GET STARTED
            </Text>
          </View>
          <Text style={{ color: '#fff', fontSize: 32, fontWeight: '900', letterSpacing: -0.7, lineHeight: 35, fontFamily: FONT }}>
            What should{'\n'}we <Text style={{ color: A }}>call you?</Text>
          </Text>
          <Text style={{ color: '#71717A', fontSize: 13, marginTop: 10, marginBottom: 30, lineHeight: 20, fontFamily: FONT }}>
            First name only — CLAWW uses it to personalize everything from here on.
          </Text>
          <TextInput
            value={name}
            onChangeText={setName}
            onSubmitEditing={next}
            placeholder="Your first name"
            placeholderTextColor="#52525B"
            autoFocus
            autoCapitalize="words"
            returnKeyType="next"
            style={{
              height: 58,
              backgroundColor: '#151517',
              borderWidth: 1,
              borderColor: name.length > 0 ? 'rgba(59,130,246,0.5)' : 'rgba(255,255,255,0.12)',
              borderRadius: 16,
              color: '#fff',
              fontSize: 20,
              fontWeight: '700',
              paddingHorizontal: 18,
              fontFamily: FONT,
            }}
          />
          <View style={{ flex: 1 }} />
          <Button variant="primary" accent={A} accentDeep={COLORS.blueDeep} size="lg" fullWidth disabled={!canAdvance} onPress={next}>
            Continue
          </Button>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
