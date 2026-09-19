import React, { useState } from 'react';
import { Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { COLORS, FONT } from '../../../lib/theme';
import { OnboardingTopBar } from '../../../components/OnboardingTopBar';
import { Button } from '../../../components/ui/Button';
import { Icon } from '../../../components/ui/Icon';

const A = COLORS.blue;
const MIN_AGE = 13;
const MAX_AGE = 80;
const PRESETS = [18, 25, 35, 45];

export default function OnboardingAge() {
  const router = useRouter();
  const { name } = useLocalSearchParams<{ name: string }>();
  const [age, setAge] = useState(25);

  const next = () => {
    router.push({ pathname: '/screens/onboarding/gender', params: { name: name ?? '', age: String(age) } });
  };

  const stepBtn = (dir: -1 | 1) => (
    <TouchableOpacity
      activeOpacity={0.8}
      onPress={() => setAge((a) => Math.max(MIN_AGE, Math.min(MAX_AGE, a + dir)))}
      style={{
        width: 44,
        height: 44,
        borderRadius: 13,
        backgroundColor: 'rgba(59,130,246,0.14)',
        borderWidth: 1,
        borderColor: 'rgba(59,130,246,0.30)',
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      <Icon name={dir === -1 ? 'chevron-left' : 'chevron-right'} size={18} color={A} />
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#050505' }}>
      <OnboardingTopBar step={1} accent={A} showBack />
      <View style={{ flex: 1, paddingHorizontal: 24, paddingTop: 38, paddingBottom: 24 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 14 }}>
          <View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: A }} />
          <Text style={{ color: A, fontSize: 10, fontWeight: '700', letterSpacing: 1, fontFamily: FONT }}>
            {name ? `NICE TO MEET YOU, ${String(name).toUpperCase()}` : 'STEP TWO'}
          </Text>
        </View>
        <Text style={{ color: '#fff', fontSize: 30, fontWeight: '900', letterSpacing: -0.6, lineHeight: 33, fontFamily: FONT }}>
          How old are you?
        </Text>

        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', gap: 22 }}>
          <View style={{ flexDirection: 'row', alignItems: 'flex-end', gap: 6 }}>
            <Text
              style={{
                color: '#fff',
                fontSize: 88,
                fontWeight: '900',
                letterSpacing: -3,
                lineHeight: 90,
                fontFamily: FONT,
                fontVariant: ['tabular-nums'],
              }}
            >
              {age}
            </Text>
            <Text style={{ color: '#71717A', fontSize: 16, fontWeight: '700', marginBottom: 14, fontFamily: FONT }}>yrs</Text>
          </View>

          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 14 }}>
            {stepBtn(-1)}
            {stepBtn(1)}
          </View>

          <View style={{ flexDirection: 'row', gap: 8 }}>
            {PRESETS.map((v) => {
              const active = age === v;
              return (
                <TouchableOpacity
                  key={v}
                  activeOpacity={0.8}
                  onPress={() => setAge(v)}
                  style={{
                    paddingHorizontal: 13,
                    paddingVertical: 6,
                    borderRadius: 100,
                    backgroundColor: active ? 'rgba(59,130,246,0.16)' : 'rgba(255,255,255,0.05)',
                    borderWidth: 1,
                    borderColor: active ? 'rgba(59,130,246,0.4)' : 'rgba(255,255,255,0.10)',
                  }}
                >
                  <Text style={{ color: active ? A : '#A1A1AA', fontSize: 12, fontWeight: '700', fontFamily: FONT }}>{v}</Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>

        <Button variant="primary" accent={A} accentDeep={COLORS.blueDeep} size="lg" fullWidth onPress={next}>
          Continue
        </Button>
      </View>
    </SafeAreaView>
  );
}
