import React, { useState } from 'react';
import { KeyboardAvoidingView, Platform, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { COLORS, FONT } from '../../../lib/theme';
import { OnboardingTopBar } from '../../../components/OnboardingTopBar';
import { Button } from '../../../components/ui/Button';
import { Surface } from '../../../components/ui/Surface';

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
    <SafeAreaView style={{ flex: 1, backgroundColor: COLORS.bg }}>
      <OnboardingTopBar step={0} totalSteps={6} accent={A} />
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }}>
        <View style={{ flex: 1, paddingHorizontal: 20, paddingTop: 32, paddingBottom: 20 }}>
          <Text style={{ color: COLORS.textMuted, fontSize: 13, fontFamily: FONT }}>Let's get started</Text>
          <Text style={{ color: COLORS.fg, fontSize: 34, fontWeight: '900', letterSpacing: -0.8, lineHeight: 38, marginTop: 6, fontFamily: FONT }}>What should we call you?</Text>
          <Text style={{ color: COLORS.textMuted, fontSize: 15, marginTop: 8, marginBottom: 26, lineHeight: 22, fontFamily: FONT }}>
            First name only. CLAWW uses it to personalise everything from here on.
          </Text>
          <Surface radius={16} padding={0} borderColor={name.length > 0 ? 'rgba(59,130,246,0.55)' : undefined}>
            <TextInput
              value={name}
              onChangeText={setName}
              onSubmitEditing={next}
              placeholder="Your first name"
              placeholderTextColor={COLORS.textFaint}
              autoFocus
              autoCapitalize="words"
              returnKeyType="next"
              accessibilityLabel="Your first name"
              style={{ height: 58, color: COLORS.fg, fontSize: 20, fontWeight: '700', paddingHorizontal: 18, fontFamily: FONT }}
            />
          </Surface>
          <View style={{ flex: 1 }} />
          <Button variant="primary" size="lg" fullWidth disabled={!canAdvance} onPress={next}>
            Continue
          </Button>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
