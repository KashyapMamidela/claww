import React, { useState } from 'react';
import { ScrollView, Text, TouchableOpacity, View } from 'react-native';
import { useRouter } from 'expo-router';
import { COLORS, FONT } from '../../lib/theme';
import { MEAL_ORDER, useAppState } from '../../lib/appState';
import { Icon } from '../../components/ui/Icon';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
import { SectionLabel } from '../../components/ui/SectionLabel';
import { ProgressBar } from '../../components/ui/ProgressBar';
import { ProgressRing } from '../../components/ui/ProgressRing';

const G = { deep: COLORS.greenDeep, bright: COLORS.green, border: COLORS.greenBorder };
const MEAL_ICON: Record<string, string> = { Breakfast: '🥣', Lunch: '🥗', Snack: '🍎', Dinner: '🍽️' };
const GOALS = { kcal: 2400, protein: 165, carbs: 240, fats: 70 };

export default function NutritionTab() {
  const { meals } = useAppState();
  const router = useRouter();
  const [glasses, setGlasses] = useState(0);

  const consumed = meals.reduce((s, m) => s + m.kcal, 0);
  const protein = meals.reduce((s, m) => s + m.protein, 0);
  const carbs = meals.reduce((s, m) => s + m.carbs, 0);
  const fats = meals.reduce((s, m) => s + m.fats, 0);
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
      <View style={{ paddingHorizontal: 16, paddingTop: 8, paddingBottom: 28, gap: 14 }}>
        <View>
          <SectionLabel color={G.bright}>MONDAY · APR 14, 2026</SectionLabel>
          <Text style={{ color: '#fff', fontSize: 28, fontWeight: '900', letterSpacing: -0.6, marginTop: 4, fontFamily: FONT }}>Nutrition</Text>
        </View>

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
              rings={[{ r: (size - sw) / 2, strokeWidth: sw, color: G.bright, pct: empty ? 0 : Math.min((consumed / GOALS.kcal) * 100, 100) }]}
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

        <View style={{ backgroundColor: '#151517', borderWidth: 1, borderColor: 'rgba(255,255,255,0.14)', borderRadius: 20, padding: 16 }}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 14 }}>
            <Text style={{ color: '#fff', fontSize: 14, fontWeight: '700', fontFamily: FONT }}>Water Intake</Text>
            <Badge color={glasses > 0 ? G.bright : '#71717A'}>{(glasses * 0.25).toFixed(2)}L / 2L</Badge>
          </View>
          <View style={{ flexDirection: 'row', gap: 6 }}>
            {Array.from({ length: 8 }).map((_, i) => (
              <TouchableOpacity
                key={i}
                activeOpacity={0.8}
                onPress={() => setGlasses(i + 1)}
                style={{
                  flex: 1,
                  aspectRatio: 1,
                  borderRadius: 10,
                  backgroundColor: i < glasses ? G.border : 'rgba(255,255,255,0.035)',
                  borderWidth: 1,
                  borderColor: i < glasses ? 'rgba(34,197,94,0.38)' : 'rgba(255,255,255,0.08)',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <Icon name="droplets" size={16} color={i < glasses ? G.bright : '#71717A'} />
              </TouchableOpacity>
            ))}
          </View>
        </View>

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
              {meals.map((m) => (
                <View
                  key={m.type}
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
                    <Text style={{ fontSize: 16 }}>{MEAL_ICON[m.type]}</Text>
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={{ color: '#fff', fontSize: 13, fontWeight: '700', fontFamily: FONT }}>{m.type}</Text>
                    <Text style={{ color: '#71717A', fontSize: 10.5, fontFamily: FONT }}>{m.time}</Text>
                  </View>
                  <Text style={{ color: G.bright, fontSize: 15, fontWeight: '800', fontFamily: FONT }}>{m.kcal}</Text>
                </View>
              ))}
            </View>
          )}
        </View>

        <Button variant="secondary" accent={COLORS.purple} fullWidth icon={<Icon name="sparkles" size={16} color={COLORS.purple} />}>
          AI Suggest
        </Button>
      </View>
    </ScrollView>
  );
}
