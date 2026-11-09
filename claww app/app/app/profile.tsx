import React, { useCallback, useState } from 'react';
import { Medallion } from '../components/ui/Medallion';
import { BackTile } from '../components/ui/BackTile';
import { Surface } from '../components/ui/Surface';
import { Rise } from '../components/ui/Rise';
import { Platform, ScrollView, Share, Text, TouchableOpacity, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { useFocusEffect } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { COLORS, FONT, BG, bg } from '../lib/theme';
import { useAppState } from '../lib/appState';
import { signOut } from '../lib/auth';
import {
  exportUserData,
  getAchievements,
  getCompletedWorkoutDays,
  getLevelInfo,
  getProfile,
  getTierName,
  getTotalVolume,
  type Achievement,
  type Profile,
} from '../lib/data';
import { Icon } from '../components/ui/Icon';
import { Badge } from '../components/ui/Badge';
import { ErrorCard } from '../components/ui/ErrorCard';
import { Skeleton } from '../components/ui/Skeleton';
import { DeleteAccountModal } from '../components/DeleteAccountModal';
import { MedicalDisclaimerModal } from '../components/MedicalDisclaimerModal';
import { PrivacyDataModal } from '../components/PrivacyDataModal';
import { openStoreListing, openSupportEmail } from '../lib/support';

const P = COLORS.amber;

const GOAL_LABELS: Record<string, string> = {
  muscle_gain: 'Build Muscle',
  fat_loss: 'Lose Fat',
  strength: 'Get Stronger',
  endurance: 'Endurance',
  maintenance: 'Maintain',
  flexibility: 'Flexibility',
};

// SHIP PHASE 8.1 — onPress is required, not optional: a row without a real
// handler is a compile error here, which is what let "Notifications" (no
// real destination yet — SHIP PHASE 8.3) get removed instead of shipped as
// a decorative stub.
interface MenuRow {
  icon: string;
  label: string;
  /** Shown small on the right, before the chevron. */
  value?: string;
  onPress: () => void;
}

export default function ProfileScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { userId, userName, xp, streak } = useAppState();

  const [profile, setProfile] = useState<Profile | null>(null);
  const [workoutCount, setWorkoutCount] = useState(0);
  const [volume, setVolume] = useState(0);
  const [achievements, setAchievements] = useState<Achievement[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [deleteModalVisible, setDeleteModalVisible] = useState(false);
  const [disclaimerModalVisible, setDisclaimerModalVisible] = useState(false);
  const [privacyModalVisible, setPrivacyModalVisible] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [exportError, setExportError] = useState<string | null>(null);

  // SHIP PHASE 7.5 — reuses the caller's own JWT-scoped queries in
  // exportUserData (RLS does the scoping, no service role). Web triggers a
  // real file download; native has no extra file-system dependency in this
  // codebase yet, so it hands the JSON to the OS share sheet instead, which
  // needs nothing beyond react-native's built-in Share API.
  const handleExportData = useCallback(async () => {
    if (!userId || exporting) return;
    setExporting(true);
    setExportError(null);
    try {
      const data = await exportUserData(userId);
      const json = JSON.stringify(data, null, 2);
      if (Platform.OS === 'web') {
        const blob = new Blob([json], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `claww-data-export-${new Date().toISOString().slice(0, 10)}.json`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
      } else {
        await Share.share({ message: json, title: 'CLAWW data export' });
      }
    } catch (e) {
      setExportError(e instanceof Error ? e.message : 'Failed to export your data.');
    } finally {
      setExporting(false);
    }
  }, [userId, exporting]);

  // xp/streak come from AppState (live — see appState.tsx).
  useFocusEffect(
    useCallback(() => {
      if (!userId) return;
      let cancelled = false;
      Promise.all([getProfile(userId), getCompletedWorkoutDays(userId), getTotalVolume(userId), getAchievements(userId)]).then(
        ([p, wc, v, a]) => {
          if (cancelled) return;
          setProfile(p);
          setWorkoutCount(wc);
          setVolume(v);
          setAchievements(a);
          setLoaded(true);
        }
      );
      return () => {
        cancelled = true;
      };
    }, [userId])
  );

  const { level, xpIntoLevel, xpForNextLevel } = getLevelInfo(xp);
  const tier = getTierName(level);
  const earnedCount = achievements.filter((a) => a.earned).length;
  const displayName = profile?.name || userName || 'Member';
  const goalLabel = profile?.goal ? GOAL_LABELS[profile.goal] ?? profile.goal : '—';

  const stats = [
    { label: 'Workouts', value: String(workoutCount), icon: 'flame', color: '#FF4500' },
    { label: 'Total Vol', value: volume >= 1000 ? `${(volume / 1000).toFixed(1)}K` : String(Math.round(volume)), icon: 'zap', color: '#A855F7' },
    { label: 'XP', value: xp.toLocaleString(), icon: 'trophy', color: P },
    { label: 'Streak', value: `${streak}d`, icon: 'star', color: '#00D68F' },
  ];
  const bodyStats = [
    { l: 'Weight', v: profile?.weight ? `${profile.weight} kg` : '—' },
    { l: 'Height', v: profile?.height ? `${profile.height} cm` : '—' },
    { l: 'Goal', v: goalLabel },
  ];

  const menuItems: MenuRow[] = [
    { icon: 'settings', label: 'Settings', value: profile?.notifications_enabled ? 'Reminders on' : 'Reminders off', onPress: () => router.push('/settings') },
    { icon: 'pencil', label: 'Your week, marked up', onPress: () => router.push('/week-review') },
    { icon: 'utensils', label: 'Food preferences', value: (profile?.personalization_profile as any)?.foodProfile ? 'Set' : undefined, onPress: () => router.push({ pathname: '/screens/nutrition-setup/foodprofile', params: { edit: '1' } }) },
    { icon: 'shield', label: 'Privacy & Data', onPress: () => setPrivacyModalVisible(true) },
    { icon: 'help-circle', label: 'Help & Support', onPress: () => openSupportEmail('CLAWW support request') },
    { icon: 'star', label: 'Rate CLAWW', onPress: openStoreListing },
    { icon: 'info', label: 'About', onPress: () => router.push('/about') },
  ];

  if (!loaded) {
    return (
      <ScrollView style={{ flex: 1, backgroundColor: '#050505' }} showsVerticalScrollIndicator={false}>
        <View style={{ paddingHorizontal: 16, paddingTop: insets.top + 8, paddingBottom: 32, gap: 14 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, paddingTop: 2 }}>
            <Skeleton width={30} height={30} borderRadius={8} />
            <Skeleton width={90} height={16} borderRadius={4} />
          </View>
          <Skeleton height={150} borderRadius={18} />
          <View style={{ flexDirection: 'row', gap: 8 }}>
            <Skeleton height={92} borderRadius={14} style={{ flex: 1 }} />
            <Skeleton height={92} borderRadius={14} style={{ flex: 1 }} />
            <Skeleton height={92} borderRadius={14} style={{ flex: 1 }} />
            <Skeleton height={92} borderRadius={14} style={{ flex: 1 }} />
          </View>
          <Skeleton height={120} borderRadius={16} />
          <Skeleton height={140} borderRadius={16} />
        </View>
      </ScrollView>
    );
  }

  return (
    <ScrollView style={{ flex: 1, backgroundColor: '#050505' }} showsVerticalScrollIndicator={false}>
      <View style={{ paddingHorizontal: 16, paddingTop: insets.top + 8, paddingBottom: 32, gap: 14 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, paddingTop: 2 }}>
          <BackTile onPress={() => router.back()} />
          <View><Badge color={P}>MY PROFILE</Badge></View>
        </View>

        <Surface radius={20} padding={16}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 14 }}>
            <LinearGradient
              colors={['#FF4500', P]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={{ width: 64, height: 64, borderRadius: 16, alignItems: 'center', justifyContent: 'center' }}
            >
              <Text style={{ fontSize: 22, fontVariant: ['tabular-nums'], color: '#fff', fontFamily: BG[800] }}>
                {displayName.charAt(0).toUpperCase()}
              </Text>
            </LinearGradient>
            <View style={{ flex: 1 }}>
              <Text style={{ color: '#fff', fontSize: 17, letterSpacing: -0.3, fontFamily: BG[800] }}>{displayName}</Text>
              <Text style={{ color: COLORS.textMuted, fontSize: 11, marginTop: 1, fontFamily: BG[400] }}>{profile?.email ?? ''} · {tier}</Text>
              <View style={{ flexDirection: 'row', gap: 6, marginTop: 5 }}>
                <Badge color={P}>LVL {level}</Badge>
                <Badge color="#00D68F">{streak}-DAY STREAK</Badge>
              </View>
            </View>
          </View>
          <View style={{ marginTop: 14 }}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 5 }}>
              <Text style={{ color: COLORS.textMuted, fontSize: 11, fontFamily: BG[400] }}>XP Progress — Level {level}</Text>
              <Text style={{ color: P, fontSize: 11, fontFamily: BG[600] }}>
                {xpIntoLevel} / {xpForNextLevel}
              </Text>
            </View>
            <View style={{ height: 5, backgroundColor: 'rgba(255,255,255,0.07)', borderRadius: 100, overflow: 'hidden' }}>
              <LinearGradient
                colors={['#FF4500', P]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={{ height: '100%', width: `${(xpIntoLevel / xpForNextLevel) * 100}%`, borderRadius: 100 }}
              />
            </View>
          </View>
        </Surface>

        <View style={{ flexDirection: 'row', gap: 8 }}>
          {stats.map((s) => (
            <View
              key={s.label}
              style={{
                flex: 1,
                backgroundColor: '#151517',
                borderWidth: 1,
                borderColor: 'rgba(255,255,255,0.08)',
                borderRadius: 12,
                paddingHorizontal: 8,
                paddingVertical: 10,
                alignItems: 'center',
                gap: 5,
              }}
            >
              <Icon name={s.icon} size={14} color={s.color} />
              <Text style={{ color: '#fff', fontSize: 15, fontFamily: BG[800] }}>{s.value}</Text>
              <Text style={{ color: COLORS.textMuted, fontSize: 11, textAlign: 'center', fontFamily: BG[400] }}>{s.label}</Text>
            </View>
          ))}
        </View>

        <Surface radius={20} padding={16}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
            <Text style={{ color: '#fff', fontSize: 17, fontFamily: BG[700] }}>Achievements</Text>
            <Text style={{ color: COLORS.textMuted, fontSize: 13, fontFamily: BG[400] }}>{earnedCount}/{achievements.length} earned</Text>
          </View>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
            {achievements.map((b) => (
              <View key={b.label} style={{ width: '22.5%', alignItems: 'center', gap: 6 }}>
                <Medallion icon={b.icon} color={b.color} earned={b.earned} />
                <Text style={{ color: b.earned ? COLORS.fgGray : COLORS.textFaint, fontSize: 13, textAlign: 'center', lineHeight: 16, fontFamily: BG[400] }}>{b.label}</Text>
              </View>
            ))}
          </View>
        </Surface>

        <Rise i={2}>
        <Surface radius={20} padding={16}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 12 }}>
            <Text style={{ color: '#fff', fontSize: 13, fontFamily: BG[600] }}>Body stats</Text>
          </View>
          <View style={{ flexDirection: 'row', gap: 8 }}>
            {bodyStats.map((bs) => (
              <View
                key={bs.l}
                style={{
                  flex: 1,
                  backgroundColor: 'rgba(255,255,255,0.03)',
                  borderWidth: 1,
                  borderColor: 'rgba(255,255,255,0.08)',
                  borderRadius: 10,
                  padding: 10,
                }}
              >
                <Text style={{ color: COLORS.textMuted, fontSize: 11, fontFamily: BG[400] }}>{bs.l}</Text>
                <Text style={{ color: '#fff', fontSize: 15, marginTop: 3, fontFamily: BG[700] }}>{bs.v}</Text>
              </View>
            ))}
          </View>
        </Surface>
        </Rise>

        <Rise i={3}>
        <Surface radius={20} padding={0}>
          {menuItems.map((item, i) => (
            <TouchableOpacity
              key={item.label}
              activeOpacity={0.8}
              onPress={item.onPress}
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                paddingHorizontal: 16,
                paddingVertical: 10,
                gap: 12,
                borderTopWidth: i > 0 ? 1 : 0,
                borderTopColor: 'rgba(255,255,255,0.08)',
              }}
            >
              <View style={{ width: 44, height: 44, borderRadius: 12, backgroundColor: 'rgba(255,255,255,0.05)', alignItems: 'center', justifyContent: 'center' }}>
                <Icon name={item.icon} size={16} color="#A1A1AA" />
              </View>
              <Text style={{ flex: 1, color: '#fff', fontSize: 15, fontFamily: BG[600] }}>{item.label}</Text>
              {item.value ? <Text style={{ color: COLORS.textMuted, fontSize: 13, fontFamily: BG[500] }}>{item.value}</Text> : null}
              <Icon name="chevron-right" size={15} color="#71717A" />
            </TouchableOpacity>
          ))}
          <TouchableOpacity
            activeOpacity={0.8}
            onPress={() => setDisclaimerModalVisible(true)}
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              paddingHorizontal: 16,
              paddingVertical: 10,
              gap: 12,
              borderTopWidth: 1,
              borderTopColor: 'rgba(255,255,255,0.08)',
            }}
          >
            <View style={{ width: 44, height: 44, borderRadius: 12, backgroundColor: 'rgba(255,255,255,0.05)', alignItems: 'center', justifyContent: 'center' }}>
              <Icon name="alert-triangle" size={16} color="#A1A1AA" />
            </View>
            <Text style={{ flex: 1, color: '#fff', fontSize: 15, fontFamily: BG[600] }}>Medical disclaimer</Text>
            <Icon name="chevron-right" size={15} color="#71717A" />
          </TouchableOpacity>
          <TouchableOpacity
            activeOpacity={0.8}
            onPress={handleExportData}
            disabled={exporting}
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              paddingHorizontal: 16,
              paddingVertical: 14,
              gap: 12,
              borderTopWidth: 1,
              borderTopColor: 'rgba(255,255,255,0.08)',
              opacity: exporting ? 0.6 : 1,
            }}
          >
            <View style={{ width: 44, height: 44, borderRadius: 12, backgroundColor: 'rgba(255,255,255,0.05)', alignItems: 'center', justifyContent: 'center' }}>
              <Icon name="download" size={16} color="#A1A1AA" />
            </View>
            <Text style={{ flex: 1, color: '#fff', fontSize: 15, fontFamily: BG[600] }}>
              {exporting ? 'Preparing export…' : 'Download My Data'}
            </Text>
            <Icon name="chevron-right" size={15} color="#71717A" />
          </TouchableOpacity>
          <TouchableOpacity
            activeOpacity={0.8}
            onPress={signOut}
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              paddingHorizontal: 16,
              paddingVertical: 14,
              gap: 12,
              borderTopWidth: 1,
              borderTopColor: 'rgba(255,255,255,0.08)',
            }}
          >
            <View style={{ width: 44, height: 44, borderRadius: 12, backgroundColor: 'rgba(239,68,68,0.1)', alignItems: 'center', justifyContent: 'center' }}>
              <Icon name="log-out" size={16} color="#EF4444" />
            </View>
            <Text style={{ flex: 1, color: '#EF4444', fontSize: 15, fontFamily: BG[600] }}>Sign out</Text>
          </TouchableOpacity>
          <TouchableOpacity
            activeOpacity={0.8}
            onPress={() => setDeleteModalVisible(true)}
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              paddingHorizontal: 16,
              paddingVertical: 14,
              gap: 12,
              borderTopWidth: 1,
              borderTopColor: 'rgba(255,255,255,0.08)',
            }}
          >
            <View style={{ width: 44, height: 44, borderRadius: 12, backgroundColor: 'rgba(239,68,68,0.1)', alignItems: 'center', justifyContent: 'center' }}>
              <Icon name="trash-2" size={16} color="#EF4444" />
            </View>
            <Text style={{ flex: 1, color: '#EF4444', fontSize: 15, fontFamily: BG[600] }}>Delete account</Text>
          </TouchableOpacity>
        </Surface>
        </Rise>

        {exportError ? <ErrorCard message={exportError} onRetry={handleExportData} retrying={exporting} /> : null}
      </View>
      <DeleteAccountModal visible={deleteModalVisible} onClose={() => setDeleteModalVisible(false)} />
      <MedicalDisclaimerModal visible={disclaimerModalVisible} onClose={() => setDisclaimerModalVisible(false)} />
      <PrivacyDataModal
        visible={privacyModalVisible}
        onClose={() => setPrivacyModalVisible(false)}
        onExport={handleExportData}
        onDelete={() => setDeleteModalVisible(true)}
      />
    </ScrollView>
  );
}
