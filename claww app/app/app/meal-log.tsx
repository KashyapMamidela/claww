import React, { useCallback, useState } from 'react';
import { mealForClock } from '../components/nutrition/MealTypePicker';
import { scanPlate, setScanSession } from '../lib/scanner';
import { DEFAULT_CONTEXT, PORTION_FACTOR } from '../lib/engine';
import { describeToItems } from '../lib/describeMeal';
import { startCheck } from '../lib/mealCheck';
import { estimateItem } from '../lib/mealCheckLogic';
import { BackTile } from '../components/ui/BackTile';
import { Image, ScrollView, Text, TextInput, TouchableOpacity, View } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useFocusEffect } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { COLORS, FONT, BG, bg } from '../lib/theme';
import { useAppState, type EstimatedMeal, type MealLogRow, type MealType } from '../lib/appState';
import {
  getMealPhotoHistory,
  getProfile,
  getSignedMealPhotoUrl,
  getTodaysMealLogs,
  didTrainToday,
  uploadMealPhoto,
  type DietaryRestriction,
  type NutritionDefaults,
  type PortionSize,
} from '../lib/data';
import type { FoodProfile } from '../lib/foodProfile';
import { MealSuggestions } from '../components/MealSuggestions';
import { SUGGEST_MEAL_ENABLED } from '../lib/flags';
import { Icon } from '../components/ui/Icon';
import { Surface } from '../components/ui/Surface';
import { Button } from '../components/ui/Button';
import { Chip } from '../components/ui/Chip';
import { Segmented } from '../components/ui/Segmented';
import { ErrorCard } from '../components/ui/ErrorCard';

const G = { deep: COLORS.greenDeep, bright: COLORS.green, border: COLORS.greenBorder };

interface Suggestion {
  label: string;
  violates: DietaryRestriction[];
}

