import React, { useEffect, useState } from 'react';
import { Image, Modal, Text, TouchableOpacity, View } from 'react-native';
import { COLORS, FONT, BG, bg } from '../lib/theme';
import type { MealLogRow } from '../lib/data';
import { Icon } from './ui/Icon';
import { mealTypeIcon, useSignedMealPhoto } from './MealPhoto';
import { useAppState } from '../lib/appState';
import { deletePlate, saveMealAsPlate, usePlates } from '../lib/platesData';
import { hasPlate } from '../lib/plates';
import { useRouter } from 'expo-router';
import { itemsFromMeal, startCheck } from '../lib/mealCheck';
import { replanToday } from '../lib/mealPlanData';
import { useToast } from './ui/Toast';

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
  const { userId, meals, removeMeal } = useAppState();
  const router = useRouter();
  const toast = useToast();
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [busy, setBusy] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);
  useEffect(() => {
    setConfirmDelete(false);
    setActionError(null);
  }, [meal?.id]);

  // Edit opens the same check screen as a scan: every item with − and +, more to add, the rating, then Save changes.
  const edit = async () => {
    if (!meal || busy) return;
    setBusy(true);
    const items = await itemsFromMeal(meal);
    setBusy(false);
    startCheck({ source: 'edit', mealType: meal.meal_type ?? 'Snack', dish: meal.description, items, editing: meal });
    onClose();
    router.push('/scan-check');
  };

  // Delete asks once in place, then removes the meal and plans the rest of the day again.
  const remove = async () => {
    if (!meal || busy) return;
    if (!confirmDelete) {
      setConfirmDelete(true);
      return;
    }
    setBusy(true);
    const ok = await removeMeal(meal.id);
    setBusy(false);
    if (!ok) {
      setActionError('Could not delete it. Check your connection and try again.');
      return;
    }
    if (userId) replanToday(userId, meals.filter((m) => m.id !== meal.id)).catch(() => {});
    toast.show({ message: 'Meal deleted' });
    onClose();
  };
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
                  {/* The dish is what you ate, so it's the title; the meal and time sit under it. */}
                  <Text style={{ color: '#fff', fontSize: 20, lineHeight: 25, fontFamily: BG[800] }}>{meal.description}</Text>
                  <Text style={{ color: COLORS.textMuted, fontSize: 13, marginTop: 2, fontFamily: BG[400] }}>
                    {meal.meal_type ?? 'Meal'} · {new Date(meal.logged_at).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}
                  </Text>
                </View>
              </View>

              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
                {[
                  { label: 'Calories', value: `${Math.round(meal.calories ?? 0)}` },
                  { label: 'Protein', value: `${Math.round(meal.protein_g ?? 0)} g` },
                  { label: 'Carbs', value: `${Math.round(meal.carbs_g ?? 0)} g` },
                  { label: 'Fat', value: `${Math.round(meal.fats_g ?? 0)} g` },
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
                    <Text style={{ color: COLORS.textMuted, fontSize: 11, fontFamily: BG[400] }}>{s.label}</Text>
                    <Text style={{ color: '#fff', fontSize: 17, fontFamily: BG[800] }}>{s.value}</Text>
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
                  style={{ height: 50, borderRadius: 25, borderWidth: 1, borderColor: COLORS.greenBorderMd, backgroundColor: isPlate ? COLORS.greenGlow : 'transparent', alignItems: 'center', justifyContent: 'center', flexDirection: 'row', gap: 8 }}
                >
                  <Icon name={isPlate ? 'check' : 'plus'} size={16} color={COLORS.green} />
                  <Text style={{ color: COLORS.green, fontSize: 15, fontFamily: BG[700] }}>{isPlate ? 'Saved as my plate' : 'Save as my plate'}</Text>
                </TouchableOpacity>
              ) : null}

              {meal.plan_status !== 'skipped' ? (
                <View style={{ flexDirection: 'row', gap: 10 }}>
                  <TouchableOpacity
                    activeOpacity={0.8}
                    onPress={edit}
                    disabled={busy}
                    accessibilityRole="button"
                    accessibilityLabel="Edit this meal"
                    style={{ flex: 1, height: 50, borderRadius: 25, backgroundColor: COLORS.green, alignItems: 'center', justifyContent: 'center', flexDirection: 'row', gap: 8 }}
                  >
                    <Icon name="pencil" size={16} color="#04140A" />
                    <Text style={{ color: '#04140A', fontSize: 15, fontFamily: BG[800] }}>Edit</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    activeOpacity={0.8}
                    onPress={remove}
                    disabled={busy}
                    accessibilityRole="button"
                    accessibilityLabel={confirmDelete ? 'Confirm delete this meal' : 'Delete this meal'}
                    style={{ flex: 1, height: 50, borderRadius: 25, borderWidth: 1, borderColor: 'rgba(248,113,113,0.5)', backgroundColor: confirmDelete ? 'rgba(248,113,113,0.16)' : 'transparent', alignItems: 'center', justifyContent: 'center', flexDirection: 'row', gap: 8 }}
                  >
                    <Icon name="trash-2" size={16} color="#F87171" />
                    <Text style={{ color: '#F87171', fontSize: 15, fontFamily: BG[800] }}>{confirmDelete ? 'Tap again to delete' : 'Delete'}</Text>
                  </TouchableOpacity>
                </View>
              ) : (
                <TouchableOpacity
                  activeOpacity={0.8}
                  onPress={remove}
                  disabled={busy}
                  accessibilityRole="button"
                  accessibilityLabel="Remove this skipped answer"
                  style={{ height: 50, borderRadius: 25, borderWidth: 1, borderColor: COLORS.border, alignItems: 'center', justifyContent: 'center' }}
                >
                  <Text style={{ color: COLORS.fg, fontSize: 15, fontFamily: BG[700] }}>{confirmDelete ? 'Tap again to undo the skip' : 'Undo skipped'}</Text>
                </TouchableOpacity>
              )}
              {actionError ? <Text style={{ color: '#F87171', fontSize: 13, fontFamily: BG[400] }}>{actionError}</Text> : null}

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
                <Text style={{ color: '#fff', fontSize: 15, fontFamily: BG[700] }}>Close</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>
      </View>
    </Modal>
  );
}
