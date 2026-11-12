import React from 'react';
import { View } from 'react-native';
import { tint } from '../../lib/theme';
import { Icon } from './Icon';

// The card's area icon drawn large, faint and partly off the bottom-right edge, like a stamp on paper. Decoration
// only: hidden from screen readers and never catches touches. Must sit inside a parent that clips (radius + overflow).
export function Stamp({ name, color, size = 64, opacity = 0.16, right = -10, bottom = -12 }: { name: string; color: string; size?: number; opacity?: number; right?: number; bottom?: number }) {
  return (
    <View pointerEvents="none" importantForAccessibility="no-hide-descendants" accessibilityElementsHidden style={{ position: 'absolute', right, bottom, transform: [{ rotate: '-12deg' }] }}>
      <Icon name={name} size={size} color={tint(color, opacity)} strokeWidth={1.5} />
    </View>
  );
}
