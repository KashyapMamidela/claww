import React from 'react';
import { ScrollView, Text, View } from 'react-native';
import { AREA_COLORS, FONT, tint } from '../lib/theme';
import type { StreakStats } from '../lib/activityMath';
import { BottomSheet } from './ui/BottomSheet';

const C = AREA_COLORS.streak;
const REASON_COLORS = { sleep: AREA_COLORS.sleep, meal: AREA_COLORS.nutrition, workout: AREA_COLORS.workouts } as const;

export interface StreakSheetProps {
  visible: boolean;
  onClose: () => void;
  stats: StreakStats | null;
}

/** Streak detail sheet (V2 PHASE 4.2): current and best streak, and which of the last 3 weeks' days counted and why. */
export function StreakSheet({ visible, onClose, stats }: StreakSheetProps) {
  const weeks = stats ? [stats.grid.slice(0, 7), stats.grid.slice(7, 14), stats.grid.slice(14, 21)] : [];

  return (
    <BottomSheet visible={visible} onClose={onClose}>
      <ScrollView contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 12, gap: 18 }}>
        <Text style={{ color: C, fontSize: 12, fontWeight: '800', letterSpacing: 0.8, fontFamily: FONT }}>STREAK</Text>

        <View style={{ flexDirection: 'row', gap: 10 }}>
          {[
            { label: 'CURRENT', value: stats?.current ?? 0 },
            { label: 'BEST', value: stats?.best ?? 0 },
          ].map((s) => (
            <View key={s.label} style={{ flex: 1, padding: 14, borderRadius: 16, backgroundColor: 'rgba(255,255,255,0.04)' }}>
              <Text style={{ color: '#71717A', fontSize: 10, fontWeight: '800', letterSpacing: 0.6, fontFamily: FONT }}>{s.label}</Text>
              <Text style={{ color: s.label === 'CURRENT' ? C : '#fff', fontSize: 34, fontWeight: '900', fontFamily: FONT }}>
                {s.value}
                <Text style={{ color: '#71717A', fontSize: 13, fontWeight: '600' }}> {s.value === 1 ? 'day' : 'days'}</Text>
              </Text>
            </View>
          ))}
        </View>

        <Text style={{ color: '#A1A1AA', fontSize: 12.5, lineHeight: 18, fontFamily: FONT }}>
          A day counts when you log sleep, a meal or a workout set. Missing today doesn't break it until the day is over.
        </Text>

        {stats ? (
          <View style={{ gap: 6 }}>
            <View style={{ flexDirection: 'row', gap: 6 }}>
              {weeks[0].map((d, i) => (
                <Text key={i} style={{ flex: 1, color: '#52525B', fontSize: 10, textAlign: 'center', fontFamily: FONT }}>
                  {d.date.toLocaleDateString([], { weekday: 'narrow' })}
                </Text>
              ))}
            </View>
            {weeks.map((week, w) => (
              <View key={w} style={{ flexDirection: 'row', gap: 6 }}>
                {week.map((d) => (
                  <View
                    key={d.date.toDateString()}
                    accessibilityLabel={`${d.date.toDateString()}: ${d.active ? [d.reasons.sleep && 'sleep', d.reasons.meal && 'meal', d.reasons.workout && 'workout'].filter(Boolean).join(', ') : 'nothing logged'}`}
                    style={{
                      flex: 1,
                      aspectRatio: 1,
                      borderRadius: 10,
                      backgroundColor: d.active ? tint(C, 0.22) : 'rgba(255,255,255,0.04)',
                      borderWidth: d.isToday ? 1.5 : 0,
                      borderColor: C,
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: 3,
                    }}
                  >
                    <Text style={{ color: d.active ? '#fff' : '#52525B', fontSize: 11, fontWeight: '700', fontFamily: FONT }}>{d.date.getDate()}</Text>
                    <View style={{ flexDirection: 'row', gap: 2, height: 4 }}>
                      {(['sleep', 'meal', 'workout'] as const).map((k) =>
                        d.reasons[k] ? <View key={k} style={{ width: 4, height: 4, borderRadius: 2, backgroundColor: REASON_COLORS[k] }} /> : null
                      )}
                    </View>
                  </View>
                ))}
              </View>
            ))}
            <View style={{ flexDirection: 'row', gap: 14, marginTop: 6 }}>
              {(['sleep', 'meal', 'workout'] as const).map((k) => (
                <View key={k} style={{ flexDirection: 'row', alignItems: 'center', gap: 5 }}>
                  <View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: REASON_COLORS[k] }} />
                  <Text style={{ color: '#71717A', fontSize: 11, fontFamily: FONT }}>{k === 'meal' ? 'Meal' : k === 'sleep' ? 'Sleep' : 'Workout'}</Text>
                </View>
              ))}
            </View>
          </View>
        ) : (
          <Text style={{ color: '#71717A', fontSize: 12.5, fontFamily: FONT }}>Loading…</Text>
        )}
      </ScrollView>
    </BottomSheet>
  );
}
