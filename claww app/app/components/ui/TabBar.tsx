import React, { useEffect } from 'react';
import { Pressable, Text, View, useWindowDimensions } from 'react-native';
import { Glass } from './Glass';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, { Easing, useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';
import type { BottomTabBarProps } from '@react-navigation/bottom-tabs';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { COLORS, FONT, TAB_ACCENTS, TAB_BAR_HEIGHT } from '../../lib/theme';
import { tick } from '../../lib/haptics';
import { Icon } from './Icon';
import { useQuickLog } from '../QuickLog';

// Premium S5: a floating capsule, 12 pt in from the sides, frosted, with a pill that slides under the active
// tab (in that tab's colour) and a centre + that opens Quick log. The More tab is gone from the bar: the
// avatar in the title bar opens Profile.

const SLOTS = ['index', 'workouts', '__plus', 'nutrition', 'tracker'] as const;
const META: Record<string, { label: string; icon: string }> = {
  index: { label: 'Home', icon: 'home' },
  workouts: { label: 'Train', icon: 'dumbbell' },
  nutrition: { label: 'Food', icon: 'apple' },
  tracker: { label: 'Progress', icon: 'activity' },
};
const SIDE = 12;
const PAD = 6;

export function TabBar({ state, navigation }: BottomTabBarProps) {
  const { width } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const { open: openQuickLog } = useQuickLog();
  const inner = width - SIDE * 2 - PAD * 2;
  const slotW = inner / SLOTS.length;
  const activeName = state.routes[state.index]?.name ?? 'index';
  const activeSlot = Math.max(0, SLOTS.indexOf(activeName as (typeof SLOTS)[number]));
  const accent = TAB_ACCENTS[activeName]?.accent ?? '#FFFFFF';

  const x = useSharedValue(activeSlot * slotW);
  useEffect(() => {
    x.value = withTiming(activeSlot * slotW, { duration: 300, easing: Easing.bezier(0.22, 1, 0.36, 1) });
  }, [activeSlot, slotW, x]);
  const pillStyle = useAnimatedStyle(() => ({ transform: [{ translateX: x.value }] }));

  return (
    <>
      {/* A fade under the bar: content scrolls away into the page colour instead of colliding with the bar. */}
      <LinearGradient pointerEvents="none" colors={['rgba(5,5,5,0)', 'rgba(5,5,5,0.92)']} style={{ position: 'absolute', left: 0, right: 0, bottom: 0, height: Math.max(insets.bottom, 12) + TAB_BAR_HEIGHT + 34 }} />
      <View pointerEvents="box-none" style={{ position: 'absolute', left: SIDE, right: SIDE, bottom: Math.max(insets.bottom, 12), zIndex: 10 }}>
        <Glass radius={TAB_BAR_HEIGHT / 2} style={{ height: TAB_BAR_HEIGHT }}>
          <View style={{ flex: 1, padding: PAD }}>
          <Animated.View
            pointerEvents="none"
            style={[
              {
                position: 'absolute',
                left: PAD + 4,
                top: PAD,
                bottom: PAD,
                width: slotW - 8,
                borderRadius: 24,
                backgroundColor: `${accent}26`,
                borderWidth: 1,
                borderColor: `${accent}59`,
              },
              pillStyle,
            ]}
          />
          <View style={{ flex: 1, flexDirection: 'row' }}>
            {SLOTS.map((slot) => {
              if (slot === '__plus') {
                return (
                  <View key={slot} style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
                    <Pressable
                      accessibilityRole="button"
                      accessibilityLabel="Quick log"
                      hitSlop={6}
                      onPress={() => {
                        tick();
                        openQuickLog();
                      }}
                      style={({ pressed }) => ({ opacity: pressed ? 0.8 : 1, transform: [{ scale: pressed ? 0.95 : 1 }] })}
                    >
                      <LinearGradient
                        colors={['#F4F4F5', '#D4D4D8']}
                        start={{ x: 0, y: 0 }}
                        end={{ x: 1, y: 1 }}
                        style={{ width: 46, height: 46, borderRadius: 23, alignItems: 'center', justifyContent: 'center' }}
                      >
                        <Icon name="plus" size={22} color="#09090B" strokeWidth={2.6} />
                      </LinearGradient>
                    </Pressable>
                  </View>
                );
              }
              const meta = META[slot];
              const route = state.routes.find((r) => r.name === slot);
              if (!route) return <View key={slot} style={{ flex: 1 }} />;
              const isActive = slot === activeName;
              const tabAccent = TAB_ACCENTS[slot]?.accent ?? '#FFFFFF';
              return (
                <Pressable
                  key={slot}
                  accessibilityRole="tab"
                  accessibilityState={{ selected: isActive }}
                  accessibilityLabel={meta.label}
                  onPress={() => {
                    if (!isActive) tick();
                    navigation.navigate(route.name);
                  }}
                  style={{ flex: 1, alignItems: 'center', justifyContent: 'center', gap: 3 }}
                >
                  <Icon name={meta.icon} size={22} color={isActive ? tabAccent : '#8A8A93'} strokeWidth={isActive ? 2.2 : 1.8} />
                  <Text style={{ fontSize: 11, lineHeight: 13, fontFamily: FONT, fontWeight: '700', color: isActive ? COLORS.fg : '#8A8A93' }} numberOfLines={1}>
                    {meta.label}
                  </Text>
                </Pressable>
              );
            })}
          </View>
          </View>
        </Glass>
      </View>
    </>
  );
}