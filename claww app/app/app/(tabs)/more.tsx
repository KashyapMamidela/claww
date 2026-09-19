import React, { useCallback, useState } from 'react';
import { ScrollView, Text, TouchableOpacity, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { useRouter } from 'expo-router';
import { useFocusEffect } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { COLORS, FONT, HEADER_CONTENT_HEIGHT, TAB_BAR_CONTENT_HEIGHT } from '../../lib/theme';
import { useAppState } from '../../lib/appState';
import { signOut } from '../../lib/auth';
import { getAchievements, getLevelInfo, getProfile, getTierName, type Achievement } from '../../lib/data';
import { Icon } from '../../components/ui/Icon';
import { Badge } from '../../components/ui/Badge';
import { Display } from '../../components/ui/Typography';

export default function MoreTab() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { userId, userName, xp, streak } = useAppState();
  const openProfile = () => router.push('/profile');

  const [displayName, setDisplayName] = useState('');
  const [achievements, setAchievements] = useState<Achievement[]>([]);

  // xp/streak come from AppState (live — see appState.tsx).
  useFocusEffect(
    useCallback(() => {
      if (!userId) return;
      let cancelled = false;
      Promise.all([getProfile(userId), getAchievements(userId)]).then(([profile, a]) => {
        if (cancelled) return;
        setDisplayName(profile?.name || userName || 'Member');
        setAchievements(a);
      });
      return () => {
        cancelled = true;
      };
    }, [userId, userName])
  );

  const { level } = getLevelInfo(xp);
  const tier = getTierName(level);
  const earnedCount = achievements.filter((a) => a.earned).length;
  const preview = achievements.slice(0, 4);

  const sections = [
    {
      title: 'FEATURES',
      rows: [
        { icon: 'user-circle-2', color: COLORS.amber, label: 'Profile', sub: 'Stats, badges & body metrics', onPress: openProfile },
        { icon: 'bell', color: COLORS.purple, label: 'Notifications', sub: 'Workout reminders & alerts' },
      ],
    },
    {
      title: 'PERSONALISE',
      rows: [
        { icon: 'settings', color: '#A1A1AA', label: 'Settings', sub: 'Units, goals & preferences' },
        { icon: 'moon', color: COLORS.indigo, label: 'Appearance', sub: 'Dark mode · AMOLED · Theme' },
        { icon: 'smartphone', color: '#A1A1AA', label: 'Connected Apps', sub: 'Not connected — coming soon' },
      ],
    },
    {
      title: 'SUPPORT',
      rows: [
        { icon: 'help-circle', color: '#A1A1AA', label: 'Help & Support', sub: 'FAQs, tutorials, contact' },
        { icon: 'star', color: COLORS.amber, label: 'Rate CLAWW', sub: 'Loving the app? Leave a review' },
        { icon: 'info', color: '#A1A1AA', label: 'About', sub: 'Version 3.4.1 · Build 20240414' },
      ],
    },
  ] as const;

  return (
    <ScrollView style={{ flex: 1, backgroundColor: '#050505' }} showsVerticalScrollIndicator={false}>
      <View
        style={{
          paddingHorizontal: 16,
          paddingTop: insets.top + HEADER_CONTENT_HEIGHT + 8,
          paddingBottom: Math.max(insets.bottom, 20) + TAB_BAR_CONTENT_HEIGHT + 32,
          gap: 16,
        }}
      >
        <View>
          <Display>More</Display>
          <Text style={{ color: '#71717A', fontSize: 12, marginTop: 4, fontFamily: FONT }}>Settings, profile & more features</Text>
        </View>

        <TouchableOpacity
          activeOpacity={0.85}
          onPress={openProfile}
          style={{
            backgroundColor: '#151517',
            borderWidth: 1,
            borderColor: 'rgba(255,255,255,0.14)',
            borderRadius: 18,
            paddingHorizontal: 16,
            paddingVertical: 14,
            flexDirection: 'row',
            alignItems: 'center',
            gap: 14,
          }}
        >
          <LinearGradient
            colors={['#FF4500', COLORS.amber]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={{ width: 52, height: 52, borderRadius: 14, alignItems: 'center', justifyContent: 'center' }}
          >
            <Text style={{ fontSize: 20, fontWeight: '900', color: '#fff', fontFamily: FONT }}>
              {displayName.charAt(0).toUpperCase() || 'M'}
            </Text>
          </LinearGradient>
          <View style={{ flex: 1 }}>
            <Text style={{ color: '#fff', fontSize: 16, fontWeight: '800', fontFamily: FONT }}>{displayName}</Text>
            <Text style={{ color: '#71717A', fontSize: 11, marginTop: 1, fontFamily: FONT }}>{tier}</Text>
            <View style={{ flexDirection: 'row', gap: 6, marginTop: 5 }}>
              <Badge color={COLORS.amber}>LVL {level}</Badge>
              <Badge color="#00D68F">{streak}-DAY STREAK</Badge>
            </View>
          </View>
          <Icon name="chevron-right" size={17} color="#71717A" />
        </TouchableOpacity>

        <View style={{ backgroundColor: '#151517', borderWidth: 1, borderColor: 'rgba(255,255,255,0.08)', borderRadius: 16, paddingHorizontal: 16, paddingVertical: 14 }}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 12 }}>
            <Text style={{ color: '#fff', fontSize: 13, fontWeight: '600', fontFamily: FONT }}>Achievements</Text>
            <Text style={{ color: '#71717A', fontSize: 11, fontFamily: FONT }}>{earnedCount}/{achievements.length} earned</Text>
          </View>
          <View style={{ flexDirection: 'row', gap: 8, marginBottom: 12 }}>
            {preview.map((b, i) => (
              <Animated.View
                key={b.label}
                entering={FadeInDown.delay(i * 70).springify().damping(16)}
                style={{ flex: 1, alignItems: 'center', gap: 5, opacity: b.earned ? 1 : 0.3 }}
              >
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
              </Animated.View>
            ))}
          </View>
          <TouchableOpacity onPress={openProfile} style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 5 }}>
            <Text style={{ color: COLORS.amber, fontSize: 11.5, fontWeight: '600', fontFamily: FONT }}>
              View all {achievements.length} in Profile
            </Text>
            <Icon name="chevron-right" size={13} color={COLORS.amber} />
          </TouchableOpacity>
        </View>

        {sections.map((section) => (
          <View key={section.title}>
            <Text style={{ color: '#71717A', fontSize: 9.5, fontWeight: '700', letterSpacing: 1, marginBottom: 6, paddingLeft: 2, fontFamily: FONT }}>
              {section.title}
            </Text>
            <View style={{ backgroundColor: '#151517', borderWidth: 1, borderColor: 'rgba(255,255,255,0.08)', borderRadius: 16, overflow: 'hidden' }}>
              {section.rows.map((row, i) => (
                <TouchableOpacity
                  key={row.label}
                  activeOpacity={0.8}
                  onPress={'onPress' in row ? row.onPress : undefined}
                  style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    paddingHorizontal: 16,
                    paddingVertical: 12,
                    gap: 13,
                    borderTopWidth: i > 0 ? 1 : 0,
                    borderTopColor: 'rgba(255,255,255,0.08)',
                  }}
                >
                  <View
                    style={{
                      width: 34,
                      height: 34,
                      borderRadius: 9,
                      backgroundColor: 'rgba(255,255,255,0.04)',
                      borderWidth: 1,
                      borderColor: 'rgba(255,255,255,0.08)',
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    <Icon name={row.icon} size={18} color={row.color} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={{ color: '#fff', fontSize: 13, fontWeight: '600', fontFamily: FONT }}>{row.label}</Text>
                    <Text style={{ color: '#71717A', fontSize: 10.5, marginTop: 1, fontFamily: FONT }}>{row.sub}</Text>
                  </View>
                  <Icon name="chevron-right" size={15} color="#71717A" />
                </TouchableOpacity>
              ))}
            </View>
          </View>
        ))}

        <View style={{ backgroundColor: '#151517', borderWidth: 1, borderColor: 'rgba(255,255,255,0.08)', borderRadius: 14, overflow: 'hidden' }}>
          <TouchableOpacity activeOpacity={0.8} onPress={signOut} style={{ flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 16, paddingVertical: 13 }}>
            <View
              style={{
                width: 34,
                height: 34,
                borderRadius: 9,
                backgroundColor: 'rgba(239,68,68,0.10)',
                borderWidth: 1,
                borderColor: 'rgba(239,68,68,0.20)',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Icon name="log-out" size={16} color="#EF4444" />
            </View>
            <Text style={{ color: '#EF4444', fontSize: 13, fontWeight: '600', fontFamily: FONT }}>Sign Out</Text>
          </TouchableOpacity>
        </View>

        <View style={{ alignItems: 'center', marginTop: 4 }}>
          <Text style={{ color: '#71717A', fontSize: 10.5, fontFamily: FONT }}>CLAWW · v3.4.1 · Built with 💙</Text>
          <Text style={{ color: '#71717A', fontSize: 10, marginTop: 3, fontFamily: FONT }}>© 2026 CLAWW Technologies. All rights reserved.</Text>
        </View>
      </View>
    </ScrollView>
  );
}
