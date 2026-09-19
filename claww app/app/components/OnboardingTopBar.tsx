import React from 'react';
import { TouchableOpacity, View } from 'react-native';
import { useRouter } from 'expo-router';
import { Icon } from './ui/Icon';

export interface OnboardingTopBarProps {
  /** 0-based step index (0=name, 1=age, 2=gender, 3=reveal by default) */
  step: number;
  accent: string;
  showBack?: boolean;
  /** Number of progress segments — defaults to 3 (the onboarding flow's own count). Any multi-step intake flow can pass its own. */
  totalSteps?: number;
}

/** Reusable multi-step top bar: back chip + N progress segments. Originally built for onboarding, also used by the workout/nutrition setup flows. */
export function OnboardingTopBar({ step, accent, showBack = false, totalSteps = 3 }: OnboardingTopBarProps) {
  const router = useRouter();
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 22, paddingTop: 26 }}>
      {showBack ? (
        <TouchableOpacity
          activeOpacity={0.8}
          onPress={() => router.back()}
          style={{
            width: 30,
            height: 30,
            borderRadius: 9,
            backgroundColor: 'rgba(255,255,255,0.06)',
            borderWidth: 1,
            borderColor: 'rgba(255,255,255,0.10)',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <Icon name="chevron-left" size={14} color="#A1A1AA" />
        </TouchableOpacity>
      ) : (
        <View style={{ width: 30 }} />
      )}
      <View style={{ flex: 1, flexDirection: 'row', gap: 6 }}>
        {Array.from({ length: totalSteps }, (_, i) => i).map((i) => (
          <View
            key={i}
            style={{
              flex: 1,
              height: 4,
              borderRadius: 100,
              backgroundColor:
                i < step || step === totalSteps ? accent : i === step ? 'rgba(255,255,255,0.30)' : 'rgba(255,255,255,0.10)',
            }}
          />
        ))}
      </View>
      <View style={{ width: 30 }} />
    </View>
  );
}
