import React, { useEffect, useRef } from 'react';
import { Pressable, Text, View, useWindowDimensions } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, { Easing, useAnimatedStyle, useSharedValue, withSequence, withTiming } from 'react-native-reanimated';
import type { BottomTabBarProps } from '@react-navigation/bottom-tabs';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { COLORS, FONT, TAB_ACCENTS, TAB_BAR_HEIGHT, BG, bg } from '../../lib/theme';
import { tick } from '../../lib/haptics';
import { Icon } from './Icon';
import { Glass } from './Glass';
import { useQuickLog } from '../QuickLog';

// The floating tab bar, second pass, modelled on how Apple's tab bars feel:
//  - the selection is a neutral pane (not a coloured glow), so nothing bleeds onto the tabs next to it;
//  - only the selected icon takes the tab's colour;
//  - the pane slides on the UI thread with one ease-out curve, no overshoot;
//  - every press answers at once: the icon dips to 90 % and a selection tick plays, before the screen changes.

const SLOTS = ['index', 'workouts', '__plus', 'nutrition', 'tracker'] as const;
const META: Record<string, { label: string; icon: string }> = {
  index: { label: 'Home', icon: 'home' },
  workouts: { label: 'Train', icon: 'dumbbell' },
  nutrition: { label: 'Food', icon: 'apple' },
  tracker: { label: 'Progress', icon: 'activity' },
};
const SIDE = 14;
const PAD = 5;
const SLIDE = { duration: 220, easing: Easing.bezier(0.23, 1, 0.32, 1) };

function TabButton({ label, icon, color, active, onPress }: { label: string; icon: string; color: string; active: boolean; onPress: () => void }) {
  const s = useSharedValue(1);
  const style = useAnimatedStyle(() => ({ transform: [{ scale: s.value }] }));
  return (
    <Pressable
      accessibilityRole="tab"
      accessibilityState={{ selected: active }}
      accessibilityLabel={label}
      onPressIn={() => {
        s.value = withTiming(0.9, { duration: 90 });
      }}
      onPressOut={() => {
        s.value = withTiming(1, { duration: 160, easing: Easing.out(Easing.quad) });
      }}
      onPress={onPress}
      style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}
    >
      <Animated.View style={[{ alignItems: 'center', gap: 2 }, style]}>
        <Icon name={icon} size={22} color={active ? color : '#8E8E96'} strokeWidth={active ? 2.2 : 1.9} />
        <Text style={{ fontSize: 11, lineHeight: 13, fontFamily: bg(active ? '700' : '600'), color: active ? COLORS.fg : '#8E8E96' }} numberOfLines={1}>
          {label}
        </Text>
      </Animated.View>
    </Pressable>
  );
}

export function TabBar({ state, navigation }: BottomTabBarProps) {
  const { width } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const { open: openQuickLog } = useQuickLog();
  const inner = width - SIDE * 2 - PAD * 2;
  const slotW = inner / SLOTS.length;
  const activeName = state.routes[state.index]?.name ?? 'index';
  const activeSlot = Math.max(0, SLOTS.indexOf(activeName as (typeof SLOTS)[number]));

  // The liquid part: while the pane travels it stretches a little along the way it moves and thins a touch, then
  // settles back to round. Small on purpose (at most 16 % longer), and it rides the same 260 ms curve as the slide.
  const x = useSharedValue(activeSlot * slotW);
  const stretch = useSharedValue(0);
  const lastSlot = useRef(activeSlot);
  useEffect(() => {
    const distance = Math.abs(activeSlot - lastSlot.current);
    lastSlot.current = activeSlot;
    // The pill glides to the new tab on the same curve as the page shift. The old stretch read as a bounce, so it's gone.
    x.value = withTiming(activeSlot * slotW, SLIDE);
    void distance;
  }, [activeSlot, slotW, x, stretch]);
  const pillStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: x.value }, { scaleX: 1 + stretch.value * 0.16 }, { scaleY: 1 - stretch.value * 0.06 }],
  }));

  const plusScale = useSharedValue(1);
  const plusStyle = useAnimatedStyle(() => ({ transform: [{ scale: plusScale.value }] }));
  const bottom = Math.max(insets.bottom, 10);

  return (
    <>
      {/* Content fades into the page colour before it reaches the bar. */}
      {/* A light fade only below the bar, so content still shows (blurred) through the glass above it. */}
      <LinearGradient pointerEvents="none" colors={['rgba(5,5,5,0)', 'rgba(5,5,5,0.55)']} style={{ position: 'absolute', left: 0, right: 0, bottom: 0, height: bottom + TAB_BAR_HEIGHT / 2 }} />
      <View pointerEvents="box-none" style={{ position: 'absolute', left: SIDE, right: SIDE, bottom, zIndex: 10 }}>
        <Glass radius={TAB_BAR_HEIGHT / 2} blur={50} tint="rgba(16,17,21,0.42)" style={{ height: TAB_BAR_HEIGHT }}>
          <View style={{ flex: 1, padding: PAD }}>
            <Animated.View
              pointerEvents="none"
              style={[
                {
                  position: 'absolute',
                  left: PAD + 3,
                  top: PAD,
                  bottom: PAD,
                  width: slotW - 6,
                  borderRadius: (TAB_BAR_HEIGHT - PAD * 2) / 2,
                  backgroundColor: 'rgba(255,255,255,0.09)',
                  borderWidth: 0.5,
                  borderColor: 'rgba(255,255,255,0.10)',
                },
                pillStyle,
              ]}
            >
              <LinearGradient
                colors={['rgba(255,255,255,0)', 'rgba(255,255,255,0.32)', 'rgba(255,255,255,0)']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={{ position: 'absolute', top: 0, left: 10, right: 10, height: 1 }}
              />
            </Animated.View>
            <View style={{ flex: 1, flexDirection: 'row' }}>
              {SLOTS.map((slot) => {
                if (slot === '__plus') {
                  return (
                    <View key={slot} style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
                      <Pressable
                        accessibilityRole="button"
                        accessibilityLabel="Quick log"
                        hitSlop={6}
                        onPressIn={() => {
                          plusScale.value = withTiming(0.9, { duration: 90 });
                        }}
                        onPressOut={() => {
                          plusScale.value = withTiming(1, { duration: 160 });
                        }}
                        onPress={() => {
                          tick();
                          openQuickLog();
                        }}
                      >
                        <Animated.View style={[{ width: 44, height: 44, borderRadius: 22, overflow: 'hidden' }, plusStyle]}>
                          <LinearGradient colors={['#FFFFFF', '#D9D9DE']} start={{ x: 0, y: 0 }} end={{ x: 0, y: 1 }} style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
                            <Icon name="plus" size={21} color="#09090B" strokeWidth={2.6} />
                          </LinearGradient>
                        </Animated.View>
                      </Pressable>
                    </View>
                  );
                }
                const meta = META[slot];
                const route = state.routes.find((r) => r.name === slot);
                if (!route) return <View key={slot} style={{ flex: 1 }} />;
                const isActive = slot === activeName;
                return (
                  <TabButton
                    key={slot}
                    label={meta.label}
                    icon={meta.icon}
                    color={TAB_ACCENTS[slot]?.accent ?? '#FFFFFF'}
                    active={isActive}
                    onPress={() => {
                      if (!isActive) tick();
                      navigation.navigate(route.name);
                    }}
                  />
                );
              })}
            </View>
          </View>
        </Glass>
      </View>
    </>
  );
}
