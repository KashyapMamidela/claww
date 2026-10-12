import React, { useCallback, useState } from 'react';
import { Text, View } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { AREA_COLORS, COLORS, FONT, tint } from '../lib/theme';
import { useAppState } from '../lib/appState';
import { getRecentSleepLogs } from '../lib/data';
import { lastSevenNights, sleepQuality, SLEEP_TARGET_HOURS } from '../lib/sleepTarget';
import { Icon } from './ui/Icon';
import { PressScale } from './ui/PressScale';
import { SleepLogModal } from './SleepLogModal';

const C = AREA_COLORS.sleep;
const QUALITY_COLOR = { Good: COLORS.green, Fair: COLORS.amber, Short: COLORS.danger } as const;

function clock(iso: string | null | undefined): string {
  return iso ? new Date(iso).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' }) : '—';
}

/**
 * V2 PHASE 4.4 — Home's sleep as a row: hours, a plain-word quality (Good 7 h+,
 * Fair 6 to under 7, Short under 6), bed and wake times and the last 7 nights
 * as mini bars. Unlogged shows a single "Log last night's sleep" row. Both open
 * the existing SleepLogModal. No score.
 */
export function SleepRow() {
  const { userId, sleepLogged, todaySleep } = useAppState();
  const [modalOpen, setModalOpen] = useState(false);
  const [nights, setNights] = useState<(number | null)[]>([null, null, null, null, null, null, null]);

  useFocusEffect(
    useCallback(() => {
      if (!userId) return;
      let cancelled = false;
      getRecentSleepLogs(userId, 7).then((logs) => {
        if (!cancelled) setNights(lastSevenNights(logs, new Date()));
      });
      return () => {
        cancelled = true;
      };
    }, [userId, sleepLogged, todaySleep?.hours])
  );

  const hours = todaySleep?.hours ?? null;
  const logged = sleepLogged && hours !== null;
  const q = logged ? sleepQuality(hours) : null;
  const peak = Math.max(SLEEP_TARGET_HOURS, ...nights.map((n) => n ?? 0));

  return (
    <>
      <PressScale
        onPress={() => setModalOpen(true)}
        accessibilityRole="button"
        accessibilityLabel={logged ? `Sleep: ${hours} hours, ${q}. Open sleep log.` : "Log last night's sleep"}
      >
        <View
          style={{
            minHeight: 56,
            flexDirection: 'row',
            alignItems: 'center',
            gap: 12,
            paddingHorizontal: 14,
            paddingVertical: 8,
            borderRadius: 14,
            backgroundColor: COLORS.card,
            borderWidth: 1,
            borderColor: 'rgba(255,255,255,0.08)',
          }}
        >
          <Icon name="moon" size={17} color={C} />
          {logged && q ? (
            <>
              <View style={{ flex: 1 }}>
                <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: 8 }}>
                  <Text style={{ color: '#fff', fontSize: 15, fontWeight: '800', fontVariant: ['tabular-nums'], fontFamily: FONT }}>
                    {Math.round(hours * 10) / 10} h
                  </Text>
                  <Text style={{ color: QUALITY_COLOR[q], fontSize: 12, fontWeight: '700', fontFamily: FONT }}>{q}</Text>
                </View>
                <Text style={{ color: '#71717A', fontSize: 11.5, marginTop: 1, fontFamily: FONT }}>
                  {clock(todaySleep?.bedtime)} – {clock(todaySleep?.wake_time)}
                </Text>
              </View>
              <View style={{ flexDirection: 'row', alignItems: 'flex-end', gap: 3, height: 28 }} accessibilityLabel="Last 7 nights">
                {nights.map((n, i) => (
                  <View
                    key={i}
                    style={{
                      width: 6,
                      height: n === null ? 3 : Math.max(3, (n / peak) * 28),
                      borderRadius: 2,
                      backgroundColor: n === null ? tint(C, 0.15) : i === nights.length - 1 ? C : tint(C, 0.5),
                    }}
                  />
                ))}
              </View>
            </>
          ) : (
            <>
              <Text style={{ flex: 1, color: '#fff', fontSize: 14, fontWeight: '700', fontFamily: FONT }}>Log last night's sleep</Text>
              <Icon name="chevron-right" size={16} color="#52525B" />
            </>
          )}
        </View>
      </PressScale>
      <SleepLogModal visible={modalOpen} onClose={() => setModalOpen(false)} />
    </>
  );
}
