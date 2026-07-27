import React from 'react';
import { ScrollView, Text, View } from 'react-native';
import { FONT } from '../../lib/theme';
import { useAppState } from '../../lib/appState';
import { Icon } from '../../components/ui/Icon';
import { Button } from '../../components/ui/Button';
import { ProgressBar } from '../../components/ui/ProgressBar';
import { ProgressRing } from '../../components/ui/ProgressRing';

// Tracker is strictly black & white — no accent hues on this screen.
const W = '#FFFFFF';
const WD = '#D4D4D8';
const GR = '#A1A1AA';
const GD = '#52525B';
const UNLOCK_AT = 3;

function KpiTile({ label, value, sub, note, delta }: { label: string; value: string; sub?: string; note?: string; delta?: string }) {
  return (
    <View
      style={{
        flexBasis: '48.5%',
        flexGrow: 1,
        backgroundColor: '#151517',
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.13)',
        borderRadius: 14,
        paddingHorizontal: 14,
        paddingTop: 14,
        paddingBottom: 12,
      }}
    >
      <Text style={{ color: GD, fontSize: 9, fontWeight: '700', letterSpacing: 0.9, fontFamily: FONT }}>{label}</Text>
      <Text style={{ color: value === '—' ? GD : W, fontSize: 30, fontWeight: '900', letterSpacing: -1.2, marginTop: 4, fontFamily: FONT }}>
        {value}
        {sub ? <Text style={{ color: GD, fontSize: 11, fontWeight: '400', letterSpacing: 0 }}> {sub}</Text> : null}
      </Text>
      {note ? (
        <Text style={{ color: GD, fontSize: 10.5, lineHeight: 15, marginTop: 7, fontFamily: FONT }}>{note}</Text>
      ) : delta ? (
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 3, marginTop: 7 }}>
          <Icon name="arrow-up-right" size={11} color={WD} />
          <Text style={{ color: WD, fontSize: 10.5, fontWeight: '700', fontFamily: FONT }}>{delta}</Text>
          <Text style={{ color: GD, fontSize: 10, fontFamily: FONT }}>vs last month</Text>
        </View>
      ) : null}
    </View>
  );
}

