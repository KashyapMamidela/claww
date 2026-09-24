import React from 'react';
import { Modal, Text, TouchableOpacity, View } from 'react-native';
import { COLORS, FONT } from '../lib/theme';
import type { MealLogRow } from '../lib/data';

const MEAL_ICON: Record<string, string> = { Breakfast: '🥣', Lunch: '🥗', Snack: '🍎', Dinner: '🍽️' };

export interface MealDetailModalProps {
  meal: MealLogRow | null;
  onClose: () => void;
}

/** Tapping a Meal Timeline row previously did nothing — this shows the same
 * fields already stored on the row (no new data needed), matching the
 * post-log confirmation screen meal-log.tsx already shows once right after
 * saving. */
export function MealDetailModal({ meal, onClose }: MealDetailModalProps) {
  return (
    <Modal visible={!!meal} transparent animationType="fade" onRequestClose={onClose}>
      <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.65)', alignItems: 'center', justifyContent: 'center', padding: 24 }}>
        <View
          style={{
            width: '100%',
            maxWidth: 380,
            backgroundColor: COLORS.card,
            borderWidth: 1,
            borderColor: COLORS.border,
            borderRadius: 18,
            padding: 20,
            gap: 14,
          }}
        >
          {meal && (
            <>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                <View
                  style={{
                    width: 40,
                    height: 40,
                    borderRadius: 10,
                    backgroundColor: 'rgba(34,197,94,0.11)',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <Text style={{ fontSize: 18 }}>{MEAL_ICON[meal.meal_type ?? ''] ?? '🍽️'}</Text>
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={{ color: '#fff', fontSize: 16, fontWeight: '800', fontFamily: FONT }}>{meal.meal_type ?? 'Meal'}</Text>
                  <Text style={{ color: '#71717A', fontSize: 11.5, fontFamily: FONT }}>
                    {new Date(meal.logged_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    {meal.estimated ? ' · estimated' : ''}
                  </Text>
                </View>
              </View>

              <Text style={{ color: '#A1A1AA', fontSize: 13, lineHeight: 19, fontFamily: FONT }}>{meal.description}</Text>

              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
                {[
                  { label: 'Calories', value: `${Math.round(meal.calories ?? 0)}` },
                  { label: 'Protein', value: `${Math.round(meal.protein_g ?? 0)}g` },
                  { label: 'Carbs', value: `${Math.round(meal.carbs_g ?? 0)}g` },
                  { label: 'Fats', value: `${Math.round(meal.fats_g ?? 0)}g` },
                ].map((s) => (
                  <View
                    key={s.label}
                    style={{
                      flexGrow: 1,
                      minWidth: '45%',
                      backgroundColor: 'rgba(255,255,255,0.04)',
                      borderRadius: 12,
                      paddingVertical: 10,
                      paddingHorizontal: 12,
                    }}
                  >
                    <Text style={{ color: '#71717A', fontSize: 10, fontFamily: FONT }}>{s.label}</Text>
                    <Text style={{ color: '#fff', fontSize: 16, fontWeight: '800', fontFamily: FONT }}>{s.value}</Text>
                  </View>
                ))}
              </View>

              <TouchableOpacity
                activeOpacity={0.8}
                onPress={onClose}
                style={{
                  height: 48,
                  borderRadius: 14,
                  backgroundColor: 'rgba(255,255,255,0.06)',
                  alignItems: 'center',
                  justifyContent: 'center',
                  marginTop: 4,
                }}
              >
                <Text style={{ color: '#fff', fontSize: 14, fontWeight: '700', fontFamily: FONT }}>Close</Text>
              </TouchableOpacity>
            </>
          )}
        </View>
      </View>
    </Modal>
  );
}
