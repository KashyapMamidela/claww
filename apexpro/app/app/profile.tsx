import React from 'react';
import { ScrollView, Text, TouchableOpacity, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { COLORS, FONT } from '../lib/theme';
import { Icon } from '../components/ui/Icon';
import { Badge } from '../components/ui/Badge';

const P = COLORS.amber;

const BADGES = [
  { icon: '🔥', label: '30-Day Streak', color: '#FF4500', earned: true },
  { icon: '💪', label: 'Iron 100', color: '#3B82F6', earned: true },
  { icon: '⚡', label: 'Volume King', color: '#A855F7', earned: true },
  { icon: '🎯', label: 'Goal Crusher', color: '#00D68F', earned: true },
  { icon: '🥊', label: 'Elite Tier', color: P, earned: false },
  { icon: '🌙', label: 'Night Owl', color: '#6366F1', earned: false },
  { icon: '🚀', label: 'CLAWW Legend', color: '#EC4899', earned: false },
];

export default function ProfileScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const xp = 4280;
  const xpNext = 5000;

  const stats = [
    { label: 'Workouts', value: '247', icon: 'flame', color: '#FF4500' },
    { label: 'Total Vol', value: '1.2M', icon: 'zap', color: '#A855F7' },
    { label: 'PRs Set', value: '38', icon: 'trophy', color: P },
    { label: 'Streak', value: '18d', icon: 'star', color: '#00D68F' },
  ];
  const bodyStats = [
    { l: 'Weight', v: '182 lb', d: '–3 lb', c: '#00D68F' },
    { l: 'Body Fat (est.)', v: '12.4%', d: '–1.2%', c: '#00D68F' },
    { l: 'Muscle (est.)', v: '38.6%', d: '+0.8%', c: P },
  ];
  const menuItems = [
    { icon: 'bell', label: 'Notifications' },
    { icon: 'shield', label: 'Privacy & Data' },
    { icon: 'help-circle', label: 'Help & Support' },
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
              <Text style={{ fontSize: 22, fontWeight: '900', color: '#fff', fontFamily: FONT }}>M</Text>
            </LinearGradient>
            <View style={{ flex: 1 }}>
              <Text style={{ color: '#fff', fontSize: 18, fontWeight: '800', letterSpacing: -0.3, fontFamily: FONT }}>Marcus Reid</Text>
              <Text style={{ color: '#71717A', fontSize: 11, marginTop: 1, fontFamily: FONT }}>@marcus_claww · Elite Tier</Text>
              <View style={{ flexDirection: 'row', gap: 6, marginTop: 5 }}>
                <Badge color={P}>LVL 34</Badge>
                <Badge color="#00D68F">18-DAY STREAK</Badge>
              </View>
            </View>
          </View>
          <View style={{ marginTop: 14 }}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 5 }}>
              <Text style={{ color: '#71717A', fontSize: 10, fontFamily: FONT }}>XP Progress — Level 34</Text>
              <Text style={{ color: P, fontSize: 10, fontWeight: '600', fontFamily: FONT }}>
                {xp.toLocaleString()} / {xpNext.toLocaleString()}
              </Text>
            </View>
            <View style={{ height: 5, backgroundColor: 'rgba(255,255,255,0.07)', borderRadius: 100, overflow: 'hidden' }}>
              <LinearGradient
                colors={['#FF4500', P]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={{ height: '100%', width: `${(xp / xpNext) * 100}%`, borderRadius: 100 }}
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
            <Text style={{ color: '#71717A', fontSize: 11, fontFamily: FONT }}>4/7 earned</Text>
          </View>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
            {BADGES.map((b) => (
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
            <Text style={{ color: '#71717A', fontSize: 10.5, fontFamily: FONT }}>Updated Apr 14</Text>
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
                <Text style={{ color: bs.c, fontSize: 9.5, marginTop: 2, fontFamily: FONT }}>{bs.d}</Text>
              </View>
            ))}
          </View>
          <Text style={{ color: '#52525B', fontSize: 9.5, marginTop: 10, lineHeight: 13, fontFamily: FONT }}>
            Body fat and muscle % are self-reported estimates, not clinical measurements.
          </Text>
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
        </View>
      </View>
    </ScrollView>
  );
}
