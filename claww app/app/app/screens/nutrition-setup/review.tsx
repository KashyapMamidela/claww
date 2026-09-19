import React, { useState } from 'react';
import { Text, TextInput, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { COLORS, FONT } from '../../../lib/theme';
import { useAppState } from '../../../lib/appState';
import { OnboardingTopBar } from '../../../components/OnboardingTopBar';
import { Button } from '../../../components/ui/Button';
import { Icon } from '../../../components/ui/Icon';
import { ErrorCard } from '../../../components/ui/ErrorCard';
import {
  computeNutritionSample,
  saveNutritionTargets,
  type ActivityLevel,
  type DietaryRestriction,
  type Goal,
  type NutritionDefaults,
} from '../../../lib/data';

const G = COLORS.green;
const TOTAL_STEPS = 5;

export default function NutritionSetupReview() {
  const router = useRouter();
  const { userId } = useAppState();
  const { height, weight, age, gender, goal, activityLevel, dietaryRestrictions } = useLocalSearchParams<{
    height: string;
    weight: string;
    age: string;
    gender: string;
    goal: string;
    activityLevel: string;
    dietaryRestrictions: string;
  }>();

  const [sample, setSample] = useState<NutritionDefaults | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const restrictions = (dietaryRestrictions ?? '').split(',').filter(Boolean) as DietaryRestriction[];

  const handleCalculate = () => {
    setSample(
      computeNutritionSample({
        height: Number(height),
        weight: Number(weight),
        age: Number(age),
        gender: gender || null,
        goal: (goal as Goal) || null,
        activityLevel: activityLevel as ActivityLevel,
      })
    );
  };

  const handleSave = async () => {
    if (!sample || !userId) return;
    setSaving(true);
    setError(null);
    const ok = await saveNutritionTargets(userId, sample, restrictions);
    setSaving(false);
    if (!ok) {
      setError('Could not save your targets — check your connection and try again.');
      return;
    }
    router.dismissTo('/(tabs)/nutrition');
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#050505' }}>
      <OnboardingTopBar step={4} totalSteps={TOTAL_STEPS} accent={G} showBack={!saving} />
      <View style={{ flex: 1, paddingHorizontal: 24, paddingTop: 38, paddingBottom: 24 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 14 }}>
          <View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: G }} />
          <Text style={{ color: G, fontSize: 10, fontWeight: '700', letterSpacing: 1, fontFamily: FONT }}>READY</Text>
        </View>
        <Text style={{ color: '#fff', fontSize: 28, fontWeight: '900', letterSpacing: -0.6, lineHeight: 32, fontFamily: FONT }}>
          Your nutrition targets
        </Text>

        {!sample ? (
          <>
            <Text style={{ color: '#71717A', fontSize: 13, marginTop: 10, marginBottom: 30, lineHeight: 19, fontFamily: FONT }}>
              We'll calculate a starting point from everything you just entered — you can adjust anything before saving.
            </Text>
            <View style={{ flex: 1 }} />
            <Button
              variant="primary"
              accent={G}
              accentDeep={COLORS.greenDeep}
              size="lg"
              fullWidth
              onPress={handleCalculate}
              icon={<Icon name="sparkles" size={16} color="#fff" />}
            >
              Calculate Sample Plan
            </Button>
          </>
        ) : (
          <>
            <Text style={{ color: '#71717A', fontSize: 13, marginTop: 10, marginBottom: 22, lineHeight: 19, fontFamily: FONT }}>
              Adjust anything below, then save.
            </Text>
            <View style={{ gap: 10, marginBottom: 22 }}>
              {(
                [
                  ['Calories (kcal)', 'calories'],
                  ['Protein (g)', 'protein_g'],
                  ['Carbs (g)', 'carbs_g'],
                  ['Fats (g)', 'fats_g'],
                ] as const
              ).map(([label, key]) => (
                <View key={key} style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                  <Text style={{ color: '#A1A1AA', fontSize: 13, fontFamily: FONT, width: 130 }}>{label}</Text>
                  <TextInput
                    value={String(sample[key])}
                    onChangeText={(v) => setSample({ ...sample, [key]: Number(v) || 0 })}
                    keyboardType="numeric"
                    style={{
                      flex: 1,
                      height: 46,
                      backgroundColor: '#151517',
                      borderWidth: 1,
                      borderColor: COLORS.greenBorder,
                      borderRadius: 14,
                      color: '#fff',
                      fontSize: 15,
                      fontWeight: '600',
                      paddingHorizontal: 16,
                      fontFamily: FONT,
                    }}
                  />
                </View>
              ))}
            </View>

            <View style={{ flex: 1 }} />

            {error ? (
              <View style={{ marginBottom: 12 }}>
                <ErrorCard message={error} onRetry={handleSave} retrying={saving} />
              </View>
            ) : null}

            <Button variant="primary" accent={G} accentDeep={COLORS.greenDeep} size="lg" fullWidth disabled={saving} onPress={handleSave}>
              {saving ? 'Saving…' : 'Save Targets'}
            </Button>
            <TouchableOpacity onPress={() => setSample(null)} style={{ alignSelf: 'center', marginTop: 14 }}>
              <Text style={{ color: '#71717A', fontSize: 12.5, fontFamily: FONT }}>Recalculate from inputs</Text>
            </TouchableOpacity>
          </>
        )}
      </View>
    </SafeAreaView>
  );
}
