import React, { useCallback, useMemo, useState } from 'react';
import { Pressable, ScrollView, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { useFocusEffect } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { COLORS, FONT, BG, bg } from '../lib/theme';
import { useAppState, type MealLogRow } from '../lib/appState';
import { getMealLogsBetween, getProfile, type NutritionDefaults } from '../lib/data';
import { MICRO_LABELS, microTargets, nextMealFor, normaliseSex, rateMeal, sodiumOver, sumMicros, type MicroKey } from '../lib/diaryLogic';
import { MealCard } from '../components/nutrition/MealCard';
import { MealDetailModal } from '../components/MealDetailModal';
import { Display } from '../components/ui/Typography';
import { BackTile } from '../components/ui/BackTile';
import { Icon } from '../components/ui/Icon';
import { PressScale } from '../components/ui/PressScale';
import { ProgressBar } from '../components/ui/ProgressBar';
import { SectionLabel } from '../components/ui/SectionLabel';
import { Skeleton } from '../components/ui/Skeleton';
import { Surface } from '../components/ui/Surface';

// NG PHASE 8 (screen 18): the food diary. A strip of the last seven days with a dot per meal, the day's
// micronutrients against targets for the user's age and sex (sodium over its limit is amber), and every entry with its
// rating and one kind reason; tap an entry for its micronutrients and Edit.

const G = COLORS.green;
const DAY_MS = 86_400_000;

const startOf = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate());
const key = (d: Date) => `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
const timeText = (iso: string) => new Date(iso).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });

export default function DiaryScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { userId } = useAppState();
  const today = useMemo(() => startOf(new Date()), []);
  const days = useMemo(() => Array.from({ length: 7 }, (_, i) => new Date(today.getTime() - (6 - i) * DAY_MS)), [today]);
  const [selected, setSelected] = useState(6);
  const [week, setWeek] = useState<MealLogRow[] | null>(null);
  const [targets, setTargets] = useState<NutritionDefaults | null>(null);
  const [age, setAge] = useState<number | null>(null);
  const [sex, setSex] = useState<string | null>(null);
  const [open, setOpen] = useState<string | null>(null);
  const [editing, setEditing] = useState<MealLogRow | null>(null);

  useFocusEffect(
    useCallback(() => {
      if (!userId) return;
      let cancelled = false;
      Promise.all([getMealLogsBetween(userId, days[0].toISOString(), new Date(today.getTime() + DAY_MS).toISOString()), getProfile(userId)]).then(([rows, profile]) => {
        if (cancelled) return;
        setWeek(rows);
        setTargets(profile?.personalization_profile?.nutritionDefaults ?? null);
        setAge(profile?.age ?? null);
        setSex(profile?.gender ?? null);
      });
      return () => {
        cancelled = true;
      };
    }, [userId, days, today])
  );

  const byDay = useMemo(() => {
    const m = new Map<string, MealLogRow[]>();
    for (const r of week ?? []) m.set(key(new Date(r.logged_at)), [...(m.get(key(new Date(r.logged_at))) ?? []), r]);
    return m;
  }, [week]);

  const day = days[selected];
  const entries = byDay.get(key(day)) ?? [];
  const kcal = Math.round(entries.reduce((s, m) => s + (m.calories ?? 0), 0));
  const goals = targets ?? { calories: 2000, protein_g: 140, carbs_g: 220, fats_g: 65 };
  const mt = microTargets(age, normaliseSex(sex));
  const micros = sumMicros(entries.map((e) => e.nutrients ?? null));

  const rated = useMemo(() => {
    let kcalBefore = 0;
    let proteinBefore = 0;
    return entries.filter((m) => m.plan_status !== 'skipped').map((m, i) => {
      const r = rateMeal(
        { kcal: m.calories ?? 0, protein: m.protein_g ?? 0, fats: m.fats_g ?? 0, sodiumMg: m.nutrients?.sodiumMg ?? null, mealType: m.meal_type },
        { kcalTarget: goals.calories, proteinTarget: goals.protein_g, kcalBefore, proteinBefore, nextMeal: nextMealFor(entries.slice(0, i + 1).map((x) => x.meal_type ?? ''), new Date(m.logged_at).getHours()) }
      );
      kcalBefore += m.calories ?? 0;
      proteinBefore += m.protein_g ?? 0;
      return { meal: m, ...r };
    });
  }, [entries, goals.calories, goals.protein_g]);

  const title = selected === 6 ? 'Today' : selected === 5 ? 'Yesterday' : day.toLocaleDateString(undefined, { weekday: 'long', day: 'numeric', month: 'short' });
  const microValue = (k: MicroKey) => micros.totals[k];
  const fmt = (k: MicroKey, v: number) => (k === 'b12Ug' ? v.toFixed(1) : k === 'sodiumMg' ? (v / 1000).toFixed(1) : String(Math.round(v)));

  return (
    <View style={{ flex: 1, backgroundColor: COLORS.bg }}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingTop: insets.top + 12, paddingHorizontal: 16, paddingBottom: insets.bottom + 40, gap: 14 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
          <BackTile onPress={() => router.back()} />
          <PressScale onPress={() => router.push('/meal-log')} accessibilityRole="button" accessibilityLabel="Add a meal" hitSlop={4}>
            <View style={{ width: 44, height: 44, borderRadius: 12, backgroundColor: G, alignItems: 'center', justifyContent: 'center' }}>
              <Icon name="plus" size={22} color="#052e16" strokeWidth={3} />
            </View>
          </PressScale>
        </View>
        <View>
          <SectionLabel color={G}>FOOD DIARY</SectionLabel>
          <Display>{title}</Display>
        </View>

        <View style={{ flexDirection: 'row', gap: 6 }}>
          {days.map((d, i) => {
            const n = Math.min(3, (byDay.get(key(d)) ?? []).length);
            const on = i === selected;
            return (
              <Pressable key={i} onPress={() => setSelected(i)} accessibilityRole="button" accessibilityState={{ selected: on }} accessibilityLabel={`${d.toDateString()}: ${n} meals logged`} style={{ flex: 1 }}>
                <View style={{ minHeight: 76, borderRadius: 16, alignItems: 'center', justifyContent: 'center', gap: 4, borderWidth: 1, borderColor: on ? G : COLORS.border, backgroundColor: on ? G : COLORS.card }}>
                  <Text style={{ color: on ? '#052e16' : COLORS.textMuted, fontSize: 13, fontFamily: BG[700] }}>{d.toLocaleDateString(undefined, { weekday: 'narrow' })}</Text>
                  <Text style={{ color: on ? '#052e16' : COLORS.fg, fontSize: 20, fontVariant: ['tabular-nums'], fontFamily: BG[800] }}>{d.getDate()}</Text>
                  <View style={{ flexDirection: 'row', gap: 3 }}>
                    {[0, 1, 2].map((j) => (
                      <View key={j} style={{ width: 5, height: 5, borderRadius: 3, backgroundColor: j < n ? (on ? '#052e16' : G) : on ? 'rgba(5,46,22,0.3)' : 'rgba(255,255,255,0.14)' }} />
                    ))}
                  </View>
                </View>
              </Pressable>
            );
          })}
        </View>

        {week === null ? (
          <Skeleton height={190} borderRadius={20} />
        ) : (
          <Surface padding={16}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 12 }}>
              <Text style={{ color: COLORS.fg, fontSize: 20, fontFamily: BG[800] }}>Micronutrients</Text>
              <Text style={{ color: COLORS.textMuted, fontSize: 15, fontFamily: BG[400] }}>
                {kcal.toLocaleString('en-IN')} kcal · {entries.length} entr{entries.length === 1 ? 'y' : 'ies'}
              </Text>
            </View>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', columnGap: 18, rowGap: 14 }}>
              {MICRO_LABELS.map((m) => {
                const value = microValue(m.key);
                const target = m.key === 'fibreG' ? mt.fibreG : m.key === 'ironMg' ? mt.ironMg : m.key === 'calciumMg' ? mt.calciumMg : m.key === 'vitcMg' ? mt.vitcMg : m.key === 'b12Ug' ? mt.b12Ug : mt.sodiumMg;
                const over = m.key === 'sodiumMg' && sodiumOver(value, target);
                const color = over ? COLORS.amber : G;
                return (
                  <View key={m.key} style={{ width: '47%' }}>
                    <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 5 }}>
                      <Text style={{ color: COLORS.textMuted, fontSize: 15, fontFamily: BG[400] }}>{m.label}</Text>
                      <Text style={{ color: over ? COLORS.amber : COLORS.fg, fontSize: 15, fontVariant: ['tabular-nums'], fontFamily: BG[800] }}>
                        {fmt(m.key, value)} / {m.key === 'sodiumMg' ? `${(target / 1000).toFixed(0)} g` : `${fmt(m.key, target)} ${m.unit}`}
                      </Text>
                    </View>
                    <ProgressBar pct={target > 0 ? Math.min(100, (value / target) * 100) : 0} color={color} height={6} />
                  </View>
                );
              })}
            </View>
            {entries.length > 0 && micros.counted < micros.total ? (
              <Text style={{ color: COLORS.textFaint, fontSize: 13, marginTop: 12, fontFamily: BG[400] }}>
                {micros.counted === 0 ? 'None of these entries has micronutrient data yet.' : `Counts ${micros.counted} of ${micros.total} entries: only meals logged from the food database carry micronutrients.`}
              </Text>
            ) : null}
          </Surface>
        )}

        {week !== null && rated.length === 0 ? (
          <View style={{ borderRadius: 16, borderWidth: 1, borderStyle: 'dashed', borderColor: COLORS.borderStrong, padding: 22, alignItems: 'center', gap: 6 }}>
            <Text style={{ color: COLORS.fg, fontSize: 17, fontFamily: BG[700] }}>Nothing logged {selected === 6 ? 'yet today' : 'this day'}</Text>
            <Text style={{ color: COLORS.textMuted, fontSize: 15, textAlign: 'center', fontFamily: BG[400] }}>Tap + to add a meal. It shows up here with a rating.</Text>
          </View>
        ) : null}

        {rated.map(({ meal: m, rating, reason }) => {
          const expanded = open === m.id;
          const n = m.nutrients;
          const chips: [string, number | null | undefined, string][] = [
            ['Iron', n?.ironMg, 'mg'],
            ['Fibre', n?.fibreG, 'g'],
            ['Vit C', n?.vitcMg, 'mg'],
            ['Sodium', n?.sodiumMg, 'mg'],
            ['Calcium', n?.calciumMg, 'mg'],
            ['B12', n?.b12Ug, 'µg'],
          ];
          return (
            <MealCard
              key={m.id}
              mealType={m.meal_type}
              time={timeText(m.logged_at)}
              planStatus={m.plan_status}
              name={m.description}
              macros={`${Math.round(m.calories ?? 0)} kcal · P ${Math.round(m.protein_g ?? 0)} · C ${Math.round(m.carbs_g ?? 0)} · F ${Math.round(m.fats_g ?? 0)}`}
              photoPath={m.photo_url}
              rating={rating}
              reason={reason}
              onPress={() => setOpen(expanded ? null : m.id)}
            >
              {expanded ? (
                <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
                  {chips.filter(([, v]) => typeof v === 'number').map(([label, v, unit]) => (
                    <View key={label} style={{ minHeight: 44, borderRadius: 12, borderWidth: 1, borderColor: COLORS.borderStrong, paddingHorizontal: 12, justifyContent: 'center' }}>
                      <Text style={{ color: COLORS.fg, fontSize: 15, fontFamily: BG[400] }}>
                        {label} {Math.round((v as number) * 10) / 10} {unit}
                      </Text>
                    </View>
                  ))}
                  {chips.every(([, v]) => typeof v !== 'number') ? <Text style={{ color: COLORS.textMuted, fontSize: 15, fontFamily: BG[400] }}>No micronutrient data for this entry.</Text> : null}
                  <Pressable onPress={() => setEditing(m)} accessibilityRole="button" accessibilityLabel="Edit this entry" style={{ minHeight: 44, borderRadius: 12, borderWidth: 1, borderColor: COLORS.greenBorderMd, backgroundColor: 'rgba(34,197,94,0.1)', paddingHorizontal: 16, justifyContent: 'center' }}>
                    <Text style={{ color: G, fontSize: 15, fontFamily: BG[800] }}>Edit</Text>
                  </Pressable>
                </View>
              ) : null}
            </MealCard>
          );
        })}
      </ScrollView>
      <MealDetailModal meal={editing} onClose={() => setEditing(null)} />
    </View>
  );
}
