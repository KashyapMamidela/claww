import React, { useCallback, useState } from 'react';
import { Image, ScrollView, Text, TextInput, TouchableOpacity, View } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useFocusEffect } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { COLORS, FONT } from '../lib/theme';
import { useAppState, type EstimatedMeal, type MealLogRow, type MealType } from '../lib/appState';
import { getProfile, type DietaryRestriction, type PortionSize } from '../lib/data';
import { Icon } from '../components/ui/Icon';
import { Button } from '../components/ui/Button';
import { ErrorCard } from '../components/ui/ErrorCard';

const G = { deep: COLORS.greenDeep, bright: COLORS.green, border: COLORS.greenBorder };

interface Suggestion {
  label: string;
  violates: DietaryRestriction[];
}

const SUGGESTIONS: Record<string, Suggestion[]> = {
  Breakfast: [
    { label: 'Oatmeal with fruit', violates: [] },
    { label: 'Chia pudding', violates: [] },
    { label: 'Scrambled eggs & toast', violates: ['vegan', 'gluten_free'] },
    { label: 'Greek yogurt & granola', violates: ['vegan', 'dairy_free', 'gluten_free'] },
    { label: 'Protein smoothie', violates: [] },
    { label: 'Avocado toast', violates: ['gluten_free'] },
  ],
  Lunch: [
    { label: 'Lentil soup', violates: [] },
    { label: 'Grilled chicken & rice', violates: ['vegetarian', 'vegan'] },
    { label: 'Turkey sandwich', violates: ['vegetarian', 'vegan', 'gluten_free'] },
    { label: 'Caesar salad', violates: ['vegetarian', 'vegan', 'dairy_free'] },
    { label: 'Chicken burrito bowl', violates: ['vegetarian', 'vegan'] },
    { label: 'Veggie stir fry', violates: ['gluten_free'] },
  ],
  Snack: [
    { label: 'Protein bar', violates: [] },
    { label: 'Apple & peanut butter', violates: ['nut_allergy'] },
    { label: 'Mixed nuts', violates: ['nut_allergy'] },
    { label: 'Greek yogurt', violates: ['vegan', 'dairy_free'] },
    { label: 'Protein shake', violates: [] },
  ],
  Dinner: [
    { label: 'Stir-fried tofu & rice', violates: ['gluten_free'] },
    { label: 'Grilled salmon & veggies', violates: ['vegetarian', 'vegan'] },
    { label: 'Pasta with meat sauce', violates: ['vegetarian', 'vegan', 'gluten_free'] },
    { label: 'Steak & sweet potato', violates: ['vegetarian', 'vegan'] },
    { label: 'Chicken curry & rice', violates: ['vegetarian', 'vegan'] },
  ],
};

const PORTIONS: { value: PortionSize; label: string; hint: string }[] = [
  { value: 'small', label: 'Small', hint: '~0.7x' },
  { value: 'regular', label: 'Regular', hint: '1x' },
  { value: 'large', label: 'Large', hint: '~1.4x' },
];

