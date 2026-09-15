import React from 'react';
import { Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { FONT } from '../lib/theme';
import { OnboardingTopBar } from './OnboardingTopBar';

export interface SetupChipStepProps<T extends string> {
  step: number;
  totalSteps: number;
  accent: string;
  eyebrow: string;
  title: string;
  subtitle?: string;
  options: { value: T; label: string }[];
  selected: T | null;
  onSelect: (value: T) => void;
  showBack?: boolean;
}

/**
 * One big-card single-select question per screen, matching the onboarding
 * gender step's UX (tap a card, it highlights, the caller decides what
 * happens next — usually an auto-advance). Shared by the workout-setup and
 * nutrition-setup step flows since equipment/goal/experience/activity are
 * all this exact shape, just with different copy and options.
 */
export function SetupChipStep<T extends string>({
  step,
  totalSteps,
  accent,
  eyebrow,
  title,
  subtitle,
  options,
  selected,
  onSelect,
  showBack = true,
}: SetupChipStepProps<T>) {
  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#050505' }}>
      <OnboardingTopBar step={step} totalSteps={totalSteps} accent={accent} showBack={showBack} />
      <View style={{ flex: 1, paddingHorizontal: 24, paddingTop: 38, paddingBottom: 24 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 14 }}>
          <View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: accent }} />
          <Text style={{ color: accent, fontSize: 10, fontWeight: '700', letterSpacing: 1, fontFamily: FONT }}>{eyebrow}</Text>
        </View>
        <Text style={{ color: '#fff', fontSize: 28, fontWeight: '900', letterSpacing: -0.6, lineHeight: 32, fontFamily: FONT }}>
          {title}
        </Text>
        {subtitle ? (
          <Text style={{ color: '#71717A', fontSize: 13, marginTop: 10, lineHeight: 19, fontFamily: FONT }}>{subtitle}</Text>
        ) : null}

        <View style={{ marginTop: 26, gap: 12 }}>
          {options.map((opt) => {
            const isActive = selected === opt.value;
            return (
              <TouchableOpacity
                key={opt.value}
                activeOpacity={0.85}
                onPress={() => onSelect(opt.value)}
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  gap: 14,
                  paddingHorizontal: 18,
                  paddingVertical: 16,
                  borderRadius: 16,
                  backgroundColor: isActive ? `${accent}18` : '#151517',
                  borderWidth: 1,
                  borderColor: isActive ? `${accent}60` : 'rgba(255,255,255,0.10)',
                }}
              >
                <Text style={{ color: isActive ? accent : '#fff', fontSize: 15, fontWeight: '700', flex: 1, fontFamily: FONT }}>
                  {opt.label}
                </Text>
                {isActive && <Text style={{ color: accent, fontSize: 16 }}>✓</Text>}
              </TouchableOpacity>
            );
          })}
        </View>
      </View>
    </SafeAreaView>
  );
}
