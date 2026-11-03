import React, { useState } from 'react';
import { Text, TextInput, View } from 'react-native';
import { AREA_COLORS, COLORS, FONT, tint } from '../lib/theme';
import { suggestMeals, type DietaryRestriction, type EstimatedMeal, type MealSuggestion, type MealType, type RemainingMacros, type SuggestRefine } from '../lib/data';
import { cuisineLabels, normalizeFoodProfile, type FoodProfile } from '../lib/foodProfile';
import { Icon } from './ui/Icon';
import { PressScale } from './ui/PressScale';

const C = AREA_COLORS.nutrition;

const REFINES: { key: SuggestRefine; label: string }[] = [
  { key: 'more_protein', label: 'More protein' },
  { key: 'quicker', label: 'Quicker' },
  { key: 'something_else', label: 'Something else' },
];

export interface MealSuggestionsProps {
  mealType: MealType;
  remaining: RemainingMacros | undefined;
  restrictions: DietaryRestriction[];
  foodProfile: FoodProfile | undefined;
  goal: string | null;
  eatenToday: string[];
  trainedToday: boolean;
  /** Called when the user taps "Log this"; the parent opens its review step. */
  onPick: (meal: EstimatedMeal) => void;
}

function MacroPill({ label, value }: { label: string; value: string }) {
  return (
    <View style={{ flex: 1, paddingVertical: 8, borderRadius: 10, backgroundColor: 'rgba(255,255,255,0.04)', alignItems: 'center' }}>
      <Text style={{ color: '#fff', fontSize: 14, fontWeight: '800', fontVariant: ['tabular-nums'], fontFamily: FONT }}>{value}</Text>
      <Text style={{ color: '#71717A', fontSize: 9.5, fontWeight: '700', letterSpacing: 0.5, fontFamily: FONT }}>{label}</Text>
    </View>
  );
}

/**
 * V2 PHASE 5.3 — what is left today and the active preferences on top, three
 * ranked option cards (best fit badged), refine chips that re-ask without
 * typing, and free text. Logging goes through the parent's review step.
 */
