import React from 'react';
import { View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { COLORS } from '../../lib/theme';
import { Icon } from './Icon';
import { PressScale } from './PressScale';

// NG PHASE 1 (build plan 5.4): the set row's tick, 44 x 44, radius 13.
//   done     blue gradient, white check
//   current  blue outline with a glow: tap = logged exactly as planned
//   pending  grey outline, dim check

export type TickState = 'done' | 'current' | 'pending';

export interface TickButtonProps {
  state: TickState;
  onPress?: () => void;
  accessibilityLabel: string;
}

export function TickButton({ state, onPress, accessibilityLabel }: TickButtonProps) {
  const box = { width: 44, height: 44, borderRadius: 12, alignItems: 'center' as const, justifyContent: 'center' as const };
  const inner =
    state === 'done' ? (
      <LinearGradient colors={[COLORS.blueDeep, COLORS.blue]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={[box, { boxShadow: `0px 4px 10px ${COLORS.blue}55` }]}>
        <Icon name="check" size={20} color="#fff" strokeWidth={3} />
      </LinearGradient>
    ) : state === 'current' ? (
      <View style={[box, { borderWidth: 1.5, borderColor: COLORS.blue, backgroundColor: 'rgba(59,130,246,0.10)', boxShadow: `0px 0px 12px ${COLORS.blue}55` }]}>
        <Icon name="check" size={20} color="#fff" strokeWidth={3} />
      </View>
    ) : (
      <View style={[box, { borderWidth: 1.5, borderColor: COLORS.borderStrong }]}>
        <Icon name="check" size={20} color="rgba(255,255,255,0.3)" strokeWidth={2.5} />
      </View>
    );

  return (
    <PressScale
      onPress={onPress}
      disabled={!onPress || state === 'done'}
      scaleTo={0.9}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      accessibilityState={{ checked: state === 'done', disabled: !onPress || state === 'done' }}
    >
      {inner}
    </PressScale>
  );
}
