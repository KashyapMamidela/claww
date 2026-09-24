import React, { useCallback, useState } from 'react';
import { ScrollView, Text, TouchableOpacity, View } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { useRouter } from 'expo-router';
import { useFocusEffect } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { COLORS, FONT, HEADER_CONTENT_HEIGHT, TAB_BAR_CONTENT_HEIGHT } from '../../lib/theme';
import { MEAL_ORDER, useAppState } from '../../lib/appState';
import { getProfile, type MealLogRow, type NutritionDefaults } from '../../lib/data';
import { MealDetailModal } from '../../components/MealDetailModal';
import { Icon } from '../../components/ui/Icon';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
import { SectionLabel } from '../../components/ui/SectionLabel';
import { ProgressBar } from '../../components/ui/ProgressBar';
import { ProgressRing } from '../../components/ui/ProgressRing';
import { WaterWidget } from '../../components/WaterWidget';
import { Display } from '../../components/ui/Typography';
import { Skeleton } from '../../components/ui/Skeleton';

const G = { deep: COLORS.greenDeep, bright: COLORS.green, border: COLORS.greenBorder };
const MEAL_ICON: Record<string, string> = { Breakfast: '🥣', Lunch: '🥗', Snack: '🍎', Dinner: '🍽️' };
const DEFAULT_GOALS: NutritionDefaults = { calories: 2000, protein_g: 140, carbs_g: 220, fats_g: 65 };