export function MealSuggestions({ mealType, remaining, restrictions, foodProfile, goal, eatenToday, trainedToday, onPick }: MealSuggestionsProps) {
  const [preference, setPreference] = useState('');
  const [loading, setLoading] = useState(false);
  const [options, setOptions] = useState<MealSuggestion[] | null>(null);
  const [generic, setGeneric] = useState(false);
  const [seen, setSeen] = useState<string[]>([]);

  const fp = normalizeFoodProfile(foodProfile);
  const cuisines = cuisineLabels(fp);
  const prefChips = [...restrictions.map((r) => r.replace(/_/g, ' ')), ...cuisines, ...(fp.avoid ? [`no ${fp.avoid}`] : [])];

  const ask = async (refine?: SuggestRefine) => {
    if (loading) return;
    setLoading(true);
    const res = await suggestMeals({
      mealType,
      preference: preference.trim(),
      dietaryRestrictions: restrictions,
      goal,
      cuisines: fp.cuisines,
      avoid: fp.avoid,
      // "Something else" must not bring back what was just shown.
      eatenToday: refine === 'something_else' ? [...eatenToday, ...seen] : eatenToday,
      trainedToday,
      remaining,
      refine,
    });
    setLoading(false);
    setOptions(res.options);
    setGeneric(res.generic);
    setSeen((prev) => [...prev, ...res.options.map((o) => o.description)]);
  };

  return (
    <View style={{ backgroundColor: COLORS.card, borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)', borderRadius: 16, padding: 14, marginBottom: 20, gap: 12 }}>
      <Text style={{ color: '#fff', fontSize: 13, fontWeight: '700', fontFamily: FONT }}>Not sure what to eat?</Text>

      {remaining ? (
        <View style={{ gap: 6 }}>
          <Text style={{ color: '#71717A', fontSize: 10.5, fontWeight: '700', letterSpacing: 0.6, fontFamily: FONT }}>LEFT TODAY</Text>
          <View style={{ flexDirection: 'row', gap: 6 }}>
            <MacroPill label="KCAL" value={String(Math.round(remaining.calories))} />
            <MacroPill label="PROTEIN" value={`${Math.round(remaining.protein_g)} g`} />
            <MacroPill label="CARBS" value={`${Math.round(remaining.carbs_g)} g`} />
            <MacroPill label="FAT" value={`${Math.round(remaining.fats_g)} g`} />
          </View>
        </View>
      ) : null}

      {prefChips.length > 0 ? (
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>
          {prefChips.map((p) => (
            <View key={p} style={{ paddingHorizontal: 9, paddingVertical: 4, borderRadius: 100, backgroundColor: tint(C, 0.12) }}>
              <Text style={{ color: C, fontSize: 10.5, fontWeight: '700', fontFamily: FONT }}>{p}</Text>
            </View>
          ))}
        </View>
      ) : null}

      <TextInput
        value={preference}
        onChangeText={setPreference}
        placeholder="e.g. something light, only have eggs and rice"
        placeholderTextColor="#52525B"
        style={{ height: 44, borderRadius: 12, paddingHorizontal: 12, backgroundColor: 'rgba(255,255,255,0.04)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.12)', color: '#fff', fontSize: 13, fontFamily: FONT }}
      />

      {options === null || loading ? (
        <PressScale onPress={() => ask()} disabled={loading} accessibilityRole="button">
          <View style={{ height: 44, borderRadius: 12, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, backgroundColor: tint(C, 0.14), borderWidth: 1, borderColor: tint(C, 0.3) }}>
            <Icon name="sparkles" size={14} color={C} />
            <Text style={{ color: C, fontSize: 12.5, fontWeight: '700', fontFamily: FONT }}>
              {loading ? 'Finding options…' : preference.trim() ? 'Suggest based on this' : 'Suggest 3 meals for me'}
            </Text>
          </View>
        </PressScale>
      ) : (
        <>
          {generic ? (
            <Text style={{ color: '#A1A1AA', fontSize: 11.5, fontFamily: FONT }}>Couldn't reach suggestions just now, so this is a typical portion instead.</Text>
          ) : null}
          {options.map((o) => (
            <View key={o.description} style={{ padding: 12, borderRadius: 14, backgroundColor: 'rgba(255,255,255,0.04)', borderWidth: 1, borderColor: o.bestFit ? tint(C, 0.45) : 'rgba(255,255,255,0.08)', gap: 8 }}>
              <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 8 }}>
                <Text style={{ flex: 1, color: '#fff', fontSize: 14, fontWeight: '800', lineHeight: 19, fontFamily: FONT }}>{o.description}</Text>
                {o.bestFit && !generic ? (
                  <View style={{ paddingHorizontal: 8, paddingVertical: 3, borderRadius: 100, backgroundColor: tint(C, 0.18) }}>
                    <Text style={{ color: C, fontSize: 9.5, fontWeight: '800', letterSpacing: 0.4, fontFamily: FONT }}>BEST FIT</Text>
                  </View>
                ) : null}
              </View>
              <View style={{ flexDirection: 'row', gap: 6 }}>
                <MacroPill label="KCAL" value={String(Math.round(o.calories))} />
                <MacroPill label="PROTEIN" value={`${Math.round(o.protein_g)} g`} />
                <MacroPill label="CARBS" value={`${Math.round(o.carbs_g)} g`} />
                <MacroPill label="FAT" value={`${Math.round(o.fats_g)} g`} />
              </View>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5 }}>
                <Icon name="clock" size={12} color="#71717A" />
                <Text style={{ color: '#71717A', fontSize: 11.5, fontFamily: FONT }}>{o.prep_minutes} min</Text>
              </View>
              <Text style={{ color: '#A1A1AA', fontSize: 12, lineHeight: 17, fontFamily: FONT }}>{o.why}</Text>
              <PressScale
                onPress={() =>
                  onPick({ description: o.description, calories: o.calories, protein_g: o.protein_g, carbs_g: o.carbs_g, fats_g: o.fats_g })
                }
                accessibilityRole="button"
                accessibilityLabel={`Log ${o.description}`}
              >
                <View style={{ height: 42, borderRadius: 11, alignItems: 'center', justifyContent: 'center', backgroundColor: o.bestFit ? C : tint(C, 0.16) }}>
                  <Text style={{ color: o.bestFit ? '#050505' : C, fontSize: 13, fontWeight: '800', fontFamily: FONT }}>Log this</Text>
                </View>
              </PressScale>
            </View>
          ))}
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
            {REFINES.map((r) => (
              <PressScale key={r.key} onPress={() => ask(r.key)} accessibilityRole="button">
                <View style={{ paddingHorizontal: 12, paddingVertical: 8, borderRadius: 100, backgroundColor: COLORS.card, borderWidth: 1, borderColor: 'rgba(255,255,255,0.14)' }}>
                  <Text style={{ color: '#D4D4D8', fontSize: 12, fontWeight: '600', fontFamily: FONT }}>{r.label}</Text>
                </View>
              </PressScale>
            ))}
          </View>
        </>
      )}
    </View>
  );
}
