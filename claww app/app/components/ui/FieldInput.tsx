import React from 'react';
import { TextInput, TextInputProps } from 'react-native';
import { COLORS, FONT, BG, bg } from '../../lib/theme';
import { Surface } from './Surface';

/** A text field on the same textured surface as the cards: 52 tall, radius 14, a brighter edge once it has text. */
export function FieldInput({ active, style, ...rest }: TextInputProps & { active?: boolean }) {
  return (
    <Surface radius={14} padding={0} grain={0.06} borderColor={active ? 'rgba(255,255,255,0.4)' : undefined} shadow={false}>
      <TextInput
        placeholderTextColor="#52525B"
        {...rest}
        style={[{ height: 52, color: COLORS.fg, fontSize: 15, paddingHorizontal: 16, fontFamily: BG[600] }, style]}
      />
    </Surface>
  );
}