export default function MealLogScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { mealType } = useLocalSearchParams<{ mealType: string }>();
  const { userId, estimateMealText, estimateMealPhoto, saveMeal } = useAppState();
  const [text, setText] = useState('');
  const [portion, setPortion] = useState<PortionSize>('regular');
  const [photo, setPhoto] = useState<{ uri: string; base64: string; mimeType: string } | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [dietaryRestrictions, setDietaryRestrictions] = useState<DietaryRestriction[]>([]);

  // SHIP PHASE 8 follow-up — review-before-save. `reviewing` holds the raw
  // estimate + editable string fields (numeric TextInputs need a string,
  // not a number, to let a user clear a field while typing) until they
  // confirm; `logged` holds the actually-saved row, shown as a real
  // confirmation instead of a silent router.back().
  const [reviewing, setReviewing] = useState<EstimatedMeal | null>(null);
  const [reviewFields, setReviewFields] = useState({ calories: '', protein_g: '', carbs_g: '', fats_g: '' });
  const [logged, setLogged] = useState<MealLogRow | null>(null);

  useFocusEffect(
    useCallback(() => {
      if (!userId) return;
      let cancelled = false;
      getProfile(userId).then((profile) => {
        if (!cancelled) setDietaryRestrictions(profile?.personalization_profile?.dietaryRestrictions ?? []);
      });
      return () => {
        cancelled = true;
      };
    }, [userId])
  );

  const allSuggestions = SUGGESTIONS[mealType ?? ''] ?? SUGGESTIONS.Snack;
  const suggestions = allSuggestions.filter((s) => !s.violates.some((v) => dietaryRestrictions.includes(v)));
  const canSubmit = (text.trim().length > 0 || photo) && !saving;

  const pickPhoto = async (source: 'camera' | 'library') => {
    setError(null);
    const permission =
      source === 'camera'
        ? await ImagePicker.requestCameraPermissionsAsync()
        : await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      setError(`CLAWW needs ${source === 'camera' ? 'camera' : 'photo library'} access to estimate from a photo.`);
      return;
    }

    // No forced crop — a meal photo's real framing matters for accurate
    // estimation, and a fixed 4:3 crop was cutting off part of the plate.
    const options: ImagePicker.ImagePickerOptions = { mediaTypes: 'images', base64: true, quality: 0.5 };
    const result = source === 'camera'
      ? await ImagePicker.launchCameraAsync(options)
      : await ImagePicker.launchImageLibraryAsync(options);

    if (result.canceled || !result.assets?.[0]?.base64) return;
    const asset = result.assets[0];
    setPhoto({ uri: asset.uri, base64: asset.base64!, mimeType: asset.mimeType ?? 'image/jpeg' });
    setText('');
  };

  // Step 1: estimate only — never saves. Populates the review step below so
  // a bad guess can be corrected before it's ever written to meal_logs.
  const handleEstimate = async () => {
    if (!canSubmit) return;
    setSaving(true);
    setError(null);

    const result = photo
      ? await estimateMealPhoto((mealType as MealType) ?? 'Snack', `data:${photo.mimeType};base64,${photo.base64}`, portion)
      : await estimateMealText((mealType as MealType) ?? 'Snack', text.trim(), portion);

    setSaving(false);
    if (!result.ok || !result.meal) {
      setError(result.reason ?? "Couldn't estimate that meal — check your connection and try again.");
      return;
    }
    setReviewing(result.meal);
    setReviewFields({
      calories: String(Math.round(result.meal.calories)),
      protein_g: String(Math.round(result.meal.protein_g)),
      carbs_g: String(Math.round(result.meal.carbs_g)),
      fats_g: String(Math.round(result.meal.fats_g)),
    });
  };

  // Step 2: user reviewed (and maybe edited) the estimate — this is the only
  // place that actually saves. An empty/invalid field falls back to the
  // original estimate for that field rather than saving a garbage 0.
  const handleConfirmLog = async () => {
    if (!reviewing || saving) return;
    setSaving(true);
    setError(null);

    const parsed = (value: string, fallback: number) => {
      const n = Number(value);
      return Number.isFinite(n) && value.trim() !== '' ? n : fallback;
    };
    const finalMeal: EstimatedMeal = {
      description: reviewing.description,
      calories: parsed(reviewFields.calories, reviewing.calories),
      protein_g: parsed(reviewFields.protein_g, reviewing.protein_g),
      carbs_g: parsed(reviewFields.carbs_g, reviewing.carbs_g),
      fats_g: parsed(reviewFields.fats_g, reviewing.fats_g),
    };

    const inserted = await saveMeal((mealType as MealType) ?? 'Snack', finalMeal);
    setSaving(false);
    if (!inserted) {
      setError("Couldn't log that meal — check your connection and try again.");
      return;
    }
    setLogged(inserted);
  };

  const handleEditEstimate = () => {
    setReviewing(null);
    setError(null);
  };

  // Post-log confirmation — shows exactly what was saved, real numbers from
  // the inserted row, not the pre-edit estimate. Replaces the old silent
  // router.back() with something a user can actually verify against what
  // they just confirmed.
  if (logged) {
    return (
      <View style={{ flex: 1, backgroundColor: '#050505', alignItems: 'center', justifyContent: 'center', paddingHorizontal: 24 }}>
        <View
          style={{
            width: 64,
            height: 64,
            borderRadius: 18,
            backgroundColor: G.border,
            alignItems: 'center',
            justifyContent: 'center',
            marginBottom: 20,
          }}
        >
          <Icon name="check-circle-2" size={30} color={G.bright} />
        </View>
        <Text style={{ color: '#fff', fontSize: 20, fontWeight: '900', marginBottom: 6, fontFamily: FONT, textAlign: 'center' }}>
          Logged: {logged.description}
        </Text>
        <Text style={{ color: '#71717A', fontSize: 12.5, marginBottom: 24, fontFamily: FONT }}>{logged.meal_type ?? mealType}</Text>

        <View style={{ flexDirection: 'row', gap: 10, width: '100%', marginBottom: 28 }}>
          {[
            { label: 'Calories', value: Math.round(logged.calories ?? 0) },
            { label: 'Protein', value: `${Math.round(logged.protein_g ?? 0)}g` },
            { label: 'Carbs', value: `${Math.round(logged.carbs_g ?? 0)}g` },
            { label: 'Fats', value: `${Math.round(logged.fats_g ?? 0)}g` },
          ].map((s) => (
            <View
              key={s.label}
              style={{
                flex: 1,
                backgroundColor: '#151517',
                borderWidth: 1,
                borderColor: 'rgba(255,255,255,0.08)',
                borderRadius: 14,
                paddingVertical: 12,
                alignItems: 'center',
              }}
            >
              <Text style={{ color: '#fff', fontSize: 15, fontWeight: '800', fontFamily: FONT }}>{s.value}</Text>
              <Text style={{ color: '#71717A', fontSize: 9.5, marginTop: 2, fontFamily: FONT }}>{s.label}</Text>
            </View>
          ))}
        </View>

        <Button variant="primary" accent={G.bright} accentDeep={G.deep} size="lg" fullWidth onPress={() => router.back()}>
          Done
        </Button>
      </View>
    );
  }

  // Review-before-save — the estimate is never written to meal_logs until
  // the user confirms here, matching the workout confirm-before-log pattern.
  // Macro fields are editable; the description carries over as-is.
  if (reviewing) {
    const field = (key: keyof typeof reviewFields, label: string, suffix: string) => (
      <View style={{ flex: 1 }}>
        <Text style={{ color: '#71717A', fontSize: 10.5, marginBottom: 6, fontFamily: FONT }}>{label}</Text>
        <View
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            backgroundColor: '#151517',
            borderWidth: 1,
            borderColor: 'rgba(255,255,255,0.12)',
            borderRadius: 12,
            paddingHorizontal: 12,
          }}
        >
          <TextInput
            value={reviewFields[key]}
            onChangeText={(v) => setReviewFields((f) => ({ ...f, [key]: v.replace(/[^0-9]/g, '') }))}
            keyboardType="number-pad"
            style={{ flex: 1, color: '#fff', fontSize: 16, fontWeight: '700', fontFamily: FONT, paddingVertical: 12 }}
          />
          <Text style={{ color: '#71717A', fontSize: 11, fontFamily: FONT }}>{suffix}</Text>
        </View>
      </View>
    );

    return (
      <View style={{ flex: 1, backgroundColor: '#050505' }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, paddingTop: insets.top + 26, paddingHorizontal: 20, paddingBottom: 4 }}>
          <TouchableOpacity
            activeOpacity={0.8}
            onPress={handleEditEstimate}
            style={{ width: 34, height: 34, borderRadius: 10, backgroundColor: '#151517', borderWidth: 1, borderColor: 'rgba(255,255,255,0.10)', alignItems: 'center', justifyContent: 'center' }}
          >
            <Icon name="chevron-left" size={16} color="#A1A1AA" />
          </TouchableOpacity>
          <Text style={{ color: '#fff', fontSize: 16, fontWeight: '800', fontFamily: FONT }}>Review estimate</Text>
        </View>

        <ScrollView contentContainerStyle={{ paddingHorizontal: 20, paddingTop: 22, paddingBottom: 24 }}>
          <Text style={{ color: '#71717A', fontSize: 12, marginBottom: 4, fontFamily: FONT }}>Does this look right? Adjust anything before logging it.</Text>
          <Text style={{ color: '#fff', fontSize: 20, fontWeight: '800', marginBottom: 20, fontFamily: FONT }}>{reviewing.description}</Text>

          <View style={{ flexDirection: 'row', gap: 10, marginBottom: 12 }}>
            {field('calories', 'Calories', 'kcal')}
            {field('protein_g', 'Protein', 'g')}
          </View>
          <View style={{ flexDirection: 'row', gap: 10 }}>
            {field('carbs_g', 'Carbs', 'g')}
            {field('fats_g', 'Fats', 'g')}
          </View>

          {error ? (
            <View style={{ marginTop: 16 }}>
              <ErrorCard message={error} onRetry={handleConfirmLog} retrying={saving} />
            </View>
          ) : null}

          <View style={{ marginTop: 24, gap: 10 }}>
            <Button variant="primary" accent={G.bright} accentDeep={G.deep} size="lg" fullWidth disabled={saving} onPress={handleConfirmLog}>
              {saving ? 'Logging…' : 'Looks good, log it'}
            </Button>
            <Button variant="ghost" size="md" fullWidth onPress={handleEditEstimate} disabled={saving}>
              Edit meal instead
            </Button>
          </View>
        </ScrollView>
      </View>
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: '#050505' }}>
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          gap: 12,
          paddingTop: insets.top + 26,
          paddingHorizontal: 20,
          paddingBottom: 4,
        }}
      >
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
        <Text style={{ color: '#fff', fontSize: 16, fontWeight: '800', fontFamily: FONT }}>Log {mealType || 'a Meal'}</Text>
      </View>

      <ScrollView contentContainerStyle={{ paddingHorizontal: 20, paddingTop: 22, paddingBottom: 24 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 10 }}>
          <View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: G.bright }} />
          <Text style={{ color: G.bright, fontSize: 10, fontWeight: '700', letterSpacing: 0.9, fontFamily: FONT }}>WHAT DID YOU EAT?</Text>
        </View>
        <Text style={{ color: '#fff', fontSize: 24, fontWeight: '900', letterSpacing: -0.5, marginBottom: 14, lineHeight: 29, fontFamily: FONT }}>
          Just tell us — in your own words.
        </Text>

        {!photo && (
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 14 }} contentContainerStyle={{ gap: 8 }}>
            {suggestions.map((s) => (
              <TouchableOpacity
                key={s.label}
                activeOpacity={0.8}
                onPress={() => setText(s.label)}
                style={{
                  backgroundColor: text === s.label ? G.border : '#151517',
                  borderWidth: 1,
                  borderColor: text === s.label ? 'rgba(34,197,94,0.4)' : 'rgba(255,255,255,0.12)',
                  borderRadius: 100,
                  paddingHorizontal: 14,
                  paddingVertical: 9,
                }}
              >
                <Text style={{ color: text === s.label ? G.bright : '#A1A1AA', fontSize: 12.5, fontWeight: '600', fontFamily: FONT }}>
                  {s.label}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        )}

        {photo ? (
          <View
            style={{
              borderRadius: 18,
              borderWidth: 1,
              borderColor: G.border,
              overflow: 'hidden',
              marginBottom: 8,
            }}
          >
            <Image source={{ uri: photo.uri }} style={{ width: '100%', height: 220 }} resizeMode="cover" />
            <TouchableOpacity
              activeOpacity={0.85}
              onPress={() => setPhoto(null)}
              style={{
                position: 'absolute',
                top: 10,
                right: 10,
                width: 30,
                height: 30,
                borderRadius: 9,
                backgroundColor: 'rgba(0,0,0,0.6)',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Icon name="x" size={15} color="#fff" />
            </TouchableOpacity>
          </View>
        ) : (
          <TextInput
            value={text}
            onChangeText={setText}
            placeholder="e.g. grilled chicken with rice"
            placeholderTextColor="#52525B"
            multiline
            numberOfLines={3}
            style={{
              backgroundColor: '#151517',
              borderWidth: 1,
              borderColor: text.length > 0 ? G.border : 'rgba(255,255,255,0.12)',
              borderRadius: 18,
              color: '#fff',
              fontSize: 17,
              fontWeight: '500',
              padding: 16,
              minHeight: 96,
              textAlignVertical: 'top',
              fontFamily: FONT,
              lineHeight: 24,
            }}
          />
        )}
        <Text style={{ color: '#52525B', fontSize: 11, marginTop: 8, marginHorizontal: 2, fontFamily: FONT }}>
          {photo
            ? 'CLAWW will read this photo and estimate calories and macros.'
            : 'Portion size, brand, or a rough guess all work — CLAWW fills in the rest.'}
        </Text>

        <Text style={{ color: '#fff', fontSize: 13, fontWeight: '700', marginTop: 22, marginBottom: 10, fontFamily: FONT }}>
          How much did you have?
        </Text>
        <View style={{ flexDirection: 'row', gap: 8, marginBottom: 4 }}>
          {PORTIONS.map((p) => (
            <TouchableOpacity
              key={p.value}
              activeOpacity={0.8}
              onPress={() => setPortion(p.value)}
              style={{
                flex: 1,
                alignItems: 'center',
                paddingVertical: 12,
                borderRadius: 14,
                backgroundColor: portion === p.value ? G.border : '#151517',
                borderWidth: 1,
                borderColor: portion === p.value ? 'rgba(34,197,94,0.4)' : 'rgba(255,255,255,0.12)',
              }}
            >
              <Text style={{ color: portion === p.value ? G.bright : '#fff', fontSize: 13, fontWeight: '700', fontFamily: FONT }}>
                {p.label}
              </Text>
              <Text style={{ color: portion === p.value ? G.bright : '#71717A', fontSize: 10, marginTop: 1, fontFamily: FONT }}>
                {p.hint}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
        <Text style={{ color: '#52525B', fontSize: 11, marginTop: 8, marginHorizontal: 2, fontFamily: FONT }}>
          This scales the estimate up or down — pick what matches your plate.
        </Text>

        {error ? (
          <View style={{ marginTop: 16 }}>
            <ErrorCard message={error} onRetry={canSubmit ? handleEstimate : undefined} retrying={saving} />
          </View>
        ) : null}

        <View style={{ marginTop: 22 }}>
          <Button
            variant="primary"
            accent={G.bright}
            accentDeep={G.deep}
            size="lg"
            fullWidth
            disabled={!canSubmit}
            onPress={handleEstimate}
            icon={<Icon name="sparkles" size={17} color="#fff" />}
          >
            {saving ? 'Estimating…' : photo ? 'Estimate from Photo' : 'Estimate Meal'}
          </Button>
        </View>

        {!photo && (
          <>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: 22, marginBottom: 16 }}>
              <View style={{ flex: 1, height: 1, backgroundColor: 'rgba(255,255,255,0.08)' }} />
              <Text style={{ color: '#52525B', fontSize: 10.5, fontWeight: '700', letterSpacing: 0.8, fontFamily: FONT }}>OR</Text>
              <View style={{ flex: 1, height: 1, backgroundColor: 'rgba(255,255,255,0.08)' }} />
            </View>

            <View style={{ flexDirection: 'row', gap: 10 }}>
              <TouchableOpacity
                activeOpacity={0.8}
                onPress={() => pickPhoto('camera')}
                style={{
                  flex: 1,
                  flexDirection: 'row',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 8,
                  borderWidth: 1,
                  borderStyle: 'dashed',
                  borderColor: 'rgba(255,255,255,0.14)',
                  borderRadius: 16,
                  paddingVertical: 14,
                }}
              >
                <Icon name="camera" size={16} color="#71717A" />
                <Text style={{ color: '#A1A1AA', fontSize: 12.5, fontWeight: '600', fontFamily: FONT }}>Take Photo</Text>
              </TouchableOpacity>
              <TouchableOpacity
                activeOpacity={0.8}
                onPress={() => pickPhoto('library')}
                style={{
                  flex: 1,
                  flexDirection: 'row',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 8,
                  borderWidth: 1,
                  borderStyle: 'dashed',
                  borderColor: 'rgba(255,255,255,0.14)',
                  borderRadius: 16,
                  paddingVertical: 14,
                }}
              >
                <Icon name="image" size={16} color="#71717A" />
                <Text style={{ color: '#A1A1AA', fontSize: 12.5, fontWeight: '600', fontFamily: FONT }}>Choose Photo</Text>
              </TouchableOpacity>
            </View>
          </>
        )}
      </ScrollView>
    </View>
  );
}
