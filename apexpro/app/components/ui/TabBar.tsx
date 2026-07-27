import React, { useEffect, useRef } from 'react';
import { Animated, Text, TouchableOpacity, View, useWindowDimensions } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import type { BottomTabBarProps } from '@react-navigation/bottom-tabs';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { FONT, TAB_ACCENTS } from '../../lib/theme';
import { Icon } from './Icon';

const TAB_META: Record<string, { label: string; icon: string }> = {
  index: { label: 'Home', icon: 'home' },
  workouts: { label: 'Workouts', icon: 'dumbbell' },
  nutrition: { label: 'Nutrition', icon: 'apple' },
  tracker: { label: 'CLAWW Tracker', icon: 'activity' },
  more: { label: 'More', icon: 'layout-grid' },
};

/** 5-tab bottom nav with a sliding accent-gradient indicator (design BottomNav port). */
export function TabBar({ state, navigation }: BottomTabBarProps) {
  const { width } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const tabCount = state.routes.length;
  const tabWidth = width / tabCount;
  const indicatorX = useRef(new Animated.Value(state.index * tabWidth)).current;

  useEffect(() => {
    Animated.spring(indicatorX, {
      toValue: state.index * tabWidth,
      useNativeDriver: true,
      speed: 18,
      bounciness: 7,
    }).start();
  }, [state.index, tabWidth]);

  const activeRoute = state.routes[state.index]?.name ?? 'index';
  const activeAccent = TAB_ACCENTS[activeRoute]?.accent ?? '#FFFFFF';

  return (
    <View
      style={{
        backgroundColor: '#0F0F10',
        borderTopWidth: 1,
        borderTopColor: 'rgba(255,255,255,0.08)',
        paddingTop: 6,
        paddingBottom: Math.max(insets.bottom, 20),
      }}
    >
      <Animated.View
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          width: tabWidth,
          height: 2,
          transform: [{ translateX: indicatorX }],
        }}
      >
        <LinearGradient
          colors={[`${activeAccent}00`, activeAccent, `${activeAccent}00`]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={{
            flex: 1,
            shadowColor: activeAccent,
            shadowOffset: { width: 0, height: 0 },
            shadowOpacity: 0.5,
            shadowRadius: 5,
          }}
        />
      </Animated.View>
      <View style={{ flexDirection: 'row' }}>
        {state.routes.map((route, idx) => {
          const isActive = idx === state.index;
          const meta = TAB_META[route.name] ?? { label: route.name, icon: 'circle' };
          const accent = TAB_ACCENTS[route.name]?.accent ?? '#FFFFFF';
          return (
            <TouchableOpacity
              key={route.key}
              activeOpacity={0.7}
              onPress={() => navigation.navigate(route.name)}
              style={{ flex: 1, alignItems: 'center', gap: 4, paddingTop: 8 }}
            >
              <View style={{ width: 28, height: 28, alignItems: 'center', justifyContent: 'center' }}>
                <Icon name={meta.icon} size={20} color={isActive ? accent : '#71717A'} strokeWidth={isActive ? 2.2 : 1.6} />
              </View>
              <Text
                style={{
                  fontSize: 9.5,
                  fontFamily: FONT,
                  fontWeight: isActive ? '700' : '400',
                  color: isActive ? accent : '#71717A',
                }}
                numberOfLines={1}
              >
                {meta.label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );
}
