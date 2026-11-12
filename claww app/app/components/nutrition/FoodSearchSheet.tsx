import React, { useEffect, useMemo, useState } from 'react';
import { ScrollView, Text, TextInput, View } from 'react-native';
import { useRouter } from 'expo-router';
import { COLORS, FONT, BG, bg } from '../../lib/theme';
import { useAppState, type MealLogRow, type MealType } from '../../lib/appState';
import { searchFoodDb, recordFoodUse } from '../../lib/foodDb';
import { defaultUnit, gramsFor, nutrientsFor, parseQuery, unitsFor, type Food } from '../../lib/foodLookup';
import { BottomSheet } from '../ui/BottomSheet';
import { Skeleton } from '../ui/Skeleton';
import { Button } from '../ui/Button';
import { Chip } from '../ui/Chip';
import { ErrorCard } from '../ui/ErrorCard';
import { Icon } from '../ui/Icon';
import { PressScale } from '../ui/PressScale';
import { platesFor, type SavedPlate } from '../../lib/plates';
import { rememberUnit, rememberedUnit } from '../../lib/unitMemory';
import { recordPlateUse, usePlates } from '../../lib/platesData';
import { Stepper } from '../ui/Stepper';
import { startCheck } from '../../lib/mealCheck';
import { requestFood } from '../../lib/foodRequests';
import { scanGramsFor } from '../../lib/engine';

// NG PHASE 8: "Search" and "Something else". Search the reviewed food database by name (chai, 2 roti, katori dal),
// pick a quantity in household units, and log it with its micronutrients. Nothing here is estimated by a model.

const G = COLORS.green;

export interface FoodSearchSheetProps {
  visible: boolean;
  mealType: MealType;
  /** Recent descriptions to start from while the box is empty. */
  recent: string[];
  /** True when the meal being logged replaces a planned one (logged as swapped), false for an extra. */
  planned?: boolean;
  /** The scanner's "Pick a food" for an item it could not match opens with that item's name already typed. */
  initialQuery?: string;
  /** When given, picking a food hands it back (with quantity and unit) instead of logging a meal: the scanner's "add something we missed". */
  onPickFood?: (food: Food, qty: number, unit: string) => void;
  onClose: () => void;
  onLogged: (row: MealLogRow) => void;
}


/** Premium B9: "5 idli Idli" reads "5 idli"; long names are shortened on a word. */
export function tidyName(raw: string): string {
  const words = raw.trim().split(/\s+/);
  const out: string[] = [];
  for (const w of words) if (!out.length || out[out.length - 1].toLowerCase() !== w.toLowerCase()) out.push(w);
  let t = out.join(' ');
  if (t.length > 26) t = `${t.slice(0, 26).replace(/\s+\S*$/, '')}…`;
  return t;
}

// A wait under 300 ms shows nothing (no flash); longer, three rows shaped like results, which the real rows replace.
function SearchSkeleton() {
  const [show, setShow] = useState(false);
  useEffect(() => {
    const t = setTimeout(() => setShow(true), 300);
    return () => clearTimeout(t);
  }, []);
  if (!show) return null;
  return (
    <View accessibilityLabel="Searching">
      {[0, 1, 2].map((i) => (
        <View key={i} style={{ minHeight: 56, paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: COLORS.border, gap: 6, justifyContent: 'center' }}>
          <Skeleton width={i === 1 ? '45%' : '60%'} height={15} borderRadius={4} />
          <Skeleton width="38%" height={11} borderRadius={4} />
        </View>
      ))}
    </View>
  );
}

