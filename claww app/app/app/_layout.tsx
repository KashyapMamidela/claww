import { Stack, useRouter } from 'expo-router';
import { BG } from '../lib/theme';
import { BricolageGrotesque_400Regular, BricolageGrotesque_500Medium, BricolageGrotesque_600SemiBold, BricolageGrotesque_700Bold, BricolageGrotesque_800ExtraBold } from '@expo-google-fonts/bricolage-grotesque';
import Animated, { FadeOut } from 'react-native-reanimated';
import * as Sentry from '@sentry/react-native';
import { useCallback, useEffect, useState } from 'react';
import { Platform, View, StatusBar } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { useFonts } from 'expo-font';
import * as SplashScreen from 'expo-splash-screen';
import * as Notifications from 'expo-notifications';
import * as WebBrowser from 'expo-web-browser';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import type { Session } from '@supabase/supabase-js';
import { AppStateProvider } from '../lib/appState';
import { OfflineBanner } from '../components/OfflineBanner';
import { MomentHost } from '../components/moments/MomentHost';
import { ToastProvider } from '../components/ui/Toast';
import { QuickLogProvider } from '../components/QuickLog';
import { WorkoutSessionProvider } from '../lib/workoutSession';
import { ActivitySessionProvider } from '../lib/activitySession';
import { supabase } from '../lib/supabase';
import { ensureProfileRow, isOnboardingComplete } from '../lib/auth';
import { notificationsSupported, type ReminderType } from '../lib/notifications';
import { refreshReminders } from '../lib/reminderSync';
import { isLockAction, runLockAction } from '../lib/lockActionRunner';
import { SplashIntro } from '../components/SplashIntro';
import { initSentry } from '../lib/sentry';
import { initAnalytics, identify, resetAnalytics } from '../lib/analytics';
import { ensureSkiaWebLoaded } from '../lib/skiaWeb';

initSentry();
initAnalytics();
// Kicks off the web CanvasKit load as early as possible; ProgressRing
// itself awaits the same cached promise before mounting its <Canvas>, so
// this is just a head start, not the only place it's requested.
ensureSkiaWebLoaded();

// SHIP PHASE 8.3 — where a tapped reminder actually takes the user. Kept
// next to the notification scheduling itself only because both files agree
// on the same `data.type` contract; nothing about routing belongs in
// lib/notifications.ts.
const REMINDER_ROUTES: Record<ReminderType, string> = {
  workout: '/(tabs)/workouts',
  meal: '/meal-log',
  sleep: '/(tabs)',
  water: '/(tabs)/nutrition',
  catchup: '/catch-up',
  review: '/week-review',
};

SplashScreen.preventAutoHideAsync().catch(() => {});
// Required by expo-web-browser for signInWithGoogle's openAuthSessionAsync
// to resolve correctly when the auth session closes/redirects (matters most
// on web, where it dismisses the popup) — must run once at module scope.
WebBrowser.maybeCompleteAuthSession();

type AuthState = 'loading' | 'auth' | 'onboarding' | 'app';

export default Sentry.wrap(RootLayout);

function RootLayout() {
  const router = useRouter();
  // Native (iOS/Android) gets "Inter" as static per-weight files embedded
  // by the expo-font config plugin (see app.json) — already available at
  // boot, no JS-side loading needed, and critically avoids this hook
  // re-registering a single-weight "Inter" face that would shadow the
  // native weight-mapped family. Only web (no config-plugin embedding)
  // still needs it loaded here.
  // Premium X4: Bricolage Grotesque is the app's typeface. Each weight is its own family (BG in lib/theme.ts), loaded
  // here at start, because a font loaded from JS does not respond to fontWeight on Android.
  const [fontsLoaded] = useFonts({
    ...(Platform.OS === 'web' ? { Inter: require('../assets/fonts/Inter_400Regular.ttf'), Caveat: require('../assets/fonts/Caveat_500Medium.ttf') } : {}),
    [BG[400]]: BricolageGrotesque_400Regular,
    [BG[500]]: BricolageGrotesque_500Medium,
    [BG[600]]: BricolageGrotesque_600SemiBold,
    [BG[700]]: BricolageGrotesque_700Bold,
    [BG[800]]: BricolageGrotesque_800ExtraBold,
  });
  const [authState, setAuthState] = useState<AuthState>('loading');
  const [introDone, setIntroDone] = useState(false);

  const resolveSession = useCallback(async (session: Session | null) => {
    if (!session) {
      resetAnalytics();
      setAuthState('auth');
      return;
    }
    identify(session.user.id);
    // A trigger normally creates this row on sign-up (see schema.sql); this
    // is a defensive no-op fallback in case that trigger isn't installed yet.
    await ensureProfileRow(session.user);
    // Put reminders back on every start (V2 PHASE 3.1) — fire-and-forget,
    // never blocks getting into the app.
    refreshReminders(session.user.id).catch(() => {});
    const complete = await isOnboardingComplete(session.user.id);
    setAuthState(complete ? 'app' : 'onboarding');
  }, []);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => resolveSession(data.session));

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      resolveSession(session);
    });

    return () => subscription.unsubscribe();
  }, [resolveSession]);

  useEffect(() => {
    if (!notificationsSupported) return;
    // Polish step 5: the buttons on meal, water and sleep reminders log without opening the app.
    const openNutrition = (slot: string) => router.push({ pathname: '/(tabs)/nutrition', params: { search: slot } } as never);
    const handle = (response: Notifications.NotificationResponse) => {
      if (isLockAction(response.actionIdentifier)) {
        runLockAction(response, openNutrition).catch(() => {});
        return true;
      }
      return false;
    };
    // A button pressed while the app was closed is delivered as the last response when it starts.
    Notifications.getLastNotificationResponseAsync()
      .then((last) => {
        if (last) handle(last);
      })
      .catch(() => {});
    const subscription = Notifications.addNotificationResponseReceivedListener((response) => {
      if (handle(response)) return;
      const type = response.notification.request.content.data?.type as ReminderType | undefined;
      const route = type ? REMINDER_ROUTES[type] : undefined;
      if (route) router.push(route as never);
    });
    return () => subscription.remove();
  }, [router]);

  useEffect(() => {
    if (authState === 'auth') {
      router.replace('/screens/auth/welcome');
    } else if (authState === 'onboarding') {
      router.replace('/screens/onboarding/name');
    } else if (authState === 'app') {
      router.replace('/(tabs)');
    }
  }, [authState]);

  const ready = fontsLoaded && authState !== 'loading';

  useEffect(() => {
    if (ready) {
      SplashScreen.hideAsync().catch(() => {});
    }
  }, [ready]);

  if (!ready) {
    return null;
  }

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      {/* Premium D14: light status bar icons over the dark app, drawn edge to edge. */}
      <StatusBar barStyle="light-content" backgroundColor="transparent" translucent />
      <SafeAreaProvider>
        <AppStateProvider>
          <WorkoutSessionProvider>
            <ActivitySessionProvider>
              <ToastProvider>
                <QuickLogProvider>
                  <Stack
                    screenOptions={{
                      headerShown: false,
                      contentStyle: { backgroundColor: '#050505' },
                    }}
                  />
                </QuickLogProvider>
              </ToastProvider>
            </ActivitySessionProvider>
          </WorkoutSessionProvider>
          <OfflineBanner />
          <MomentHost />
        </AppStateProvider>
        {!introDone && (
          // Premium D15: the splash fades into Home instead of cutting.
          <Animated.View exiting={FadeOut.duration(500)} style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 }}>
            <SplashIntro onFinish={() => setIntroDone(true)} />
          </Animated.View>
        )}
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
