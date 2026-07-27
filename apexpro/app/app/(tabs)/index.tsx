import React from 'react';
import { ScrollView, Text, TouchableOpacity, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { COLORS, FONT } from '../../lib/theme';
import { useAppState } from '../../lib/appState';
import { Icon } from '../../components/ui/Icon';
import { Button } from '../../components/ui/Button';
import { SectionLabel } from '../../components/ui/SectionLabel';
import { StatCard } from '../../components/ui/StatCard';
import { ProgressBar } from '../../components/ui/ProgressBar';
import { ProgressRing } from '../../components/ui/ProgressRing';
import { SleepArcDial } from '../../components/SleepArcDial';

function AiCard({ children }: { children: React.ReactNode }) {
  return (
    <View
      style={{
        backgroundColor: '#151517',
        borderWidth: 1,
        borderColor: 'rgba(168,85,247,0.22)',
        borderRadius: 16,
        paddingHorizontal: 16,
        paddingVertical: 14,
      }}
    >
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 10 }}>
        <View
          style={{
            width: 28,
            height: 28,
            borderRadius: 8,
            backgroundColor: 'rgba(168,85,247,0.15)',
            borderWidth: 1,
            borderColor: 'rgba(168,85,247,0.3)',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <Icon name="sparkles" size={14} color={COLORS.purple} />
        </View>
        <Text style={{ color: '#fff', fontSize: 12, fontWeight: '700', fontFamily: FONT }}>CLAWW AI</Text>
      </View>
      <Text style={{ color: '#A1A1AA', fontSize: 12.5, lineHeight: 19, fontFamily: FONT }}>{children}</Text>
    </View>
  );
}

function HomeEmptyState() {
  const { userName, sleepLogged, logSleep, generatePlan } = useAppState();

  return (
    <View style={{ paddingHorizontal: 16, paddingTop: 8, paddingBottom: 28, gap: 14 }}>
      <View>
        <SectionLabel color={COLORS.blue}>DAY ONE</SectionLabel>
        <Text style={{ color: '#fff', fontSize: 28, fontWeight: '900', letterSpacing: -0.6, lineHeight: 31, marginTop: 4, fontFamily: FONT }}>
          Welcome,{'\n'}{userName || 'there'}.
        </Text>
        <Text style={{ color: '#71717A', fontSize: 12, marginTop: 6, lineHeight: 18, fontFamily: FONT }}>
          No recovery score yet — <Text style={{ color: COLORS.indigo, fontWeight: '700' }}>log tonight's sleep</Text> to unlock one.
        </Text>
      </View>

      <View
        style={{
          backgroundColor: '#151517',
          borderWidth: 1,
          borderColor: 'rgba(59,130,246,0.30)',
          borderRadius: 20,
          paddingHorizontal: 18,
          paddingVertical: 20,
          alignItems: 'center',
          gap: 14,
        }}
      >
        <ProgressRing size={164} rings={[{ r: 66, strokeWidth: 8, color: COLORS.blue, pct: 0 }]} trackDash="3 9">
          <View
            style={{
              width: 56,
              height: 56,
              borderRadius: 16,
              backgroundColor: 'rgba(59,130,246,0.14)',
              borderWidth: 1,
              borderColor: 'rgba(59,130,246,0.30)',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <Icon name="sparkles" size={24} color={COLORS.blue} />
          </View>
        </ProgressRing>
        <View style={{ alignItems: 'center' }}>
          <Text style={{ color: '#fff', fontSize: 15, fontWeight: '800', marginBottom: 4, fontFamily: FONT }}>
            Nothing logged yet — that's normal
          </Text>
          <Text style={{ color: '#71717A', fontSize: 12.5, lineHeight: 19, maxWidth: 260, textAlign: 'center', fontFamily: FONT }}>
            Generate a plan built around your onboarding answers and today's progress ring starts filling in.
          </Text>
        </View>
        <Button
          variant="primary"
          accent={COLORS.blue}
          accentDeep={COLORS.blueDeep}
          size="lg"
          fullWidth
          onPress={generatePlan}
          icon={<Icon name="wand-2" size={16} color="#fff" />}
        >
          Generate My First Plan
        </Button>
      </View>

      <View style={{ flexDirection: 'row', gap: 8 }}>
        <StatCard label="Steps" value="—" sub="no data yet" color="#A1A1AA" icon={<Icon name="footprints" size={16} color="#A1A1AA" />} />
        <StatCard label="Burned" value="—" sub="no data yet" color="#71717A" icon={<Icon name="flame" size={16} color="#71717A" />} />
        <StatCard label="Streak" value="0" sub="days" color="#71717A" icon={<Icon name="trending-up" size={16} color="#71717A" />} />
      </View>

      <View
        style={{
          backgroundColor: '#151517',
          borderWidth: 1,
          borderColor: 'rgba(129,140,248,0.28)',
          borderRadius: 20,
          paddingHorizontal: 18,
          paddingVertical: 16,
          flexDirection: 'row',
          alignItems: 'center',
          gap: 14,
        }}
      >
        <View
          style={{
            width: 48,
            height: 48,
            borderRadius: 14,
            backgroundColor: 'rgba(129,140,248,0.14)',
            borderWidth: 1,
            borderColor: 'rgba(129,140,248,0.30)',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <Icon name="moon" size={22} color={COLORS.indigo} />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={{ color: '#fff', fontSize: 13, fontWeight: '700', marginBottom: 2, fontFamily: FONT }}>
            {sleepLogged ? 'Recovery is calculating…' : "Log tonight's sleep"}
          </Text>
          <Text style={{ color: '#71717A', fontSize: 11.5, lineHeight: 16, fontFamily: FONT }}>
            {sleepLogged
              ? "You'll see your Recovery Score here tomorrow morning."
              : 'Unlocks your Recovery Score and a personalised readiness read each morning.'}
          </Text>
        </View>
        {!sleepLogged ? (
          <TouchableOpacity
            activeOpacity={0.8}
            onPress={logSleep}
            style={{
              height: 36,
              paddingHorizontal: 14,
              borderRadius: 10,
              borderWidth: 1,
              borderColor: 'rgba(129,140,248,0.4)',
              backgroundColor: 'rgba(129,140,248,0.14)',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <Text style={{ color: COLORS.indigo, fontSize: 12, fontWeight: '700', fontFamily: FONT }}>Log sleep</Text>
          </TouchableOpacity>
        ) : (
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5 }}>
            <Icon name="check" size={13} color={COLORS.green} strokeWidth={3} />
            <Text style={{ color: COLORS.green, fontSize: 12, fontWeight: '700', fontFamily: FONT }}>Logged</Text>
          </View>
        )}
      </View>

      <AiCard>
        Your coach is still warming up — <Text style={{ color: '#fff', fontWeight: '700' }}>generate a plan and log a few days</Text> and
        insights will start showing up here.
      </AiCard>
    </View>
  );
}

function HomePopulated() {
  const { userName } = useAppState();
  const rows = [
    { label: 'Activity', value: '48 min', sub: 'of 60', pct: 80, color: COLORS.blue },
    { label: 'Calories', value: '1,840', sub: 'of 2,400', pct: 77, color: '#FFFFFF' },
    { label: 'Hydration', value: '2.1 L', sub: 'of 3L', pct: 70, color: COLORS.green },
  ];

  return (
    <View style={{ paddingHorizontal: 16, paddingTop: 8, paddingBottom: 28, gap: 14 }}>
      <View>
        <SectionLabel color={COLORS.green}>MONDAY · APR 14, 2026</SectionLabel>
        <Text style={{ color: '#fff', fontSize: 28, fontWeight: '900', letterSpacing: -0.6, lineHeight: 31, marginTop: 4, fontFamily: FONT }}>
          Good morning,{'\n'}{userName || 'Marcus'}.
        </Text>
        <Text style={{ color: '#71717A', fontSize: 12, marginTop: 6, lineHeight: 18, fontFamily: FONT }}>
          Recovery score <Text style={{ color: COLORS.green, fontWeight: '700' }}>84 · High</Text> — great day to push hard.
        </Text>
      </View>

      <View
        style={{
          backgroundColor: '#151517',
          borderWidth: 1,
          borderColor: 'rgba(255,255,255,0.14)',
          borderRadius: 20,
          paddingHorizontal: 18,
          paddingVertical: 16,
        }}
      >
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
          <Text style={{ color: '#fff', fontSize: 13, fontWeight: '700', fontFamily: FONT }}>Daily Progress</Text>
          <View
            style={{
              backgroundColor: 'rgba(245,158,11,0.14)',
              borderWidth: 1,
              borderColor: 'rgba(245,158,11,0.28)',
              borderRadius: 7,
              paddingHorizontal: 9,
              paddingVertical: 3,
            }}
          >
            <Text style={{ fontSize: 10, fontWeight: '700', color: COLORS.amber, fontFamily: FONT }}>✦ 847 CLAWW</Text>
          </View>
        </View>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 18 }}>
          <ProgressRing
            size={164}
            rings={[
              { r: 72, strokeWidth: 7, color: COLORS.blue, pct: 80 },
              { r: 57, strokeWidth: 7, color: '#FFFFFF', pct: 76.7 },
              { r: 42, strokeWidth: 7, color: COLORS.green, pct: 70 },
            ]}
            trackColor="rgba(255,255,255,0.055)"
          >
            <Text style={{ color: '#fff', fontSize: 26, fontWeight: '900', fontFamily: FONT }}>76%</Text>
            <Text style={{ color: '#A1A1AA', fontSize: 9.5, marginTop: 3, fontFamily: FONT }}>Daily Goal</Text>
          </ProgressRing>
          <View style={{ flex: 1, gap: 11 }}>
            {rows.map((s) => (
              <View key={s.label}>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 }}>
                  <Text style={{ color: '#A1A1AA', fontSize: 10.5, fontFamily: FONT }}>{s.label}</Text>
                  <Text style={{ fontFamily: FONT }}>
                    <Text style={{ color: '#fff', fontSize: 12, fontWeight: '700' }}>{s.value} </Text>
                    <Text style={{ color: '#71717A', fontSize: 10 }}>{s.sub}</Text>
                  </Text>
                </View>
                <ProgressBar pct={s.pct} color={s.color} />
              </View>
            ))}
          </View>
        </View>
      </View>

      <View style={{ flexDirection: 'row', gap: 8 }}>
        <StatCard label="Steps" value="8,240" sub="/ 10,000" pct={82} color="#A1A1AA" icon={<Icon name="footprints" size={16} color="#A1A1AA" />} />
        <StatCard label="Burned" value="512" sub="kcal" pct={58} color={COLORS.flame} icon={<Icon name="flame" size={16} color={COLORS.flame} />} />
        <StatCard label="Streak" value="18" sub="days" pct={100} color={COLORS.green} icon={<Icon name="trending-up" size={16} color={COLORS.green} />} />
      </View>

      <SleepArcDial />

      <LinearGradient
        colors={['#0F172A', '#1E3A5F', '#1D4ED8']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={{
          borderRadius: 20,
          borderWidth: 1,
          borderColor: 'rgba(59,130,246,0.35)',
          paddingHorizontal: 18,
          paddingVertical: 16,
        }}
      >
        <Text style={{ color: 'rgba(255,255,255,0.7)', fontSize: 10, fontWeight: '700', letterSpacing: 0.9, fontFamily: FONT }}>
          TODAY'S PLAN · DAY 4/7
        </Text>
        <Text style={{ color: '#fff', fontSize: 18, fontWeight: '800', letterSpacing: -0.3, marginTop: 6, marginBottom: 8, fontFamily: FONT }}>
          Upper Body Hypertrophy
        </Text>
        <ProgressBar pct={40} color="#FFFFFF" height={4} />
      </LinearGradient>

      <AiCard>
        Your <Text style={{ color: '#fff', fontWeight: '700' }}>recovery score of 84</Text> and{' '}
        <Text style={{ color: COLORS.purple, fontWeight: '700' }}>18-day streak</Text> put you in peak form. Consider adding{' '}
        <Text style={{ color: COLORS.green, fontWeight: '700' }}>+20g protein</Text> post-workout.
      </AiCard>
    </View>
  );
}

export default function HomeTab() {
  const { isNewUser } = useAppState();
  return (
    <ScrollView style={{ flex: 1, backgroundColor: '#050505' }} showsVerticalScrollIndicator={false}>
      {isNewUser ? <HomeEmptyState /> : <HomePopulated />}
    </ScrollView>
  );
}
