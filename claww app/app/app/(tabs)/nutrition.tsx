import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ScrollView, Text, TouchableOpacity, View } from 'react-native';
import { useRouter } from 'expo-router';
import { useFocusEffect } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { COLORS, FONT, FONT_HAND, HEADER_CONTENT_HEIGHT, TAB_BAR_CONTENT_HEIGHT } from '../../lib/theme';
import { useAppState, type MealLogRow, type MealType } from '../../lib/appState';
import { getProfile, getRecentMeals, saveFoodProfile, type NutritionDefaults } from '../../lib/data';
import { normalizeFoodProfile, shouldAskFoodProfile } from '../../lib/foodProfile';
import { MEAL_PLAN_ENABLED } from '../../lib/flags';
import { nextMealFor } from '../../lib/homeMoment';
import { dayLine, proteinGapNote, rateMeal, usualsFrom, type Usual } from '../../lib/nutritionLogic';
import { MealDetailModal } from '../../components/MealDetailModal';
import { MealCard } from '../../components/nutrition/MealCard';
import { FoodSearchSheet } from '../../components/nutrition/FoodSearchSheet';
import { Icon } from '../../components/ui/Icon';
import { Button } from '../../components/ui/Button';
import { SectionLabel } from '../../components/ui/SectionLabel';
import { ProgressBar } from '../../components/ui/ProgressBar';
import { ProgressRing } from '../../components/ui/ProgressRing';
import { Surface } from '../../components/ui/Surface';
import { Display } from '../../components/ui/Typography';
import { Skeleton } from '../../components/ui/Skeleton';
import { PressScale } from '../../components/ui/PressScale';

// NG PHASE 8 (screen 14): the Nutrition tab. The macro card with the day's protein note in the pen, three labelled
// actions, one-tap usuals from your last two weeks, and today's meals with what is next. Without meal plans yet
// (NG PHASE 7) the up-next card asks what you are having instead of offering "Ate as planned".

const G = COLORS.green;
const DEFAULT_GOALS: NutritionDefaults = { calories: 2000, protein_g: 140, carbs_g: 220, fats_g: 65 };
const SLOTS: MealType[] = ['Breakfast', 'Lunch', 'Dinner'];

const timeText = (iso: string) => new Date(iso).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });

