import React, { useEffect, useState } from 'react';
import { getMarks } from '../../lib/penData';
import { Easing, View } from 'react-native';
import { useReducedMotion } from 'react-native-reanimated';
import type { BottomTabNavigationOptions } from '@react-navigation/bottom-tabs';
import { Tabs, useGlobalSearchParams, usePathname, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { AppHeader } from '../../components/ui/AppHeader';
import { AmbientLight } from '../../components/ui/AmbientLight';
import { TabBar } from '../../components/ui/TabBar';
import { LiveWorkoutPlayer } from '../../components/LiveWorkoutPlayer';
import { useWorkoutSession } from '../../lib/workoutSession';
import { useAppState } from '../../lib/appState';
import { dayLabel } from '../../lib/format';
import { setCurrentTab } from '../../lib/tabBarVisibility';
import { TAB_ACCENTS, TAB_BAR_HEIGHT } from '../../lib/theme';
import { useRenderCount } from '../../lib/perf';
import { useQuickLog } from '../../components/QuickLog';

// Switching tabs: the new page slides in a short way from the side you moved toward while the old one slides out
// and fades. Short (28 px, 220 ms, strong ease-out) because tabs are switched dozens of times a day; Reduce motion
// gets a plain cross-fade.
const TAB_SHIFT: Pick<BottomTabNavigationOptions, 'animation' | 'transitionSpec' | 'sceneStyleInterpolator'> = {
  animation: 'shift',
  transitionSpec: { animation: 'timing', config: { duration: 220, easing: Easing.bezier(0.23, 1, 0.32, 1) } },
  sceneStyleInterpolator: ({ current }) => ({
    sceneStyle: {
      opacity: current.progress.interpolate({ inputRange: [-1, -0.5, 0, 0.5, 1], outputRange: [0, 0, 1, 0, 0] }),
      transform: [{ translateX: current.progress.interpolate({ inputRange: [-1, 0, 1], outputRange: [-28, 0, 28] }) }],
    },
  }),
};
const TAB_FADE: Pick<BottomTabNavigationOptions, 'animation' | 'transitionSpec'> = {
  animation: 'fade',
  transitionSpec: { animation: 'timing', config: { duration: 150, easing: Easing.out(Easing.quad) } },
};

export default function TabsLayout() {
  const reducedMotion = useReducedMotion();
  useRenderCount('TabsLayout');
  const pathname = usePathname();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { status, endSession } = useWorkoutSession();

  const routeName = pathname === '/' ? 'index' : pathname.replace(/^\//, '');
  const { userName, userId } = useAppState();
  useEffect(() => { setCurrentTab(routeName); }, [routeName]);
  // Premium F2: the widgets open the Quick log sheet (?quicklog=1) or the activity sheet (?quicklog=activity) through a link.
  const { quicklog } = useGlobalSearchParams<{ quicklog?: string }>();
  const { open: openQuickLog, openActivity } = useQuickLog();
  useEffect(() => {
    if (!quicklog) return;
    const t = setTimeout(() => {
      if (quicklog === 'activity') openActivity();
      else openQuickLog();
      router.setParams({ quicklog: undefined });
    }, 400);
    return () => clearTimeout(t);
  }, [quicklog, openQuickLog, openActivity, router]);
  // Premium H8: an orange dot on the pen when a mark is waiting for a Keep or Use my old plan.
  const [penDot, setPenDot] = useState(false);
  useEffect(() => {
    if (!userId) return;
    getMarks(userId, 7).then((m) => setPenDot(m.some((x) => x.status === 'active'))).catch(() => {});
  }, [userId, pathname]);
  // Home and Progress are white/grey by tab; the header's logo tile always carries a colour.
  const headerAccent = ({ index: '#3B82F6', workouts: '#3B82F6', nutrition: '#22C55E', tracker: '#2DD4BF', more: '#A1A1AA' } as Record<string, string>)[routeName] ?? '#3B82F6';
  const now = new Date();
  const headerTitle =
    routeName === 'index'
      ? dayLabel(now)
      : ({ workouts: 'Train', nutrition: 'Food', tracker: 'Progress', more: 'More' } as Record<string, string>)[routeName] ?? '';

  // Session hits 'completed' the instant the last set is finished (or the
  // last exercise skipped) — hand off to the real celebration screen, then
  // clear the session so the mini-player disappears behind it.
  useEffect(() => {
    if (status === 'completed') {
      router.push('/workout-complete');
      endSession();
    }
  }, [status]);

  const tabBarHeight = TAB_BAR_HEIGHT + Math.max(insets.bottom, 12);

  // AppHeader and TabBar float over the scene now (see both components) so
  // their blur has real content behind it — Tabs fills the full screen and
  // each screen pads its own content by HEADER_CONTENT_HEIGHT/TAB_BAR_CONTENT_HEIGHT
  // + insets instead of this layout reserving that space.
  return (
    <View style={{ flex: 1, backgroundColor: '#050505' }}>
      <Tabs
        tabBar={(props) => <TabBar {...props} />}
        screenOptions={{ headerShown: false, sceneStyle: { backgroundColor: '#050505' }, freezeOnBlur: true, ...(reducedMotion ? TAB_FADE : TAB_SHIFT) }}
      >
        <Tabs.Screen name="index" />
        <Tabs.Screen name="workouts" />
        <Tabs.Screen name="nutrition" />
        <Tabs.Screen name="tracker" />
      </Tabs>
      <AmbientLight tabColor={headerAccent} />
      <AppHeader
        accent={headerAccent}
        title={headerTitle}
        penDot={penDot}
        initial={(userName || 'M').charAt(0).toUpperCase()}
        onPenPress={() => router.push('/week-review')}
        onAvatarPress={() => router.push('/profile')}
      />
      <LiveWorkoutPlayer bottomOffset={tabBarHeight + 8} />
    </View>
  );
}
