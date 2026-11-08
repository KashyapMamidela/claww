import React, { useEffect } from 'react';
import { View } from 'react-native';
import { Tabs, usePathname, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { AppHeader } from '../../components/ui/AppHeader';
import { TabBar } from '../../components/ui/TabBar';
import { LiveWorkoutPlayer } from '../../components/LiveWorkoutPlayer';
import { useWorkoutSession } from '../../lib/workoutSession';
import { useAppState } from '../../lib/appState';
import { dayLabel } from '../../lib/format';
import { setCurrentTab } from '../../lib/tabBarVisibility';
import { TAB_ACCENTS, TAB_BAR_HEIGHT } from '../../lib/theme';
import { useRenderCount } from '../../lib/perf';

export default function TabsLayout() {
  useRenderCount('TabsLayout');
  const pathname = usePathname();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { status, endSession } = useWorkoutSession();

  const routeName = pathname === '/' ? 'index' : pathname.replace(/^\//, '');
  const { userName } = useAppState();
  useEffect(() => { setCurrentTab(routeName); }, [routeName]);
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
        screenOptions={{ headerShown: false, sceneStyle: { backgroundColor: '#050505' } }}
      >
        <Tabs.Screen name="index" />
        <Tabs.Screen name="workouts" />
        <Tabs.Screen name="nutrition" />
        <Tabs.Screen name="tracker" />
      </Tabs>
      <AppHeader
        accent={headerAccent}
        title={headerTitle}
        collapsing={routeName !== 'index'}
        initial={(userName || 'M').charAt(0).toUpperCase()}
        onPenPress={() => router.push('/week-review')}
        onAvatarPress={() => router.push('/profile')}
      />
      <LiveWorkoutPlayer bottomOffset={tabBarHeight + 8} />
    </View>
  );
}
