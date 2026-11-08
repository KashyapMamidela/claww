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

/** 0 at the top of a tab screen, 1 once its large title has scrolled away: the title bar fades its own title in (Premium S1). */
export const headerProgress = makeMutable(0);
const offsets: Record<string, number> = {};
let currentRoute = 'index';
const progressFor = (y: number) => Math.max(0, Math.min(1, (y - 36) / 28));

/** Called by the tabs layout when the active tab changes, so the title bar matches that screen's own scroll position. */
export function setCurrentTab(route: string): void {
  currentRoute = route;
  headerProgress.value = progressFor(offsets[route] ?? 0);
  setBarHidden(false);
}

/** Spread onto a tab screen's ScrollView: `<ScrollView {...useHideBarOnScroll('workouts')}>`. */
export function useHideBarOnScroll(route: string = 'index') {
  const last = useRef(0);
  const onScroll = useCallback((e: NativeSyntheticEvent<NativeScrollEvent>) => {
    const y = e.nativeEvent.contentOffset.y;
    offsets[route] = y;
    if (route === currentRoute) headerProgress.value = progressFor(y);
    const dy = y - last.current;
    if (y < SHOW_AT_TOP) setBarHidden(false);
    else if (dy > MOVE_THRESHOLD) setBarHidden(true);
    else if (dy < -MOVE_THRESHOLD) setBarHidden(false);
    if (Math.abs(dy) > MOVE_THRESHOLD || y < SHOW_AT_TOP) last.current = y;
  }, [route]);
  return { onScroll, scrollEventThrottle: 16 } as const;
}
