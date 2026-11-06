import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useWorkoutSession } from './workoutSession';
import { tabBottomPad } from './layout';

/** Bottom padding for a tab screen's scroll content (see lib/layout.ts). `extra` is the screen's own breathing room. */
export function useTabBottomPad(extra = 28): number {
  const insets = useSafeAreaInsets();
  const { status } = useWorkoutSession();
  return tabBottomPad(insets.bottom, extra, status !== 'idle');
}
