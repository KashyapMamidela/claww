import React, { useState } from 'react';
import { KeyboardAvoidingView, Platform, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { COLORS, FONT } from '../../../lib/theme';
import { OnboardingTopBar } from '../../../components/OnboardingTopBar';
import { Button } from '../../../components/ui/Button';

const G = COLORS.green;
const TOTAL_STEPS = 5;

export default function NutritionSetupDetails() {
  const router = useRouter();
  const params = useLocalSearchParams<{ height: string; weight: string; age: string; gender: string; goal: string; activityLevel: string; dietaryRestrictions: string }>();
  const [height, setHeight] = useState(params.height ?? '');
  const [weight, setWeight] = useState(params.weight ?? '');
  const [age, setAge] = useState(params.age ?? '');

  const canAdvance = Number(height) > 0 && Number(weight) > 0 && Number(age) > 0;

  const next = () => {
    if (!canAdvance) return;
    router.push({
      pathname: '/screens/nutrition-setup/goal',
      params: { ...params, height, weight, age },
    });
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#050505' }}>
      <OnboardingTopBar step={0} totalSteps={TOTAL_STEPS} accent={G} />
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }}>
        <View style={{ flex: 1, paddingHorizontal: 24, paddingTop: 38, paddingBottom: 24 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 14 }}>
            <View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: G }} />
            <Text style={{ color: G, fontSize: 10, fontWeight: '700', letterSpacing: 1, fontFamily: FONT }}>NUTRITION TARGETS</Text>
          </View>
          <Text style={{ color: '#fff', fontSize: 28, fontWeight: '900', letterSpacing: -0.6, lineHeight: 32, fontFamily: FONT }}>
            Your details
          </Text>
          <Text style={{ color: '#71717A', fontSize: 13, marginTop: 10, marginBottom: 26, lineHeight: 19, fontFamily: FONT }}>
            We'll calculate a starting point from these, then you can adjust anything before saving.
          </Text>

          <View style={{ flexDirection: 'row', gap: 10 }}>
            <View style={{ flex: 1, minWidth: 0 }}>
              <Text style={{ color: '#71717A', fontSize: 10.5, marginBottom: 6, marginLeft: 2, fontFamily: FONT }}>Height (cm)</Text>
              <TextInput
                value={height}
                onChangeText={setHeight}
                placeholder="e.g. 175"
                placeholderTextColor="#52525B"
                keyboardType="numeric"
                autoFocus
                style={inputStyle(height.length > 0)}
              />
            </View>
            <View style={{ flex: 1, minWidth: 0 }}>
              <Text style={{ color: '#71717A', fontSize: 10.5, marginBottom: 6, marginLeft: 2, fontFamily: FONT }}>Weight (kg)</Text>
              <TextInput
                value={weight}
                onChangeText={setWeight}
                placeholder="e.g. 70"
                placeholderTextColor="#52525B"
                keyboardType="numeric"
                style={inputStyle(weight.length > 0)}
              />
            </View>
            <View style={{ flex: 0.7, minWidth: 0 }}>
              <Text style={{ color: '#71717A', fontSize: 10.5, marginBottom: 6, marginLeft: 2, fontFamily: FONT }}>Age (yrs)</Text>
              <TextInput
                value={age}
                onChangeText={setAge}
                placeholder="e.g. 28"
                placeholderTextColor="#52525B"
                keyboardType="numeric"
                onSubmitEditing={next}
                style={inputStyle(age.length > 0)}
              />
            </View>
          </View>
          <Text style={{ color: '#52525B', fontSize: 10.5, marginTop: 10, lineHeight: 15, fontFamily: FONT }}>
            Age matters here because your calorie burn rate changes with it — it's part of the BMR formula we use.
          </Text>

          <View style={{ flex: 1 }} />
          <Button variant="primary" accent={G} accentDeep={COLORS.greenDeep} size="lg" fullWidth disabled={!canAdvance} onPress={next}>
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
    height: 54,
    backgroundColor: '#151517',
    borderWidth: 1,
    borderColor: active ? COLORS.greenBorder : 'rgba(255,255,255,0.12)',
    borderRadius: 14,
    color: '#fff',
    fontSize: 15,
    fontWeight: '600' as const,
    paddingHorizontal: 16,
    fontFamily: FONT,
  };
}
