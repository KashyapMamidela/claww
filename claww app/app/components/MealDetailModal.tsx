import React, { useEffect, useState } from 'react';
import { Image, Modal, Text, TouchableOpacity, View } from 'react-native';
import { COLORS, FONT } from '../lib/theme';
import type { MealLogRow } from '../lib/data';
import { Icon } from './ui/Icon';
import { mealTypeIcon, useSignedMealPhoto } from './MealPhoto';
import { useAppState } from '../lib/appState';
import { deletePlate, saveMealAsPlate, usePlates } from '../lib/platesData';
import { hasPlate } from '../lib/plates';

export interface MealDetailModalProps {
  meal: MealLogRow | null;
  onClose: () => void;
}

/** Tapping a Meal Timeline row previously did nothing — this shows the same
 * fields already stored on the row (no new data needed), matching the
 * post-log confirmation screen meal-log.tsx already shows once right after
 * saving. When the meal was logged from a photo, the photo leads the sheet. */
export function MealDetailModal({ meal, onClose }: MealDetailModalProps) {
  const photoUrl = useSignedMealPhoto(meal?.photo_url);
  const [photoFailed, setPhotoFailed] = useState(false);
  useEffect(() => setPhotoFailed(false), [photoUrl]);
  const showPhoto = !!photoUrl && !photoFailed;
  // Polish step 6: keep this meal as a plate; plates come first in Something else and in search.
  const { userId } = useAppState();
  const { plates } = usePlates(userId);
  const [savingPlate, setSavingPlate] = useState(false);
  const isPlate = !!meal && hasPlate(plates, meal.description);
  const togglePlate = async () => {
    if (!userId || !meal || savingPlate) return;
    setSavingPlate(true);
    if (isPlate) {
      const p = plates.find((x) => x.name.trim().toLowerCase() === meal.description.trim().toLowerCase());
      if (p) await deletePlate(userId, p.id);
    } else {
      await saveMealAsPlate(userId, meal);
    }
    setSavingPlate(false);
  };

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
            overflow: 'hidden',
          }}
        >
          {meal && showPhoto ? (
            <Image
              source={{ uri: photoUrl }}
              onError={() => setPhotoFailed(true)}
              style={{ width: '100%', aspectRatio: 4 / 3, backgroundColor: COLORS.greenGlow }}
              resizeMode="cover"
            />
          ) : null}
          {meal && (
            <View style={{ padding: 20, gap: 14 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                {!showPhoto ? (
                  <View
                    style={{
                      width: 40,
                      height: 40,
                      borderRadius: 10,
                      backgroundColor: COLORS.greenGlow,
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    <Icon name={mealTypeIcon(meal.meal_type)} size={19} color={COLORS.green} />
                  </View>
                ) : null}
                <View style={{ flex: 1 }}>
                  <Text style={{ color: '#fff', fontSize: 16, fontWeight: '800', fontFamily: FONT }}>{meal.meal_type ?? 'Meal'}</Text>
                  <Text style={{ color: COLORS.textMuted, fontSize: 12, fontFamily: FONT }}>
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
                    <Text style={{ color: COLORS.textMuted, fontSize: 11, fontFamily: FONT }}>{s.label}</Text>
                    <Text style={{ color: '#fff', fontSize: 16, fontWeight: '800', fontFamily: FONT }}>{s.value}</Text>
                  </View>
                ))}
              </View>

              {meal.plan_status !== 'skipped' ? (
                <TouchableOpacity
                  activeOpacity={0.8}
                  onPress={togglePlate}
                  disabled={savingPlate}
                  accessibilityRole="button"
                  accessibilityLabel={isPlate ? 'Remove from my plates' : 'Save as my plate'}
                  style={{ height: 52, borderRadius: 14, borderWidth: 1, borderColor: COLORS.greenBorderMd, backgroundColor: isPlate ? COLORS.greenGlow : 'transparent', alignItems: 'center', justifyContent: 'center', flexDirection: 'row', gap: 8 }}
                >
                  <Icon name={isPlate ? 'check' : 'plus'} size={16} color={COLORS.green} />
                  <Text style={{ color: COLORS.green, fontSize: 14, fontWeight: '700', fontFamily: FONT }}>{isPlate ? 'Saved as my plate' : 'Save as my plate'}</Text>
                </TouchableOpacity>
              ) : null}

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
            </View>
          )}
        </View>
      </View>
    </Modal>
  );
}
