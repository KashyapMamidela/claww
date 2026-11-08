import React, { useEffect, useRef, useState } from 'react';
import { Text, TextInput, View } from 'react-native';
import { COLORS, FONT, BG, bg } from '../../lib/theme';
import { Surface } from '../ui/Surface';

// Height and weight fields with their own state: typing redraws only these two boxes. The parent hears about the values
// 300 ms after the last keystroke (and when a field is left), not on every key, which keeps the setup screen smooth.
export interface BasicsInputsProps {
  initialHeight: string;
  initialWeight: string;
  onChange: (height: string, weight: string) => void;
}

function Field({ label, unit, value, onChangeText, onEnd }: { label: string; unit: string; value: string; onChangeText: (t: string) => void; onEnd: () => void }) {
  return (
    <View style={{ flex: 1 }}>
      <Text style={{ color: COLORS.textMuted, fontSize: 13, marginBottom: 6, fontFamily: BG[400] }}>{label}</Text>
      <Surface radius={14} padding={0} borderColor={value.length > 0 ? 'rgba(59,130,246,0.5)' : undefined}>
        <View style={{ flexDirection: 'row', alignItems: 'center', paddingHorizontal: 14 }}>
          <TextInput
            value={value}
            onChangeText={(t) => onChangeText(t.replace(/[^0-9.]/g, '').slice(0, 5))}
            onEndEditing={onEnd}
            keyboardType="numeric"
            placeholder="0"
            placeholderTextColor={COLORS.textFaint}
            accessibilityLabel={`${label} in ${unit}`}
            style={{ flex: 1, height: 52, color: COLORS.fg, fontSize: 17, fontFamily: BG[700] }}
          />
          <Text style={{ color: COLORS.textMuted, fontSize: 15, fontFamily: BG[400] }}>{unit}</Text>
        </View>
      </Surface>
    </View>
  );
}

export function BasicsInputs({ initialHeight, initialWeight, onChange }: BasicsInputsProps) {
  const [height, setHeight] = useState(initialHeight);
  const [weight, setWeight] = useState(initialWeight);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const latest = useRef({ height, weight });
  latest.current = { height, weight };

  const flush = () => {
    if (timer.current) clearTimeout(timer.current);
    timer.current = null;
    onChange(latest.current.height, latest.current.weight);
  };
  const later = () => {
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(flush, 300);
  };

  useEffect(() => () => {
    if (timer.current) clearTimeout(timer.current);
  }, []);

  return (
    <View style={{ flexDirection: 'row', gap: 12 }}>
      <Field label="Height" unit="cm" value={height} onChangeText={(t) => { setHeight(t); later(); }} onEnd={flush} />
      <Field label="Weight" unit="kg" value={weight} onChangeText={(t) => { setWeight(t); later(); }} onEnd={flush} />
    </View>
  );
}