const SUGGESTIONS: Record<string, Suggestion[]> = {
  Breakfast: [
    { label: '2 idli with sambar', violates: [] },
    { label: '2 egg omelette and toast', violates: ['vegan', 'vegetarian', 'gluten_free'] },
    { label: 'Masala dosa', violates: [] },
    { label: 'Poha', violates: [] },
    { label: 'Oats with milk', violates: ['vegan', 'dairy_free', 'gluten_free'] },
    { label: 'Chai and 2 biscuits', violates: ['vegan', 'dairy_free', 'gluten_free'] },
  ],
  Lunch: [
    { label: 'Dal, rice and sabzi', violates: [] },
    { label: '2 roti with paneer curry', violates: ['vegan', 'dairy_free', 'gluten_free'] },
    { label: 'Chicken curry and rice', violates: ['vegetarian', 'vegan'] },
    { label: 'Rajma chawal', violates: [] },
    { label: 'Curd rice', violates: ['vegan', 'dairy_free'] },
    { label: 'Veg biryani and raita', violates: ['vegan', 'dairy_free'] },
  ],
  Snack: [
    { label: 'Chai and samosa', violates: ['vegan', 'dairy_free', 'gluten_free'] },
    { label: 'Banana', violates: [] },
    { label: 'Roasted chana', violates: [] },
    { label: 'Protein shake', violates: [] },
    { label: 'Handful of peanuts', violates: ['nut_allergy'] },
  ],
  Dinner: [
    { label: '2 roti with dal', violates: ['gluten_free'] },
    { label: 'Chicken curry and 2 roti', violates: ['vegetarian', 'vegan', 'gluten_free'] },
    { label: 'Khichdi with curd', violates: ['vegan', 'dairy_free'] },
    { label: 'Egg curry and rice', violates: ['vegetarian', 'vegan'] },
    { label: 'Paneer bhurji and roti', violates: ['vegan', 'dairy_free', 'gluten_free'] },
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

  // Item #24 — a real preference-aware suggestion, not the fixed chip list
  // below. Remaining macros are computed from the user's own real
  // nutrition targets + what they've actually logged today, so the
  // suggestion is grounded rather than freeform.
  const [foodProfile, setFoodProfile] = useState<FoodProfile | undefined>(undefined);
  const [goal, setGoal] = useState<string | null>(null);
  const [eatenNames, setEatenNames] = useState<string[]>([]);
  const [trainedToday, setTrainedToday] = useState(false);
  const [nutritionDefaults, setNutritionDefaults] = useState<NutritionDefaults | null>(null);
  const [consumedToday, setConsumedToday] = useState({ calories: 0, protein_g: 0, carbs_g: 0, fats_g: 0 });

  // SHIP PHASE 8 follow-up — review-before-save. `reviewing` holds the raw
  // estimate + editable string fields (numeric TextInputs need a string,
  // not a number, to let a user clear a field while typing) until they
  // confirm; `logged` holds the actually-saved row, shown as a real
  // confirmation instead of a silent router.back().
  const [reviewing, setReviewing] = useState<EstimatedMeal | null>(null);
  const [reviewFields, setReviewFields] = useState({ calories: '', protein_g: '', carbs_g: '', fats_g: '' });
  const [logged, setLogged] = useState<MealLogRow | null>(null);

  // Item #22 — "you ate this before" quick-pick, so a repeated meal doesn't
  // need a fresh photo every time. History rows come with a photo_url
  // Storage PATH (private bucket), so thumbnails need their own signed
  // URLs before they're displayable — fetched alongside the history itself.
  const [photoHistory, setPhotoHistory] = useState<MealLogRow[]>([]);
  const [photoHistoryUrls, setPhotoHistoryUrls] = useState<Record<string, string>>({});

  useFocusEffect(
    useCallback(() => {
      if (!userId) return;
      let cancelled = false;
      getProfile(userId).then((profile) => {
        if (!cancelled) {
          setDietaryRestrictions(profile?.personalization_profile?.dietaryRestrictions ?? []);
          setNutritionDefaults(profile?.personalization_profile?.nutritionDefaults ?? null);
          setFoodProfile(profile?.personalization_profile?.foodProfile);
          setGoal(profile?.goal ?? null);
        }
      });
      getTodaysMealLogs(userId).then((meals) => {
        if (cancelled) return;
        setConsumedToday({
          calories: meals.reduce((s, m) => s + (m.calories ?? 0), 0),
          protein_g: meals.reduce((s, m) => s + (m.protein_g ?? 0), 0),
          carbs_g: meals.reduce((s, m) => s + (m.carbs_g ?? 0), 0),
          fats_g: meals.reduce((s, m) => s + (m.fats_g ?? 0), 0),
        });
        setEatenNames(meals.map((m) => m.description));
      });
      didTrainToday(userId).then((t) => {
        if (!cancelled) setTrainedToday(t);
      });
      getMealPhotoHistory(userId).then(async (rows) => {
        if (cancelled) return;
        setPhotoHistory(rows);
        const entries = await Promise.all(
          rows.map(async (r) => [r.id, r.photo_url ? await getSignedMealPhotoUrl(r.photo_url) : null] as const)
        );
        if (!cancelled) {
          setPhotoHistoryUrls(Object.fromEntries(entries.filter(([, url]) => url)) as Record<string, string>);
        }
      });
      return () => {
        cancelled = true;
      };
    }, [userId])
  );

  // Reusing a past photographed meal — skip straight to review with its
  // saved macros/description, no re-estimation and no re-upload (same
  // Storage path is reused as-is).
  const reuseHistoryMeal = (row: MealLogRow) => {
    const meal: EstimatedMeal = {
      description: row.description,
      calories: row.calories ?? 0,
      protein_g: row.protein_g ?? 0,
      carbs_g: row.carbs_g ?? 0,
      fats_g: row.fats_g ?? 0,
      photoPath: row.photo_url,
    };
    setReviewing(meal);
    setReviewFields({
      calories: String(Math.round(meal.calories)),
      protein_g: String(Math.round(meal.protein_g)),
      carbs_g: String(Math.round(meal.carbs_g)),
      fats_g: String(Math.round(meal.fats_g)),
    });
  };

  const allSuggestions = SUGGESTIONS[mealType ?? ''] ?? SUGGESTIONS.Snack;
  const suggestions = allSuggestions.filter((s) => !s.violates.some((v) => dietaryRestrictions.includes(v)));
  const canSubmit = (text.trim().length > 0 || photo) && !saving;

  // Item #24 — real remaining budget, not a fabricated number: the user's
  // own saved nutrition targets (or nothing, if they haven't set any up
  // yet) minus what they've actually logged today.
  const remainingMacros = nutritionDefaults
    ? {
        calories: Math.max(0, nutritionDefaults.calories - consumedToday.calories),
        protein_g: Math.max(0, nutritionDefaults.protein_g - consumedToday.protein_g),
        carbs_g: Math.max(0, nutritionDefaults.carbs_g - consumedToday.carbs_g),
        fats_g: Math.max(0, nutritionDefaults.fats_g - consumedToday.fats_g),
      }
    : undefined;

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
    // A photo goes through the same plate check as the Scan button: items in household units you can fix, then log.
    const mime = asset.mimeType ?? 'image/jpeg';
    setScanSession({
      photoUri: asset.uri,
      base64: asset.base64!,
      mimeType: mime,
      source: 'photo',
      mealType: (mealType as string) || mealForClock(new Date().getHours()),
      pending: scanPlate(`data:${mime};base64,${asset.base64}`),
      outcome: null,
      context: DEFAULT_CONTEXT,
    });
    router.push('/scan-check');
  };

  // Step 1: estimate only — never saves. Populates the review step below so
  // a bad guess can be corrected before it's ever written to meal_logs.
  const handleEstimate = async () => {
    if (!canSubmit) return;
    setSaving(true);
    setError(null);

    // Premium: a meal described in words is matched to the food database and checked on the same screen as a plate.
    if (!photo && text.trim()) {
      const items = await describeToItems(text.trim(), PORTION_FACTOR[portion === 'small' ? 'small' : portion === 'large' ? 'large' : 'regular']);
      if (items.some((i) => i.food)) {
        const dish = text.trim().replace(/\s+/g, ' ');
        setSaving(false);
        setScanSession({
          photoUri: '',
          base64: '',
          mimeType: '',
          source: 'text',
          mealType: (mealType as string) || mealForClock(new Date().getHours()),
          pending: Promise.resolve({ ok: true as const, result: { route: 'ok' as const, dish: dish.charAt(0).toUpperCase() + dish.slice(1), confidence: 1, candidates: [], items, oilFood: null, model: 'text' } }),
          outcome: null,
          context: DEFAULT_CONTEXT,
        });
        router.push('/scan-check');
        return;
      }
    }

    const result = photo
      ? await estimateMealPhoto((mealType as MealType) ?? 'Snack', `data:${photo.mimeType};base64,${photo.base64}`, portion)
      : await estimateMealText((mealType as MealType) ?? 'Snack', text.trim(), portion);

    setSaving(false);
    if (!result.ok || !result.meal) {
      setError(result.reason ?? "Couldn't estimate that meal — check your connection and try again.");
      return;
    }
    if (!photo) {
      const dish = text.trim().replace(/\s+/g, ' ');
      const name = dish.charAt(0).toUpperCase() + dish.slice(1);
      startCheck({ source: 'text', mealType: (mealType as string) || mealForClock(new Date().getHours()), dish: name, items: [estimateItem(name, result.meal)] });
      router.push('/scan-check');
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
    // A brand-new photo (not one reused from history, which already carries
    // its own photoPath on `reviewing`) gets uploaded once, right here —
    // not earlier, so cancelling out of the review step never leaves an
    // orphaned upload with no meal_logs row pointing at it.
    const photoPath = reviewing.photoPath ?? (photo ? await uploadMealPhoto(userId!, photo.base64, photo.mimeType) : null);

    const finalMeal: EstimatedMeal = {
      description: reviewing.description,
      calories: parsed(reviewFields.calories, reviewing.calories),
      protein_g: parsed(reviewFields.protein_g, reviewing.protein_g),
      carbs_g: parsed(reviewFields.carbs_g, reviewing.carbs_g),
      fats_g: parsed(reviewFields.fats_g, reviewing.fats_g),
      photoPath,
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
        <Text style={{ color: '#fff', fontSize: 20, fontVariant: ['tabular-nums'], marginBottom: 6, fontFamily: BG[800], textAlign: 'center' }}>
          Logged: {logged.description}
        </Text>
        <Text style={{ color: COLORS.textMuted, fontSize: 13, marginBottom: 24, fontFamily: BG[400] }}>{logged.meal_type ?? mealType}</Text>

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
              <Text style={{ color: '#fff', fontSize: 15, fontFamily: BG[800] }}>{s.value}</Text>
              <Text style={{ color: COLORS.textMuted, fontSize: 11, marginTop: 2, fontFamily: BG[400] }}>{s.label}</Text>
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
        <Text style={{ color: COLORS.textMuted, fontSize: 11, marginBottom: 6, fontFamily: BG[400] }}>{label}</Text>
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
            style={{ flex: 1, color: '#fff', fontSize: 17, fontFamily: BG[700], paddingVertical: 12 }}
          />
          <Text style={{ color: COLORS.textMuted, fontSize: 11, fontFamily: BG[400] }}>{suffix}</Text>
        </View>
      </View>
    );

    return (
      <View style={{ flex: 1, backgroundColor: '#050505' }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, paddingTop: insets.top + 26, paddingHorizontal: 20, paddingBottom: 4 }}>
          <BackTile onPress={handleEditEstimate} label="Edit the estimate" />
          <Text style={{ color: '#fff', fontSize: 17, fontFamily: BG[800] }}>Review estimate</Text>
        </View>

        <ScrollView contentContainerStyle={{ paddingHorizontal: 20, paddingTop: 22, paddingBottom: 24 }}>
          <Text style={{ color: COLORS.textMuted, fontSize: 13, marginBottom: 4, fontFamily: BG[400] }}>Does this look right? Adjust anything before logging it.</Text>
          <Text style={{ color: '#fff', fontSize: 20, marginBottom: 20, fontFamily: BG[800] }}>{reviewing.description}</Text>

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

  const meal = (mealType as string) || mealForClock(new Date().getHours());
  const ready = text.trim().length > 0 && !saving;

  return (
    <View style={{ flex: 1, backgroundColor: '#050505' }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, paddingTop: insets.top + 26, paddingHorizontal: 20, paddingBottom: 4 }}>
        <BackTile onPress={() => router.back()} label="Back" />
        <View>
          <Text style={{ color: '#fff', fontSize: 20, fontFamily: BG[800] }}>Log {meal.toLowerCase()}</Text>
          <Text style={{ color: COLORS.textMuted, fontSize: 13, fontFamily: BG[400] }}>Scan below, or describe it</Text>
        </View>
      </View>

      <ScrollView contentContainerStyle={{ paddingHorizontal: 20, paddingTop: 20, paddingBottom: 32, gap: 18 }} keyboardShouldPersistTaps="handled">
        <View style={{ gap: 10 }}>
          <Text style={{ color: COLORS.textMuted, fontSize: 14, fontFamily: BG[600] }}>Describe what you ate</Text>
          <Surface radius={18} padding={0} grain={0.06} borderColor={text.length > 0 ? G.border : undefined}>
            <TextInput
              value={text}
              onChangeText={setText}
              placeholder="2 idli, sambar and a cup of chai"
              placeholderTextColor={COLORS.textFaint}
              multiline
              accessibilityLabel="Describe what you ate"
              style={{ color: '#fff', fontSize: 17, paddingHorizontal: 16, paddingTop: 16, paddingBottom: 8, minHeight: 84, textAlignVertical: 'top', fontFamily: BG[500], lineHeight: 24 }}
            />
            <View style={{ paddingHorizontal: 10, paddingBottom: 10 }}>
              <Segmented
                options={PORTIONS.map((p) => ({ value: p.value, label: p.label }))}
                value={portion}
                onChange={setPortion}
                accent={G.bright}
                accentDeep={G.deep}
                accessibilityLabel="How much did you have"
              />
            </View>
          </Surface>
          {suggestions.length > 0 ? (
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }} keyboardShouldPersistTaps="handled">
              {suggestions.map((s) => (
                <Chip key={s.label} active={text === s.label} accent={G.bright} accentDeep={G.deep} onPress={() => setText(s.label)}>
                  {s.label}
                </Chip>
              ))}
            </ScrollView>
          ) : null}
          {error ? <ErrorCard message={error} onRetry={ready ? handleEstimate : undefined} retrying={saving} /> : null}
        </View>

        {photoHistory.length > 0 && !text ? (
          <View style={{ gap: 10 }}>
            <Text style={{ color: COLORS.textMuted, fontSize: 14, fontFamily: BG[600] }}>Eaten this before</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 10 }}>
              {photoHistory.map((row) => (
                <TouchableOpacity key={row.id} activeOpacity={0.85} onPress={() => reuseHistoryMeal(row)} style={{ width: 96 }} accessibilityRole="button" accessibilityLabel={`Log again: ${row.description}`}>
                  <Image source={{ uri: photoHistoryUrls[row.id] }} style={{ width: 96, height: 96, borderRadius: 14, backgroundColor: '#151517' }} resizeMode="cover" />
                  <Text numberOfLines={1} style={{ color: '#fff', fontSize: 12, marginTop: 5, fontFamily: BG[700] }}>{row.description}</Text>
                  <Text style={{ color: COLORS.textMuted, fontSize: 12, fontFamily: BG[400] }}>{Math.round(row.calories ?? 0)} kcal</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        ) : null}

        {SUGGEST_MEAL_ENABLED ? (
          <MealSuggestions
            mealType={(mealType as MealType) ?? 'Snack'}
            remaining={remainingMacros}
            restrictions={dietaryRestrictions}
            foodProfile={foodProfile}
            goal={goal}
            eatenToday={eatenNames}
            trainedToday={trainedToday}
            onPick={(m) => {
              setReviewing(m);
              setReviewFields({ calories: String(Math.round(m.calories)), protein_g: String(Math.round(m.protein_g)), carbs_g: String(Math.round(m.carbs_g)), fats_g: String(Math.round(m.fats_g)) });
            }}
          />
        ) : null}
      </ScrollView>

      {/* The main action sits at the bottom, under the thumb. It scans, and turns into "Check my meal" once something is typed. */}
      <View style={{ flexDirection: 'row', gap: 10, paddingHorizontal: 20, paddingTop: 12, paddingBottom: insets.bottom + 12, borderTopWidth: 1, borderTopColor: 'rgba(255,255,255,0.06)', backgroundColor: '#050505' }}>
        <TouchableOpacity
          activeOpacity={0.8}
          onPress={() => pickPhoto('library')}
          accessibilityRole="button"
          accessibilityLabel="Use a photo from your gallery"
          style={{ width: 56, height: 56, borderRadius: 28, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(255,255,255,0.06)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.10)' }}
        >
          <Icon name="image" size={22} color={G.bright} />
        </TouchableOpacity>
        <View style={{ flex: 1 }}>
          {text.trim().length > 0 ? (
            <Button variant="primary" accent={G.bright} accentDeep={G.deep} size="lg" fullWidth disabled={saving} onPress={handleEstimate}>
              {saving ? 'Checking…' : 'Check my meal'}
            </Button>
          ) : (
            <Button
              variant="primary"
              accent={G.bright}
              accentDeep={G.deep}
              size="lg"
              fullWidth
              onPress={() => router.replace({ pathname: '/scan', params: { mealType: meal } })}
              icon={<Icon name="camera" size={20} color="#fff" />}
            >
              Scan your plate
            </Button>
          )}
        </View>
      </View>
    </View>
  );
}
