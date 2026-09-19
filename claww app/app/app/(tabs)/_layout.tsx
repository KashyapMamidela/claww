import React, { useEffect } from 'react';
import { View } from 'react-native';
import { Tabs, usePathname, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { AppHeader } from '../../components/ui/AppHeader';
import { TabBar } from '../../components/ui/TabBar';
import { LiveWorkoutPlayer } from '../../components/LiveWorkoutPlayer';
import { useWorkoutSession } from '../../lib/workoutSession';
import { TAB_ACCENTS } from '../../lib/theme';

export default function TabsLayout() {
  const pathname = usePathname();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { status, endSession } = useWorkoutSession();

  const routeName = pathname === '/' ? 'index' : pathname.replace(/^\//, '');
  const wordmarkAccent = TAB_ACCENTS[routeName]?.wordmark ?? '#A1A1AA';

  // Session hits 'completed' the instant the last set is finished (or the
  // last exercise skipped) — hand off to the real celebration screen, then
  // clear the session so the mini-player disappears behind it.
  useEffect(() => {
    if (status === 'completed') {
      router.push('/workout-complete');
      endSession();
    }
  }, [status]);

  const tabBarHeight = 52 + Math.max(insets.bottom, 20);

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
        <Tabs.Screen name="more" />
      </Tabs>
      <AppHeader wordmarkAccent={wordmarkAccent} onBellPress={() => router.navigate('/(tabs)/more')} />
      <LiveWorkoutPlayer bottomOffset={tabBarHeight + 10} />
    </View>
  );
}
