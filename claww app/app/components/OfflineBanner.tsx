import React from 'react';
import { Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { COLORS, FONT } from '../lib/theme';
import { useOfflineStatus } from '../lib/writeQueueRuntime';
import { Icon } from './ui/Icon';

// NG PHASE 14 (screen 19): where writes are queued, say so. Offline: everything you log is kept on the phone and sent
// when the connection returns. Online with items still waiting: they are being sent. Never blocks a touch.

export function OfflineBanner() {
  const { offline, pending } = useOfflineStatus();
  const insets = useSafeAreaInsets();
  if (!offline && pending === 0) return null;
  const text = offline
    ? pending > 0
      ? `Offline. ${pending} saved on this phone, they send when you are back.`
      : 'Offline. What you log is saved on this phone and sent when you are back.'
    : `Sending ${pending} saved ${pending === 1 ? 'item' : 'items'}.`;
  return (
    <View pointerEvents="none" style={{ position: 'absolute', top: insets.top + 6, left: 16, right: 16, alignItems: 'center' }} accessibilityLiveRegion="polite" accessibilityRole="alert">
      <View style={{ minHeight: 36, borderRadius: 18, paddingHorizontal: 14, paddingVertical: 8, flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: 'rgba(30,30,34,0.96)', borderWidth: 1, borderColor: COLORS.borderStrong }}>
        <Icon name={offline ? 'wifi-off' : 'refresh-cw'} size={14} color={COLORS.amber} />
        <Text style={{ color: COLORS.fg, fontSize: 13, fontWeight: '700', fontFamily: FONT, flexShrink: 1 }}>{text}</Text>
      </View>
    </View>
  );
}
