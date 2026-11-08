import React, { useCallback, useState } from 'react';
import { BackTile } from '../components/ui/BackTile';
import { Surface } from '../components/ui/Surface';
import { ScrollView, Switch, Text, TouchableOpacity, View } from 'react-native';
import { useRouter } from 'expo-router';
import { useFocusEffect } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { COLORS, FONT } from '../lib/theme';
import { useAppState } from '../lib/appState';
import { signOut } from '../lib/auth';
import { getGenerationUsageToday, getProfile, saveReminderSettings, saveScanTraining, setNotificationsEnabled } from '../lib/data';
import { GENERATION_CAPS } from '../lib/generationCaps';
import { cancelAllReminders, notificationsSupported, requestNotificationPermission, scheduleTestReminder } from '../lib/notifications';
import { SHOW_DEV_TOOLS } from '../lib/devTools';
import { getPerfReport, PERF_ENABLED, resetPerfReport, type PerfReport } from '../lib/perf';
import { refreshReminders } from '../lib/reminderSync';
import { DEFAULT_REMINDER_SETTINGS, normalizeReminderSettings, type ReminderSettings } from '../lib/reminderPlan';
import { ReminderSettingsCard } from '../components/ReminderSettingsCard';
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
  const [scanTraining, setScanTrainingOn] = useState(false);
  const [permissionDenied, setPermissionDenied] = useState(false);
  const [testStatus, setTestStatus] = useState<string | null>(null);
  const [reminderSettings, setReminderSettings] = useState<ReminderSettings>(DEFAULT_REMINDER_SETTINGS);

  useFocusEffect(
    useCallback(() => {
      if (!userId) return;
      let cancelled = false;
      Promise.all([getGenerationUsageToday(userId), getProfile(userId)]).then(([u, profile]) => {
        if (cancelled) return;
        setUsage(u);
        setNotificationsOn(profile?.notifications_enabled ?? false);
        setScanTrainingOn(!!profile?.personalization_profile?.scanTraining);
        setReminderSettings(normalizeReminderSettings(profile?.personalization_profile?.reminders));
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
      await setNotificationsEnabled(userId, true);
      setNotificationsOn(true);
      await refreshReminders(userId).catch(() => {});
    } else {
      await cancelAllReminders();
      await setNotificationsEnabled(userId, false);
      setNotificationsOn(false);
    }
    setNotificationsBusy(false);
  };

  const handleReminderSettings = async (next: ReminderSettings) => {
    if (!userId) return;
    setReminderSettings(next);
    await saveReminderSettings(userId, next);
    refreshReminders(userId).catch(() => {});
  };

  const rows = [
    { label: 'Workout plan generations', used: usage?.plan ?? 0, cap: GENERATION_CAPS.plan },
    { label: 'Meal estimations', used: usage?.meal ?? 0, cap: GENERATION_CAPS.meal },
  ];

  return (
    <ScrollView style={{ flex: 1, backgroundColor: '#050505' }} showsVerticalScrollIndicator={false}>
      <View style={{ paddingHorizontal: 16, paddingTop: insets.top + 8, paddingBottom: 32, gap: 14 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, paddingTop: 2 }}>
          <BackTile onPress={() => router.back()} />
          <View><Badge color={P}>SETTINGS</Badge></View>
        </View>

        <Surface radius={20} padding={16}>
          <Text style={{ color: '#fff', fontSize: 13, fontWeight: '700', fontFamily: FONT, marginBottom: 4 }}>Today's generation usage</Text>
          <Text style={{ color: COLORS.textMuted, fontSize: 11, fontFamily: FONT, marginBottom: 14 }}>
            Resets at midnight. Hitting a limit means try again tomorrow.
          </Text>
          {rows.map((r, i) => (
            <View key={r.label} style={{ marginTop: i > 0 ? 14 : 0 }}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 6 }}>
                <Text style={{ color: '#A1A1AA', fontSize: 13, fontFamily: FONT }}>{r.label}</Text>
                <Text style={{ color: r.used >= r.cap ? COLORS.danger : '#fff', fontSize: 13, fontWeight: '700', fontFamily: FONT }}>
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
        </Surface>

        {notificationsSupported ? (
          <Surface radius={20} padding={16}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
              <View style={{ width: 32, height: 32, borderRadius: 8, backgroundColor: 'rgba(59,130,246,0.14)', alignItems: 'center', justifyContent: 'center' }}>
                <Icon name="bell" size={16} color={COLORS.blue} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={{ color: '#fff', fontSize: 13, fontWeight: '600', fontFamily: FONT }}>Reminders</Text>
                <Text style={{ color: COLORS.textMuted, fontSize: 11, marginTop: 1, fontFamily: FONT }}>Workout, meal, sleep and water nudges</Text>
              </View>
              <Switch value={notificationsOn} onValueChange={handleToggleNotifications} disabled={notificationsBusy} />
            </View>
            {notificationsOn ? (
              <View style={{ marginTop: 10, borderTopWidth: 1, borderTopColor: 'rgba(255,255,255,0.06)', paddingTop: 4 }}>
                <ReminderSettingsCard settings={reminderSettings} disabled={notificationsBusy} onChange={handleReminderSettings} />
              </View>
            ) : null}
            {permissionDenied ? (
              <Text style={{ color: COLORS.danger, fontSize: 11, marginTop: 10, fontFamily: FONT }}>
                Notifications are blocked for CLAWW in your device settings — enable them there first.
              </Text>
            ) : null}
          </Surface>
        ) : null}

        <Surface radius={20} padding={16}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
            <View style={{ width: 32, height: 32, borderRadius: 8, backgroundColor: 'rgba(34,197,94,0.14)', alignItems: 'center', justifyContent: 'center' }}>
              <Icon name="camera" size={16} color={COLORS.green} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={{ color: '#fff', fontSize: 15, fontWeight: '600', fontFamily: FONT }}>Help improve the scanner</Text>
              <Text style={{ color: COLORS.textMuted, fontSize: 13, marginTop: 1, lineHeight: 17, fontFamily: FONT }}>
                When you fix a scanned plate, share the photo, what the scanner guessed and your fix, so it learns Indian meals. Off by default. Turn it off any time.
              </Text>
            </View>
            <Switch
              value={scanTraining}
              accessibilityLabel="Help improve the scanner"
              onValueChange={(on) => {
                setScanTrainingOn(on);
                if (userId) saveScanTraining(userId, on).then((ok) => { if (!ok) setScanTrainingOn(!on); });
              }}
            />
          </View>
        </Surface>

        {notificationsSupported && SHOW_DEV_TOOLS ? (
          <View style={{ backgroundColor: '#151517', borderWidth: 1, borderStyle: 'dashed', borderColor: 'rgba(245,158,11,0.35)', borderRadius: 16, paddingHorizontal: 16, paddingVertical: 14, gap: 10 }}>
            <Text style={{ color: COLORS.amber, fontSize: 11, fontWeight: '800', letterSpacing: 0.7, fontFamily: FONT }}>TEST TOOLS · NOT IN RELEASE BUILDS</Text>
            <TouchableOpacity
              activeOpacity={0.8}
              onPress={async () => {
                const ok = await scheduleTestReminder(2);
                setTestStatus(ok ? 'Test reminder set for 2 minutes from now. Lock the phone and wait.' : 'Notifications are blocked for CLAWW.');
              }}
              style={{ height: 44, borderRadius: 12, backgroundColor: 'rgba(245,158,11,0.14)', alignItems: 'center', justifyContent: 'center' }}
            >
              <Text style={{ color: COLORS.amber, fontSize: 13, fontWeight: '700', fontFamily: FONT }}>Send a test reminder in 2 minutes</Text>
            </TouchableOpacity>
            {testStatus ? <Text style={{ color: '#A1A1AA', fontSize: 13, fontFamily: FONT }}>{testStatus}</Text> : null}
          </View>
        ) : null}

        {PERF_ENABLED && SHOW_DEV_TOOLS ? <PerfReadout /> : null}

        {SHOW_DEV_TOOLS ? (
          <TouchableOpacity
            activeOpacity={0.8}
            onPress={() => router.push('/dev/design')}
            accessibilityRole="button"
            style={{ minHeight: 44, borderRadius: 16, borderWidth: 1, borderStyle: 'dashed', borderColor: 'rgba(245,158,11,0.35)', backgroundColor: '#151517', alignItems: 'center', justifyContent: 'center', paddingVertical: 12 }}
          >
            <Text style={{ color: COLORS.amber, fontSize: 13, fontWeight: '700', fontFamily: FONT }}>Design system gallery</Text>
          </TouchableOpacity>
        ) : null}

        <Surface radius={20} padding={16}>
          <TouchableOpacity
            activeOpacity={0.8}
            onPress={signOut}
            style={{ flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 13, gap: 12 }}
          >
            <View style={{ width: 32, height: 32, borderRadius: 8, backgroundColor: 'rgba(239,68,68,0.1)', alignItems: 'center', justifyContent: 'center' }}>
              <Icon name="log-out" size={16} color="#EF4444" />
            </View>
            <Text style={{ flex: 1, color: '#EF4444', fontSize: 13, fontWeight: '500', fontFamily: FONT }}>Sign out</Text>
          </TouchableOpacity>
        </Surface>
      </View>
    </ScrollView>
  );
}

const msText = (ms: number | null) => (ms === null ? 'none yet' : `${Math.round(ms)} ms`);

/** Speed numbers for the NG PHASE 0.4 baseline, readable on an installed preview APK. */
function PerfReadout() {
  const [report, setReport] = useState<PerfReport>(getPerfReport);
  useFocusEffect(useCallback(() => setReport(getPerfReport()), []));
  const { setLatency, homeFirstPaintMs } = report;
  const row = (label: string, value: string) => (
    <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
      <Text style={{ color: '#A1A1AA', fontSize: 13, fontFamily: FONT }}>{label}</Text>
      <Text style={{ color: COLORS.fg, fontSize: 13, fontWeight: '700', fontFamily: FONT, fontVariant: ['tabular-nums'] }}>{value}</Text>
    </View>
  );
  return (
    <View style={{ backgroundColor: '#151517', borderWidth: 1, borderStyle: 'dashed', borderColor: 'rgba(245,158,11,0.35)', borderRadius: 16, paddingHorizontal: 16, paddingVertical: 14, gap: 8 }}>
      <Text style={{ color: COLORS.amber, fontSize: 11, fontWeight: '800', letterSpacing: 0.7, fontFamily: FONT }}>SPEED NUMBERS · NOT IN RELEASE BUILDS</Text>
      {row('Sets timed', String(setLatency.count))}
      {row('Tap to next set, median', msText(setLatency.median))}
      {row('Tap to next set, slowest 10%', msText(setLatency.p90))}
      {row('Home first paint (this app start)', msText(homeFirstPaintMs))}
      <View style={{ flexDirection: 'row', gap: 8, marginTop: 4 }}>
        <TouchableOpacity activeOpacity={0.8} onPress={() => setReport(getPerfReport())} style={{ flex: 1, height: 44, borderRadius: 12, backgroundColor: 'rgba(245,158,11,0.14)', alignItems: 'center', justifyContent: 'center' }}>
          <Text style={{ color: COLORS.amber, fontSize: 13, fontWeight: '700', fontFamily: FONT }}>Refresh</Text>
        </TouchableOpacity>
        <TouchableOpacity
          activeOpacity={0.8}
          onPress={() => {
            resetPerfReport();
            setReport(getPerfReport());
          }}
          style={{ flex: 1, height: 44, borderRadius: 12, borderWidth: 1, borderColor: 'rgba(245,158,11,0.35)', alignItems: 'center', justifyContent: 'center' }}
        >
          <Text style={{ color: COLORS.amber, fontSize: 13, fontWeight: '700', fontFamily: FONT }}>Reset set timings</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}
