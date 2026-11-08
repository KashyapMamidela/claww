import React from 'react';
import Animated from 'react-native-reanimated';
import { riseIn } from '../../lib/motion';

/** Premium D11: a card that rises 10 px and fades in the first time it appears. `i` staggers by 40 ms (max 8). Reduce motion shows it at once. */
export function Rise({ i = 0, children }: { i?: number; children: React.ReactNode }) {
  return <Animated.View entering={riseIn(i)}>{children}</Animated.View>;
}
