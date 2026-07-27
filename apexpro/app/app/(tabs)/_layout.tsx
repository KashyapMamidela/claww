import React from 'react';
import { View } from 'react-native';
import { Tabs, usePathname, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { AppHeader } from '../../components/ui/AppHeader';
import { TabBar } from '../../components/ui/TabBar';
import { TAB_ACCENTS } from '../../lib/theme';

export default function TabsLayout() {
  const pathname = usePathname();
  const router = useRouter();
  const insets = useSafeAreaInsets();

  const routeName = pathname === '/' ? 'index' : pathname.replace(/^\//, '');
  const wordmarkAccent = TAB_ACCENTS[routeName]?.wordmark ?? '#A1A1AA';

  return (
    <View style={{ flex: 1, backgroundColor: '#050505', paddingTop: insets.top }}>
      <AppHeader wordmarkAccent={wordmarkAccent} onBellPress={() => router.navigate('/(tabs)/more')} />
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
    </View>
  );
}
