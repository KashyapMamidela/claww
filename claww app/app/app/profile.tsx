import React, { useCallback, useState } from 'react';
import { ScrollView, Text, TouchableOpacity, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { useFocusEffect } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { COLORS, FONT } from '../lib/theme';
import { useAppState } from '../lib/appState';
import { signOut } from '../lib/auth';
import {
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
import { DeleteAccountModal } from '../components/DeleteAccountModal';

const P = COLORS.amber;

const GOAL_LABELS: Record<string, string> = {
  muscle_gain: 'Build Muscle',
  fat_loss: 'Lose Fat',
  endurance: 'Endurance',
  maintenance: 'Maintain',
  flexibility: 'Flexibility',
};

const menuItems = [
  { icon: 'bell', label: 'Notifications' },
  { icon: 'shield', label: 'Privacy & Data' },
  { icon: 'help-circle', label: 'Help & Support' },
];

export default function ProfileScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { userId, userName, xp, streak } = useAppState();

  const [profile, setProfile] = useState<Profile | null>(null);
  const [workoutCount, setWorkoutCount] = useState(0);
  const [volume, setVolume] = useState(0);
  const [achievements, setAchievements] = useState<Achievement[]>([]);
  const [deleteModalVisible, setDeleteModalVisible] = useState(false);

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
          <Badge color={P}>MY PROFILE</Badge>
        </View>

        <View style={{ backgroundColor: '#151517', borderWidth: 1, borderColor: COLORS.amberBorder, borderRadius: 16, padding: 16 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 14 }}>
            <LinearGradient
              colors={['#FF4500', P]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={{ width: 64, height: 64, borderRadius: 16, alignItems: 'center', justifyContent: 'center' }}
            >
              <Text style={{ fontSize: 22, fontWeight: '900', color: '#fff', fontFamily: FONT }}>
                {displayName.charAt(0).toUpperCase()}
              </Text>
            </LinearGradient>
            <View style={{ flex: 1 }}>
              <Text style={{ color: '#fff', fontSize: 18, fontWeight: '800', letterSpacing: -0.3, fontFamily: FONT }}>{displayName}</Text>
              <Text style={{ color: '#71717A', fontSize: 11, marginTop: 1, fontFamily: FONT }}>{profile?.email ?? ''} · {tier}</Text>
              <View style={{ flexDirection: 'row', gap: 6, marginTop: 5 }}>
                <Badge color={P}>LVL {level}</Badge>
                <Badge color="#00D68F">{streak}-DAY STREAK</Badge>
              </View>
            </View>
          </View>
          <View style={{ marginTop: 14 }}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 5 }}>
              <Text style={{ color: '#71717A', fontSize: 10, fontFamily: FONT }}>XP Progress — Level {level}</Text>
              <Text style={{ color: P, fontSize: 10, fontWeight: '600', fontFamily: FONT }}>
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
        </View>

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
              <Text style={{ color: '#fff', fontSize: 15, fontWeight: '800', fontFamily: FONT }}>{s.value}</Text>
              <Text style={{ color: '#71717A', fontSize: 9, textAlign: 'center', fontFamily: FONT }}>{s.label}</Text>
            </View>
          ))}
        </View>

        <View style={{ backgroundColor: '#151517', borderWidth: 1, borderColor: 'rgba(255,255,255,0.08)', borderRadius: 16, paddingHorizontal: 16, paddingVertical: 14 }}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
            <Text style={{ color: '#fff', fontSize: 13, fontWeight: '600', fontFamily: FONT }}>Achievements</Text>
            <Text style={{ color: '#71717A', fontSize: 11, fontFamily: FONT }}>{earnedCount}/{achievements.length} earned</Text>
          </View>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
            {achievements.map((b) => (
              <View key={b.label} style={{ width: '22.5%', alignItems: 'center', gap: 5, opacity: b.earned ? 1 : 0.3 }}>
                <View
                  style={{
                    width: 48,
                    height: 48,
                    borderRadius: 12,
                    backgroundColor: b.earned ? `${b.color}18` : 'rgba(255,255,255,0.04)',
                    borderWidth: 1,
                    borderColor: b.earned ? `${b.color}30` : 'rgba(255,255,255,0.08)',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <Text style={{ fontSize: 20 }}>{b.icon}</Text>
                </View>
                <Text style={{ color: '#A1A1AA', fontSize: 8.5, textAlign: 'center', lineHeight: 10, fontFamily: FONT }}>{b.label}</Text>
              </View>
            ))}
          </View>
        </View>

        <View style={{ backgroundColor: '#151517', borderWidth: 1, borderColor: 'rgba(255,255,255,0.08)', borderRadius: 16, paddingHorizontal: 16, paddingVertical: 14 }}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 12 }}>
            <Text style={{ color: '#fff', fontSize: 13, fontWeight: '600', fontFamily: FONT }}>Body Stats</Text>
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
                <Text style={{ color: '#71717A', fontSize: 9.5, fontFamily: FONT }}>{bs.l}</Text>
                <Text style={{ color: '#fff', fontSize: 14, fontWeight: '700', marginTop: 3, fontFamily: FONT }}>{bs.v}</Text>
              </View>
            ))}
          </View>
        </View>

        <View style={{ backgroundColor: '#151517', borderWidth: 1, borderColor: 'rgba(255,255,255,0.08)', borderRadius: 16, overflow: 'hidden' }}>
          {menuItems.map((item, i) => (
            <TouchableOpacity
              key={item.label}
              activeOpacity={0.8}
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                paddingHorizontal: 16,
                paddingVertical: 13,
                gap: 12,
                borderTopWidth: i > 0 ? 1 : 0,
                borderTopColor: 'rgba(255,255,255,0.08)',
              }}
            >
              <View style={{ width: 32, height: 32, borderRadius: 8, backgroundColor: 'rgba(255,255,255,0.05)', alignItems: 'center', justifyContent: 'center' }}>
                <Icon name={item.icon} size={16} color="#A1A1AA" />
              </View>
              <Text style={{ flex: 1, color: '#fff', fontSize: 13, fontWeight: '500', fontFamily: FONT }}>{item.label}</Text>
              <Icon name="chevron-right" size={15} color="#71717A" />
            </TouchableOpacity>
          ))}
          <TouchableOpacity
            activeOpacity={0.8}
            onPress={signOut}
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              paddingHorizontal: 16,
              paddingVertical: 13,
              gap: 12,
              borderTopWidth: 1,
              borderTopColor: 'rgba(255,255,255,0.08)',
            }}
          >
            <View style={{ width: 32, height: 32, borderRadius: 8, backgroundColor: 'rgba(239,68,68,0.1)', alignItems: 'center', justifyContent: 'center' }}>
              <Icon name="log-out" size={16} color="#EF4444" />
            </View>
            <Text style={{ flex: 1, color: '#EF4444', fontSize: 13, fontWeight: '500', fontFamily: FONT }}>Sign Out</Text>
          </TouchableOpacity>
          <TouchableOpacity
            activeOpacity={0.8}
            onPress={() => setDeleteModalVisible(true)}
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              paddingHorizontal: 16,
              paddingVertical: 13,
              gap: 12,
              borderTopWidth: 1,
              borderTopColor: 'rgba(255,255,255,0.08)',
            }}
          >
            <View style={{ width: 32, height: 32, borderRadius: 8, backgroundColor: 'rgba(239,68,68,0.1)', alignItems: 'center', justifyContent: 'center' }}>
              <Icon name="trash-2" size={16} color="#EF4444" />
            </View>
            <Text style={{ flex: 1, color: '#EF4444', fontSize: 13, fontWeight: '500', fontFamily: FONT }}>Delete Account</Text>
          </TouchableOpacity>
        </View>
      </View>
      <DeleteAccountModal visible={deleteModalVisible} onClose={() => setDeleteModalVisible(false)} />
    </ScrollView>
  );
}
