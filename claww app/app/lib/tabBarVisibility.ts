import { useCallback, useRef } from 'react';
import type { NativeScrollEvent, NativeSyntheticEvent } from 'react-native';
import { makeMutable, withTiming } from 'react-native-reanimated';

// Premium S5: the floating tab bar tucks away when you scroll down and comes back when you scroll up or reach the top.
// One module-level shared value (0 = shown, 1 = hidden) so the bar and every tab screen agree without a provider.

export const barHidden = makeMutable(0);

const SHOW_AT_TOP = 24;
const MOVE_THRESHOLD = 10;

export function setBarHidden(hidden: boolean): void {
  barHidden.value = withTiming(hidden ? 1 : 0, { duration: 220 });
}

/** Spread onto a tab screen's ScrollView: `<ScrollView {...useHideBarOnScroll()}>`. */
export function useHideBarOnScroll() {
  const last = useRef(0);
  const onScroll = useCallback((e: NativeSyntheticEvent<NativeScrollEvent>) => {
    const y = e.nativeEvent.contentOffset.y;
    const dy = y - last.current;
    if (y < SHOW_AT_TOP) setBarHidden(false);
    else if (dy > MOVE_THRESHOLD) setBarHidden(true);
    else if (dy < -MOVE_THRESHOLD) setBarHidden(false);
    if (Math.abs(dy) > MOVE_THRESHOLD || y < SHOW_AT_TOP) last.current = y;
  }, []);
  return { onScroll, scrollEventThrottle: 16 } as const;
}
