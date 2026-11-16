import { Dimensions } from 'react-native';
import { Easing, makeMutable, withTiming } from 'react-native-reanimated';
import { scheduleOnRN } from 'react-native-worklets';

// Switching tab is a slide in two parts: the page you are on follows your finger (or, for a tap on the bar, moves off by
// itself) and leaves the screen toward the side you are going from, then the next page glides in from the opposite side.
// `tabDragX` is the leaving page's offset; every tab scene adds it while it is the focused one (see TabScene).

export const TAB_ORDER = ['index', 'workouts', 'nutrition', 'tracker'] as const;
export type TabName = (typeof TAB_ORDER)[number];

export const SCREEN_W = Dimensions.get('window').width;
/** Offset of the page that is leaving, in px. 0 = in place, -SCREEN_W = gone off to the left. */
export const tabDragX = makeMutable(0);

export const EXIT_MS = 170;
export const ENTER_MS = 320;
export const SLIDE_EASE = Easing.bezier(0.23, 1, 0.32, 1);

/** 1 while a slide is running; a shared value so the swipe gesture (UI thread) and taps (JS) see the same flag. */
const slideBusy = makeMutable(0);
const release = () => {
  setTimeout(() => {
    slideBusy.set(0);
  }, ENTER_MS + 80);
};

export function indexOfTab(name: string): number {
  'worklet';
  return TAB_ORDER.indexOf(name as TabName);
}

/** The tab to the right (+1) or left (-1) of this one, or null at the ends. */
export function neighbourTab(name: string, step: 1 | -1): TabName | null {
  'worklet';
  const i = indexOfTab(name) + step;
  return i >= 0 && i < TAB_ORDER.length ? TAB_ORDER[i] : null;
}

/**
 * Go to another tab with the slide: the current page leaves first (170 ms), then the navigation happens and the new page
 * glides in. Taps while a slide is running are ignored. With `reduced` (Reduce motion) it just navigates.
 */
export function slideToTab(current: string, target: string, navigate: (name: string) => void, reduced = false): void {
  if (target === current) return;
  if (slideBusy.get() === 1) return;
  slideBusy.set(1);
  if (reduced) {
    navigate(target);
    release();
    return;
  }
  const dir = indexOfTab(target) > indexOfTab(current) ? -1 : 1;
  tabDragX.set(
    withTiming(dir * SCREEN_W, { duration: EXIT_MS, easing: SLIDE_EASE }, (finished) => {
      'worklet';
      if (finished) scheduleOnRN(navigate, target);
    })
  );
  release();
}

/** Used by the swipe gesture once its own exit animation has finished: navigate and keep taps out while the page glides in. */
export function markSlideBusy(): void {
  slideBusy.set(1);
  release();
}
export function isSlideBusy(): boolean {
  'worklet';
  return slideBusy.get() === 1;
}
