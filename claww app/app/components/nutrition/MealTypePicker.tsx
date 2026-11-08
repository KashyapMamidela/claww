import React from 'react';
import { ScrollView } from 'react-native';
import { AREA_COLORS } from '../../lib/theme';
import type { MealType } from '../../lib/appState';
import { Chip } from '../ui/Chip';
import { tick } from '../../lib/haptics';

// Premium: which meal this is. Three planned meals and as many snacks as you eat: a snack is any extra meal (a
// packet from a barcode, a fruit, a post-workout shake). It is stored as "Snack", so nothing changes in the database.

const G = AREA_COLORS.nutrition;
const ORDER: MealType[] = ['Breakfast', 'Lunch', 'Snack', 'Dinner'];
const LABEL: Record<MealType, string> = { Breakfast: 'Breakfast', Lunch: 'Lunch', Snack: 'Snack', Dinner: 'Dinner' };

export function MealTypePicker({ value, onChange }: { value: MealType; onChange: (t: MealType) => void }) {
  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8, paddingHorizontal: 16 }} accessibilityLabel="Which meal is this">
      {ORDER.map((t) => (
        <Chip
          key={t}
          active={value === t}
          accent={G}
          accentDeep="#15803D"
          onPress={() => {
            if (t !== value) tick();
            onChange(t);
          }}
        >
          {LABEL[t]}
        </Chip>
      ))}
    </ScrollView>
  );
}

/** The meal a log most likely is, from the clock: a snack between the big meals. */
export function mealForClock(hour: number): MealType {
  if (hour >= 5 && hour < 10) return 'Breakfast';
  if (hour >= 10 && hour < 12) return 'Snack';
  if (hour >= 12 && hour < 15) return 'Lunch';
  if (hour >= 15 && hour < 19) return 'Snack';
  if (hour >= 19 && hour < 22) return 'Dinner';
  return 'Snack';
}
