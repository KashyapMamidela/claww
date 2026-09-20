import React, { useState } from 'react';
import { Text, TouchableOpacity, View } from 'react-native';
import { COLORS, FONT } from '../lib/theme';
import { requestNotificationPermission, scheduleDefaultReminders } from '../lib/notifications';
import { setNotificationPromptShown, setNotificationsEnabled } from '../lib/data';
import { Icon } from './ui/Icon';

export interface NotificationPromptCardProps {
  userId: string;
  onDismiss: () => void;
}

/**
 * SHIP PHASE 8.3 — the soft-ask, shown once after a user's first completed
 * workout (see workout-complete.tsx), before the real OS permission dialog.
 * "Not now" and "Enable" both permanently record that the prompt was shown
 * (notification_prompt_shown_at) so it never appears again — re-enabling
 * later is Settings' job, not a second ask here.
 */
export function NotificationPromptCard({ userId, onDismiss }: NotificationPromptCardProps) {
  const [loading, setLoading] = useState(false);

  const handleEnable = async () => {
    setLoading(true);
    const granted = await requestNotificationPermission();
    if (granted) {
      await scheduleDefaultReminders();
      await setNotificationsEnabled(userId, true);
    }
    await setNotificationPromptShown(userId);
    setLoading(false);
    onDismiss();
  };

  const handleDecline = async () => {
    await setNotificationPromptShown(userId);
    onDismiss();
  };

  return (
    <View
      style={{
        width: '100%',
        backgroundColor: '#151517',
        borderWidth: 1,
        borderColor: 'rgba(59,130,246,0.22)',
        borderRadius: 16,
        padding: 16,
        marginTop: 4,
        gap: 12,
      }}
    >
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
        <View
          style={{
            width: 34,
            height: 34,
            borderRadius: 9,
            backgroundColor: 'rgba(59,130,246,0.14)',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <Icon name="bell" size={17} color={COLORS.blue} />
        </View>
        <Text style={{ flex: 1, color: '#fff', fontSize: 13.5, fontWeight: '700', fontFamily: FONT }}>Stay on track</Text>
      </View>
      <Text style={{ color: '#A1A1AA', fontSize: 12.5, lineHeight: 18, fontFamily: FONT }}>
        Get a nudge to train, log meals, and log sleep — nothing else, and you can turn it off anytime in Settings.
      </Text>
      <View style={{ flexDirection: 'row', gap: 10 }}>
        <TouchableOpacity
          activeOpacity={0.8}
          onPress={handleDecline}
          disabled={loading}
          style={{ flex: 1, height: 42, borderRadius: 12, alignItems: 'center', justifyContent: 'center' }}
        >
          <Text style={{ color: '#71717A', fontSize: 13, fontWeight: '600', fontFamily: FONT }}>Not now</Text>
        </TouchableOpacity>
        <TouchableOpacity
          activeOpacity={0.8}
          onPress={handleEnable}
          disabled={loading}
          style={{
            flex: 1,
            height: 42,
            borderRadius: 12,
            backgroundColor: COLORS.blue,
            alignItems: 'center',
            justifyContent: 'center',
            opacity: loading ? 0.6 : 1,
          }}
        >
          <Text style={{ color: '#fff', fontSize: 13, fontWeight: '700', fontFamily: FONT }}>{loading ? 'Enabling…' : 'Enable'}</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}