export default function NutritionTab() {
  const { userId, meals } = useAppState();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [nutritionDefaults, setNutritionDefaults] = useState<NutritionDefaults | null>(null);
  const [hasCustomTargets, setHasCustomTargets] = useState(false);
  const [targetsLoaded, setTargetsLoaded] = useState(false);
  const [selectedMeal, setSelectedMeal] = useState<MealLogRow | null>(null);

  useFocusEffect(
    useCallback(() => {
      if (!userId) return;
      let cancelled = false;
      getProfile(userId).then((profile) => {
        if (cancelled) return;
        const targets = profile?.personalization_profile?.nutritionDefaults ?? null;
        setNutritionDefaults(targets);
        setHasCustomTargets(!!targets);
        setTargetsLoaded(true);
      });
      return () => {
        cancelled = true;
      };
    }, [userId])
  );

  const GOALS = nutritionDefaults
    ? { kcal: nutritionDefaults.calories, protein: nutritionDefaults.protein_g, carbs: nutritionDefaults.carbs_g, fats: nutritionDefaults.fats_g }
    : { kcal: DEFAULT_GOALS.calories, protein: DEFAULT_GOALS.protein_g, carbs: DEFAULT_GOALS.carbs_g, fats: DEFAULT_GOALS.fats_g };

  const consumed = Math.round(meals.reduce((s, m) => s + (m.calories ?? 0), 0));
  const protein = Math.round(meals.reduce((s, m) => s + (m.protein_g ?? 0), 0));
  const carbs = Math.round(meals.reduce((s, m) => s + (m.carbs_g ?? 0), 0));
  const fats = Math.round(meals.reduce((s, m) => s + (m.fats_g ?? 0), 0));
  const empty = meals.length === 0;
  const nextMeal = MEAL_ORDER[meals.length];

  const MACROS = [
    { label: 'Protein', cur: protein, goal: GOALS.protein, color: G.bright },
    { label: 'Carbs', cur: carbs, goal: GOALS.carbs, color: '#D4D4D8' },
    { label: 'Fats', cur: fats, goal: GOALS.fats, color: COLORS.burgundyText },
  ];

  const size = 186;
  const sw = 11;

  return (
    <ScrollView style={{ flex: 1, backgroundColor: '#050505' }} showsVerticalScrollIndicator={false}>
      <View
        style={{
          paddingHorizontal: 16,
          paddingTop: insets.top + HEADER_CONTENT_HEIGHT + 8,
          paddingBottom: Math.max(insets.bottom, 20) + TAB_BAR_CONTENT_HEIGHT + 28,
          gap: 14,
        }}
      >
        <View>
          <SectionLabel color={G.bright}>{new Date().toLocaleDateString(undefined, { weekday: 'long', month: 'short', day: 'numeric' }).toUpperCase()}</SectionLabel>
          <Display style={{ marginTop: 4 }}>Nutrition</Display>
        </View>

        {targetsLoaded && !hasCustomTargets && (
          <TouchableOpacity
            activeOpacity={0.85}
            onPress={() => router.push('/nutrition-setup')}
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              gap: 12,
              backgroundColor: '#151517',
              borderWidth: 1,
              borderColor: G.border,
              borderRadius: 16,
              paddingHorizontal: 16,
              paddingVertical: 14,
            }}
          >
            <View
              style={{
                width: 36,
                height: 36,
                borderRadius: 10,
                backgroundColor: 'rgba(34,197,94,0.14)',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Icon name="sparkles" size={16} color={G.bright} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={{ color: '#fff', fontSize: 13, fontWeight: '700', fontFamily: FONT }}>Set up your nutrition targets</Text>
              <Text style={{ color: '#71717A', fontSize: 11, marginTop: 1, fontFamily: FONT }}>
                We'll calculate a sample plan for you to customize — showing generic defaults for now.
              </Text>
            </View>
            <Icon name="chevron-right" size={16} color="#71717A" />
          </TouchableOpacity>
        )}

        {!targetsLoaded ? (
          <Skeleton height={224} borderRadius={20} />
        ) : (
          <View
            style={{
              backgroundColor: '#151517',
              borderWidth: 1,
              borderColor: 'rgba(255,255,255,0.14)',
              borderRadius: 20,
              paddingHorizontal: 16,
              paddingTop: 18,
              paddingBottom: 16,
            }}
          >
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 16 }}>
              <View>
                <Text style={{ color: '#71717A', fontSize: 10, fontWeight: '700', letterSpacing: 0.9, fontFamily: FONT }}>DAILY TARGET</Text>
                <Text style={{ color: '#fff', fontSize: 22, fontWeight: '900', fontFamily: FONT }}>
                  {GOALS.kcal.toLocaleString()} <Text style={{ color: '#71717A', fontSize: 13, fontWeight: '400' }}>kcal</Text>
                </Text>
              </View>
              <Badge color={empty ? '#71717A' : G.bright}>
                {empty ? 'Nothing logged yet' : `${(GOALS.kcal - consumed).toLocaleString()} kcal left`}
              </Badge>
            </View>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 20 }}>
              <ProgressRing
                size={size}
                rings={[{ r: (size - sw) / 2, strokeWidth: sw, color: G.bright, pct: empty ? 0 : (consumed / GOALS.kcal) * 100 }]}
                trackColor="rgba(255,255,255,0.055)"
                trackDash={empty ? '3 8' : undefined}
              >
                <Text style={{ color: empty ? '#52525B' : '#fff', fontSize: 28, fontWeight: '900', fontFamily: FONT }}>
                  {consumed.toLocaleString()}
                </Text>
                <Text style={{ color: '#71717A', fontSize: 10, fontFamily: FONT }}>kcal eaten</Text>
              </ProgressRing>
              <View style={{ flex: 1, gap: 10 }}>
                {[
                  { l: 'Consumed', v: consumed, c: empty ? '#71717A' : G.bright },
                  { l: 'Burned', v: 0, c: empty ? '#71717A' : COLORS.burgundyText },
                  { l: 'Net', v: consumed, c: empty ? '#71717A' : '#fff' },
                ].map((s) => (
                  <View
                    key={s.l}
                    style={{
                      backgroundColor: 'rgba(255,255,255,0.035)',
                      borderWidth: 1,
                      borderColor: 'rgba(255,255,255,0.08)',
                      borderRadius: 10,
                      paddingHorizontal: 11,
                      paddingVertical: 8,
                    }}
                  >
                    <Text style={{ color: '#71717A', fontSize: 10, fontFamily: FONT }}>{s.l}</Text>
                    <Text style={{ color: s.c, fontSize: 18, fontWeight: '800', fontFamily: FONT }}>
                      {s.v.toLocaleString()} <Text style={{ color: '#71717A', fontSize: 10, fontWeight: '400' }}>kcal</Text>
                    </Text>
                  </View>
                ))}
              </View>
            </View>
          </View>
        )}

        <Button
          variant="primary"
          accent={G.bright}
          accentDeep={G.deep}
          size="lg"
          fullWidth
          icon={<Icon name="plus" size={18} color="#fff" />}
          disabled={!nextMeal}
          onPress={() => nextMeal && router.push({ pathname: '/meal-log', params: { mealType: nextMeal } })}
        >
          {nextMeal ? `Add ${nextMeal}` : 'All Meals Logged Today ✓'}
        </Button>

        <View style={{ backgroundColor: '#151517', borderWidth: 1, borderColor: 'rgba(255,255,255,0.14)', borderRadius: 20, padding: 16 }}>
          <Text style={{ color: '#fff', fontSize: 14, fontWeight: '700', marginBottom: 14, fontFamily: FONT }}>Macronutrients</Text>
          <View style={{ gap: 10 }}>
            {MACROS.map((m) => (
              <View key={m.label}>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 6 }}>
                  <Text style={{ color: '#fff', fontSize: 12, fontWeight: '600', fontFamily: FONT }}>{m.label}</Text>
                  <Text style={{ color: m.cur > 0 ? m.color : '#71717A', fontSize: 12, fontWeight: '700', fontFamily: FONT }}>
                    {m.cur}g <Text style={{ color: '#71717A', fontWeight: '400' }}>/ {m.goal}g</Text>
                  </Text>
                </View>
                <ProgressBar pct={(m.cur / m.goal) * 100} color={m.color} height={6} />
              </View>
            ))}
          </View>
        </View>

        <WaterWidget />

        <View>
          <Text style={{ color: '#fff', fontSize: 14, fontWeight: '700', marginBottom: 10, fontFamily: FONT }}>Meal Timeline</Text>
          {empty ? (
            <View
              style={{
                backgroundColor: '#151517',
                borderWidth: 1,
                borderStyle: 'dashed',
                borderColor: 'rgba(255,255,255,0.14)',
                borderRadius: 16,
                paddingHorizontal: 16,
                paddingVertical: 26,
                alignItems: 'center',
                gap: 8,
              }}
            >
              <View
                style={{
                  width: 44,
                  height: 44,
                  borderRadius: 12,
                  backgroundColor: 'rgba(255,255,255,0.05)',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <Text style={{ fontSize: 20 }}>🍽️</Text>
              </View>
              <Text style={{ color: '#A1A1AA', fontSize: 12.5, fontWeight: '600', fontFamily: FONT }}>No meals logged yet today</Text>
              <Text style={{ color: '#71717A', fontSize: 11, lineHeight: 16, maxWidth: 220, textAlign: 'center', fontFamily: FONT }}>
                Tap "Add {nextMeal ?? 'Meal'}" above to start your timeline.
              </Text>
            </View>
          ) : (
            <View style={{ gap: 8 }}>
              {meals.map((m, i) => (
                <Animated.View key={m.id} entering={FadeInDown.delay(i * 60).springify().damping(18)}>
                <TouchableOpacity
                  activeOpacity={0.8}
                  onPress={() => setSelectedMeal(m)}
                  style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    gap: 10,
                    backgroundColor: '#151517',
                    borderWidth: 1,
                    borderColor: G.border,
                    borderLeftWidth: 3,
                    borderLeftColor: G.bright,
                    borderRadius: 16,
                    paddingHorizontal: 12,
                    paddingVertical: 11,
                  }}
                >
                  <View
                    style={{
                      width: 34,
                      height: 34,
                      borderRadius: 9,
                      backgroundColor: 'rgba(34,197,94,0.11)',
                      borderWidth: 1,
                      borderColor: G.border,
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    <Text style={{ fontSize: 16 }}>{MEAL_ICON[m.meal_type ?? ''] ?? '🍽️'}</Text>
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={{ color: '#fff', fontSize: 13, fontWeight: '700', fontFamily: FONT }}>{m.meal_type ?? 'Meal'}</Text>
                    <Text style={{ color: '#71717A', fontSize: 10.5, fontFamily: FONT }}>
                      {new Date(m.logged_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </Text>
                  </View>
                  <Text style={{ color: G.bright, fontSize: 15, fontWeight: '800', fontFamily: FONT }}>{Math.round(m.calories ?? 0)}</Text>
                </TouchableOpacity>
                </Animated.View>
              ))}
            </View>
          )}
        </View>

        <Button
          variant="secondary"
          accent={COLORS.purple}
          fullWidth
          icon={<Icon name="sparkles" size={16} color={COLORS.purple} />}
          disabled={!nextMeal}
          onPress={() => nextMeal && router.push({ pathname: '/meal-log', params: { mealType: nextMeal } })}
        >
          {nextMeal ? `Suggest ${nextMeal}` : 'All Meals Logged Today ✓'}
        </Button>
      </View>
      <MealDetailModal meal={selectedMeal} onClose={() => setSelectedMeal(null)} />
    </ScrollView>
  );
}
