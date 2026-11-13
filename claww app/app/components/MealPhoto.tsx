import React, { useEffect, useState } from 'react';
import { Image, View } from 'react-native';
import { COLORS } from '../lib/theme';
import { getSignedMealPhotoUrl } from '../lib/data';
import { Icon } from './ui/Icon';

const MEAL_TYPE_ICON: Record<string, string> = {
  Breakfast: 'coffee',
  Lunch: 'salad',
  Snack: 'apple',
  Dinner: 'utensils-crossed',
};

export function mealTypeIcon(mealType: string | null | undefined): string {
  return MEAL_TYPE_ICON[mealType ?? ''] ?? 'utensils';
}

/** Signs a private meal-photo path (1h link). Null while loading, when the
 * meal has no photo, or when signing fails — callers show the icon then. */
export function useSignedMealPhoto(path: string | null | undefined): string | null {
  const [url, setUrl] = useState<string | null>(null);
  useEffect(() => {
    let cancelled = false;
    setUrl(null);
    if (path) {
      getSignedMealPhotoUrl(path).then((u) => {
        if (!cancelled) setUrl(u);
      });
    }
    return () => {
      cancelled = true;
    };
  }, [path]);
  return url;
}

export interface MealThumbProps {
  /** Storage path from meal_logs.photo_url, or null for text-only meals. */
  photoPath: string | null | undefined;
  mealType: string | null | undefined;
  size?: number;
}

/** Round photo thumbnail for a meal, or its meal-type icon when there's no
 * photo, the link can't be signed, or the image fails to load (e.g. an
 * expired link) — never a broken image. */
export function MealThumb({ photoPath, mealType, size = 34 }: MealThumbProps) {
  const url = useSignedMealPhoto(photoPath);
  const [failed, setFailed] = useState(false);

  useEffect(() => setFailed(false), [url]);

  // The meal's icon shows at once, and the photo fades in over it (150 ms) once it has loaded, so the circle is
  // never blank while the link is signed or the image downloads.
  return (
    <View
      style={{
        width: size,
        height: size,
        borderRadius: size / 2,
        backgroundColor: COLORS.greenGlow,
        borderWidth: 1,
        borderColor: COLORS.greenBorder,
        alignItems: 'center',
        justifyContent: 'center',
        overflow: 'hidden',
      }}
    >
      <Icon name={mealTypeIcon(mealType)} size={Math.round(size * 0.47)} color={COLORS.green} />
      {url && !failed ? (
        <Image
          source={{ uri: url }}
          onError={() => setFailed(true)}
          fadeDuration={150}
          style={{ position: 'absolute', top: 0, left: 0, width: size, height: size, borderRadius: size / 2 }}
          resizeMode="cover"
        />
      ) : null}
    </View>
  );
}
