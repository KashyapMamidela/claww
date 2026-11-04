import React, { useEffect, useMemo, useState } from 'react';
import { ScrollView, Text, TextInput, View } from 'react-native';
import { useRouter } from 'expo-router';
import { COLORS, FONT } from '../../lib/theme';
import { useAppState, type MealLogRow, type MealType } from '../../lib/appState';
import { searchFoodDb, recordFoodUse } from '../../lib/foodDb';
import { defaultUnit, gramsFor, nutrientsFor, unitsFor, type Food } from '../../lib/foodLookup';
import { BottomSheet } from '../ui/BottomSheet';
import { Button } from '../ui/Button';
import { Chip } from '../ui/Chip';
import { ErrorCard } from '../ui/ErrorCard';
import { Icon } from '../ui/Icon';
import { PressScale } from '../ui/PressScale';
import { Stepper } from '../ui/Stepper';

// NG PHASE 8: "Search" and "Something else". Search the reviewed food database by name (chai, 2 roti, katori dal),
// pick a quantity in household units, and log it with its micronutrients. Nothing here is estimated by a model.

const G = COLORS.green;

export interface FoodSearchSheetProps {
  visible: boolean;
  mealType: MealType;
  /** Recent descriptions to start from while the box is empty. */
  recent: string[];
  onClose: () => void;
  onLogged: (row: MealLogRow) => void;
}

