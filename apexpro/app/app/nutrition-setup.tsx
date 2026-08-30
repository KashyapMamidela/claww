import React, { useEffect, useState } from 'react';
import { ScrollView, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { COLORS, FONT } from '../lib/theme';
import { useAppState } from '../lib/appState';
import {
  getProfile,
  computeNutritionSample,
  saveNutritionTargets,
  type ActivityLevel,
  type DietaryRestriction,
  type Goal,
  type NutritionDefaults,
} from '../lib/data';
import { Icon } from '../components/ui/Icon';
import { Button } from '../components/ui/Button';
import { Chip } from '../components/ui/Chip';

const G = { deep: COLORS.greenDeep, bright: COLORS.green, border: COLORS.greenBorder };

const GOALS: { value: Goal; label: string }[] = [
  { value: 'muscle_gain', label: 'Build Muscle' },
  { value: 'fat_loss', label: 'Lose Fat' },
  { value: 'endurance', label: 'Endurance' },
  { value: 'maintenance', label: 'Maintain' },
  { value: 'flexibility', label: 'Flexibility' },
];

const ACTIVITY: { value: ActivityLevel; label: string }[] = [
  { value: 'sedentary', label: 'Sedentary' },
  { value: 'moderate', label: 'Moderately Active' },
  { value: 'active', label: 'Very Active' },
];

const DIETARY: { value: DietaryRestriction; label: string }[] = [
  { value: 'vegetarian', label: 'Vegetarian' },
  { value: 'vegan', label: 'Vegan' },
  { value: 'gluten_free', label: 'Gluten-Free' },
  { value: 'dairy_free', label: 'Dairy-Free' },
  { value: 'nut_allergy', label: 'Nut Allergy' },
  { value: 'shellfish_allergy', label: 'Shellfish Allergy' },
  { value: 'halal', label: 'Halal' },
  { value: 'kosher', label: 'Kosher' },
];

export default function NutritionSetupScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { userId } = useAppState();

  const [loading, setLoading] = useState(true);
  const [height, setHeight] = useState('');
  const [weight, setWeight] = useState('');
  const [age, setAge] = useState('');
  const [gender, setGender] = useState<string | null>(null);
  const [goal, setGoal] = useState<Goal | null>(null);
  const [activityLevel, setActivityLevel] = useState<ActivityLevel | null>(null);
  const [dietaryRestrictions, setDietaryRestrictions] = useState<DietaryRestriction[]>([]);

  const [sample, setSample] = useState<NutritionDefaults | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!userId) return;
    getProfile(userId).then((profile) => {
      if (profile) {
        if (profile.height) setHeight(String(profile.height));
        if (profile.weight) setWeight(String(profile.weight));
        if (profile.age) setAge(String(profile.age));
        setGender(profile.gender);
        setGoal(profile.goal);
        setActivityLevel(profile.personalization_profile?.workoutDefaults?.activityLevel ?? null);
        setDietaryRestrictions(profile.personalization_profile?.dietaryRestrictions ?? []);
      }
      setLoading(false);
    });
  }, [userId]);

  const toggleDietary = (d: DietaryRestriction) => {
    setDietaryRestrictions((prev) => (prev.includes(d) ? prev.filter((x) => x !== d) : [...prev, d]));
  };

  const canCalculate = Number(height) > 0 && Number(weight) > 0 && Number(age) > 0 && !!goal && !!activityLevel;

  const handleCalculate = () => {
    if (!canCalculate || !goal || !activityLevel) return;
    setSample(
      computeNutritionSample({
        height: Number(height),
        weight: Number(weight),
        age: Number(age),
        gender,
        goal,
        activityLevel,
      })
    );
  };

  const handleSave = async () => {
    if (!sample || !userId) return;
    setSaving(true);
    setError(null);
    const ok = await saveNutritionTargets(userId, sample, dietaryRestrictions);
    setSaving(false);
    if (!ok) {
      setError('Could not save your targets — check your connection and try again.');
      return;
    }
    router.dismissTo('/(tabs)/nutrition');
  };

  if (loading) {
    return <View style={{ flex: 1, backgroundColor: COLORS.bg }} />;
  }

  return (
    <View style={{ flex: 1, backgroundColor: COLORS.bg }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, paddingTop: insets.top + 20, paddingHorizontal: 20, paddingBottom: 4 }}>
        <TouchableOpacity
          activeOpacity={0.8}
          onPress={() => router.back()}
          style={{
            width: 34,
            height: 34,
            borderRadius: 10,
            backgroundColor: '#151517',
            borderWidth: 1,
            borderColor: 'rgba(255,255,255,0.10)',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <Icon name="x" size={16} color="#A1A1AA" />
        </TouchableOpacity>
        <Text style={{ color: '#fff', fontSize: 16, fontWeight: '800', fontFamily: FONT }}>Nutrition Targets</Text>
      </View>

      <ScrollView contentContainerStyle={{ paddingHorizontal: 20, paddingTop: 18, paddingBottom: 32 }}>
        <Text style={{ color: '#71717A', fontSize: 13, lineHeight: 19, marginBottom: 22, fontFamily: FONT }}>
          We'll calculate a starting point from your details, then you can adjust anything before saving.
        </Text>

        <Text style={{ color: '#fff', fontSize: 13, fontWeight: '700', marginBottom: 10, fontFamily: FONT }}>Your Details</Text>
        <View style={{ flexDirection: 'row', gap: 10, marginBottom: 4 }}>
          <View style={{ flex: 1, minWidth: 0 }}>
            <Text style={{ color: '#71717A', fontSize: 10.5, marginBottom: 5, marginLeft: 2, fontFamily: FONT }}>Height (cm)</Text>
            <TextInput
              value={height}
              onChangeText={setHeight}
              placeholder="e.g. 175"
              placeholderTextColor="#52525B"
              keyboardType="numeric"
              style={inputStyle(height.length > 0)}
            />
          </View>
          <View style={{ flex: 1, minWidth: 0 }}>
            <Text style={{ color: '#71717A', fontSize: 10.5, marginBottom: 5, marginLeft: 2, fontFamily: FONT }}>Weight (kg)</Text>
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
            <Text style={{ color: '#71717A', fontSize: 10.5, marginBottom: 5, marginLeft: 2, fontFamily: FONT }}>Age (yrs)</Text>
            <TextInput
              value={age}
              onChangeText={setAge}
              placeholder="e.g. 28"
              placeholderTextColor="#52525B"
              keyboardType="numeric"
              style={inputStyle(age.length > 0)}
            />
          </View>
        </View>
        <Text style={{ color: '#52525B', fontSize: 10.5, marginBottom: 14, marginLeft: 2, fontFamily: FONT }}>
          Age matters here because your calorie burn rate changes with it — it's part of the BMR formula we use.
        </Text>

        <Text style={{ color: '#fff', fontSize: 13, fontWeight: '700', marginBottom: 10, fontFamily: FONT }}>Goal</Text>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 18 }}>
          {GOALS.map((g) => (
            <Chip key={g.value} active={goal === g.value} accent={G.bright} accentDeep={G.deep} onPress={() => setGoal(g.value)}>
              {g.label}
            </Chip>
          ))}
        </View>

        <Text style={{ color: '#fff', fontSize: 13, fontWeight: '700', marginBottom: 10, fontFamily: FONT }}>Activity Level</Text>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 22 }}>
          {ACTIVITY.map((a) => (
            <Chip
              key={a.value}
              active={activityLevel === a.value}
              accent={G.bright}
              accentDeep={G.deep}
              onPress={() => setActivityLevel(a.value)}
            >
              {a.label}
            </Chip>
          ))}
        </View>

        <Text style={{ color: '#fff', fontSize: 13, fontWeight: '700', marginBottom: 4, fontFamily: FONT }}>
          Dietary Restrictions (optional)
        </Text>
        <Text style={{ color: '#52525B', fontSize: 10.5, marginBottom: 10, fontFamily: FONT }}>
          We'll steer meal suggestions and AI estimates away from anything that conflicts with these.
        </Text>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 22 }}>
          {DIETARY.map((d) => (
            <Chip
              key={d.value}
              active={dietaryRestrictions.includes(d.value)}
              accent={G.bright}
              accentDeep={G.deep}
              onPress={() => toggleDietary(d.value)}
            >
              {d.label}
            </Chip>
          ))}
        </View>

        {!sample ? (
          <Button
            variant="primary"
            accent={G.bright}
            accentDeep={G.deep}
            size="lg"
            fullWidth
            disabled={!canCalculate}
            onPress={handleCalculate}
            icon={<Icon name="sparkles" size={16} color="#fff" />}
          >
            Calculate Sample Plan
          </Button>
        ) : (
          <>
            <Text style={{ color: '#fff', fontSize: 13, fontWeight: '700', marginBottom: 10, fontFamily: FONT }}>
              Your sample targets — adjust anything below
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
                    style={[inputStyle(true), { flex: 1, height: 46 }]}
                  />
                </View>
              ))}
            </View>

            {error ? <Text style={{ color: COLORS.danger, fontSize: 12.5, marginBottom: 12, fontFamily: FONT }}>{error}</Text> : null}

            <Button variant="primary" accent={G.bright} accentDeep={G.deep} size="lg" fullWidth disabled={saving} onPress={handleSave}>
              {saving ? 'Saving…' : 'Save Targets'}
            </Button>
            <TouchableOpacity onPress={() => setSample(null)} style={{ alignSelf: 'center', marginTop: 14 }}>
              <Text style={{ color: '#71717A', fontSize: 12.5, fontFamily: FONT }}>Recalculate from inputs</Text>
            </TouchableOpacity>
          </>
        )}
      </ScrollView>
    </View>
  );
}

function inputStyle(active: boolean) {
  return {
    flex: 1,
    minWidth: 0,
    height: 54,
    backgroundColor: COLORS.card,
    borderWidth: 1,
    borderColor: active ? G.border : 'rgba(255,255,255,0.12)',
    borderRadius: 14,
    color: '#fff',
    fontSize: 15,
    fontWeight: '600' as const,
    paddingHorizontal: 16,
    fontFamily: FONT,
  };
}
