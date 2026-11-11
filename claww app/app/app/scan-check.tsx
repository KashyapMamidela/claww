import React, { useEffect, useMemo, useState } from 'react';
import { MealTypePicker } from '../components/nutrition/MealTypePicker';
import { BackTile } from '../components/ui/BackTile';
import { ActivityIndicator, Image, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { COLORS, FONT, FONT_HAND, BG, bg } from '../lib/theme';
import { useAppState, type MealType } from '../lib/appState';
import { getProfile, uploadMealPhoto } from '../lib/data';
import {
  applyContext, itemNutrients, scanStepFor, scanSwitchUnit, scanUnitChoices, setQuantity, totalsOf, scanGramsFor, type ScanFood, type ScanItem,
} from '../lib/engine';
import { searchFoodDb } from '../lib/foodDb';
import { defaultUnit, type Food } from '../lib/foodLookup';
import { contextText } from '../lib/scanHabit';
import { rememberUnit } from '../lib/unitMemory';
import { Chip } from '../components/ui/Chip';
import { getScanSession, saveScanCorrection, setScanSession, type ScanResult } from '../lib/scanner';
import { ensureMealPlans, replanToday } from '../lib/mealPlanData';
import { builtMealName, isEstimateFood } from '../lib/mealCheckLogic';
import { recordFoodUse } from '../lib/foodDb';
import { useToast } from '../components/ui/Toast';
import { rateMeal } from '../lib/nutritionLogic';
import { nextMealFor } from '../lib/homeMoment';
import { RatingPill } from '../components/nutrition/MealCard';
import { FoodSearchSheet } from '../components/nutrition/FoodSearchSheet';
import { Button } from '../components/ui/Button';
import { ErrorCard } from '../components/ui/ErrorCard';
import { Icon } from '../components/ui/Icon';
import { PressScale } from '../components/ui/PressScale';
import { Surface } from '../components/ui/Surface';

// NG PHASE 9, step 2 (screen 17): check the plate. Every item in household units with the grams small, 44 px steppers by
// household step, the hidden oil on its own amber line, the rating with a reason, and one tap to log. Below 50 %
// confidence it asks instead of guessing ("Not sure": a few dishes to pick, or log by name).

const G = COLORS.green;
const AMBER = COLORS.amber;

function fmtQty(q: number) {
  return Number.isInteger(q) ? String(q) : String(Math.round(q * 10) / 10);
}

function toScanFood(f: Food): ScanFood {
  return f;
}

export default function ScanCheckScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { userId, meals, saveMeal, editMeal } = useAppState();
  const toast = useToast();
  // Read once: the session is cleared after logging, and this screen must keep rendering the same meal until it closes.
  const [session] = useState(getScanSession);
  const [result, setResult] = useState<ScanResult | null>(null);
  const [failure, setFailure] = useState<string | null>(null);
  const [items, setItems] = useState<ScanItem[]>([]);
  const [notSure, setNotSure] = useState(false);
  const [dish, setDish] = useState('');
  const [pickFor, setPickFor] = useState<string | 'add' | null>(null);
  const [searchOpen, setSearchOpen] = useState(false);
  const [targets, setTargets] = useState<{ calories: number; protein_g: number } | null>(null);
  const [optIn, setOptIn] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [unitOpen, setUnitOpen] = useState<string | null>(null);

  useEffect(() => {
    if (!session) return;
    let cancelled = false;
    session.pending.then((o) => {
      if (cancelled) return;
      if (!o.ok) {
        setFailure(o.reason);
        return;
      }
      setResult(o.result);
      setDish(o.result.dish);
      if (o.result.route === 'not_sure') setNotSure(true);
      else setItems(applyContext(o.result.items, session.context, o.result.oilFood));
    });
    return () => {
      cancelled = true;
    };
  }, [session]);

  useEffect(() => {
    if (!userId) return;
    getProfile(userId).then((p) => {
      setTargets(p?.personalization_profile?.nutritionDefaults ?? null);
      setOptIn(!!p?.personalization_profile?.scanTraining);
    });
  }, [userId]);

  const totals = useMemo(() => totalsOf(items), [items]);
  // Search, and an edited meal that is one database food, are named from the amount ("5 Plain dosa"), so the name
  // follows the − and +; a scanned or described dish keeps its own name.
  const mealName = useMemo(() => {
    const shown = items.filter((i) => !i.hidden);
    const oneFood = shown.length === 1 && !!shown[0].food && !isEstimateFood(shown[0].food);
    const src = session?.source ?? 'photo';
    if (src === 'search' || (src === 'edit' && oneFood)) return builtMealName(items);
    return dish || (src !== 'photo' ? 'Meal' : 'Scanned plate');
  }, [items, dish, session]);
  const [mealType, setMealType] = useState<MealType>(((session?.editing?.meal_type ?? session?.mealType) || 'Snack') as MealType);
  const source = session?.source ?? 'photo';
  const fromText = source !== 'photo';
  const editing = session?.editing ?? null;
  const unmatched = items.filter((i) => !i.food);
  const others = useMemo(() => meals.filter((m) => m.id !== editing?.id), [meals, editing]);
  const eaten = useMemo(() => ({ kcal: others.reduce((s, m) => s + (m.calories ?? 0), 0), protein: others.reduce((s, m) => s + (m.protein_g ?? 0), 0) }), [others]);
  const rating = useMemo(
    () =>
      rateMeal(
        { kcal: totals.kcal, protein: totals.protein, fats: totals.fat, sodiumMg: totals.sodiumMg, mealType },
        { kcalTarget: targets?.calories ?? 2000, proteinTarget: targets?.protein_g ?? 120, kcalBefore: eaten.kcal, proteinBefore: eaten.protein, nextMeal: nextMealFor([...others.map((m) => m.meal_type ?? ''), mealType], new Date().getHours()) }
      ),
    [totals, mealType, targets, eaten, others]
  );

  if (!session) {
    return (
      <View style={{ flex: 1, backgroundColor: COLORS.bg, alignItems: 'center', justifyContent: 'center', padding: 24, gap: 14 }}>
        <Text style={{ color: COLORS.fg, fontSize: 17, fontFamily: BG[800] }}>No plate to check</Text>
        <Button variant="primary" accent={G} accentDeep={COLORS.greenDeep} size="md" onPress={() => router.replace('/scan')}>
          Scan a plate
        </Button>
      </View>
    );
  }

  const bump = (key: string, dir: 1 | -1) =>
    setItems((prev) =>
      prev.map((i) => {
        if (i.key !== key) return i;
        const step = i.unit === 'g' ? 25 : scanStepFor(i.unit);
        const q = Math.max(step, Math.round((i.qty + dir * step) * 100) / 100);
        return setQuantity(i, q);
      })
    );
  // At the smallest amount the minus button becomes a bin: one more tap takes the line off.
  const atMin = (i: ScanItem) => i.qty <= (i.unit === 'g' ? 25 : scanStepFor(i.unit));

  // Polish step 6b: tap the amount to measure it in the unit you know (katori, bowl, spoon, pieces, grams).
  const changeUnit = (key: string, unit: string) => {
    setItems((prev) => prev.map((i) => (i.key === key ? scanSwitchUnit(i, unit) : i)));
    const it = items.find((i) => i.key === key);
    if (it?.food) rememberUnit(it.food.name, unit).catch(() => {});
  };

  const remove = (key: string) => setItems((prev) => prev.filter((i) => i.key !== key));

  const adopt = (food: Food, qty: number, unit: string): ScanItem => {
    const g = scanGramsFor(toScanFood(food), qty, unit);
    return { key: `add${Date.now()}`, heard: food.name, food: toScanFood(food), qty, unit: g.unit, grams: Math.round(g.grams) };
  };

  const onPicked = (food: Food, qty: number, unit: string) => {
    const added = adopt(food, qty, unit);
    setItems((prev) => (pickFor && pickFor !== 'add' ? prev.map((i) => (i.key === pickFor ? { ...added, key: i.key, heard: i.heard } : i)) : [...prev, added]));
    setPickFor(null);
    setSearchOpen(false);
  };

  const chooseCandidate = async (name: string) => {
    const [food] = await searchFoodDb(name, 1);
    if (!food) {
      setSearchOpen(true);
      return;
    }
    const d = defaultUnit(food);
    setDish(food.name);
    setItems(applyContext([adopt(food, 1, d.unit)], session.context, result?.oilFood ?? null));
    setNotSure(false);
  };

  const log = async () => {
    if (!userId || saving || items.length === 0 || unmatched.length > 0) return;
    setSaving(true);
    setError(null);
    const realItems = items.filter((i) => i.food && !isEstimateFood(i.food));
    const hasEstimate = items.some((i) => isEstimateFood(i.food));
    const name = mealName;
    const meal = {
      description: name,
      calories: totals.kcal,
      protein_g: totals.protein,
      carbs_g: totals.carbs,
      fats_g: totals.fat,
      // Items and micronutrients only when every line is a database food; an estimate has no breakdown to keep.
      ...(hasEstimate ? {} : {
        items: realItems.map((i) => ({ food: i.food!.name, unit: i.unit, qty: i.qty, grams: i.grams })),
        nutrients: { fibreG: totals.fibreG, ironMg: totals.ironMg, calciumMg: totals.calciumMg, vitcMg: totals.vitcMg, b12Ug: totals.b12Ug, sodiumMg: totals.sodiumMg },
      }),
    };
    if (editing) {
      const ok = await editMeal(editing.id, mealType, meal);
      setSaving(false);
      if (!ok) {
        setError('Could not save the change. Check your connection and try again.');
        return;
      }
      replanToday(userId, meals.map((m) => (m.id === editing.id ? { ...m, ...meal, meal_type: mealType } as typeof m : m))).catch(() => {});
      setScanSession(null);
      toast.show({ message: 'Meal updated' });
      router.back();
      return;
    }
    const photoPath = fromText || !session.base64 ? null : await uploadMealPhoto(userId, session.base64, session.mimeType);
    const plan = await ensureMealPlans(userId).catch(() => null);
    const planned = !!plan?.meals.some((m) => m.meal === mealType.toLowerCase());
    const row = await saveMeal(mealType, {
      ...meal,
      description: name,
      calories: totals.kcal,
      protein_g: totals.protein,
      carbs_g: totals.carbs,
      fats_g: totals.fat,
      photoPath,
      planStatus: planned ? 'swapped' : 'extra',
      ...(source === 'photo' ? { context: session.context } : {}),
    });
    if (!row) {
      setSaving(false);
      setError('Could not log it. Check your connection and try again.');
      return;
    }
    realItems.forEach((i) => recordFoodUse(i.food!.id).catch(() => {}));
    if (optIn && result && source === 'photo') {
      saveScanCorrection(userId, {
        photoPath,
        model: result.model,
        guess: { dish: result.dish, confidence: result.confidence, items: result.items.map((i) => ({ heard: i.heard, food: i.food?.name ?? null, qty: i.qty, unit: i.unit })) },
        context: session.context,
        finalItems: items.map((i) => ({ food: i.food?.name ?? null, qty: i.qty, unit: i.unit, grams: i.grams, hidden: !!i.hidden })),
      }).catch(() => {});
    }
    replanToday(userId, [...meals, row]).catch(() => {});
    setScanSession(null);
    // The button stays on "Logging…" while the screen closes: flipping it back mid-transition made Android crash
    // ("View already has a parent") when the screen below gained the new meal.
    router.dismissTo('/(tabs)/nutrition');
  };

  const header = (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 12, paddingTop: insets.top + 6, paddingBottom: 8 }}>
      <BackTile onPress={() => router.back()} />
      <View style={{ flex: 1 }}>
        <Text style={{ color: COLORS.fg, fontSize: 20, fontFamily: BG[800] }}>{editing ? 'Edit your meal' : fromText ? 'Check your meal' : 'Check your plate'}</Text>
        <Text style={{ color: COLORS.textMuted, fontSize: 13, fontFamily: BG[400] }}>{editing ? `Logged at ${new Date(editing.logged_at).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}` : source === 'search' ? 'From food search' : source === 'text' ? 'From your description' : contextText(session.context)}</Text>
      </View>
    </View>
  );

  if (failure) {
    return (
      <View style={{ flex: 1, backgroundColor: COLORS.bg }}>
        {header}
        <View style={{ padding: 20, gap: 14 }}>
          <ErrorCard message={failure} />
          <Button variant="primary" accent={G} accentDeep={COLORS.greenDeep} size="lg" fullWidth onPress={() => setSearchOpen(true)}>
            Log it by name
          </Button>
          <Button variant="secondary" size="md" fullWidth onPress={() => router.replace('/scan')}>
            Try another photo
          </Button>
        </View>
        <FoodSearchSheet visible={searchOpen} mealType={mealType} recent={[]} onClose={() => setSearchOpen(false)} onLogged={() => router.dismissTo('/(tabs)/nutrition')} />
      </View>
    );
  }

  if (!result) {
    return (
      <View style={{ flex: 1, backgroundColor: COLORS.bg }}>
        {header}
        <View style={{ padding: 40, alignItems: 'center', gap: 14 }}>
          <ActivityIndicator color={G} />
          <Text style={{ color: COLORS.textMuted, fontSize: 15, fontFamily: BG[400] }}>Reading the plate…</Text>
        </View>
      </View>
    );
  }

  if (notSure) {
    return (
      <View style={{ flex: 1, backgroundColor: COLORS.bg }}>
        {header}
        <ScrollView contentContainerStyle={{ padding: 20, gap: 14 }}>
          <Image source={{ uri: session.photoUri }} style={{ width: '100%', height: 200, borderRadius: 20 }} resizeMode="cover" accessibilityLabel="Your photo" />
          <Text style={{ color: COLORS.fg, fontSize: 22, fontVariant: ['tabular-nums'], fontFamily: BG[800] }}>Not sure about this one</Text>
          <Text style={{ color: COLORS.textMuted, fontSize: 15, lineHeight: 21, fontFamily: BG[400] }}>Pick what it is, or log it by name. We would rather ask than guess your calories.</Text>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10 }}>
            {result.candidates.map((c) => (
              <PressScale key={c} onPress={() => chooseCandidate(c)} accessibilityRole="button" accessibilityLabel={`It is ${c}`}>
                <View style={{ minHeight: 44, paddingHorizontal: 18, borderRadius: 22, borderWidth: 1, borderColor: COLORS.greenBorderMd, backgroundColor: 'rgba(34,197,94,0.08)', justifyContent: 'center' }}>
                  <Text style={{ color: G, fontSize: 17, fontFamily: BG[800] }}>{c}</Text>
                </View>
              </PressScale>
            ))}
          </View>
          <Button variant="secondary" size="lg" fullWidth onPress={() => setSearchOpen(true)} icon={<Icon name="search" size={16} color={G} />}>
            Log by name instead
          </Button>
        </ScrollView>
        <FoodSearchSheet visible={searchOpen} mealType={mealType} recent={[]} onClose={() => setSearchOpen(false)} onLogged={() => router.dismissTo('/(tabs)/nutrition')} />
      </View>
    );
  }

  const MACROS = [
    { label: 'Protein', value: totals.protein, goal: targets?.protein_g ?? 120, color: '#F472B6' },
    { label: 'Carbs', value: totals.carbs, goal: 300, color: '#F59E0B' },
    { label: 'Fat', value: totals.fat, goal: 70, color: '#38BDF8' },
  ];

  return (
    <View style={{ flex: 1, backgroundColor: COLORS.bg }}>
      {header}
      <ScrollView contentContainerStyle={{ paddingBottom: insets.bottom + 120, gap: 14 }}>
        <MealTypePicker value={mealType} onChange={setMealType} />

        {/* The answer first: what this meal comes to, and what it means for your day. */}
        <View style={{ paddingHorizontal: 16 }}>
          <Surface padding={16} radius={22}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 14 }}>
              {session.photoUri ? (
                <Image source={{ uri: session.photoUri }} style={{ width: 56, height: 56, borderRadius: 28 }} resizeMode="cover" accessibilityLabel="Your photo" />
              ) : (
                <View style={{ width: 56, height: 56, borderRadius: 28, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(34,197,94,0.14)', borderWidth: 1, borderColor: COLORS.greenBorderMd }}>
                  <Icon name="utensils" size={24} color={G} />
                </View>
              )}
              <View style={{ flex: 1 }}>
                <Text style={{ color: COLORS.fg, fontSize: 20, lineHeight: 24, fontFamily: BG[800] }} numberOfLines={2}>{mealName}</Text>
                <Text style={{ color: COLORS.textMuted, fontSize: 13, fontFamily: BG[400] }}>{items.filter((i) => !i.hidden).length} {items.filter((i) => !i.hidden).length === 1 ? 'item' : 'items'} · tap − or + to fix</Text>
              </View>
              <RatingPill rating={rating.rating} />
            </View>

            <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: 6, marginTop: 14 }}>
              <Text style={{ color: COLORS.fg, fontSize: 44, lineHeight: 48, letterSpacing: -1, fontVariant: ['tabular-nums'], fontFamily: BG[800] }}>{Math.round(totals.kcal)}</Text>
              <Text style={{ color: COLORS.textMuted, fontSize: 17, fontFamily: BG[600] }}>kcal</Text>
            </View>

            <View style={{ flexDirection: 'row', gap: 12, marginTop: 12 }}>
              {MACROS.map((m) => (
                <View key={m.label} style={{ flex: 1, gap: 5 }}>
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline' }}>
                    <Text style={{ color: COLORS.textMuted, fontSize: 13, fontFamily: BG[500] }}>{m.label}</Text>
                    <Text style={{ color: COLORS.fg, fontSize: 15, fontVariant: ['tabular-nums'], fontFamily: BG[800] }}>{Math.round(m.value)} g</Text>
                  </View>
                  <View style={{ height: 5, borderRadius: 3, backgroundColor: 'rgba(255,255,255,0.08)', overflow: 'hidden' }}>
                    <View style={{ height: '100%', width: `${Math.max(3, Math.min(100, (m.value / m.goal) * 100))}%`, backgroundColor: m.color, borderRadius: 3 }} />
                  </View>
                </View>
              ))}
            </View>
          </Surface>
        </View>

        <View style={{ paddingHorizontal: 16 }}>
          <Surface padding={0} radius={22}>
            {items.map((i, idx) => {
              const hidden = !!i.hidden;
              const label = i.food ? (hidden ? 'Oil' : i.food.name) : i.heard;
              return (
                <View key={i.key}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 12, paddingHorizontal: 14, borderTopWidth: idx === 0 ? 0 : StyleSheet.hairlineWidth, borderTopColor: COLORS.border }}>
                    <View style={{ width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center', backgroundColor: hidden ? 'rgba(245,158,11,0.14)' : 'rgba(34,197,94,0.12)' }}>
                      <Text style={{ color: hidden ? AMBER : G, fontSize: 17, fontFamily: BG[800] }}>{label.charAt(0).toUpperCase()}</Text>
                    </View>
                    <View style={{ flex: 1, minWidth: 0 }}>
                      <Text style={{ color: COLORS.fg, fontSize: 17, fontFamily: BG[700] }} numberOfLines={1}>{label}</Text>
                      {!i.food ? (
                        <Pressable onPress={() => { setPickFor(i.key); setSearchOpen(true); }} accessibilityRole="button" style={{ minHeight: 32, justifyContent: 'center' }}>
                          <Text style={{ color: AMBER, fontSize: 13, fontFamily: BG[700] }}>Not in the database. Pick a food</Text>
                        </Pressable>
                      ) : (
                        <Text style={{ color: hidden ? AMBER : COLORS.textMuted, fontSize: 13, fontVariant: ['tabular-nums'], fontFamily: BG[400] }}>
                          {hidden ? `hidden · from ${session.context.oil} oil` : isEstimateFood(i.food) ? `${Math.round(itemNutrients(i).kcal)} kcal · estimated` : `${Math.round(itemNutrients(i).kcal)} kcal · ${Math.round(i.grams)} g`}
                        </Text>
                      )}
                    </View>
                    {i.food ? (
                      // One capsule: − amount +. The amount opens the unit choices.
                      <View style={{ flexDirection: 'row', alignItems: 'center', height: 44, borderRadius: 22, backgroundColor: 'rgba(255,255,255,0.07)' }}>
                        <PressScale onPress={() => (atMin(i) ? remove(i.key) : bump(i.key, -1))} accessibilityRole="button" accessibilityLabel={atMin(i) ? `Remove ${label}` : `Less ${i.food.name}`}>
                          <View style={{ width: 40, height: 44, alignItems: 'center', justifyContent: 'center' }}>
                            <Icon name={atMin(i) ? 'trash-2' : 'minus'} size={17} color={atMin(i) ? COLORS.textMuted : COLORS.fg} />
                          </View>
                        </PressScale>
                        <PressScale
                          onPress={() => { if (!isEstimateFood(i.food)) setUnitOpen((k) => (k === i.key ? null : i.key)); }}
                          accessibilityRole="button"
                          accessibilityState={{ expanded: unitOpen === i.key }}
                          accessibilityLabel={`${fmtQty(i.qty)} ${i.unit} of ${i.food.name}. Change the unit.`}
                        >
                          <View style={{ minWidth: 64, height: 44, alignItems: 'center', justifyContent: 'center' }}>
                            <Text style={{ color: unitOpen === i.key ? G : COLORS.fg, fontSize: 15, fontVariant: ['tabular-nums'], fontFamily: BG[800] }} numberOfLines={1}>
                              {fmtQty(i.qty)} {i.unit}
                            </Text>
                          </View>
                        </PressScale>
                        <PressScale onPress={() => bump(i.key, 1)} accessibilityRole="button" accessibilityLabel={`More ${i.food.name}`}>
                          <View style={{ width: 40, height: 44, alignItems: 'center', justifyContent: 'center' }}>
                            <Icon name="plus" size={17} color={COLORS.fg} />
                          </View>
                        </PressScale>
                      </View>
                    ) : (
                      <PressScale onPress={() => remove(i.key)} accessibilityRole="button" accessibilityLabel={`Remove ${i.heard}`}>
                        <View style={{ minHeight: 44, paddingHorizontal: 8, justifyContent: 'center' }}>
                          <Text style={{ color: COLORS.textMuted, fontSize: 15, fontFamily: BG[700] }}>Remove</Text>
                        </View>
                      </PressScale>
                    )}
                  </View>
                  {i.food && unitOpen === i.key ? (
                    <View style={{ paddingLeft: 66, paddingBottom: 12, paddingRight: 14, gap: 8 }}>
                      <Text style={{ color: COLORS.textMuted, fontSize: 13, fontFamily: BG[400] }}>Measure in</Text>
                      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
                        {scanUnitChoices(i.food).map((u) => (
                          <Chip key={u} active={i.unit === u} accent={G} accentDeep={COLORS.greenDeep} onPress={() => changeUnit(i.key, u)}>
                            {u === 'g' ? 'grams' : u}
                          </Chip>
                        ))}
                      </View>
                    </View>
                  ) : null}
                </View>
              );
            })}
            <Pressable
              onPress={() => { setPickFor('add'); setSearchOpen(true); }}
              accessibilityRole="button"
              style={{ minHeight: 56, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: COLORS.border }}
            >
              <Icon name="plus" size={17} color={G} />
              <Text style={{ color: G, fontSize: 17, fontFamily: BG[800] }}>Add something we missed</Text>
            </Pressable>
          </Surface>
        </View>

        <View style={{ marginHorizontal: 16, borderRadius: 20, padding: 14, flexDirection: 'row', gap: 12, alignItems: 'center', backgroundColor: rating.rating === 'good' ? 'rgba(34,197,94,0.10)' : rating.rating === 'okay' ? 'rgba(245,158,11,0.10)' : 'rgba(161,161,170,0.10)' }}>
          <Text style={{ color: rating.rating === 'good' ? COLORS.ratingGood : rating.rating === 'okay' ? COLORS.ratingOkay : COLORS.ratingPoor, fontSize: 13, letterSpacing: 0.5, fontFamily: BG[800] }}>{rating.rating.toUpperCase()}</Text>
          <Text style={{ color: COLORS.fg, fontSize: 15, lineHeight: 21, flex: 1, fontFamily: BG[400] }}>{rating.reason}</Text>
        </View>
        {error ? <View style={{ paddingHorizontal: 16 }}><ErrorCard message={error} onRetry={log} retrying={saving} /></View> : null}
      </ScrollView>

      <View style={{ position: 'absolute', left: 16, right: 16, bottom: insets.bottom + 12 }}>
        <Button variant="primary" accent={G} accentDeep={COLORS.greenDeep} size="lg" fullWidth disabled={saving || items.length === 0 || unmatched.length > 0} onPress={log} icon={<Icon name="check" size={18} color="#fff" />}>
          {saving ? (editing ? 'Saving…' : 'Logging…') : unmatched.length > 0 ? 'Pick a food for each item first' : editing ? 'Save changes' : 'Looks right, log it'}
        </Button>
      </View>

      <FoodSearchSheet visible={searchOpen} mealType={mealType} recent={[]} onPickFood={onPicked} onClose={() => { setSearchOpen(false); setPickFor(null); }} onLogged={() => setSearchOpen(false)} />
    </View>
  );
}
