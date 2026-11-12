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
  /** A small line under the title, e.g. Home's date. */
  subtitle?: string;
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
export function AppHeader({ accent, title, subtitle, collapsing, penDot, initial, onPenPress, onAvatarPress }: AppHeaderProps) {
  const insets = useSafeAreaInsets();
  const titleStyle = useAnimatedStyle(() => ({ opacity: collapsing ? headerProgress.value : 1, transform: [{ translateY: collapsing ? (1 - headerProgress.value) * 6 : 0 }] }));
  return (
    <View style={{ position: 'absolute', top: 0, left: 0, right: 0, zIndex: 10 }}>
      {/* Glass, the bar version: the same smoked tint and light blur as the tab bar, a hairline instead of a border. */}
      <BlurView
        intensity={50}
        tint="dark"
        experimentalBlurMethod="dimezisBlurView"
        blurReductionFactor={3}
        // Real glass: a light tint so content scrolling underneath frosts instead of disappearing.
        style={{ paddingTop: insets.top, backgroundColor: 'rgba(8,8,10,0.45)', borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: 'rgba(255,255,255,0.10)' }}
      >
        <View style={{ height: HEADER_CONTENT_HEIGHT, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16 }}>
          {/* The tab's name is the title, with an optional small line under it (Home's date). The logo tile that sat
              beside it is gone: it repeated the app icon on every screen and added a sixth colour to the header. */}
          <View style={{ flex: 1 }}>
            <Animated.Text style={[{ color: COLORS.fg, fontSize: subtitle ? 22 : 24, letterSpacing: -0.5, fontFamily: BG[800] }, titleStyle]} numberOfLines={1}>
              {title}
            </Animated.Text>
            {subtitle ? <Text style={{ color: COLORS.textMuted, fontSize: 13, marginTop: -1, fontFamily: BG[600] }} numberOfLines={1}>{subtitle}</Text> : null}
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
              {/* A calm round avatar: the orange gradient square was the loudest thing on every screen. */}
              <View style={{ width: 40, height: 40, borderRadius: 20, backgroundColor: 'rgba(255,255,255,0.10)', alignItems: 'center', justifyContent: 'center', borderWidth: StyleSheet.hairlineWidth, borderColor: 'rgba(255,255,255,0.22)' }}>
                <Text style={{ color: COLORS.fg, fontSize: 16, fontFamily: BG[800] }}>{initial}</Text>
              </View>
            </PressScale>
          </View>
        </View>
      </BlurView>
    </View>
  );
}
