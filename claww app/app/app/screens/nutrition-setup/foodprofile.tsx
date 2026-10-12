import React, { useEffect, useState } from 'react';
import { ScrollView, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { COLORS, FONT } from '../../../lib/theme';
import { OnboardingTopBar } from '../../../components/OnboardingTopBar';
import { Button } from '../../../components/ui/Button';
import { Chip } from '../../../components/ui/Chip';
import { useAppState } from '../../../lib/appState';
import { getProfile, saveFoodProfile } from '../../../lib/data';
import { AVOID_MAX_LENGTH, CUISINE_OPTIONS, normalizeFoodProfile, type Cuisine } from '../../../lib/foodProfile';

const G = COLORS.green;
const TOTAL_STEPS = 6;

/** V2 PHASE 5.1 — preferred cuisines and foods to avoid. Optional; also reached from Profile with ?edit=1, where it saves and goes back. */
export default function NutritionSetupFoodProfile() {
  const router = useRouter();
  const { userId } = useAppState();
  const { edit, ...params } = useLocalSearchParams<Record<string, string>>();
  const editing = edit === '1';
  const [cuisines, setCuisines] = useState<Cuisine[]>([]);
  const [avoid, setAvoid] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!userId) return;
    getProfile(userId).then((p) => {
      const fp = normalizeFoodProfile(p?.personalization_profile?.foodProfile);
      setCuisines(fp.cuisines);
      setAvoid(fp.avoid);
    });
  }, [userId]);

  const toggle = (c: Cuisine) =>
    setCuisines((prev) => {
      if (c === 'anything') return prev.includes('anything') ? [] : ['anything'];
      const without = prev.filter((x) => x !== 'anything');
      return without.includes(c) ? without.filter((x) => x !== c) : [...without, c];
    });

  const next = async () => {
    if (!userId || saving) return;
    setSaving(true);
    await saveFoodProfile(userId, normalizeFoodProfile({ cuisines, avoid }));
    setSaving(false);
    if (editing) router.back();
    else router.push({ pathname: '/screens/nutrition-setup/review', params });
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#050505' }}>
      <OnboardingTopBar step={4} totalSteps={TOTAL_STEPS} accent={G} showBack />
      <ScrollView contentContainerStyle={{ flexGrow: 1, paddingHorizontal: 24, paddingTop: 38, paddingBottom: 24 }} keyboardShouldPersistTaps="handled">
        <Text style={{ color: '#fff', fontSize: 28, fontWeight: '900', letterSpacing: -0.6, lineHeight: 32, fontFamily: FONT }}>
          What do you like to eat?
        </Text>
        <Text style={{ color: '#71717A', fontSize: 13, marginTop: 10, marginBottom: 22, lineHeight: 19, fontFamily: FONT }}>
          Optional. Meal suggestions will lean toward these and skip what you avoid.
        </Text>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10 }}>
          {CUISINE_OPTIONS.map((o) => (
            <Chip key={o.value} active={cuisines.includes(o.value)} accent={G} accentDeep={COLORS.greenDeep} onPress={() => toggle(o.value)}>
              {o.label}
            </Chip>
          ))}
        </View>
        <Text style={{ color: '#A1A1AA', fontSize: 12, fontWeight: '700', marginTop: 28, marginBottom: 8, fontFamily: FONT }}>Foods to avoid</Text>
        <TextInput
          value={avoid}
          onChangeText={setAvoid}
          maxLength={AVOID_MAX_LENGTH}
          placeholder="e.g. mushrooms, brinjal, mayonnaise"
          placeholderTextColor="#52525B"
          style={{ height: 48, borderRadius: 12, paddingHorizontal: 14, backgroundColor: 'rgba(255,255,255,0.05)', color: '#fff', fontFamily: FONT }}
        />
        <View style={{ flex: 1, minHeight: 24 }} />
        <Button variant="primary" accent={G} accentDeep={COLORS.greenDeep} size="lg" fullWidth onPress={next} disabled={saving}>
          {editing ? 'Save' : 'Continue'}
        </Button>
      </ScrollView>
    </SafeAreaView>
  );
}
