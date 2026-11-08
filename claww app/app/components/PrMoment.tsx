import React, { useEffect } from 'react';
import { Modal, Text, View } from 'react-native';
import * as Haptics from 'expo-haptics';
import Animated, { FadeIn, FadeInDown } from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';
import { Button } from './ui/Button';
import { COLORS, FONT, FONT_HAND } from '../lib/theme';

// Premium X6: when a session beats a best, one full-screen moment before the summary: the new number, big, with a
// handwritten line, a heavy haptic and a Share button. Shown once per session.

export interface PrMomentProps {
  visible: boolean;
  /** "Bench press" */
  name: string;
  /** "62.5 kg × 8 on 3 sets" */
  detail: string;
  /** The next target, "next: 65 kg", when the engine has one. */
  next?: string | null;
  onShare: () => void;
  onClose: () => void;
}

export function PrMoment({ visible, name, detail, next, onShare, onClose }: PrMomentProps) {
  useEffect(() => {
    if (visible) Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
  }, [visible]);

  return (
    <Modal visible={visible} animationType="fade" transparent statusBarTranslucent onRequestClose={onClose}>
      <View style={{ flex: 1, backgroundColor: '#050505', alignItems: 'center', justifyContent: 'center', padding: 24 }}>
        <LinearGradient pointerEvents="none" colors={['rgba(245,158,11,0.28)', 'rgba(245,158,11,0)']} style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 420 }} />
        <Animated.Text entering={FadeIn.duration(400)} style={{ color: '#FBBF24', fontSize: 13, fontWeight: '800', letterSpacing: 1.5, fontFamily: FONT }}>
          NEW BEST
        </Animated.Text>
        <Animated.Text entering={FadeInDown.delay(150).duration(450)} style={{ color: COLORS.fg, fontSize: 28, fontWeight: '800', marginTop: 12, textAlign: 'center', fontFamily: FONT }}>
          {name}
        </Animated.Text>
        <Animated.Text
          entering={FadeInDown.delay(300).duration(500)}
          style={{ color: COLORS.fg, fontSize: 44, lineHeight: 52, fontWeight: '900', letterSpacing: -1, marginTop: 8, textAlign: 'center', fontVariant: ['tabular-nums'], fontFamily: FONT }}
        >
          {detail}
        </Animated.Text>
        <Animated.Text
          entering={FadeIn.delay(700).duration(500)}
          style={{ color: COLORS.fg, fontSize: 30, marginTop: 14, fontFamily: FONT_HAND, fontWeight: '700', transform: [{ rotate: '-2deg' }], textShadowColor: 'rgba(255,255,255,0.4)', textShadowRadius: 14 }}
        >
          {next ? `up it goes. ${next}` : 'that one goes in the book'}
        </Animated.Text>
        <View style={{ position: 'absolute', left: 24, right: 24, bottom: 48, gap: 8 }}>
          <Button variant="primary" size="lg" fullWidth accent="#F59E0B" accentDeep="#B45309" onPress={onShare}>
            Share it
          </Button>
          <Button variant="ghost" size="lg" fullWidth onPress={onClose}>
            Continue
          </Button>
        </View>
      </View>
    </Modal>
  );
}