function TrackerLocked({ workoutsCompleted }: { workoutsCompleted: number }) {
  const remaining = UNLOCK_AT - workoutsCompleted;
  const KPI_LOCKED = [
    { label: 'CLAWW SCORE', value: '—', note: 'Complete 3 workouts to unlock your CLAWW Score.' },
    { label: 'STREAK', value: '—', note: 'Log workouts on consecutive days to start a streak.' },
    {
      label: 'WORKOUTS',
      value: String(workoutsCompleted),
      sub: `/ ${UNLOCK_AT}`,
      note: remaining > 0 ? `${remaining} more to unlock your Tracker.` : 'Unlocking…',
    },
    { label: 'VOLUME', value: '—', note: 'Volume trends appear after your first 3 workouts.' },
  ];

  return (
    <View style={{ paddingHorizontal: 16, paddingTop: 8, paddingBottom: 32, gap: 14 }}>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <View>
          <Text style={{ color: GD, fontSize: 9.5, fontWeight: '700', letterSpacing: 1.1, fontFamily: FONT }}>
            APR 2026 · BUILDING YOUR BASELINE
          </Text>
          <Text style={{ color: W, fontSize: 28, fontWeight: '900', letterSpacing: -0.7, marginTop: 6, fontFamily: FONT }}>CLAWW Tracker</Text>
          <Text style={{ color: GD, fontSize: 11.5, marginTop: 5, fontFamily: FONT }}>
            {workoutsCompleted} of {UNLOCK_AT} workouts logged
          </Text>
        </View>
        <ProgressRing size={68} rings={[{ r: 31, strokeWidth: 6, color: W, pct: 0 }]} trackColor="rgba(255,255,255,0.07)" trackDash="3 7">
          <Icon name="lock" size={18} color={GD} />
        </ProgressRing>
      </View>

      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>
        {KPI_LOCKED.map((k) => (
          <KpiTile key={k.label} label={k.label} value={k.value} sub={k.sub} note={k.note} />
        ))}
      </View>

      <View style={{ backgroundColor: '#151517', borderWidth: 1, borderColor: 'rgba(255,255,255,0.13)', borderRadius: 16, overflow: 'hidden' }}>
        <View
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            gap: 8,
            paddingHorizontal: 14,
            paddingVertical: 11,
            borderBottomWidth: 1,
            borderBottomColor: 'rgba(255,255,255,0.13)',
            backgroundColor: '#1A1A1C',
          }}
        >
          <Icon name="lock" size={13} color={GD} />
          <Text style={{ color: GR, fontSize: 13, fontWeight: '700', fontFamily: FONT }}>Goals — locked</Text>
        </View>
        <View style={{ padding: 14 }}>
          <Text style={{ color: GD, fontSize: 12, lineHeight: 19, fontFamily: FONT }}>
            Monthly workout, volume, streak, and body-weight goals appear once your CLAWW Score unlocks — log{' '}
            {remaining > 0 ? remaining : 'a few'} more workout{remaining === 1 ? '' : 's'} to get there.
          </Text>
        </View>
      </View>

      <View
        style={{
          backgroundColor: '#151517',
          borderWidth: 1,
          borderColor: 'rgba(255,255,255,0.13)',
          borderLeftWidth: 3,
          borderLeftColor: GD,
          borderRadius: 12,
          paddingHorizontal: 14,
          paddingVertical: 12,
        }}
      >
        <Text style={{ color: GD, fontSize: 9, fontWeight: '700', letterSpacing: 0.9, fontFamily: FONT }}>CLAWW AI · VOLUME ANALYSIS</Text>
        <Text style={{ color: GR, fontSize: 13, fontWeight: '600', marginTop: 8, lineHeight: 19, fontFamily: FONT }}>
          Still collecting data — a volume trend read appears after your first 3 workouts.
        </Text>
      </View>

      <View style={{ flexDirection: 'row', gap: 8 }}>
        <Button variant="ghost" disabled icon={<Icon name="download" size={16} color={GD} />} style={{ flex: 2 }}>
          Export Report
        </Button>
        <Button variant="ghost" disabled style={{ flex: 1 }} icon={<Icon name="share-2" size={15} color={GD} />}>
          Share
        </Button>
      </View>
    </View>
  );
}

