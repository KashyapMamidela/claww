import React from 'react';
import { ScrollView, Text, View } from 'react-native';
import { COLORS, AREA_COLORS, FONT, tint, BG, bg } from '../lib/theme';
import type { PlanStreakStats, StreakDayStatus } from '../lib/planStreak';
import { BottomSheet } from './ui/BottomSheet';
import { Icon } from './ui/Icon';

const C = AREA_COLORS.streak;

const STATUS_TEXT: Record<StreakDayStatus, string> = {
  done: 'session done',
  rest: 'rest day',
  missed: 'missed',
  protected: 'exam week',
  today: 'today',
};

export interface StreakSheetProps {
  visible: boolean;
  onClose: () => void;
  stats: PlanStreakStats | null;
}

/**
 * The streak sheet. One streak everywhere (Home, the Tracker, the session card): plan days followed. A session done
 * counts, a rest day counts, a missed planned day breaks it, and an exam week protects it without counting.
 */
export function StreakSheet({ visible, onClose, stats }: StreakSheetProps) {
  const weeks = stats ? [stats.grid.slice(0, 7), stats.grid.slice(7, 14), stats.grid.slice(14, 21)] : [];

  return (
    <BottomSheet visible={visible} onClose={onClose}>
      <ScrollView contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 12, gap: 18 }}>
        <Text style={{ color: C, fontSize: 13, letterSpacing: 0.8, fontFamily: BG[800] }}>STREAK</Text>

        <View style={{ flexDirection: 'row', gap: 10 }}>
          {[
            { label: 'CURRENT', value: stats?.current ?? 0 },
            { label: 'BEST', value: stats?.best ?? 0 },
          ].map((s) => (
            <View key={s.label} style={{ flex: 1, padding: 14, borderRadius: 16, backgroundColor: 'rgba(255,255,255,0.04)' }}>
              <Text style={{ color: COLORS.textMuted, fontSize: 11, letterSpacing: 0.6, fontFamily: BG[800] }}>{s.label}</Text>
              <Text style={{ color: s.label === 'CURRENT' ? C : '#fff', fontSize: 34, fontVariant: ['tabular-nums'], fontFamily: BG[800] }}>
                {s.value}
                <Text style={{ color: COLORS.textMuted, fontSize: 13, fontWeight: '600' }}> {s.value === 1 ? 'day' : 'days'}</Text>
              </Text>
            </View>
          ))}
        </View>

        <Text style={{ color: '#A1A1AA', fontSize: 13, lineHeight: 19, fontFamily: BG[400] }}>
          A day counts when you follow your plan: you trained on a training day, or rested on a rest day. A missed
          training day breaks it; today never does. Busy week? Turn on Exam week after a session and missed days won't
          break it for 7 days.
        </Text>

        {stats ? (
          <View style={{ gap: 6 }}>
            <View style={{ flexDirection: 'row', gap: 6 }}>
              {weeks[0].map((d, i) => (
                <Text key={i} style={{ flex: 1, color: COLORS.textFaint, fontSize: 11, textAlign: 'center', fontFamily: BG[400] }}>
                  {d.date.toLocaleDateString([], { weekday: 'narrow' })}
                </Text>
              ))}
            </View>
            {weeks.map((week, w) => (
              <View key={w} style={{ flexDirection: 'row', gap: 6 }}>
                {week.map((d) => {
                  const done = d.status === 'done' || (d.status === 'today' && d.counts);
                  const rest = d.status === 'rest';
                  const missed = d.status === 'missed';
                  return (
                    <View
                      key={d.key}
                      accessibilityLabel={`${d.date.toDateString()}: ${STATUS_TEXT[d.status]}`}
                      style={{
                        flex: 1,
                        aspectRatio: 1,
                        borderRadius: 10,
                        backgroundColor: done ? tint(C, 0.28) : rest ? tint(C, 0.16) : missed ? tint(COLORS.danger, 0.16) : 'rgba(255,255,255,0.04)',
                        borderWidth: d.status === 'today' ? 1.5 : 0,
                        borderColor: C,
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: 2,
                      }}
                    >
                      <Text style={{ color: done || rest ? '#fff' : COLORS.textFaint, fontSize: 13, fontFamily: BG[700] }}>{d.date.getDate()}</Text>
                      {done ? <Icon name="check" size={11} color={C} strokeWidth={3} /> : missed ? <Icon name="x" size={11} color={COLORS.danger} strokeWidth={3} /> : rest ? <Icon name="moon" size={11} color={C} /> : d.status === 'protected' ? <Icon name="shield" size={11} color={C} /> : null}
                    </View>
                  );
                })}
              </View>
            ))}
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 14, marginTop: 6 }}>
              {([
                ['Session done', tint(C, 0.28)],
                ['Rest day', tint(C, 0.16)],
                ['Missed', tint(COLORS.danger, 0.16)],
              ] as const).map(([label, color]) => (
                <View key={label} style={{ flexDirection: 'row', alignItems: 'center', gap: 5 }}>
                  <View style={{ width: 10, height: 10, borderRadius: 3, backgroundColor: color }} />
                  <Text style={{ color: COLORS.textMuted, fontSize: 13, fontFamily: BG[400] }}>{label}</Text>
                </View>
              ))}
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5 }}>
                <Icon name="shield" size={11} color={C} />
                <Text style={{ color: COLORS.textMuted, fontSize: 13, fontFamily: BG[400] }}>Exam week</Text>
              </View>
            </View>
          </View>
        ) : (
          <Text style={{ color: COLORS.textMuted, fontSize: 13, fontFamily: BG[400] }}>Loading…</Text>
        )}
      </ScrollView>
    </BottomSheet>
  );
}
