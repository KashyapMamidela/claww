import React, { useState } from 'react';
import { Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { COLORS, FONT } from '../../../lib/theme';
import { OnboardingTopBar } from '../../../components/OnboardingTopBar';
import { Button } from '../../../components/ui/Button';
import { Chip } from '../../../components/ui/Chip';
import type { DietaryRestriction } from '../../../lib/data';

const G = COLORS.green;
const TOTAL_STEPS = 5;

const OPTIONS: { value: DietaryRestriction; label: string }[] = [
  { value: 'vegetarian', label: 'Vegetarian' },
  { value: 'vegan', label: 'Vegan' },
  { value: 'gluten_free', label: 'Gluten-Free' },
  { value: 'dairy_free', label: 'Dairy-Free' },
  { value: 'nut_allergy', label: 'Nut Allergy' },
  { value: 'shellfish_allergy', label: 'Shellfish Allergy' },
  { value: 'halal', label: 'Halal' },
  { value: 'kosher', label: 'Kosher' },
];

export default function NutritionSetupDietary() {
  const router = useRouter();
  const params = useLocalSearchParams<{
    height: string;
    weight: string;
    age: string;
    gender: string;
    goal: string;
    activityLevel: string;
    dietaryRestrictions: string;
  }>();
  const [dietaryRestrictions, setDietaryRestrictions] = useState<DietaryRestriction[]>(
    (params.dietaryRestrictions ?? '').split(',').filter(Boolean) as DietaryRestriction[]
  );

  const toggle = (d: DietaryRestriction) => {
    setDietaryRestrictions((prev) => (prev.includes(d) ? prev.filter((x) => x !== d) : [...prev, d]));
  };

  const next = () => {
    router.push({
      pathname: '/screens/nutrition-setup/review',
      params: { ...params, dietaryRestrictions: dietaryRestrictions.join(',') },
    });
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#050505' }}>
      <OnboardingTopBar step={3} totalSteps={TOTAL_STEPS} accent={G} showBack />
      <View style={{ flex: 1, paddingHorizontal: 24, paddingTop: 38, paddingBottom: 24 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 14 }}>
          <View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: G }} />
          <Text style={{ color: G, fontSize: 10, fontWeight: '700', letterSpacing: 1, fontFamily: FONT }}>LAST THING</Text>
        </View>
        <Text style={{ color: '#fff', fontSize: 28, fontWeight: '900', letterSpacing: -0.6, lineHeight: 32, fontFamily: FONT }}>
          Dietary restrictions?
        </Text>
        <Text style={{ color: '#71717A', fontSize: 13, marginTop: 10, marginBottom: 26, lineHeight: 19, fontFamily: FONT }}>
          Optional — we'll steer meal suggestions and AI estimates away from anything that conflicts with these.
        </Text>

        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10 }}>
          {OPTIONS.map((opt) => (
            <Chip key={opt.value} active={dietaryRestrictions.includes(opt.value)} accent={G} accentDeep={COLORS.greenDeep} onPress={() => toggle(opt.value)}>
              {opt.label}
            </Chip>
          ))}
        </View>

        <View style={{ flex: 1 }} />
        <Button variant="primary" accent={G} accentDeep={COLORS.greenDeep} size="lg" fullWidth onPress={next}>
          Continue
        </Button>
      </View>
    </SafeAreaView>
  );
}