function TrackerUnlocked() {
  const KPI = [
    { label: 'CLAWW SCORE', value: '847', sub: '/ 1000', delta: '+42' },
    { label: 'STREAK', value: '14', sub: 'days', delta: '+3' },
    { label: 'WORKOUTS', value: '52', sub: 'sessions', delta: '+8' },
    { label: 'VOLUME', value: '142.8K', sub: 'lbs', delta: '+11.2%' },
  ];
  const GOALS = [
    { label: 'Monthly Workouts', pct: 90 },
    { label: 'Volume Target', pct: 89 },
    { label: 'Active Streak', pct: 47 },
    { label: 'Body Weight Goal', pct: 75 },
  ];

  return (
    <View style={{ paddingHorizontal: 16, paddingTop: 8, paddingBottom: 32, gap: 14 }}>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <View>
          <Text style={{ color: GD, fontSize: 9.5, fontWeight: '700', letterSpacing: 1.1, fontFamily: FONT }}>APR 2026 · PERFORMANCE</Text>
          <Text style={{ color: W, fontSize: 28, fontWeight: '900', letterSpacing: -0.7, marginTop: 6, fontFamily: FONT }}>CLAWW Tracker</Text>
          <Text style={{ color: GD, fontSize: 11.5, marginTop: 5, fontFamily: FONT }}>Precision data · no noise</Text>
        </View>
        <ProgressRing size={68} rings={[{ r: 31, strokeWidth: 6, color: W, pct: 84.7 }]} trackColor="rgba(255,255,255,0.07)">
          <Text style={{ color: W, fontSize: 16, fontWeight: '900', fontFamily: FONT }}>847</Text>
          <Text style={{ color: GD, fontSize: 7.5, fontFamily: FONT }}>/1000</Text>
        </ProgressRing>
      </View>

      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>
        {KPI.map((k) => (
          <KpiTile key={k.label} label={k.label} value={k.value} sub={k.sub} delta={k.delta} />
        ))}
      </View>

      <View style={{ backgroundColor: '#151517', borderWidth: 1, borderColor: 'rgba(255,255,255,0.13)', borderRadius: 16, overflow: 'hidden' }}>
        <View
          style={{
            flexDirection: 'row',
            justifyContent: 'space-between',
            paddingHorizontal: 14,
            paddingVertical: 11,
            borderBottomWidth: 1,
            borderBottomColor: 'rgba(255,255,255,0.13)',
            backgroundColor: '#1A1A1C',
          }}
        >
          <Text style={{ color: W, fontSize: 13, fontWeight: '700', fontFamily: FONT }}>Goals</Text>
          <Text style={{ color: GD, fontSize: 11, fontFamily: FONT }}>2/5 completed</Text>
        </View>
        {GOALS.map((g, i) => (
          <View
            key={g.label}
            style={{
              paddingHorizontal: 14,
              paddingVertical: 11,
              borderTopWidth: i > 0 ? 1 : 0,
              borderTopColor: 'rgba(255,255,255,0.07)',
            }}
          >
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 7 }}>
              <Text style={{ color: GR, fontSize: 12, fontFamily: FONT }}>{g.label}</Text>
              <Text style={{ color: g.pct >= 75 ? WD : GR, fontSize: 20, fontWeight: '900', fontFamily: FONT }}>
                {g.pct}
                <Text style={{ color: GD, fontSize: 10 }}>%</Text>
              </Text>
            </View>
            <ProgressBar pct={g.pct} color={g.pct >= 75 ? WD : GR} height={3} glow={false} />
          </View>
        ))}
      </View>

      <View
        style={{
          backgroundColor: '#151517',
          borderWidth: 1,
          borderColor: 'rgba(255,255,255,0.13)',
          borderLeftWidth: 3,
          borderLeftColor: W,
          borderRadius: 12,
          paddingHorizontal: 14,
          paddingVertical: 12,
        }}
      >
        <Text style={{ color: GD, fontSize: 9, fontWeight: '700', letterSpacing: 0.9, fontFamily: FONT }}>CLAWW AI · VOLUME ANALYSIS</Text>
        <Text style={{ color: W, fontSize: 34, fontWeight: '900', letterSpacing: -1.5, marginVertical: 6, fontFamily: FONT }}>+11.2%</Text>
        <Text style={{ color: WD, fontSize: 12, fontWeight: '600', fontFamily: FONT }}>Volume trending above baseline</Text>
      </View>

      <View style={{ flexDirection: 'row', gap: 8 }}>
        <Button variant="inverted" icon={<Icon name="download" size={16} color="#000" />} style={{ flex: 2 }}>
          Export Report
        </Button>
        <Button variant="ghost" style={{ flex: 1 }} icon={<Icon name="share-2" size={15} color={GR} />}>
          Share
        </Button>
      </View>
    </View>
  );
}

export default function TrackerTab() {
  const { workoutsCompleted } = useAppState();
  const locked = workoutsCompleted < UNLOCK_AT;
  return (
    <ScrollView style={{ flex: 1, backgroundColor: '#050505' }} showsVerticalScrollIndicator={false}>
      {locked ? <TrackerLocked workoutsCompleted={workoutsCompleted} /> : <TrackerUnlocked />}
    </ScrollView>
  );
}
