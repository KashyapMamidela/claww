import React from 'react';
import { Text, View } from 'react-native';
import { COLORS, FONT, SURFACES } from '../../lib/theme';
import { Icon } from './Icon';
import { PressScale } from './PressScale';
import { Well } from './Well';

// NG PHASE 1 (build plan 5.4): two 44 x 44 buttons around a big value (24 / 900, tabular)
// with its unit underneath, inside a Well. Used for kg and reps in the player and for
// household portions in the scanner.

export interface StepperProps {
  value: string;
  unit: string;
  onDecrement: () => void;
  onIncrement: () => void;
  decrementDisabled?: boolean;
  incrementDisabled?: boolean;
  /** What is being changed, for screen readers ("Weight", "Reps"). */
  label: string;
}

function StepButton({ icon, onPress, disabled, a11y }: { icon: string; onPress: () => void; disabled?: boolean; a11y: string }) {
  return (
    <PressScale onPress={onPress} disabled={disabled} scaleTo={0.92} accessibilityRole="button" accessibilityLabel={a11y} accessibilityState={{ disabled: !!disabled }}>
      <View
        style={{
          width: 44,
          height: 44,
          borderRadius: 13,
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: SURFACES.cardTop,
          borderWidth: 1,
          borderColor: COLORS.borderStrong,
          opacity: disabled ? 0.4 : 1,
        }}
      >
        <Icon name={icon} size={18} color={COLORS.fg} strokeWidth={2.4} />
      </View>
    </PressScale>
  );
}

export function Stepper({ value, unit, onDecrement, onIncrement, decrementDisabled, incrementDisabled, label }: StepperProps) {
  return (
    <Well padding={4} radius={16}>
      <View style={{ flexDirection: 'row', alignItems: 'center' }} accessibilityRole="adjustable" accessibilityLabel={label} accessibilityValue={{ text: `${value} ${unit}` }}>
        <StepButton icon="minus" onPress={onDecrement} disabled={decrementDisabled} a11y={`Less ${label.toLowerCase()}`} />
        <View style={{ flex: 1, alignItems: 'center' }}>
          <Text style={{ color: COLORS.fg, fontSize: 22, fontWeight: '900', fontFamily: FONT, fontVariant: ['tabular-nums'], lineHeight: 28 }}>{value}</Text>
          <Text style={{ color: COLORS.textMuted, fontSize: 11, fontWeight: '600', fontFamily: FONT }}>{unit}</Text>
        </View>
        <StepButton icon="plus" onPress={onIncrement} disabled={incrementDisabled} a11y={`More ${label.toLowerCase()}`} />
      </View>
    </Well>
  );
}
