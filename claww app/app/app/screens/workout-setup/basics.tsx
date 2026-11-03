import React, { useEffect, useState } from 'react';
import { KeyboardAvoidingView, Platform, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { COLORS, FONT } from '../../../lib/theme';
import { OnboardingTopBar } from '../../../components/OnboardingTopBar';
import { Button } from '../../../components/ui/Button';
import { ProfileBasicsCard } from '../../../components/ProfileBasicsCard';
import { useAppState } from '../../../lib/appState';
import { basicsSummary, hasBasics, profileBasics, useProfile } from '../../../lib/profile';

const A = COLORS.blue;
const TOTAL_STEPS = 8;

export default function WorkoutSetupBasics() {
  const router = useRouter();
  const { userId } = useAppState();
  const { profile } = useProfile(userId);
  const basics = profileBasics(profile);
  // NG PHASE 2: height and weight come from the profile; ask only when it doesn't have them, or to correct.
  const known = hasBasics(basics, ['heightCm', 'weightKg']);
  const [editing, setEditing] = useState(false);
  const [height, setHeight] = useState('');
  const [weight, setWeight] = useState('');

  useEffect(() => {
    if (basics.heightCm && !height) setHeight(String(basics.heightCm));
    if (basics.weightKg && !weight) setWeight(String(basics.weightKg));
    // fill once, when the profile arrives; never overwrite what the user is typing
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [basics.heightCm, basics.weightKg]);

  const showInputs = !known || editing;

  const canAdvance = Number(height) > 0 && Number(weight) > 0;

  const next = () => {
    if (!canAdvance) return;
    router.push({ pathname: '/screens/workout-setup/equipment', params: { height, weight } });
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#050505' }}>
      <OnboardingTopBar step={0} totalSteps={TOTAL_STEPS} accent={A} />
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }}>
        <View style={{ flex: 1, paddingHorizontal: 24, paddingTop: 38, paddingBottom: 24 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 14 }}>
            <View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: A }} />
            <Text style={{ color: A, fontSize: 10, fontWeight: '700', letterSpacing: 1, fontFamily: FONT }}>BUILD YOUR PLAN</Text>
          </View>
          <Text style={{ color: '#fff', fontSize: 28, fontWeight: '900', letterSpacing: -0.6, lineHeight: 32, fontFamily: FONT }}>
            {showInputs ? 'Height & weight?' : 'Your details'}
          </Text>
          <Text style={{ color: COLORS.textMuted, fontSize: 13, marginTop: 10, marginBottom: 30, lineHeight: 19, fontFamily: FONT }}>
            A few details so CLAWW can build a plan that actually fits you — this feeds generation directly, and only exercises
            from our catalog are ever used.
          </Text>

          {showInputs ? null : (
            <ProfileBasicsCard summary={basicsSummary(basics, ['heightCm', 'weightKg'])} accent={A} onEdit={() => setEditing(true)} />
          )}

          <View style={{ flexDirection: 'row', gap: 10, display: showInputs ? 'flex' : 'none' }}>
            <TextInput
              value={height}
              onChangeText={setHeight}
              placeholder="Height (cm)"
              placeholderTextColor="#52525B"
              keyboardType="numeric"
              autoFocus={showInputs}
              style={inputStyle(height.length > 0)}
            />
            <TextInput
              value={weight}
              onChangeText={setWeight}
              placeholder="Weight (kg)"
              placeholderTextColor="#52525B"
              keyboardType="numeric"
              onSubmitEditing={next}
              style={inputStyle(weight.length > 0)}
            />
          </View>

          <View style={{ flex: 1 }} />
          <Button variant="primary" accent={A} accentDeep={COLORS.blueDeep} size="lg" fullWidth disabled={!canAdvance} onPress={next}>
            Continue
          </Button>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

function inputStyle(active: boolean) {
  return {
    flex: 1,
    minWidth: 0,
    height: 58,
    backgroundColor: '#151517',
    borderWidth: 1,
    borderColor: active ? 'rgba(59,130,246,0.5)' : 'rgba(255,255,255,0.12)',
    borderRadius: 16,
    color: '#fff',
    fontSize: 18,
    fontWeight: '700' as const,
    paddingHorizontal: 16,
    fontFamily: FONT,
  };
}