export function FoodSearchSheet({ visible, mealType, recent, onClose, onLogged }: FoodSearchSheetProps) {
  const router = useRouter();
  const { saveMeal } = useAppState();
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<Food[]>([]);
  const [searching, setSearching] = useState(false);
  const [picked, setPicked] = useState<Food | null>(null);
  const [qty, setQty] = useState(1);
  const [unit, setUnit] = useState('g');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

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
    setPicked(food);
    setUnit(def.unit);
    setQty(def.unit === 'g' ? 100 : 1);
    setError(null);
  };

  const grams = picked ? gramsFor(picked, qty, unit) : 0;
  const nutrients = useMemo(() => (picked ? nutrientsFor(picked, grams) : null), [picked, grams]);
  const step = unit === 'g' ? 25 : 0.5;
  const min = unit === 'g' ? 25 : 0.5;

  const log = async () => {
    if (!picked || !nutrients || saving) return;
    setSaving(true);
    setError(null);
    const qtyText = unit === 'g' ? `${qty} g` : `${qty} ${unit}`;
    const row = await saveMeal(mealType, {
      description: `${qtyText} ${picked.name}`,
      calories: nutrients.kcal,
      protein_g: nutrients.proteinG,
      carbs_g: nutrients.carbsG,
      fats_g: nutrients.fatG,
      items: [{ food: picked.name, unit, qty, grams: Math.round(grams) }],
      nutrients: { fibreG: nutrients.fibreG, ironMg: nutrients.ironMg, calciumMg: nutrients.calciumMg, vitcMg: nutrients.vitcMg, b12Ug: nutrients.b12Ug, sodiumMg: nutrients.sodiumMg },
    });
    setSaving(false);
    if (!row) {
      setError('Could not log it. Check your connection and try again.');
      return;
    }
    recordFoodUse(picked.id).catch(() => {});
    reset();
    onLogged(row);
  };

  return (
    <BottomSheet visible={visible} onClose={close} maxHeightFraction={0.92}>
      <View style={{ paddingHorizontal: 20, paddingBottom: 12, gap: 12 }}>
        {picked && nutrients ? (
          <>
            <PressScale onPress={() => setPicked(null)} accessibilityRole="button" accessibilityLabel="Back to search" style={{ alignSelf: 'flex-start' }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, minHeight: 44 }}>
                <Icon name="chevron-left" size={18} color={COLORS.textMuted} />
                <Text style={{ color: COLORS.textMuted, fontSize: 14, fontFamily: FONT }}>Search</Text>
              </View>
            </PressScale>
            <Text style={{ color: COLORS.fg, fontSize: 22, fontWeight: '800', fontFamily: FONT }}>{picked.name}</Text>
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
            <Text style={{ color: COLORS.fg, fontSize: 28, fontWeight: '900', fontVariant: ['tabular-nums'], fontFamily: FONT }}>
              {nutrients.kcal} <Text style={{ color: COLORS.textMuted, fontSize: 14, fontWeight: '600' }}>kcal</Text>
            </Text>
            <Text style={{ color: COLORS.textMuted, fontSize: 14, fontVariant: ['tabular-nums'], fontFamily: FONT }}>
              P {nutrients.proteinG} g · C {nutrients.carbsG} g · F {nutrients.fatG} g · {Math.round(grams)} g in all
            </Text>
            {!picked.reviewed ? <Text style={{ color: COLORS.textFaint, fontSize: 12, fontFamily: FONT }}>Values are from the food database and are still being reviewed.</Text> : null}
            {error ? <ErrorCard message={error} onRetry={log} retrying={saving} /> : null}
            <Button variant="primary" accent={G} accentDeep={COLORS.greenDeep} size="lg" fullWidth disabled={saving} onPress={log}>
              {saving ? 'Saving…' : `Log ${mealType.toLowerCase()}`}
            </Button>
          </>
        ) : (
          <>
            <Text style={{ color: COLORS.fg, fontSize: 20, fontWeight: '800', fontFamily: FONT }}>Search food</Text>
            <TextInput
              value={query}
              onChangeText={setQuery}
              placeholder="chai, 2 roti, 1 katori dal"
              placeholderTextColor={COLORS.textFaint}
              autoFocus
              autoCapitalize="none"
              accessibilityLabel="Search food"
              style={{ height: 52, borderRadius: 14, borderWidth: 1, borderColor: query ? COLORS.greenBorderMd : COLORS.border, backgroundColor: COLORS.card, color: COLORS.fg, fontSize: 16, paddingHorizontal: 14, fontFamily: FONT }}
            />
            <ScrollView style={{ maxHeight: 360 }} keyboardShouldPersistTaps="handled">
              {results.map((f) => (
                <PressScale key={f.id} onPress={() => choose(f)} accessibilityRole="button" accessibilityLabel={`${f.name}, ${Math.round(f.kcal100g)} kilocalories per 100 grams`}>
                  <View style={{ minHeight: 56, paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: COLORS.border, flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                    <View style={{ flex: 1 }}>
                      <Text style={{ color: COLORS.fg, fontSize: 16, fontWeight: '700', fontFamily: FONT }}>{f.name}</Text>
                      <Text style={{ color: COLORS.textMuted, fontSize: 13, fontFamily: FONT }}>
                        {f.kind === 'dish' ? 'Dish' : 'Ingredient'} · per {defaultUnit(f).unit === 'g' ? '100 g' : `${defaultUnit(f).unit} (${Math.round(defaultUnit(f).grams)} g)`}
                      </Text>
                    </View>
                    <Icon name="chevron-right" size={16} color={COLORS.textMuted} />
                  </View>
                </PressScale>
              ))}
              {query.trim().length >= 2 && !searching && results.length === 0 ? (
                <Text style={{ color: COLORS.textMuted, fontSize: 14, paddingVertical: 14, fontFamily: FONT }}>Nothing found for "{query.trim()}". Try one word, or describe it instead.</Text>
              ) : null}
              {query.trim().length < 2 && recent.length > 0 ? (
                <View style={{ gap: 8, paddingTop: 4 }}>
                  <Text style={{ color: COLORS.textMuted, fontSize: 12, fontWeight: '700', letterSpacing: 0.9, fontFamily: FONT }}>RECENT</Text>
                  <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
                    {recent.slice(0, 6).map((r) => (
                      <Chip key={r} accent={G} onPress={() => setQuery(r.replace(/^[\d.½\s]+(g|ml|tsp|tbsp|katori|glass|cup|roti|piece)?\s*/i, ''))}>
                        {r.length > 26 ? `${r.slice(0, 26)}…` : r}
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
