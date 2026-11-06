import React from 'react';
import { View } from 'react-native';
import { COLORS } from '../../lib/theme';
import { Icon } from './Icon';
import { PressScale } from './PressScale';
import { Surface } from './Surface';

/** The back button used on every screen: a 44 pt tile with grain and a top light, like the cards. */
export function BackTile({ onPress, label = 'Back' }: { onPress: () => void; label?: string }) {
  return (
    <PressScale onPress={onPress} accessibilityRole="button" accessibilityLabel={label} hitSlop={6}>
      <Surface radius={14} padding={0} style={{ width: 44, height: 44 }}>
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
          <Icon name="chevron-left" size={20} color={COLORS.fg} />
        </View>
      </Surface>
    </PressScale>
  );
}
