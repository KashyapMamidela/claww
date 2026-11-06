import React from 'react';
import { View } from 'react-native';
import { useRouter } from 'expo-router';
import { COLORS } from '../lib/theme';
import { Icon } from './ui/Icon';
import { PressScale } from './ui/PressScale';
import { Surface } from './ui/Surface';

export interface OnboardingTopBarProps {
  /** 0-based step index. */
  step: number;
  accent: string;
  showBack?: boolean;
  /** Number of progress segments. Setup flows pass their own count. */
  totalSteps?: number;
}

/**
 * Back button and progress, both drawn as tiles (grain, top light, soft shadow) like every other card in the app.
 * The progress tile holds one segment per step: done ones glow in the accent, the current one is bright, the rest dim.
 */
export function OnboardingTopBar({ step, accent, showBack = false, totalSteps = 3 }: OnboardingTopBarProps) {
  const router = useRouter();
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 20, paddingTop: 12 }}>
      {showBack ? (
        <PressScale onPress={() => router.back()} accessibilityRole="button" accessibilityLabel="Back" hitSlop={6}>
          <Surface radius={14} padding={0} style={{ width: 44, height: 44 }}>
            <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
              <Icon name="chevron-left" size={20} color={COLORS.fg} />
            </View>
          </Surface>
        </PressScale>
      ) : null}
      <Surface radius={14} padding={0} style={{ flex: 1, height: 44 }}>
        <View
          style={{ flex: 1, flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 14 }}
          accessibilityRole="progressbar"
          accessibilityLabel={`Step ${Math.min(step + 1, totalSteps)} of ${totalSteps}`}
        >
          {Array.from({ length: totalSteps }, (_, i) => i).map((i) => {
            const done = i < step || step >= totalSteps;
            const current = i === step && !done;
            return (
              <View
                key={i}
                style={{
                  flex: 1,
                  height: 6,
                  borderRadius: 3,
                  backgroundColor: done ? accent : current ? 'rgba(255,255,255,0.55)' : 'rgba(255,255,255,0.10)',
                  boxShadow: done ? `0px 0px 8px ${accent}99` : undefined,
                }}
              />
            );
          })}
        </View>
      </Surface>
    </View>
  );
}
