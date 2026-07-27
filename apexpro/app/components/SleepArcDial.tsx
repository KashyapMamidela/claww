import React, { useState } from 'react';
import { Text, TouchableOpacity, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { COLORS, FONT } from '../lib/theme';
import { Icon } from './ui/Icon';
import { ProgressRing } from './ui/ProgressRing';
import { useAppState } from '../lib/appState';

const SLEEP = COLORS.indigo;
const SLEEP_DIM = COLORS.indigoDim;
const SLEEP_BORDER = COLORS.indigoBorder;

export function SleepArcDial() {
  const { logSleep } = useAppState();
  const [hours, setHours] = useState(7.5);
  const [submitted, setSubmitted] = useState(false);

  const pct = Math.min(hours / 10, 1) * 100;
  const quality = hours < 5 ? 'Poor' : hours < 6.5 ? 'Fair' : hours < 7.5 ? 'Good' : hours <= 9 ? 'Optimal' : 'Excess';
  const qColor =
    hours < 5 ? COLORS.danger : hours < 6.5 ? COLORS.amber : hours < 7.5 ? COLORS.green : hours <= 9 ? SLEEP : COLORS.fgGray;

  const stepper = (dir: -1 | 1, accent: boolean) => (
    <TouchableOpacity
      activeOpacity={0.8}
      onPress={() => {
        setHours((h) => Math.max(0, Math.min(12, +(h + dir * 0.5).toFixed(1))));
        setSubmitted(false);
      }}
      style={{
        width: 30,
        height: 30,
        borderRadius: 9,
        backgroundColor: accent ? SLEEP_DIM : 'rgba(255,255,255,0.05)',
        borderWidth: 1,
        borderColor: accent ? SLEEP_BORDER : 'rgba(255,255,255,0.10)',
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      <Icon name={dir === -1 ? 'chevron-left' : 'chevron-right'} size={14} color={accent ? SLEEP : '#A1A1AA'} />
    </TouchableOpacity>
  );

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
        {submitted && (
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

      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 18 }}>
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
            <Text style={{ color: qColor, fontSize: 9.5, fontWeight: '700', marginTop: 1, fontFamily: FONT }}>{quality}</Text>
          </ProgressRing>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
            {stepper(-1, false)}
            {stepper(1, true)}
          </View>
        </View>

        <View style={{ flex: 1, gap: 8 }}>
          {tile('🌙 Bedtime', <Text style={{ color: '#fff', fontSize: 13, fontWeight: '700', fontFamily: FONT }}>10:30 PM</Text>)}
          {tile('⏰ Wake-up', <Text style={{ color: '#fff', fontSize: 13, fontWeight: '700', fontFamily: FONT }}>06:00 AM</Text>)}
          {tile(
            'Sleep Score',
            <Text style={{ color: SLEEP, fontSize: 20, fontWeight: '900', fontFamily: FONT }}>
              {Math.round(Math.min(100, (hours / 8) * 100))}
              <Text style={{ color: '#71717A', fontSize: 11, fontWeight: '400' }}> / 100</Text>
            </Text>,
            true
          )}
        </View>
      </View>

      <TouchableOpacity
        activeOpacity={0.85}
        onPress={() => {
          setSubmitted(true);
          logSleep();
        }}
        style={{ marginTop: 14 }}
      >
        {submitted ? (
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
              Sleep Logged ✓
            </Text>
          </View>
        ) : (
          <LinearGradient
            colors={[COLORS.indigoDeep, SLEEP]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={{
              height: 42,
              borderRadius: 13,
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 8,
            }}
          >
            <Icon name="moon" size={13} color="#fff" />
            <Text style={{ color: '#fff', fontSize: 13, fontWeight: '800', letterSpacing: 0.5, fontFamily: FONT }}>
              Log {hours.toFixed(1)} Hours
            </Text>
          </LinearGradient>
        )}
      </TouchableOpacity>
    </View>
  );
}
