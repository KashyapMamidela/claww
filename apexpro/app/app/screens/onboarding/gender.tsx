import React, { useState } from 'react';
import { Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { COLORS, FONT } from '../../../lib/theme';
import { OnboardingTopBar } from '../../../components/OnboardingTopBar';

const GENDERS = [
  { id: 'male', label: 'Male', emoji: '♂', accent: '#3B82F6' },
  { id: 'female', label: 'Female', emoji: '♀', accent: '#EC4899' },
  { id: 'other', label: 'Other', emoji: '⚧', accent: '#A855F7' },
] as const;

export default function OnboardingGender() {
  const router = useRouter();
  const { name, age } = useLocalSearchParams<{ name: string; age: string }>();
  const [gender, setGender] = useState<string | null>(null);

  const select = (id: string) => {
    setGender(id);
    setTimeout(() => {
      router.push({
        pathname: '/screens/onboarding/reveal',
        params: { name: name ?? '', age: age ?? '', gender: id },
      });
    }, 260);
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#050505' }}>
      <OnboardingTopBar step={2} accent={COLORS.blue} showBack />
      <View style={{ flex: 1, paddingHorizontal: 24, paddingTop: 38, paddingBottom: 24 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 14 }}>
          <View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: COLORS.purple }} />
          <Text style={{ color: COLORS.purple, fontSize: 10, fontWeight: '700', letterSpacing: 1, fontFamily: FONT }}>LAST THING</Text>
        </View>
        <Text style={{ color: '#fff', fontSize: 30, fontWeight: '900', letterSpacing: -0.6, lineHeight: 33, fontFamily: FONT }}>
          How do you identify?
        </Text>
        <Text style={{ color: '#71717A', fontSize: 13, marginTop: 10, marginBottom: 30, fontFamily: FONT }}>
          Tunes recovery and calorie targets to you.
        </Text>

        <View style={{ gap: 12 }}>
          {GENDERS.map((g) => {
            const isActive = gender === g.id;
            return (
              <TouchableOpacity
                key={g.id}
                activeOpacity={0.85}
                onPress={() => select(g.id)}
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  gap: 14,
                  paddingHorizontal: 18,
                  paddingVertical: 16,
                  borderRadius: 16,
                  backgroundColor: isActive ? `${g.accent}18` : '#151517',
                  borderWidth: 1,
                  borderColor: isActive ? `${g.accent}60` : 'rgba(255,255,255,0.10)',
                }}
              >
                <Text style={{ fontSize: 26 }}>{g.emoji}</Text>
                <Text style={{ color: isActive ? g.accent : '#fff', fontSize: 15, fontWeight: '700', flex: 1, fontFamily: FONT }}>
                  {g.label}
                </Text>
                {isActive && <Text style={{ color: g.accent, fontSize: 16 }}>✓</Text>}
              </TouchableOpacity>
            );
          })}
        </View>
      </View>
    </SafeAreaView>
  );
}