export default function NutritionTab() {
  const { userId, meals, saveMeal, removeMeal } = useAppState();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [targets, setTargets] = useState<NutritionDefaults | null>(null);
  const [targetsLoaded, setTargetsLoaded] = useState(false);
  const [askFoodProfile, setAskFoodProfile] = useState(false);
  const [selectedMeal, setSelectedMeal] = useState<MealLogRow | null>(null);
  const [usuals, setUsuals] = useState<Usual[]>([]);
  const [recent, setRecent] = useState<string[]>([]);
  const [searchOpen, setSearchOpen] = useState(false);
  const [undo, setUndo] = useState<{ id: string; label: string } | null>(null);
  const undoTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useFocusEffect(
    useCallback(() => {
      if (!userId) return;
      let cancelled = false;
      getProfile(userId).then((profile) => {
        if (cancelled) return;
        const t = profile?.personalization_profile?.nutritionDefaults ?? null;
        setTargets(t);
        setAskFoodProfile(shouldAskFoodProfile(!!t, normalizeFoodProfile(profile?.personalization_profile?.foodProfile)));
        setTargetsLoaded(true);
      });
      getRecentMeals(userId, 14).then((rows) => {
        if (cancelled) return;
        setUsuals(usualsFrom(rows));
        setRecent(Array.from(new Set(rows.map((r) => r.description))).slice(0, 8));
      });
      return () => {
        cancelled = true;
      };
    }, [userId])
  );

  useEffect(() => () => {
    if (undoTimer.current) clearTimeout(undoTimer.current);
  }, []);

  const goals = targets
    ? { kcal: targets.calories, protein: targets.protein_g, carbs: targets.carbs_g, fats: targets.fats_g }
    : { kcal: DEFAULT_GOALS.calories, protein: DEFAULT_GOALS.protein_g, carbs: DEFAULT_GOALS.carbs_g, fats: DEFAULT_GOALS.fats_g };

  const consumed = Math.round(meals.reduce((s, m) => s + (m.calories ?? 0), 0));
  const protein = Math.round(meals.reduce((s, m) => s + (m.protein_g ?? 0), 0));
  const carbs = Math.round(meals.reduce((s, m) => s + (m.carbs_g ?? 0), 0));
  const fats = Math.round(meals.reduce((s, m) => s + (m.fats_g ?? 0), 0));
  const loggedTypes = meals.map((m) => m.meal_type ?? '').filter(Boolean);
  const hour = new Date().getHours();
  const upNext = nextMealFor(loggedTypes, hour);
  const pen = proteinGapNote(protein, targets ? goals.protein : null, upNext);
  const sorted = useMemo(() => [...meals].sort((a, b) => a.logged_at.localeCompare(b.logged_at)), [meals]);

  // Each logged meal is rated against what the day needed at that point.
  const rated = useMemo(() => {
    let kcalBefore = 0;
    let proteinBefore = 0;
    return sorted.map((m, i) => {
      const later = nextMealFor(sorted.slice(0, i + 1).map((x) => x.meal_type ?? ''), new Date(m.logged_at).getHours());
      const r = rateMeal(
        { kcal: m.calories ?? 0, protein: m.protein_g ?? 0, fats: m.fats_g ?? 0, sodiumMg: m.nutrients?.sodiumMg ?? null, mealType: m.meal_type },
        { kcalTarget: goals.kcal, proteinTarget: goals.protein, kcalBefore, proteinBefore, nextMeal: later }
      );
      kcalBefore += m.calories ?? 0;
      proteinBefore += m.protein_g ?? 0;
      return { meal: m, ...r };
    });
  }, [sorted, goals.kcal, goals.protein]);

  const logUsual = async (u: Usual) => {
    const type = (u.mealType as MealType | null) ?? upNext ?? 'Snack';
    const row = await saveMeal(type, { description: u.label, calories: u.kcal, protein_g: u.protein, carbs_g: u.carbs, fats_g: u.fats, planStatus: 'extra' });
    if (!row) return;
    setUndo({ id: row.id, label: u.label });
    if (undoTimer.current) clearTimeout(undoTimer.current);
    undoTimer.current = setTimeout(() => setUndo(null), 6000);
  };

  const undoLast = async () => {
    if (!undo) return;
    const id = undo.id;
    setUndo(null);
    await removeMeal(id);
  };

  const openAdd = (type: MealType) => router.push({ pathname: '/meal-log', params: { mealType: type } });
  const addType: MealType = upNext ?? 'Snack';

  const size = 150;
  const sw = 12;
  const pct = goals.kcal > 0 ? (consumed / goals.kcal) * 100 : 0;
  const line = dayLine(loggedTypes, protein, targets ? goals.protein : null);

  const action = (label: string, icon: string, onPress: () => void, primary = false, flex = 1) => (
    <PressScale onPress={onPress} accessibilityRole="button" accessibilityLabel={label} style={{ flex }}>
      <View
        style={{
          minHeight: 52,
          borderRadius: 16,
          borderWidth: 1,
          borderColor: primary ? G : COLORS.greenBorderMd,
          backgroundColor: primary ? G : 'rgba(34,197,94,0.08)',
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 8,
        }}
      >
        <Icon name={icon} size={18} color={primary ? '#052e16' : G} />
        <Text style={{ color: primary ? '#052e16' : G, fontSize: 16, fontWeight: '800', fontFamily: FONT }}>{label}</Text>
      </View>
    </PressScale>
  );

  return (
    <View style={{ flex: 1, backgroundColor: COLORS.bg }}>
      <ScrollView showsVerticalScrollIndicator={false}>
        <View
          style={{
            paddingHorizontal: 16,
            paddingTop: insets.top + HEADER_CONTENT_HEIGHT + 8,
            paddingBottom: Math.max(insets.bottom, 20) + TAB_BAR_CONTENT_HEIGHT + 28,
            gap: 14,
          }}
        >
          <View>
            <SectionLabel color={G}>{new Date().toLocaleDateString(undefined, { weekday: 'long', month: 'short', day: 'numeric' }).toUpperCase()}</SectionLabel>
            <Display style={{ marginTop: 4 }}>Nutrition</Display>
          </View>

          {targetsLoaded && !targets && (
            <TouchableOpacity
              activeOpacity={0.85}
              onPress={() => router.push('/nutrition-setup')}
              accessibilityRole="button"
              style={{ flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: COLORS.card, borderWidth: 1, borderColor: COLORS.greenBorder, borderRadius: 16, paddingHorizontal: 16, paddingVertical: 14 }}
            >
              <View style={{ width: 36, height: 36, borderRadius: 10, backgroundColor: 'rgba(34,197,94,0.14)', alignItems: 'center', justifyContent: 'center' }}>
                <Icon name="sparkles" size={16} color={G} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={{ color: '#fff', fontSize: 15, fontWeight: '700', fontFamily: FONT }}>Set up your meals</Text>
                <Text style={{ color: COLORS.textMuted, fontSize: 13, marginTop: 1, fontFamily: FONT }}>Three short steps. Showing generic targets for now.</Text>
              </View>
              <Icon name="chevron-right" size={16} color={COLORS.textMuted} />
            </TouchableOpacity>
          )}

          {askFoodProfile && (
            <View style={{ backgroundColor: COLORS.card, borderWidth: 1, borderColor: COLORS.greenBorder, borderRadius: 16, padding: 14, gap: 10 }}>
              <Text style={{ color: '#fff', fontSize: 15, fontWeight: '700', fontFamily: FONT }}>What do you like to eat?</Text>
              <Text style={{ color: COLORS.textMuted, fontSize: 13, lineHeight: 18, fontFamily: FONT }}>Tell us your cuisines and foods to avoid and suggestions will fit you better.</Text>
              <View style={{ flexDirection: 'row', gap: 10 }}>
                <TouchableOpacity
                  activeOpacity={0.85}
                  onPress={() => router.push({ pathname: '/screens/nutrition-setup/foodprofile', params: { edit: '1' } })}
                  style={{ minHeight: 44, paddingHorizontal: 14, borderRadius: 10, backgroundColor: 'rgba(34,197,94,0.14)', justifyContent: 'center' }}
                >
                  <Text style={{ color: G, fontSize: 14, fontWeight: '700', fontFamily: FONT }}>Set preferences</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  activeOpacity={0.85}
                  onPress={() => {
                    setAskFoodProfile(false);
                    if (userId) saveFoodProfile(userId, normalizeFoodProfile({}));
                  }}
                  style={{ minHeight: 44, paddingHorizontal: 14, justifyContent: 'center' }}
                >
                  <Text style={{ color: COLORS.textMuted, fontSize: 14, fontWeight: '600', fontFamily: FONT }}>Not now</Text>
                </TouchableOpacity>
              </View>
            </View>
          )}

          {!targetsLoaded ? (
            <Skeleton height={200} borderRadius={20} />
          ) : (
            <Surface padding={18}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 18 }}>
                <ProgressRing size={size} rings={[{ r: (size - sw) / 2, strokeWidth: sw, color: G, pct: consumed === 0 ? 0 : pct }]} trackColor="rgba(255,255,255,0.055)">
                  <Text style={{ color: '#fff', fontSize: 30, fontWeight: '900', fontVariant: ['tabular-nums'], fontFamily: FONT }}>{consumed.toLocaleString('en-IN')}</Text>
                  <Text style={{ color: COLORS.textMuted, fontSize: 13, fontFamily: FONT }}>of {goals.kcal.toLocaleString('en-IN')} kcal</Text>
                </ProgressRing>
                <View style={{ flex: 1, gap: 12 }}>
                  {[
                    { label: 'Protein', cur: protein, goal: goals.protein, color: G },
                    { label: 'Carbs', cur: carbs, goal: goals.carbs, color: COLORS.amber },
                    { label: 'Fat', cur: fats, goal: goals.fats, color: '#FB923C' },
                  ].map((m) => (
                    <View key={m.label}>
                      <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 5 }}>
                        <Text style={{ color: COLORS.textMuted, fontSize: 14, fontFamily: FONT }}>{m.label}</Text>
                        <Text style={{ fontFamily: FONT, fontVariant: ['tabular-nums'] }}>
                          <Text style={{ color: '#fff', fontSize: 15, fontWeight: '800' }}>{m.cur}</Text>
                          <Text style={{ color: COLORS.textMuted, fontSize: 13 }}> / {m.goal} g</Text>
                        </Text>
                      </View>
                      <ProgressBar pct={m.goal > 0 ? (m.cur / m.goal) * 100 : 0} color={m.color} height={6} />
                    </View>
                  ))}
                </View>
              </View>
              {pen ? <Text style={{ color: COLORS.fg, fontSize: 22, marginTop: 14, fontFamily: FONT_HAND }}>{pen}</Text> : null}
              <Text style={{ color: COLORS.textMuted, fontSize: 13, marginTop: pen ? 4 : 14, fontFamily: FONT }}>{line}</Text>
            </Surface>
          )}

          <View style={{ flexDirection: 'row', gap: 10 }}>
            {action('Scan', 'camera', () => openAdd(addType), true, 1.3)}
            {action('Search', 'search', () => setSearchOpen(true))}
            {action('Diary', 'utensils', () => router.push('/diary'))}
          </View>

          {usuals.length > 0 ? (
            <View style={{ gap: 10 }}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                <SectionLabel color={G}>YOUR USUALS · ONE TAP</SectionLabel>
                <Text style={{ color: COLORS.textMuted, fontSize: 13, fontFamily: FONT }}>from your last 2 weeks</Text>
              </View>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 10 }}>
                {usuals.map((u) => (
                  <PressScale key={u.key} onPress={() => logUsual(u)} accessibilityRole="button" accessibilityLabel={`Log ${u.label}, ${u.kcal} kilocalories`}>
                    <View style={{ minHeight: 48, borderRadius: 24, borderWidth: 1, borderColor: COLORS.borderStrong, backgroundColor: COLORS.card, paddingHorizontal: 16, flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                      <Text style={{ color: COLORS.fg, fontSize: 15, fontWeight: '700', fontFamily: FONT }}>+ {u.label.length > 24 ? `${u.label.slice(0, 24)}…` : u.label}</Text>
                      <Text style={{ color: COLORS.textMuted, fontSize: 13, fontFamily: FONT }}>{u.kcal} kcal</Text>
                    </View>
                  </PressScale>
                ))}
              </ScrollView>
            </View>
          ) : null}

          <View style={{ gap: 10 }}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
              <SectionLabel color={G}>TODAY'S MEALS</SectionLabel>
              <Text style={{ color: COLORS.textMuted, fontSize: 13, fontFamily: FONT }}>{MEAL_PLAN_ENABLED ? 'your plan' : 'plan arrives with meal plans'}</Text>
            </View>

            {rated.map(({ meal: m, rating }) => (
              <MealCard
                key={m.id}
                mealType={m.meal_type}
                time={timeText(m.logged_at)}
                planStatus={m.plan_status}
                name={m.description}
                macros={`${Math.round(m.calories ?? 0)} kcal · P ${Math.round(m.protein_g ?? 0)} g`}
                photoPath={m.photo_url}
                rating={rating}
                onPress={() => setSelectedMeal(m)}
              />
            ))}

            {upNext ? (
              <View style={{ borderRadius: 20, borderWidth: 1, borderColor: COLORS.greenBorderMd, backgroundColor: COLORS.card, padding: 16, gap: 12 }}>
                <Text style={{ color: COLORS.textMuted, fontSize: 14, fontFamily: FONT }}>{upNext} · up next</Text>
                <Text style={{ color: COLORS.fg, fontSize: 22, fontWeight: '800', fontFamily: FONT }}>What are you having?</Text>
                <Text style={{ color: COLORS.textMuted, fontSize: 14, fontFamily: FONT }}>
                  {Math.max(0, goals.kcal - consumed).toLocaleString('en-IN')} kcal and {Math.max(0, goals.protein - protein)} g protein left today
                </Text>
                <View style={{ flexDirection: 'row', gap: 10 }}>
                  <View style={{ flex: 1.2 }}>
                    <Button variant="primary" accent={G} accentDeep={COLORS.greenDeep} size="md" fullWidth onPress={() => setSearchOpen(true)} icon={<Icon name="search" size={16} color="#fff" />}>
                      Search
                    </Button>
                  </View>
                  <View style={{ flex: 1 }}>
                    <Button variant="secondary" accent={G} size="md" fullWidth onPress={() => openAdd(upNext)} icon={<Icon name="camera" size={16} color={G} />}>
                      Photo
                    </Button>
                  </View>
                </View>
              </View>
            ) : meals.length > 0 ? (
              <Text style={{ color: COLORS.textMuted, fontSize: 14, fontFamily: FONT }}>All three meals are logged. Log a snack any time with Search.</Text>
            ) : null}

            {SLOTS.filter((t) => !loggedTypes.includes(t) && t !== upNext && SLOTS.indexOf(t) > SLOTS.indexOf(upNext ?? 'Breakfast')).map((t) => (
              <View key={t} style={{ borderRadius: 16, borderWidth: 1, borderColor: COLORS.border, borderStyle: 'dashed', padding: 14 }}>
                <Text style={{ color: COLORS.textMuted, fontSize: 14, fontFamily: FONT }}>{t} · later</Text>
              </View>
            ))}
          </View>

          <PressScale onPress={() => router.push('/diary')} accessibilityRole="button" accessibilityLabel="Food diary: photos, ratings and micronutrients">
            <View style={{ borderRadius: 20, borderWidth: 1, borderColor: COLORS.greenBorderMd, backgroundColor: 'rgba(34,197,94,0.08)', padding: 16, flexDirection: 'row', alignItems: 'center', gap: 14 }}>
              <View style={{ width: 48, height: 48, borderRadius: 14, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(34,197,94,0.14)', borderWidth: 1, borderColor: COLORS.greenBorder }}>
                <Icon name="utensils" size={22} color={G} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={{ color: COLORS.fg, fontSize: 18, fontWeight: '800', fontFamily: FONT }}>Food diary</Text>
                <Text style={{ color: COLORS.textMuted, fontSize: 14, fontFamily: FONT }}>Photos, ratings and micronutrients</Text>
              </View>
              <Icon name="chevron-right" size={18} color={COLORS.textMuted} />
            </View>
          </PressScale>
        </View>
      </ScrollView>

      {undo ? (
        <View
          pointerEvents="box-none"
          style={{ position: 'absolute', left: 16, right: 16, bottom: Math.max(insets.bottom, 12) + TAB_BAR_CONTENT_HEIGHT + 12 }}
        >
          <View style={{ minHeight: 52, borderRadius: 16, backgroundColor: '#1F1F23', borderWidth: 1, borderColor: COLORS.borderStrong, paddingHorizontal: 16, flexDirection: 'row', alignItems: 'center', gap: 12 }}>
            <Text numberOfLines={1} style={{ flex: 1, color: COLORS.fg, fontSize: 15, fontFamily: FONT }}>Logged {undo.label}</Text>
            <TouchableOpacity onPress={undoLast} accessibilityRole="button" accessibilityLabel="Undo" style={{ minHeight: 44, minWidth: 56, justifyContent: 'center', alignItems: 'center' }}>
              <Text style={{ color: G, fontSize: 15, fontWeight: '800', fontFamily: FONT }}>Undo</Text>
            </TouchableOpacity>
          </View>
        </View>
      ) : null}

      <MealDetailModal meal={selectedMeal} onClose={() => setSelectedMeal(null)} />
      <FoodSearchSheet visible={searchOpen} mealType={addType} recent={recent} onClose={() => setSearchOpen(false)} onLogged={() => setSearchOpen(false)} />
    </View>
  );
}
