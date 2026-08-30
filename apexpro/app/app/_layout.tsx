import { Stack, useRouter } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { View } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { useFonts } from 'expo-font';
import * as SplashScreen from 'expo-splash-screen';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import type { Session } from '@supabase/supabase-js';
import { AppStateProvider } from '../lib/appState';
import { WorkoutSessionProvider } from '../lib/workoutSession';
import { supabase } from '../lib/supabase';
import { ensureProfileRow, isOnboardingComplete } from '../lib/auth';
import { SplashIntro } from '../components/SplashIntro';

SplashScreen.preventAutoHideAsync().catch(() => {});

type AuthState = 'loading' | 'auth' | 'onboarding' | 'app';

export default function RootLayout() {
  const router = useRouter();
  const [fontsLoaded] = useFonts({
    Inter: require('../assets/fonts/Inter-Variable.ttf'),
  });
  const [authState, setAuthState] = useState<AuthState>('loading');
  const [introDone, setIntroDone] = useState(false);

  const resolveSession = useCallback(async (session: Session | null) => {
    if (!session) {
      setAuthState('auth');
      return;
    }
    // A trigger normally creates this row on sign-up (see schema.sql); this
    // is a defensive no-op fallback in case that trigger isn't installed yet.
    await ensureProfileRow(session.user);
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
      <SafeAreaProvider>
        <AppStateProvider>
          <WorkoutSessionProvider>
            <Stack
              screenOptions={{
                headerShown: false,
                contentStyle: { backgroundColor: '#050505' },
              }}
            />
          </WorkoutSessionProvider>
        </AppStateProvider>
        {!introDone && (
          <View style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 }}>
            <SplashIntro onFinish={() => setIntroDone(true)} />
          </View>
        )}
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
