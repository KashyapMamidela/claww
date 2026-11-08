import React, { useEffect, useMemo, useState } from 'react';
import { BackTile } from '../components/ui/BackTile';
import { ActivityIndicator, Image, Pressable, ScrollView, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { COLORS, FONT, FONT_HAND } from '../lib/theme';
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
  const { userId, meals, saveMeal } = useAppState();
  const session = getScanSession();
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
  const mealType = (session?.mealType ?? 'Snack') as MealType;
  const unmatched = items.filter((i) => !i.food);
  const eaten = useMemo(() => ({ kcal: meals.reduce((s, m) => s + (m.calories ?? 0), 0), protein: meals.reduce((s, m) => s + (m.protein_g ?? 0), 0) }), [meals]);
  const rating = useMemo(
    () =>
      rateMeal(
        { kcal: totals.kcal, protein: totals.protein, fats: totals.fat, sodiumMg: totals.sodiumMg, mealType },
        { kcalTarget: targets?.calories ?? 2000, proteinTarget: targets?.protein_g ?? 120, kcalBefore: eaten.kcal, proteinBefore: eaten.protein, nextMeal: nextMealFor([...meals.map((m) => m.meal_type ?? ''), mealType], new Date().getHours()) }
      ),
    [totals, mealType, targets, eaten, meals]
  );

  if (!session) {
    return (
      <View style={{ flex: 1, backgroundColor: COLORS.bg, alignItems: 'center', justifyContent: 'center', padding: 24, gap: 14 }}>
        <Text style={{ color: COLORS.fg, fontSize: 17, fontWeight: '800', fontFamily: FONT }}>No plate to check</Text>
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

  // Polish step 6b: tap the amount to measure it in the unit you know (katori, bowl, spoon, pieces, grams).
  const [unitOpen, setUnitOpen] = useState<string | null>(null);
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
    const photoPath = await uploadMealPhoto(userId, session.base64, session.mimeType);
    const plan = await ensureMealPlans(userId).catch(() => null);
    const planned = !!plan?.meals.some((m) => m.meal === mealType.toLowerCase());
    const row = await saveMeal(mealType, {
      description: dish || 'Scanned plate',
      calories: totals.kcal,
      protein_g: totals.protein,
      carbs_g: totals.carbs,
      fats_g: totals.fat,
      photoPath,
      planStatus: planned ? 'swapped' : 'extra',
      context: session.context,
      items: items.filter((i) => i.food).map((i) => ({ food: i.food!.name, unit: i.unit, qty: i.qty, grams: i.grams })),
      nutrients: { fibreG: totals.fibreG, ironMg: totals.ironMg, calciumMg: totals.calciumMg, vitcMg: totals.vitcMg, b12Ug: totals.b12Ug, sodiumMg: totals.sodiumMg },
    });
    if (!row) {
      setSaving(false);
      setError('Could not log it. Check your connection and try again.');
      return;
    }
    if (optIn && result) {
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
    setSaving(false);
    router.dismissTo('/(tabs)/nutrition');
  };

  const header = (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 12, paddingTop: insets.top + 6, paddingBottom: 8 }}>
      <BackTile onPress={() => router.back()} />
      <View style={{ flex: 1 }}>
        <Text style={{ color: COLORS.fg, fontSize: 20, fontWeight: '800', fontFamily: FONT }}>Check your plate</Text>
        <Text style={{ color: COLORS.textMuted, fontSize: 13, fontFamily: FONT }}>{contextText(session.context)}</Text>
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
          <Text style={{ color: COLORS.textMuted, fontSize: 15, fontFamily: FONT }}>Reading the plate…</Text>
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
          <Text style={{ color: COLORS.fg, fontSize: 22, fontWeight: '900', fontVariant: ['tabular-nums'], fontFamily: FONT }}>Not sure about this one</Text>
          <Text style={{ color: COLORS.textMuted, fontSize: 15, lineHeight: 21, fontFamily: FONT }}>Pick what it is, or log it by name. We would rather ask than guess your calories.</Text>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10 }}>
            {result.candidates.map((c) => (
              <PressScale key={c} onPress={() => chooseCandidate(c)} accessibilityRole="button" accessibilityLabel={`It is ${c}`}>
                <View style={{ minHeight: 44, paddingHorizontal: 18, borderRadius: 22, borderWidth: 1, borderColor: COLORS.greenBorderMd, backgroundColor: 'rgba(34,197,94,0.08)', justifyContent: 'center' }}>
                  <Text style={{ color: G, fontSize: 17, fontWeight: '800', fontFamily: FONT }}>{c}</Text>
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

  return (
    <View style={{ flex: 1, backgroundColor: COLORS.bg }}>
      {header}
      <ScrollView contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: insets.bottom + 120, gap: 14 }}>
        <Surface padding={16}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 14 }}>
            <Image source={{ uri: session.photoUri }} style={{ width: 64, height: 64, borderRadius: 18 }} resizeMode="cover" accessibilityLabel="Your photo" />
            <View style={{ flex: 1 }}>
              <Text style={{ color: COLORS.fg, fontSize: 20, fontWeight: '800', fontFamily: FONT }} numberOfLines={2}>{dish}</Text>
              <Text style={{ color: COLORS.textMuted, fontSize: 15, fontFamily: FONT }}>{items.filter((i) => !i.hidden).length} items · tap − or + to fix</Text>
            </View>
            <RatingPill rating={rating.rating} />
          </View>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: 14 }}>
            {[
              ['kcal', String(Math.round(totals.kcal)), COLORS.fg],
              ['protein', `${Math.round(totals.protein)} g`, G],
              ['carbs', `${Math.round(totals.carbs)} g`, COLORS.fg],
              ['fat', `${Math.round(totals.fat)} g`, COLORS.fg],
            ].map(([label, value, color]) => (
              <View key={label}>
                <Text style={{ color, fontSize: 28, fontWeight: '900', fontVariant: ['tabular-nums'], fontFamily: FONT }}>{value}</Text>
                <Text style={{ color: COLORS.textMuted, fontSize: 13, fontFamily: FONT }}>{label}</Text>
              </View>
            ))}
          </View>
        </Surface>

        <Surface padding={0}>
          {items.map((i, idx) => {
            const step = i.unit === 'g' ? 25 : scanStepFor(i.unit);
            const hidden = !!i.hidden;
            return (
              <View key={i.key}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 12, paddingRight: 12, borderTopWidth: idx === 0 ? 0 : 1, borderTopColor: COLORS.border }}>
                <View style={{ width: 4, alignSelf: 'stretch', borderRadius: 2, backgroundColor: hidden ? AMBER : G, marginLeft: 0 }} />
                <View style={{ flex: 1 }}>
                  <Text style={{ color: COLORS.fg, fontSize: 17, fontWeight: '800', fontFamily: FONT }}>{i.food ? (hidden ? 'Oil' : i.food.name) : i.heard}</Text>
                  {!i.food ? (
                    <Pressable onPress={() => { setPickFor(i.key); setSearchOpen(true); }} accessibilityRole="button" style={{ minHeight: 40, justifyContent: 'center' }}>
                      <Text style={{ color: AMBER, fontSize: 15, fontWeight: '700', fontFamily: FONT }}>Not in the database. Pick a food</Text>
                    </Pressable>
                  ) : (
                    <Text style={{ color: hidden ? AMBER : COLORS.textMuted, fontSize: 13, fontFamily: FONT }}>{hidden ? `hidden · from ${session.context.oil} oil` : `from the photo${i.heard.toLowerCase() !== i.food.name.toLowerCase() ? `: ${i.heard}` : ''}`}</Text>
                  )}
                </View>
                {i.food ? (
                  <>
                    <PressScale onPress={() => bump(i.key, -1)} accessibilityRole="button" accessibilityLabel={`Less ${i.food.name}`}>
                      <View style={{ width: 44, height: 44, borderRadius: 12, borderWidth: 1, borderColor: COLORS.borderStrong, alignItems: 'center', justifyContent: 'center' }}>
                        <Icon name="minus" size={18} color={COLORS.fg} />
                      </View>
                    </PressScale>
                    <PressScale
                      onPress={() => setUnitOpen((k) => (k === i.key ? null : i.key))}
                      accessibilityRole="button"
                      accessibilityState={{ expanded: unitOpen === i.key }}
                      accessibilityLabel={`${fmtQty(i.qty)} ${i.unit} of ${i.food.name}. Change the unit.`}
                    >
                      <View style={{ minWidth: 76, minHeight: 44, alignItems: 'center', justifyContent: 'center' }}>
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 3 }}>
                          <Text style={{ color: unitOpen === i.key ? G : COLORS.fg, fontSize: 17, fontWeight: '800', fontVariant: ['tabular-nums'], fontFamily: FONT }}>{fmtQty(i.qty)} {i.unit}</Text>
                          <Icon name={unitOpen === i.key ? 'chevron-up' : 'chevron-down'} size={14} color={G} />
                        </View>
                        <Text style={{ color: COLORS.textMuted, fontSize: 13, fontVariant: ['tabular-nums'], fontFamily: FONT }}>{Math.round(i.grams)} g</Text>
                      </View>
                    </PressScale>
                    <PressScale onPress={() => bump(i.key, 1)} accessibilityRole="button" accessibilityLabel={`More ${i.food.name}`}>
                      <View style={{ width: 44, height: 44, borderRadius: 12, borderWidth: 1, borderColor: COLORS.borderStrong, alignItems: 'center', justifyContent: 'center' }}>
                        <Icon name="plus" size={18} color={COLORS.fg} />
                      </View>
                    </PressScale>
                  </>
                ) : (
                  <PressScale onPress={() => remove(i.key)} accessibilityRole="button" accessibilityLabel={`Remove ${i.heard}`}>
                    <View style={{ minHeight: 44, paddingHorizontal: 12, justifyContent: 'center' }}>
                      <Text style={{ color: COLORS.textMuted, fontSize: 15, fontWeight: '700', fontFamily: FONT }}>Remove</Text>
                    </View>
                  </PressScale>
                )}
              </View>
              {i.food && unitOpen === i.key ? (
                <View style={{ paddingLeft: 14, paddingBottom: 12, paddingRight: 12, gap: 8 }}>
                  <Text style={{ color: COLORS.textMuted, fontSize: 13, fontFamily: FONT }}>Measure in</Text>
                  <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
                    {scanUnitChoices(i.food).map((u) => (
                      <Chip key={u} active={i.unit === u} accent={G} accentDeep={COLORS.greenDeep} onPress={() => changeUnit(i.key, u)}>
                        {u === 'g' ? 'grams' : u}
                      </Chip>
                    ))}
                  </View>
                  <Text style={{ color: COLORS.pen, fontSize: 17, fontFamily: FONT_HAND }}>know the grams? pick grams</Text>
                </View>
              ) : null}
              </View>
            );
          })}
          <Pressable onPress={() => { setPickFor('add'); setSearchOpen(true); }} accessibilityRole="button" style={{ minHeight: 56, alignItems: 'center', justifyContent: 'center', borderTopWidth: 1, borderTopColor: COLORS.border }}>
            <Text style={{ color: G, fontSize: 17, fontWeight: '800', fontFamily: FONT }}>+ Add something we missed</Text>
          </Pressable>
        </Surface>

        <View style={{ borderRadius: 18, borderWidth: 1, borderColor: rating.rating === 'good' ? 'rgba(34,197,94,0.5)' : rating.rating === 'okay' ? 'rgba(245,158,11,0.5)' : 'rgba(161,161,170,0.4)', backgroundColor: COLORS.card, padding: 14, flexDirection: 'row', gap: 12, alignItems: 'center' }}>
          <Text style={{ color: rating.rating === 'good' ? COLORS.ratingGood : rating.rating === 'okay' ? COLORS.ratingOkay : COLORS.ratingPoor, fontSize: 15, fontWeight: '900', fontVariant: ['tabular-nums'], letterSpacing: 0.5, fontFamily: FONT }}>{rating.rating.toUpperCase()}</Text>
          <Text style={{ color: COLORS.fg, fontSize: 15, lineHeight: 21, flex: 1, fontFamily: FONT }}>{rating.reason}</Text>
        </View>
        <Text style={{ color: COLORS.textMuted, fontSize: 20, textAlign: 'center', fontFamily: FONT_HAND }}>{optIn ? 'your fixes teach the scanner your portions' : 'your answers become your defaults next time'}</Text>
        {error ? <ErrorCard message={error} onRetry={log} retrying={saving} /> : null}
      </ScrollView>

      <View style={{ position: 'absolute', left: 16, right: 16, bottom: insets.bottom + 12 }}>
        <Button variant="primary" accent={G} accentDeep={COLORS.greenDeep} size="lg" fullWidth disabled={saving || items.length === 0 || unmatched.length > 0} onPress={log} icon={<Icon name="check" size={18} color="#fff" />}>
          {saving ? 'Logging…' : unmatched.length > 0 ? 'Pick a food for each item first' : 'Looks right, log it'}
        </Button>
      </View>

      <FoodSearchSheet visible={searchOpen} mealType={mealType} recent={[]} onPickFood={onPicked} onClose={() => { setSearchOpen(false); setPickFor(null); }} onLogged={() => setSearchOpen(false)} />
    </View>
  );
}
