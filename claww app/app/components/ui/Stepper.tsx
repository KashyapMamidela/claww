import React, { useEffect, useRef } from 'react';
import { Text, View } from 'react-native';
import { COLORS, FONT, SURFACES, BG, bg } from '../../lib/theme';
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

// Hold a button to keep stepping: after 350 ms it repeats every 90 ms, so 20 kg is one hold instead of eight taps.
export function StepButton({ icon, onPress, disabled, a11y, size = 44, radius = 13, tone, wide = false }: { icon: string; onPress: () => void; disabled?: boolean; a11y: string; size?: number; radius?: number; tone?: string; wide?: boolean }) {
  const timer = useRef<ReturnType<typeof setInterval> | null>(null);
  const latest = useRef(onPress);
  latest.current = onPress;
  const stop = () => {
    if (timer.current) clearInterval(timer.current);
    timer.current = null;
  };
  useEffect(() => stop, []);
  useEffect(() => {
    if (disabled) stop();
  }, [disabled]);
  return (
    <PressScale
      onPress={onPress}
      onLongPress={() => {
        stop();
        latest.current();
        timer.current = setInterval(() => latest.current(), 90);
      }}
      delayLongPress={350}
      onPressOut={stop}
      disabled={disabled}
      scaleTo={0.92}
      style={wide ? { alignSelf: 'stretch' } : undefined}
      accessibilityRole="button"
      accessibilityLabel={a11y}
      accessibilityState={{ disabled: !!disabled }}
    >
      <View
        style={{
          width: wide ? '100%' : size,
          height: size,
          borderRadius: radius,
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: tone ? `${tone}33` : SURFACES.cardTop,
          borderWidth: 1,
          borderColor: tone ? `${tone}66` : COLORS.borderStrong,
          opacity: disabled ? 0.4 : 1,
        }}
      >
        <Icon name={icon} size={Math.round(size * 0.42)} color={COLORS.fg} strokeWidth={2.4} />
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
          <Text style={{ color: COLORS.fg, fontSize: 22, fontFamily: BG[800], fontVariant: ['tabular-nums'], lineHeight: 28 }}>{value}</Text>
          <Text style={{ color: COLORS.textMuted, fontSize: 11, fontFamily: BG[600] }}>{unit}</Text>
        </View>
        <StepButton icon="plus" onPress={onIncrement} disabled={incrementDisabled} a11y={`More ${label.toLowerCase()}`} />
      </View>
    </Well>
  );
}
