import React, { useCallback, useState } from 'react';
import { ScrollView, Switch, Text, TouchableOpacity, View } from 'react-native';
import { useRouter } from 'expo-router';
import { useFocusEffect } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { COLORS, FONT } from '../lib/theme';
import { useAppState } from '../lib/appState';
import { signOut } from '../lib/auth';
import { getGenerationUsageToday, getProfile, setNotificationsEnabled } from '../lib/data';
import { GENERATION_CAPS } from '../lib/generationCaps';
import { cancelAllReminders, notificationsSupported, requestNotificationPermission, scheduleDefaultReminders } from '../lib/notifications';
import { Icon } from '../components/ui/Icon';
import { Badge } from '../components/ui/Badge';

const P = '#A1A1AA';

// SHIP PHASE 8.2 — a real Settings screen, scoped to what's actually real
// today: live generation-cap usage (read-only), the SHIP PHASE 8.3
// notification toggle, and sign-out. Units (metric/imperial) still need a
// display-layer conversion audited across every screen that renders
// kg/cm — deliberately left out rather than shipped as a decorative stub.
export default function SettingsScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { userId } = useAppState();
  const [usage, setUsage] = useState<{ plan: number; meal: number } | null>(null);
  const [notificationsOn, setNotificationsOn] = useState(false);
  const [notificationsBusy, setNotificationsBusy] = useState(false);
  const [permissionDenied, setPermissionDenied] = useState(false);

  useFocusEffect(
    useCallback(() => {
      if (!userId) return;
      let cancelled = false;
      Promise.all([getGenerationUsageToday(userId), getProfile(userId)]).then(([u, profile]) => {
        if (cancelled) return;
        setUsage(u);
        setNotificationsOn(profile?.notifications_enabled ?? false);
      });
      return () => {
        cancelled = true;
      };
    }, [userId])
  );

  const handleToggleNotifications = async (next: boolean) => {
    if (!userId || notificationsBusy) return;
    setNotificationsBusy(true);
    setPermissionDenied(false);
    if (next) {
      const granted = await requestNotificationPermission();
      if (!granted) {
        setPermissionDenied(true);
        setNotificationsBusy(false);
        return;
      }
      await scheduleDefaultReminders();
      await setNotificationsEnabled(userId, true);
      setNotificationsOn(true);
    } else {
      await cancelAllReminders();
      await setNotificationsEnabled(userId, false);
      setNotificationsOn(false);
    }
    setNotificationsBusy(false);
  };

  const rows = [
    { label: 'Workout plan generations', used: usage?.plan ?? 0, cap: GENERATION_CAPS.plan },
    { label: 'Meal estimations', used: usage?.meal ?? 0, cap: GENERATION_CAPS.meal },
  ];

  return (
    <ScrollView style={{ flex: 1, backgroundColor: '#050505' }} showsVerticalScrollIndicator={false}>
      <View style={{ paddingHorizontal: 16, paddingTop: insets.top + 8, paddingBottom: 32, gap: 14 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, paddingTop: 2 }}>
          <TouchableOpacity
            activeOpacity={0.8}
            onPress={() => router.back()}
            style={{
              width: 34,
              height: 34,
              borderRadius: 9,
              backgroundColor: '#151517',
              borderWidth: 1,
              borderColor: 'rgba(255,255,255,0.08)',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <Icon name="chevron-left" size={16} color="#A1A1AA" />
          </TouchableOpacity>
          <Badge color={P}>SETTINGS</Badge>
        </View>

        <View style={{ backgroundColor: '#151517', borderWidth: 1, borderColor: 'rgba(255,255,255,0.08)', borderRadius: 16, paddingHorizontal: 16, paddingVertical: 14 }}>
          <Text style={{ color: '#fff', fontSize: 13, fontWeight: '700', fontFamily: FONT, marginBottom: 4 }}>Today's generation usage</Text>
          <Text style={{ color: '#71717A', fontSize: 11, fontFamily: FONT, marginBottom: 14 }}>
            Resets at midnight. Hitting a limit means try again tomorrow.
          </Text>
          {rows.map((r, i) => (
            <View key={r.label} style={{ marginTop: i > 0 ? 14 : 0 }}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 6 }}>
                <Text style={{ color: '#A1A1AA', fontSize: 12, fontFamily: FONT }}>{r.label}</Text>
                <Text style={{ color: r.used >= r.cap ? COLORS.danger : '#fff', fontSize: 12, fontWeight: '700', fontFamily: FONT }}>
                  {r.used} / {r.cap}
                </Text>
              </View>
              <View style={{ height: 5, backgroundColor: 'rgba(255,255,255,0.07)', borderRadius: 100, overflow: 'hidden' }}>
                <View
                  style={{
                    height: '100%',
                    width: `${Math.min(100, (r.used / r.cap) * 100)}%`,
                    backgroundColor: r.used >= r.cap ? COLORS.danger : COLORS.blue,
                    borderRadius: 100,
                  }}
                />
              </View>
            </View>
          ))}
        </View>

        {notificationsSupported ? (
          <View style={{ backgroundColor: '#151517', borderWidth: 1, borderColor: 'rgba(255,255,255,0.08)', borderRadius: 16, paddingHorizontal: 16, paddingVertical: 14 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
              <View style={{ width: 32, height: 32, borderRadius: 8, backgroundColor: 'rgba(59,130,246,0.14)', alignItems: 'center', justifyContent: 'center' }}>
                <Icon name="bell" size={16} color={COLORS.blue} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={{ color: '#fff', fontSize: 13, fontWeight: '600', fontFamily: FONT }}>Reminders</Text>
                <Text style={{ color: '#71717A', fontSize: 10.5, marginTop: 1, fontFamily: FONT }}>Workout, meal, and sleep nudges</Text>
              </View>
              <Switch value={notificationsOn} onValueChange={handleToggleNotifications} disabled={notificationsBusy} />
            </View>
            {permissionDenied ? (
              <Text style={{ color: COLORS.danger, fontSize: 11, marginTop: 10, fontFamily: FONT }}>
                Notifications are blocked for CLAWW in your device settings — enable them there first.
              </Text>
            ) : null}
          </View>
        ) : null}

        <View style={{ backgroundColor: '#151517', borderWidth: 1, borderColor: 'rgba(255,255,255,0.08)', borderRadius: 16, overflow: 'hidden' }}>
          <TouchableOpacity
            activeOpacity={0.8}
            onPress={signOut}
            style={{ flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 13, gap: 12 }}
          >
            <View style={{ width: 32, height: 32, borderRadius: 8, backgroundColor: 'rgba(239,68,68,0.1)', alignItems: 'center', justifyContent: 'center' }}>
              <Icon name="log-out" size={16} color="#EF4444" />
            </View>
            <Text style={{ flex: 1, color: '#EF4444', fontSize: 13, fontWeight: '500', fontFamily: FONT }}>Sign Out</Text>
          </TouchableOpacity>
        </View>
      </View>
    </ScrollView>
  );
}
