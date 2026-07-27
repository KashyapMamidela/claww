import { Stack, useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { AppStateProvider } from '../lib/appState';

export default function RootLayout() {
  const router = useRouter();
  const [authState, setAuthState] = useState<'loading' | 'auth' | 'onboarding' | 'app'>('loading');

  useEffect(() => {
    // For now: Show auth screen (welcome)
    setAuthState('auth');

    // TODO: Replace with Supabase auth check later
    // const checkAuth = async () => {
    //   const session = await supabase.auth.getSession();
    //   if (!session?.session) {
    //     setAuthState('auth');
    //   } else {
    //     // Check if user completed onboarding
    //     setAuthState('onboarding');
    //     // Or if completed:
    //     setAuthState('app');
    //   }
    // };
    // checkAuth();
  }, []);

  useEffect(() => {
    if (authState === 'auth') {
      router.replace('/screens/auth/welcome');
    } else if (authState === 'onboarding') {
      router.replace('/screens/onboarding/name');
    } else if (authState === 'app') {
      router.replace('/(tabs)');
    }
  }, [authState]);

  return (
    <SafeAreaProvider>
      <AppStateProvider>
        <Stack
          screenOptions={{
            headerShown: false,
            contentStyle: { backgroundColor: '#050505' },
          }}
        />
      </AppStateProvider>
    </SafeAreaProvider>
  );
}
