import React, { useEffect } from 'react';
import { Pressable, Text, View, useWindowDimensions } from 'react-native';
import { BlurView } from 'expo-blur';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, { useAnimatedStyle, useSharedValue, withSpring } from 'react-native-reanimated';
import type { BottomTabBarProps } from '@react-navigation/bottom-tabs';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { COLORS, FONT, TAB_ACCENTS, TAB_BAR_HEIGHT } from '../../lib/theme';
import { tick } from '../../lib/haptics';
import { barHidden } from '../../lib/tabBarVisibility';
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
    x.value = withSpring(activeSlot * slotW, { damping: 18, stiffness: 220 });
  }, [activeSlot, slotW, x]);
  const pillStyle = useAnimatedStyle(() => ({ transform: [{ translateX: x.value }] }));
  const hideStyle = useAnimatedStyle(() => ({ transform: [{ translateY: barHidden.value * (TAB_BAR_HEIGHT + 40) }], opacity: 1 - barHidden.value * 0.6 }));

  return (
    <Animated.View pointerEvents="box-none" style={[{ position: 'absolute', left: SIDE, right: SIDE, bottom: Math.max(insets.bottom, 12), zIndex: 10 }, hideStyle]}>
      <View
        style={{
          height: TAB_BAR_HEIGHT,
          borderRadius: 26,
          overflow: 'hidden',
          borderWidth: 1,
          borderColor: 'rgba(255,255,255,0.10)',
          boxShadow: '0px 18px 30px -12px rgba(0,0,0,0.9)',
        } as object}
      >
        <BlurView intensity={50} tint="dark" style={{ flex: 1, backgroundColor: 'rgba(18,18,21,0.94)', padding: PAD }}>
          <LinearGradient colors={['rgba(255,255,255,0.09)', 'rgba(255,255,255,0)']} style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 1 }} />
          <Animated.View
            pointerEvents="none"
            style={[
              {
                position: 'absolute',
                left: PAD + 4,
                top: PAD,
                bottom: PAD,
                width: slotW - 8,
                borderRadius: 18,
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
                        style={{ width: 48, height: 48, borderRadius: 16, alignItems: 'center', justifyContent: 'center' }}
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
        </BlurView>
      </View>
    </Animated.View>
  );
}