export function FoodSearchSheet({ visible, mealType, recent, planned = false, initialQuery, onPickFood, onClose, onLogged }: FoodSearchSheetProps) {
  const router = useRouter();
  const { saveMeal, userId } = useAppState();
  // Polish step 6: saved plates come first, one tap to log.
  const { plates } = usePlates(userId);
  const myPlates = platesFor(plates, mealType).slice(0, 8);
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<Food[]>([]);
  const [searching, setSearching] = useState(false);
  const [picked, setPicked] = useState<Food | null>(null);
  const [qty, setQty] = useState(1);
  const [unit, setUnit] = useState('g');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [asked, setAsked] = useState<string | null>(null);

  useEffect(() => {
    if (visible && initialQuery) setQuery(initialQuery);
  }, [visible, initialQuery]);

  useEffect(() => {
    if (!visible) return;
    const text = query.trim();
    if (text.length < 2) {
      setResults([]);
      return;
    }
    let cancelled = false;
    setSearching(true);
    const t = setTimeout(() => {
      searchFoodDb(text, 8).then((r) => {
        if (!cancelled) {
          setResults(r);
          setSearching(false);
        }
      });
    }, 180);
    return () => {
      cancelled = true;
      clearTimeout(t);
    };
  }, [query, visible]);

  const reset = () => {
    setQuery('');
    setResults([]);
    setPicked(null);
    setError(null);
  };
  const close = () => {
    reset();
    onClose();
  };

  const choose = (food: Food) => {
    const def = defaultUnit(food);
    // What was typed comes first: "2 roti" starts at 2 roti, "1 katori dal" at 1 katori, "200g paneer" at 200 g.
    const typed = parseQuery(query);
    const typedUnit = typed.unitWord === 'g' || typed.unitWord === 'gram' ? 'g' : unitsFor(food).find((x) => x.unit.toLowerCase() === typed.unitWord)?.unit;
    setPicked(food);
    setError(null);
    // "2 paneer" for a food counted in grams is not 2 g: then the usual starting amount is used.
    if (typed.qty !== null && typed.qty > 0 && (typedUnit || def.unit !== 'g')) {
      const u = typedUnit ?? def.unit;
      setUnit(u);
      setQty(typed.qty);
      return;
    }
    setUnit(def.unit);
    setQty(def.unit === 'g' ? 100 : 1);
    // Polish step 6b: start in the unit this food was last measured in.
    rememberedUnit(food.name).then((u) => {
      if (u && unitsFor(food).some((x) => x.unit === u)) {
        setUnit(u);
        setQty(u === 'g' ? 100 : 1);
      }
    });
  };

  const grams = picked ? gramsFor(picked, qty, unit) : 0;
  const nutrients = useMemo(() => (picked ? nutrientsFor(picked, grams) : null), [picked, grams]);
  const step = unit === 'g' ? 25 : 0.5;
  const min = unit === 'g' ? 25 : 0.5;

  const logPlate = async (p: SavedPlate) => {
    if (saving) return;
    setSaving(true);
    setError(null);
    const row = await saveMeal(mealType, {
      description: p.name,
      calories: p.kcal,
      protein_g: p.proteinG,
      carbs_g: p.carbsG,
      fats_g: p.fatG,
      planStatus: planned ? 'swapped' : 'extra',
      ...(p.items ? { items: p.items } : {}),
      ...(p.nutrients ? { nutrients: p.nutrients } : {}),
    });
    setSaving(false);
    if (!row) {
      setError('Could not log it. Check your connection and try again.');
      return;
    }
    if (userId) recordPlateUse(userId, p.id).catch(() => {});
    reset();
    onLogged(row);
  };

  const log = async () => {
    if (!picked || !nutrients || saving) return;
    if (onPickFood) {
      onPickFood(picked, qty, unit);
      reset();
      return;
    }
    // Every way of logging ends on the same check screen: the breakdown, the rating, more foods to add, then log.
    const g = scanGramsFor(picked, qty, unit);
    startCheck({ source: 'search', mealType, dish: picked.name, items: [{ key: 's0', heard: picked.name, food: picked, qty, unit: g.unit, grams: Math.round(g.grams) }] });
    reset();
    onClose();
    router.push('/scan-check');
  };

  return (
    <BottomSheet visible={visible} onClose={close} maxHeightFraction={0.92}>
      <View style={{ paddingHorizontal: 20, paddingBottom: 12, gap: 12 }}>
        {picked && nutrients ? (
          <>
            <PressScale onPress={() => setPicked(null)} accessibilityRole="button" accessibilityLabel="Back to search" style={{ alignSelf: 'flex-start' }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, minHeight: 44 }}>
                <Icon name="chevron-left" size={18} color={COLORS.textMuted} />
                <Text style={{ color: COLORS.textMuted, fontSize: 15, fontFamily: BG[400] }}>Search</Text>
              </View>
            </PressScale>
            <Text style={{ color: COLORS.fg, fontSize: 22, fontFamily: BG[800] }}>{picked.name}</Text>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
              {unitsFor(picked).map((u) => (
                <Chip
                  key={u.unit}
                  active={unit === u.unit}
                  accent={G}
                  accentDeep={COLORS.greenDeep}
                  onPress={() => {
                    setUnit(u.unit);
                    setQty(u.unit === 'g' ? 100 : 1);
                    rememberUnit(picked.name, u.unit).catch(() => {});
                  }}
                >
                  {u.unit === 'g' ? 'grams' : u.unit}
                </Chip>
              ))}
            </View>
            <Stepper
              label="Quantity"
              value={String(qty)}
              unit={unit === 'g' ? 'g' : unit}
              onDecrement={() => setQty((q) => Math.max(min, Math.round((q - step) * 100) / 100))}
              onIncrement={() => setQty((q) => Math.round((q + step) * 100) / 100)}
              decrementDisabled={qty <= min}
            />
            <Text style={{ color: COLORS.fg, fontSize: 28, fontVariant: ['tabular-nums'], fontFamily: BG[800] }}>
              {nutrients.kcal} <Text style={{ color: COLORS.textMuted, fontSize: 15, fontWeight: '600' }}>kcal</Text>
            </Text>
            <Text style={{ color: COLORS.textMuted, fontSize: 15, fontVariant: ['tabular-nums'], fontFamily: BG[400] }}>
              P {nutrients.proteinG} g · C {nutrients.carbsG} g · F {nutrients.fatG} g · {Math.round(grams)} g in all
            </Text>
            {!picked.reviewed ? <Text style={{ color: COLORS.textFaint, fontSize: 13, fontFamily: BG[400] }}>Values are from the food database and are still being reviewed.</Text> : null}
            {error ? <ErrorCard message={error} onRetry={log} retrying={saving} /> : null}
            <Button variant="primary" accent={G} accentDeep={COLORS.greenDeep} size="lg" fullWidth saving={saving} onPress={log}>
              {onPickFood ? 'Add to the plate' : 'Check and log'}
            </Button>
          </>
        ) : (
          <>
            <Text style={{ color: COLORS.fg, fontSize: 20, fontFamily: BG[800] }}>Search food</Text>
            <TextInput
              value={query}
              onChangeText={setQuery}
              placeholder="chai, 2 roti, 1 katori dal"
              placeholderTextColor={COLORS.textFaint}
              autoFocus
              autoCapitalize="none"
              accessibilityLabel="Search food"
              style={{ height: 48, borderRadius: 12, borderWidth: 1, borderColor: query ? COLORS.greenBorderMd : COLORS.border, backgroundColor: COLORS.card, color: COLORS.fg, fontSize: 17, paddingHorizontal: 14, fontFamily: BG[400] }}
            />
            <ScrollView style={{ maxHeight: 360 }} keyboardShouldPersistTaps="handled">
              {query.trim().length < 2 && !onPickFood && myPlates.length > 0 ? (
                <View style={{ gap: 4, paddingBottom: 8 }}>
                  <Text style={{ color: G, fontSize: 13, letterSpacing: 0.9, fontFamily: BG[700] }}>MY PLATES</Text>
                  {myPlates.map((p) => (
                    <PressScale key={p.id} onPress={() => logPlate(p)} disabled={saving} accessibilityRole="button" accessibilityLabel={`Log my plate: ${p.name}, ${p.kcal} kilocalories`}>
                      <View style={{ minHeight: 56, paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: COLORS.border, flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                        <View style={{ flex: 1 }}>
                          <Text style={{ color: COLORS.fg, fontSize: 17, fontFamily: BG[700] }} numberOfLines={1}>{p.name}</Text>
                          <Text style={{ color: COLORS.textMuted, fontSize: 13, fontVariant: ['tabular-nums'], fontFamily: BG[400] }}>{p.kcal} kcal · P {p.proteinG} g</Text>
                        </View>
                        <Icon name="plus" size={18} color={G} />
                      </View>
                    </PressScale>
                  ))}
                </View>
              ) : null}
              {searching && results.length === 0 ? <SearchSkeleton /> : null}
              {results.map((f) => (
                <PressScale key={f.id} onPress={() => choose(f)} accessibilityRole="button" accessibilityLabel={`${f.name}, ${Math.round(f.kcal100g)} kilocalories per 100 grams`}>
                  <View style={{ minHeight: 56, paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: COLORS.border, flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                    <View style={{ flex: 1 }}>
                      <Text style={{ color: COLORS.fg, fontSize: 17, fontFamily: BG[700] }}>{f.name}</Text>
                      <Text style={{ color: COLORS.textMuted, fontSize: 13, fontFamily: BG[400] }}>
                        {/* What a usual serving is and what it costs: "1 plate (200 g) · 380 kcal". */}
                        {defaultUnit(f).unit === 'g' ? '100 g' : `1 ${defaultUnit(f).unit} (${Math.round(defaultUnit(f).grams)} g)`} · {Math.round((f.kcal100g * (defaultUnit(f).unit === 'g' ? 100 : defaultUnit(f).grams)) / 100)} kcal
                      </Text>
                    </View>
                    <Icon name="chevron-right" size={16} color={COLORS.textMuted} />
                  </View>
                </PressScale>
              ))}
              {query.trim().length >= 2 && !searching && results.length === 0 ? (
                <View style={{ paddingVertical: 14, gap: 10 }}>
                  <Text style={{ color: COLORS.textMuted, fontSize: 15, fontFamily: BG[400] }}>Nothing found for "{query.trim()}". Try one word, or describe it instead.</Text>
                  {asked === query.trim() ? (
                    <Text style={{ color: G, fontSize: 15, fontFamily: BG[700] }}>Thanks, we will check it and add it.</Text>
                  ) : (
                    <Button variant="secondary" accent={G} size="md" onPress={() => { const q = query.trim(); requestFood(userId, q, 'search'); setAsked(q); }}>
                      Ask us to add it
                    </Button>
                  )}
                </View>
              ) : null}
              {query.trim().length < 2 && recent.length > 0 ? (
                <View style={{ gap: 8, paddingTop: 4 }}>
                  <Text style={{ color: COLORS.textMuted, fontSize: 13, letterSpacing: 0.9, fontFamily: BG[700] }}>RECENT</Text>
                  <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
                    {recent.slice(0, 6).map((r) => (
                      <Chip key={r} accent={G} onPress={() => setQuery(r.replace(/^[\d.½\s]+(g|ml|tsp|tbsp|katori|glass|cup|roti|piece)?\s*/i, ''))}>
                        {tidyName(r)}
                      </Chip>
                    ))}
                  </View>
                </View>
              ) : null}
            </ScrollView>
            <View style={{ flexDirection: 'row', gap: 10 }}>
              <View style={{ flex: 1 }}>
                <Button
                  variant="secondary"
                  accent={G}
                  size="md"
                  fullWidth
                  onPress={() => {
                    close();
                    router.push({ pathname: '/meal-log', params: { mealType } });
                  }}
                  icon={<Icon name="camera" size={15} color={G} />}
                >
                  Photo or describe
                </Button>
              </View>
            </View>
          </>
        )}
      </View>
    </BottomSheet>
  );
}
