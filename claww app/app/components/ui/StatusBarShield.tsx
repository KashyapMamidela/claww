import React from 'react';
import { View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { COLORS } from '../../lib/theme';

/**
 * A solid strip under the status bar. On a screen that scrolls edge to edge, content slid up under the clock and
 * battery and was drawn over them; this keeps the status bar readable. Touches pass through it.
 */
export function StatusBarShield({ color = COLORS.bg }: { color?: string }) {
  const insets = useSafeAreaInsets();
  return <View pointerEvents="none" style={{ position: 'absolute', top: 0, left: 0, right: 0, height: insets.top, backgroundColor: color, zIndex: 20 }} />;
}
