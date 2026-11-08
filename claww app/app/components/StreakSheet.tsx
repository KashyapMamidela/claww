import React, { useEffect, useState } from 'react';
import { weekStartKey } from '../lib/planStreak';
import { getProfile, saveFrozenDates } from '../lib/data';
import { useAppState } from '../lib/appState';
import { Button } from './ui/Button';
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
  protected: 'protected (exam week or a freeze)',
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
  const { userId, refreshStreak } = useAppState();
  const [frozen, setFrozen] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);
  useEffect(() => {
    if (!visible || !userId) return;
    getProfile(userId).then((p) => setFrozen(p?.personalization_profile?.frozenDates ?? []));
  }, [visible, userId]);

  // Premium F6: one freeze a week covers a missed planned day from the last 7. It neither counts nor breaks the streak.
  const candidate = (() => {
    if (!stats) return null;
    const usedWeeks = new Set(frozen.map(weekStartKey));
    const today = stats.grid[stats.grid.length - 1]?.key;
    const recent = stats.grid.filter((d) => d.status === 'missed' && d.key !== today).slice(-7).reverse();
    return recent.find((d) => !usedWeeks.has(weekStartKey(d.key))) ?? null;
  })();
  const freeze = async () => {
    if (!candidate || !userId || saving) return;
    setSaving(true);
    const next = [...frozen, candidate.key];
    if (await saveFrozenDates(userId, next)) {
      setFrozen(next);
      refreshStreak();
    }
    setSaving(false);
  };

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

        {candidate ? (
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, padding: 12, borderRadius: 18, backgroundColor: tint('#38BDF8', 0.12) }}>
            <Icon name="snowflake" size={22} color="#7DD3FC" />
            <Text style={{ flex: 1, color: COLORS.fg, fontSize: 15, lineHeight: 21, fontFamily: BG[500] }}>
              You missed {candidate.date.toLocaleDateString('en-GB', { weekday: 'long' })}. Use this week's freeze to keep your streak?
            </Text>
            <Button variant="primary" size="sm" accent="#38BDF8" accentDeep="#0284C7" disabled={saving} onPress={freeze}>
              Freeze
            </Button>
          </View>
        ) : null}

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
                  const isFrozen = d.status === 'protected' && frozen.includes(d.key);
                  return (
                    <View
                      key={d.key}
                      accessibilityLabel={`${d.date.toDateString()}: ${STATUS_TEXT[d.status]}`}
                      style={{
                        flex: 1,
                        aspectRatio: 1,
                        borderRadius: 10,
                        backgroundColor: done ? tint(C, 0.28) : rest ? tint(C, 0.16) : missed ? tint(COLORS.danger, 0.16) : isFrozen ? tint('#38BDF8', 0.2) : 'rgba(255,255,255,0.04)',
                        borderWidth: d.status === 'today' ? 1.5 : 0,
                        borderColor: C,
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: 2,
                      }}
                    >
                      <Text style={{ color: done || rest ? '#fff' : COLORS.textFaint, fontSize: 13, fontFamily: BG[700] }}>{d.date.getDate()}</Text>
                      {isFrozen ? <Icon name="snowflake" size={11} color="#7DD3FC" /> : done ? <Icon name="check" size={11} color={C} strokeWidth={3} /> : missed ? <Icon name="x" size={11} color={COLORS.danger} strokeWidth={3} /> : rest ? <Icon name="moon" size={11} color={C} /> : d.status === 'protected' ? <Icon name="shield" size={11} color={C} /> : null}
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
