import React from 'react';
import { Image, StyleSheet, Text, View } from 'react-native';
import { BlurView } from 'expo-blur';
import Animated, { useAnimatedStyle } from 'react-native-reanimated';
import { headerProgress } from '../../lib/tabBarVisibility';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { COLORS, FONT, HEADER_CONTENT_HEIGHT, BG, bg } from '../../lib/theme';
import { Icon } from './Icon';
import { PressScale } from './PressScale';
import { Surface } from './Surface';

export interface AppHeaderProps {
  /** The tab's colour: logo tile and (on tabs other than Home) nothing else. */
  accent: string;
  title: string;
  /** Tabs with a large title in the page: the bar's own title fades in once that title has scrolled away. */
  collapsing?: boolean;
  /** Orange dot on the pen when the week review has something new. */
  penDot?: boolean;
  initial: string;
  onPenPress: () => void;
  onAvatarPress: () => void;
}

/**
 * Premium S1/S2/H1: the title bar. A logo tile in the tab's colour, the screen's name (the date on Home), the pen
 * (opens "Your week") and the avatar (opens Profile). No CLAWW word bar, no bell. It floats over the scene so the
 * blur has content behind it; screens pad their own top by HEADER_CONTENT_HEIGHT + insets.top.
 */
export function AppHeader({ accent, title, collapsing, penDot, initial, onPenPress, onAvatarPress }: AppHeaderProps) {
  const insets = useSafeAreaInsets();
  const titleStyle = useAnimatedStyle(() => ({ opacity: collapsing ? headerProgress.value : 1, transform: [{ translateY: collapsing ? (1 - headerProgress.value) * 6 : 0 }] }));
  return (
    <View style={{ position: 'absolute', top: 0, left: 0, right: 0, zIndex: 10 }}>
      {/* Glass, the bar version: the same smoked tint and light blur as the tab bar, a hairline instead of a border. */}
      <BlurView
        intensity={22}
        tint="dark"
        experimentalBlurMethod="dimezisBlurView"
        blurReductionFactor={3}
        style={{ paddingTop: insets.top, backgroundColor: 'rgba(8,8,10,0.80)', borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: 'rgba(255,255,255,0.10)' }}
      >
        <View style={{ height: HEADER_CONTENT_HEIGHT, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, flex: 1 }}>
            <View
              style={{
                width: 32,
                height: 32,
                borderRadius: 10,
                backgroundColor: accent,
                alignItems: 'center',
                justifyContent: 'center',
                borderWidth: 1,
                borderColor: 'rgba(255,255,255,0.22)',
                boxShadow: `0px 6px 14px -6px ${accent}CC`,
              } as object}
            >
              <Image source={require('../../assets/logo-mark.png')} style={{ width: 17, height: 17 }} resizeMode="contain" />
            </View>
            <Animated.Text style={[{ color: COLORS.fg, fontSize: 20, letterSpacing: -0.4, fontFamily: BG[800] }, titleStyle]} numberOfLines={1}>
              {title}
            </Animated.Text>
          </View>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
            <PressScale onPress={onPenPress} accessibilityRole="button" accessibilityLabel="Your week, marked up" hitSlop={4}>
              <Surface radius={12} padding={0} grain={0.06} shadow={false} style={{ width: 40, height: 40 }}>
                <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
                  <Icon name="pencil" size={17} color="#D4D4D8" />
                  {penDot ? <View style={{ position: 'absolute', top: 8, right: 8, width: 8, height: 8, borderRadius: 4, backgroundColor: '#FB923C' }} /> : null}
                </View>
              </Surface>
            </PressScale>
            <PressScale onPress={onAvatarPress} accessibilityRole="button" accessibilityLabel="Profile" hitSlop={4}>
              <View style={{ width: 40, height: 40, borderRadius: 13, overflow: 'hidden', backgroundColor: '#FF4500', alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: 'rgba(255,255,255,0.2)' }}>
                <View style={{ position: 'absolute', inset: 0, backgroundColor: '#F59E0B', opacity: 0.55, transform: [{ rotate: '35deg' }, { scale: 1.6 }], left: 18 } as object} />
                <Text style={{ color: '#fff', fontSize: 16, fontVariant: ['tabular-nums'], fontFamily: BG[800] }}>{initial}</Text>
              </View>
            </PressScale>
          </View>
        </View>
      </BlurView>
    </View>
  );
}
