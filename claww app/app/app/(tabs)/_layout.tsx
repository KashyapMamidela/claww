import React, { useEffect, useRef, useState } from 'react';
import { getMarks } from '../../lib/penData';
import { View } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import { useReducedMotion, withSpring, withTiming } from 'react-native-reanimated';
import { scheduleOnRN } from 'react-native-worklets';
import { EXIT_MS, SCREEN_W, SLIDE_EASE, isSlideBusy, markSlideBusy, neighbourTab, tabDragX } from '../../lib/tabSlide';
import { TabScene } from '../../components/ui/TabScene';
import { Tabs, useGlobalSearchParams, usePathname, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { AppHeader } from '../../components/ui/AppHeader';
import { AmbientLight } from '../../components/ui/AmbientLight';
import { TabBar } from '../../components/ui/TabBar';
import { LiveWorkoutPlayer } from '../../components/LiveWorkoutPlayer';
import { ActivityMiniBar } from '../../components/activity/ActivityPlayer';
import { useWorkoutSession } from '../../lib/workoutSession';
import { useAppState } from '../../lib/appState';
import { dayLabel } from '../../lib/format';
import { setCurrentTab } from '../../lib/tabBarVisibility';
import { TAB_ACCENTS, TAB_BAR_HEIGHT } from '../../lib/theme';
import { useRenderCount } from '../../lib/perf';
import { useQuickLog } from '../../components/QuickLog';

const TAB_NAMES = ['index', 'workouts', 'nutrition', 'tracker'];

export default function TabsLayout() {
  useRenderCount('TabsLayout');
  const pathname = usePathname();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { status, endSession } = useWorkoutSession();

  const pathTab = pathname === '/' ? 'index' : pathname.replace(/^\//, '');
  // While a screen opens over the tabs (session complete, profile), the path isn't a tab: keep the last tab, so the
  // header behind it never loses its title for a moment.
  const lastTab = useRef('index');
  if (TAB_NAMES.includes(pathTab)) lastTab.current = pathTab;
  const routeName = lastTab.current;
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
      ? 'Today'
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

  // Swipe sideways to change tab: the page follows the finger, and past a third of the screen (or a quick flick) it
  // leaves and the next tab slides in; otherwise it springs back. At the first and last tab it only stretches a little.
  const reduced = useReducedMotion();
  const goTo = (name: string) => {
    markSlideBusy();
    router.navigate(name === 'index' ? '/' : (`/${name}` as never));
  };
  const swipe = Gesture.Pan()
    .enabled(!reduced)
    .activeOffsetX([-28, 28])
    .failOffsetY([-14, 14])
    .onUpdate((e) => {
      const t = e.translationX;
      const hasNext = neighbourTab(routeName, t < 0 ? 1 : -1) !== null;
      tabDragX.set(hasNext ? t : t * 0.22);
    })
    .onEnd((e) => {
      const t = e.translationX;
      const target = neighbourTab(routeName, t < 0 ? 1 : -1);
      const far = Math.abs(t) > SCREEN_W * 0.3 || (Math.abs(e.velocityX) > 650 && Math.abs(t) > 36);
      if (target && far && !isSlideBusy()) {
        tabDragX.set(
          withTiming(t < 0 ? -SCREEN_W : SCREEN_W, { duration: EXIT_MS, easing: SLIDE_EASE }, (finished) => {
            if (finished) scheduleOnRN(goTo, target);
          })
        );
      } else {
        tabDragX.set(withSpring(0, { duration: 320, dampingRatio: 1 }));
      }
    });

  // AppHeader and TabBar float over the scene now (see both components) so
  // their blur has real content behind it — Tabs fills the full screen and
  // each screen pads its own content by HEADER_CONTENT_HEIGHT/TAB_BAR_CONTENT_HEIGHT
  // + insets instead of this layout reserving that space.
  return (
    <View style={{ flex: 1, backgroundColor: '#050505' }}>
      <GestureDetector gesture={swipe}>
      <View style={{ flex: 1 }} collapsable={false}>
      <Tabs
        tabBar={(props) => <TabBar {...props} />}
        screenOptions={{ headerShown: false, sceneStyle: { backgroundColor: '#050505' }, freezeOnBlur: false }}
        screenLayout={({ children, route }) => <TabScene name={route.name}>{children}</TabScene>}
      >
        <Tabs.Screen name="index" />
        <Tabs.Screen name="workouts" />
        <Tabs.Screen name="nutrition" />
        <Tabs.Screen name="tracker" />
      </Tabs>
      </View>
      </GestureDetector>
      <AmbientLight tabColor={headerAccent} />
      <AppHeader
        accent={headerAccent}
        title={headerTitle}
        subtitle={routeName === 'index' ? dayLabel(now) : undefined}
        penDot={penDot}
        initial={(userName || 'M').charAt(0).toUpperCase()}
        onPenPress={() => router.push('/week-review')}
        onAvatarPress={() => router.push('/profile')}
      />
      <LiveWorkoutPlayer bottomOffset={tabBarHeight + 8} />
      <ActivityMiniBar bottomOffset={tabBarHeight + 8} />
    </View>
  );
}
