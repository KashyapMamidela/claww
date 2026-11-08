import React from 'react';
import { Surface } from '../ui/Surface';
import { Pressable, Text, View } from 'react-native';
import { COLORS, FONT, BG, bg } from '../../lib/theme';
import { RATING_LABEL, type Rating } from '../../lib/nutritionLogic';
import { MealThumb } from '../MealPhoto';
import { Icon } from '../ui/Icon';

// NG PHASE 8: one logged meal as a card (Nutrition tab and food diary): photo or plate, time and how it was logged,
// the name, macros, and the rating pill. The rating colours follow the design system: good green, okay amber,
// poor grey (never red: a poor meal is not a failure).

const RATING_COLORS: Record<Rating, { fg: string; border: string; bg: string }> = {
  good: { fg: COLORS.ratingGood, border: 'rgba(34,197,94,0.5)', bg: 'rgba(34,197,94,0.12)' },
  okay: { fg: COLORS.ratingOkay, border: 'rgba(245,158,11,0.5)', bg: 'rgba(245,158,11,0.12)' },
  poor: { fg: COLORS.ratingPoor, border: 'rgba(161,161,170,0.45)', bg: 'rgba(161,161,170,0.12)' },
};

export function RatingPill({ rating }: { rating: Rating }) {
  const c = RATING_COLORS[rating];
  return (
    <View accessibilityLabel={`Rated ${rating}`} style={{ minHeight: 32, paddingHorizontal: 14, borderRadius: 10, borderWidth: 1, borderColor: c.border, backgroundColor: c.bg, alignItems: 'center', justifyContent: 'center', flexDirection: 'row', gap: 6 }}>
      {rating === 'good' ? <Icon name="check" size={13} color={c.fg} strokeWidth={3} /> : null}
      <Text style={{ color: c.fg, fontSize: 13, fontVariant: ['tabular-nums'], letterSpacing: 0.5, fontFamily: BG[800] }}>{RATING_LABEL[rating]}</Text>
    </View>
  );
}

const STATUS_TEXT: Record<string, string> = { as_planned: 'as planned', swapped: 'swapped', extra: 'extra', skipped: 'skipped' };

export interface MealCardProps {
  mealType: string | null;
  time: string;
  planStatus?: string | null;
  name: string;
  macros: string;
  photoPath?: string | null;
  rating?: Rating;
  /** One kind line under the name (diary). */
  reason?: string;
  children?: React.ReactNode;
  onPress?: () => void;
}

export function MealCard({ mealType, time, planStatus, name, macros, photoPath, rating, reason, children, onPress }: MealCardProps) {
  const status = planStatus ? STATUS_TEXT[planStatus] : null;
  return (
    <Pressable
      onPress={onPress}
      disabled={!onPress}
      accessibilityRole={onPress ? 'button' : undefined}
      accessibilityLabel={`${mealType ?? 'Meal'} at ${time}: ${name}, ${macros}${rating ? `, rated ${rating}` : ''}`}
    >
      <Surface radius={20} padding={14}>
      <View style={{ gap: 10 }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
        <MealThumb photoPath={photoPath} mealType={mealType} size={52} />
        <View style={{ flex: 1 }}>
          <Text style={{ color: COLORS.textMuted, fontSize: 15, fontFamily: BG[400] }}>
            {mealType ?? 'Meal'} · {time}
            {status ? ` · ${status}` : ''}
          </Text>
          <Text style={{ color: COLORS.fg, fontSize: 17, fontFamily: BG[800] }} numberOfLines={2}>
            {name}
          </Text>
          <Text style={{ color: COLORS.textMuted, fontSize: 15, fontVariant: ['tabular-nums'], fontFamily: BG[400] }}>{macros}</Text>
        </View>
        {rating ? <RatingPill rating={rating} /> : null}
      </View>
      {reason ? <Text style={{ color: COLORS.fg, fontSize: 15, lineHeight: 22, fontFamily: BG[400] }}>{reason}</Text> : null}
      {children}
      </View>
      </Surface>
    </Pressable>
  );
}
