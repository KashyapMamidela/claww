import React, { useState } from 'react';
import { Text, TouchableOpacity, View } from 'react-native';
import { COLORS, FONT } from '../lib/theme';
import { Icon } from './ui/Icon';
import { ProgressRing } from './ui/ProgressRing';
import { useAppState } from '../lib/appState';
import { SleepLogModal } from './SleepLogModal';

const SLEEP = COLORS.indigo;
const SLEEP_DIM = COLORS.indigoDim;
const SLEEP_BORDER = COLORS.indigoBorder;

function formatTime(iso: string | null): string {
  if (!iso) return '—';
  return new Date(iso).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
}

function quality(hours: number): { label: string; color: string } {
  if (hours < 5) return { label: 'Poor', color: COLORS.danger };
  if (hours < 6.5) return { label: 'Fair', color: COLORS.amber };
  if (hours < 7.5) return { label: 'Good', color: COLORS.green };
  if (hours <= 9) return { label: 'Optimal', color: SLEEP };
  return { label: 'Excess', color: COLORS.fgGray };
}

const tile = (label: string, value: React.ReactNode, accent = false) => (
  <View
    style={{
      backgroundColor: accent ? SLEEP_DIM : 'rgba(255,255,255,0.04)',
      borderWidth: 1,
      borderColor: accent ? SLEEP_BORDER : 'rgba(255,255,255,0.08)',
      borderRadius: 11,
      paddingHorizontal: 12,
      paddingVertical: 9,
    }}
  >
    <Text style={{ color: '#71717A', fontSize: 10, marginBottom: 2, fontFamily: FONT }}>{label}</Text>
    {value}
  </View>
);

/**
 * Real Home-screen sleep card — reads appState.todaySleep (a genuine
 * database-backed "did the user actually log sleep today" check) instead
 * of local component state, so the Logged/unlogged UI survives a full app
 * restart correctly. Tapping either the ring or the button opens
 * SleepLogModal, which asks for bedtime/wake-up time directly (scroll-
 * wheel entry) rather than an hours dial the user has to mentally compute.
 */
export function SleepArcDial() {
  const { sleepLogged, todaySleep } = useAppState();
  const [modalOpen, setModalOpen] = useState(false);

  const hours = todaySleep?.hours ?? 7.5;
  const pct = Math.min(hours / 10, 1) * 100;
  const q = quality(hours);

  return (
    <View
      style={{
        backgroundColor: '#151517',
        borderWidth: 1,
        borderColor: SLEEP_BORDER,
        borderRadius: 20,
        paddingHorizontal: 18,
        paddingVertical: 16,
        overflow: 'hidden',
      }}
    >
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 14 }}>
        <View>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 3 }}>
            <View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: SLEEP }} />
            <Text style={{ color: SLEEP, fontSize: 10, fontWeight: '700', letterSpacing: 0.9, fontFamily: FONT }}>
              MORNING CHECK-IN
            </Text>
          </View>
          <Text style={{ color: '#fff', fontSize: 14, fontWeight: '700', fontFamily: FONT }}>Last Night's Sleep</Text>
        </View>
        {sleepLogged && (
          <View
            style={{
              backgroundColor: 'rgba(34,197,94,0.12)',
              borderWidth: 1,
              borderColor: 'rgba(34,197,94,0.28)',
              borderRadius: 8,
              paddingHorizontal: 10,
              paddingVertical: 4,
              flexDirection: 'row',
              alignItems: 'center',
              gap: 5,
            }}
          >
            <Icon name="check" size={11} color={COLORS.green} strokeWidth={3} />
            <Text style={{ color: COLORS.green, fontSize: 10.5, fontWeight: '700', fontFamily: FONT }}>Logged</Text>
          </View>
        )}
      </View>

      <TouchableOpacity activeOpacity={0.85} onPress={() => setModalOpen(true)} style={{ flexDirection: 'row', alignItems: 'center', gap: 18 }}>
        <View style={{ alignItems: 'center', gap: 10 }}>
          <ProgressRing
            size={148}
            rings={[{ r: (148 - 9) / 2, strokeWidth: 9, color: SLEEP, pct }]}
            rotation={135}
            trackFraction={0.75}
          >
            <Icon name="moon" size={14} color={SLEEP} />
            <Text style={{ color: '#fff', fontSize: 22, fontWeight: '900', letterSpacing: -0.6, fontFamily: FONT }}>
              {hours.toFixed(1)}
            </Text>
            <Text style={{ color: '#71717A', fontSize: 9, letterSpacing: 0.6, fontFamily: FONT }}>HOURS</Text>
            <Text style={{ color: q.color, fontSize: 9.5, fontWeight: '700', marginTop: 1, fontFamily: FONT }}>{q.label}</Text>
          </ProgressRing>
        </View>

        <View style={{ flex: 1, gap: 8 }}>
          {tile('🌙 Bedtime', <Text style={{ color: '#fff', fontSize: 13, fontWeight: '700', fontFamily: FONT }}>{formatTime(todaySleep?.bedtime ?? null)}</Text>)}
          {tile('⏰ Wake-up', <Text style={{ color: '#fff', fontSize: 13, fontWeight: '700', fontFamily: FONT }}>{formatTime(todaySleep?.wake_time ?? null)}</Text>)}
          {tile(
            'Sleep Score',
            <Text style={{ color: SLEEP, fontSize: 20, fontWeight: '900', fontFamily: FONT }}>
              {Math.round(Math.min(100, (hours / 8) * 100))}
              <Text style={{ color: '#71717A', fontSize: 11, fontWeight: '400' }}> / 100</Text>
            </Text>,
            true
          )}
        </View>
      </TouchableOpacity>

      <TouchableOpacity activeOpacity={0.85} onPress={() => setModalOpen(true)} style={{ marginTop: 14 }}>
        {sleepLogged ? (
          <View
            style={{
              height: 42,
              borderRadius: 13,
              backgroundColor: 'rgba(34,197,94,0.10)',
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 8,
            }}
          >
            <Icon name="moon" size={13} color={COLORS.green} />
            <Text style={{ color: COLORS.green, fontSize: 13, fontWeight: '800', letterSpacing: 0.5, fontFamily: FONT }}>
              Sleep Logged ✓ — tap to edit
            </Text>
          </View>
        ) : (
          <View
            style={{
              height: 42,
              borderRadius: 13,
              backgroundColor: SLEEP,
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 8,
            }}
          >
            <Icon name="moon" size={13} color="#fff" />
            <Text style={{ color: '#fff', fontSize: 13, fontWeight: '800', letterSpacing: 0.5, fontFamily: FONT }}>
              Log Sleep
            </Text>
          </View>
        )}
      </TouchableOpacity>

      <SleepLogModal visible={modalOpen} onClose={() => setModalOpen(false)} />
    </View>
  );
}
