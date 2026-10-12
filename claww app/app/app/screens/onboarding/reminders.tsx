import React, { useState } from 'react';
import { Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { COLORS, FONT } from '../../../lib/theme';
import { Button } from '../../../components/ui/Button';
import { Icon } from '../../../components/ui/Icon';
import { useAppState } from '../../../lib/appState';
import { setNotificationPromptShown, setNotificationsEnabled } from '../../../lib/data';
import { requestNotificationPermission } from '../../../lib/notifications';
import { refreshReminders } from '../../../lib/reminderSync';

/**
 * V2 PHASE 3.2 — the reminder soft-ask, moved to the end of onboarding with
 * a clear reason, instead of only after a first finished workout (which most
 * users never reached). Turning them on records that the prompt was shown;
 * "Not now" deliberately doesn't, so the post-first-workout card still asks
 * once — only users who skipped here ever see that second ask.
 */
export default function OnboardingReminders() {
  const router = useRouter();
  const { userId } = useAppState();
  const [busy, setBusy] = useState(false);

  const finish = () => router.replace('/(tabs)');

  const handleEnable = async () => {
    if (busy) return;
    setBusy(true);
    const granted = await requestNotificationPermission().catch(() => false);
    if (userId) {
      await setNotificationPromptShown(userId);
      if (granted) {
        await setNotificationsEnabled(userId, true);
        await refreshReminders(userId).catch(() => {});
      }
    }
    finish();
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#050505' }}>
      <View style={{ flex: 1, paddingHorizontal: 24, paddingBottom: 30, justifyContent: 'center', gap: 18 }}>
        <View style={{ width: 64, height: 64, borderRadius: 18, backgroundColor: 'rgba(59,130,246,0.14)', alignItems: 'center', justifyContent: 'center' }}>
          <Icon name="bell" size={28} color={COLORS.blue} />
        </View>
        <Text style={{ color: '#fff', fontSize: 28, fontWeight: '900', letterSpacing: -0.6, lineHeight: 32, fontFamily: FONT }}>Want a nudge?</Text>
        <Text style={{ color: '#A1A1AA', fontSize: 14, lineHeight: 21, fontFamily: FONT }}>
          A reminder before you train, and one if a meal or last night's sleep isn't logged yet. Never more than 2 a day, and you can change or turn
          them off anytime in Settings.
        </Text>
        <View style={{ gap: 10, marginTop: 8 }}>
          <Button variant="primary" accent={COLORS.blue} accentDeep={COLORS.blueDeep} size="lg" fullWidth onPress={handleEnable} disabled={busy}>
            {busy ? 'Turning on…' : 'Turn on reminders'}
          </Button>
          <Button variant="ghost" size="lg" fullWidth onPress={finish} disabled={busy}>
            Not now
          </Button>
        </View>
      </View>
    </SafeAreaView>
  );
}
