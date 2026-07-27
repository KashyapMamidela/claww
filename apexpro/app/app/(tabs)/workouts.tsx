import React, { useEffect, useState } from 'react';
import { ScrollView, Text, TouchableOpacity, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { COLORS, FONT } from '../../lib/theme';
import { useAppState } from '../../lib/appState';
import { Icon } from '../../components/ui/Icon';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
import { Chip } from '../../components/ui/Chip';
import { ProgressBar } from '../../components/ui/ProgressBar';

const A = COLORS.blue;
const A2 = COLORS.blueMid;
const A3 = COLORS.blueDeep;

const QUEUE = [
  { name: 'Bench Press', sets: 4, reps: '8–10' },
  { name: 'Incline DB Press', sets: 3, reps: '10–12' },
  { name: 'Cable Flyes', sets: 3, reps: '12–15' },
  { name: 'Skull Crushers', sets: 3, reps: '10' },
  { name: 'Lateral Raises', sets: 4, reps: '15' },
];

function useTimer(running: boolean) {
  const [elapsed, setElapsed] = useState(0);
  useEffect(() => {
    if (!running) return;
    const id = setInterval(() => setElapsed((e) => e + 1), 1000);
    return () => clearInterval(id);
  }, [running]);
  const mm = String(Math.floor(elapsed / 60)).padStart(2, '0');
  const ss = String(elapsed % 60).padStart(2, '0');
  return `${mm}:${ss}`;
}

function LiveWorkoutPlayer() {
  const [isPlaying, setIsPlaying] = useState(true);
  const [idx, setIdx] = useState(2);
  const [expanded, setExpanded] = useState(false);
  const [visible, setVisible] = useState(true);
  const timer = useTimer(isPlaying);
  const current = QUEUE[idx];

  if (!visible) return null;

  const ctl = (icon: string, size: number, box: number, onPress: () => void, strong = false) => (
    <TouchableOpacity
      activeOpacity={0.8}
      onPress={onPress}
      style={{
        width: box,
        height: box,
        borderRadius: box > 34 ? 11 : 9,
        backgroundColor: strong ? 'rgba(255,255,255,0.18)' : 'rgba(255,255,255,0.10)',
        borderWidth: 1,
        borderColor: strong ? 'rgba(255,255,255,0.28)' : 'rgba(255,255,255,0.16)',
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      <Icon name={icon} size={size} color={strong ? '#fff' : 'rgba(255,255,255,0.75)'} />
    </TouchableOpacity>
  );

  return (
    <View style={{ position: 'absolute', bottom: 10, left: 12, right: 12 }}>
      <LinearGradient
        colors={['#0A1628', '#0F2044', 'rgba(29,78,216,0.92)']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={{
          borderRadius: 18,
          borderWidth: 1,
          borderColor: 'rgba(59,130,246,0.40)',
          paddingHorizontal: 14,
          paddingVertical: 10,
        }}
      >
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
          <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: '#fff', opacity: isPlaying ? 1 : 0.35 }} />
          <View style={{ flex: 1, minWidth: 0 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
              <Text style={{ color: 'rgba(255,255,255,0.6)', fontSize: 9.5, fontWeight: '700', letterSpacing: 0.7, fontFamily: FONT }}>
                {isPlaying ? 'LIVE' : 'PAUSED'} · {timer}
              </Text>
              <View style={{ backgroundColor: 'rgba(255,255,255,0.12)', borderRadius: 3, paddingHorizontal: 5, paddingVertical: 1 }}>
                <Text style={{ fontSize: 8.5, fontWeight: '700', color: 'rgba(255,255,255,0.65)', fontFamily: FONT }}>
                  {idx + 1}/{QUEUE.length}
                </Text>
              </View>
            </View>
            <Text numberOfLines={1} style={{ color: '#fff', fontSize: 13, fontWeight: '800', fontFamily: FONT }}>
              {current.name}
            </Text>
            <Text style={{ color: 'rgba(255,255,255,0.55)', fontSize: 10.5, fontFamily: FONT }}>
              {current.sets} sets · {current.reps} reps
            </Text>
          </View>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
            {ctl(isPlaying ? 'pause' : 'play', 16, 38, () => setIsPlaying((p) => !p), true)}
            {ctl('skip-forward', 14, 32, () => setIdx((i) => Math.min(QUEUE.length - 1, i + 1)))}
            <TouchableOpacity onPress={() => setExpanded((x) => !x)} style={{ width: 28, height: 28, alignItems: 'center', justifyContent: 'center' }}>
              <Icon name="chevron-up" size={14} color="rgba(255,255,255,0.5)" />
            </TouchableOpacity>
            <TouchableOpacity onPress={() => setVisible(false)} style={{ width: 22, height: 22, alignItems: 'center', justifyContent: 'center' }}>
              <Icon name="x" size={12} color="rgba(255,255,255,0.35)" />
            </TouchableOpacity>
          </View>
        </View>
        <View style={{ marginTop: 8, height: 2, backgroundColor: 'rgba(255,255,255,0.12)', borderRadius: 100, overflow: 'hidden' }}>
          <View style={{ height: '100%', borderRadius: 100, width: `${(idx / QUEUE.length) * 100}%`, backgroundColor: 'rgba(255,255,255,0.75)' }} />
        </View>
        {expanded && (
          <View style={{ marginTop: 12, gap: 6 }}>
            {QUEUE.map((ex, i) => {
              const done = i < idx;
              const isCurr = i === idx;
              return (
                <TouchableOpacity
                  key={ex.name}
                  activeOpacity={0.8}
                  onPress={() => setIdx(i)}
                  style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    gap: 10,
                    paddingHorizontal: 10,
                    paddingVertical: 8,
                    borderRadius: 10,
                    backgroundColor: isCurr ? 'rgba(255,255,255,0.10)' : 'rgba(255,255,255,0.04)',
                    borderWidth: 1,
                    borderColor: isCurr ? 'rgba(255,255,255,0.20)' : 'rgba(255,255,255,0.06)',
                    opacity: done ? 0.45 : 1,
                  }}
                >
                  <View
                    style={{
                      width: 20,
                      height: 20,
                      borderRadius: 10,
                      backgroundColor: done ? 'rgba(34,197,94,0.20)' : isCurr ? 'rgba(255,255,255,0.18)' : 'rgba(255,255,255,0.07)',
                      borderWidth: 1,
                      borderColor: done ? 'rgba(34,197,94,0.45)' : isCurr ? 'rgba(255,255,255,0.35)' : 'rgba(255,255,255,0.12)',
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    <Text style={{ color: done ? COLORS.green : 'rgba(255,255,255,0.65)', fontSize: 10, fontWeight: '700', fontFamily: FONT }}>
                      {done ? '✓' : i + 1}
                    </Text>
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text
                      style={{
                        color: done ? 'rgba(255,255,255,0.45)' : isCurr ? '#fff' : 'rgba(255,255,255,0.75)',
                        fontSize: 12,
                        fontWeight: isCurr ? '700' : '500',
                        textDecorationLine: done ? 'line-through' : 'none',
                        fontFamily: FONT,
                      }}
                    >
                      {ex.name}
                    </Text>
                    <Text style={{ color: 'rgba(255,255,255,0.4)', fontSize: 10, fontFamily: FONT }}>
                      {ex.sets} × {ex.reps}
                    </Text>
                  </View>
                </TouchableOpacity>
              );
            })}
          </View>
        )}
      </LinearGradient>
    </View>
  );
}

function WorkoutsEmptyState() {
  const { generatePlan } = useAppState();
  return (
    <View style={{ paddingHorizontal: 16, paddingTop: 8, paddingBottom: 40, gap: 16 }}>
      <View>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 3 }}>
          <View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: A }} />
          <Text style={{ color: A, fontSize: 10, fontWeight: '700', letterSpacing: 0.9, fontFamily: FONT }}>WORKOUTS</Text>
        </View>
        <Text style={{ color: '#fff', fontSize: 28, fontWeight: '900', letterSpacing: -0.6, fontFamily: FONT }}>No plan yet</Text>
      </View>

      <View
        style={{
          backgroundColor: '#151517',
          borderWidth: 1,
          borderColor: 'rgba(59,130,246,0.30)',
          borderRadius: 20,
          paddingHorizontal: 24,
          paddingVertical: 32,
          alignItems: 'center',
          gap: 16,
        }}
      >
        <View
          style={{
            width: 72,
            height: 72,
            borderRadius: 20,
            backgroundColor: COLORS.blueDim,
            borderWidth: 1,
            borderColor: 'rgba(59,130,246,0.30)',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <Icon name="dumbbell" size={32} color={A} />
        </View>
        <View style={{ alignItems: 'center' }}>
          <Text style={{ color: '#fff', fontSize: 18, fontWeight: '800', marginBottom: 8, fontFamily: FONT }}>
            Your training plan lives here
          </Text>
          <Text style={{ color: '#71717A', fontSize: 13, lineHeight: 20, maxWidth: 280, textAlign: 'center', fontFamily: FONT }}>
            CLAWW builds a personalised plan from your profile and recovery — exercises, sets, and rest all tuned to you, updating as
            you log more days.
          </Text>
        </View>
        <Button
          variant="primary"
          accent={A}
          accentDeep={A3}
          size="lg"
          fullWidth
          onPress={generatePlan}
          icon={<Icon name="wand-2" size={16} color="#fff" />}
          style={{ marginTop: 4 }}
        >
          Generate My First Plan
        </Button>
      </View>
    </View>
  );
}

export default function WorkoutsTab() {
  const { isNewUser } = useAppState();
  const router = useRouter();
  const [filter, setFilter] = useState('Today');

  if (isNewUser) {
    return (
      <ScrollView style={{ flex: 1, backgroundColor: '#050505' }} showsVerticalScrollIndicator={false}>
        <WorkoutsEmptyState />
      </ScrollView>
    );
  }

  const EXERCISES = [
    { name: 'Bench Press', muscle: 'Chest', sets: 4, reps: '8–10', weight: '185 lb', done: true, progress: 100 },
    { name: 'Incline DB Press', muscle: 'Chest', sets: 3, reps: '10–12', weight: '75 lb', done: true, progress: 100 },
    { name: 'Cable Flyes', muscle: 'Chest', sets: 3, reps: '12–15', weight: '45 lb', done: false, progress: 33 },
    { name: 'Skull Crushers', muscle: 'Triceps', sets: 3, reps: '10', weight: '65 lb', done: false, progress: 0 },
    { name: 'Lateral Raises', muscle: 'Shoulders', sets: 4, reps: '15', weight: '25 lb', done: false, progress: 0 },
  ];
  const done = EXERCISES.filter((e) => e.done).length;
  const pct = Math.round((done / EXERCISES.length) * 100);

  return (
    <View style={{ flex: 1, backgroundColor: '#050505' }}>
      <ScrollView showsVerticalScrollIndicator={false}>
        <View style={{ paddingHorizontal: 16, paddingTop: 8, paddingBottom: 100, gap: 16 }}>
          <View>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 3 }}>
              <View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: A }} />
              <Text style={{ color: A, fontSize: 10, fontWeight: '700', letterSpacing: 0.9, fontFamily: FONT }}>PUSH DAY · APR 14</Text>
            </View>
            <Text style={{ color: '#fff', fontSize: 28, fontWeight: '900', letterSpacing: -0.6, fontFamily: FONT }}>Workouts</Text>
          </View>

          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 7 }}>
            {['All', 'Today', 'Strength', 'HIIT', 'Cardio'].map((f) => (
              <Chip key={f} active={f === filter} accent={A} accentDeep={A3} onPress={() => setFilter(f)}>
                {f}
              </Chip>
            ))}
          </ScrollView>

          <LinearGradient
            colors={[A3, A2, A]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={{ borderRadius: 20, borderWidth: 1, borderColor: 'rgba(59,130,246,0.48)', paddingHorizontal: 18, paddingTop: 18, paddingBottom: 16 }}
          >
            <Badge color="#fff">ACTIVE SESSION</Badge>
            <Text style={{ color: '#fff', fontSize: 21, fontWeight: '900', letterSpacing: -0.4, marginTop: 10, fontFamily: FONT }}>
              Upper Body{'\n'}Hypertrophy
            </Text>
            <View style={{ flexDirection: 'row', gap: 14, marginTop: 10 }}>
              {['55 min', '5 exercises', '420 cal'].map((t) => (
                <Text key={t} style={{ color: 'rgba(255,255,255,0.75)', fontSize: 11, fontFamily: FONT }}>
                  {t}
                </Text>
              ))}
            </View>
            <View style={{ marginTop: 16 }}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 6 }}>
                <Text style={{ color: 'rgba(255,255,255,0.6)', fontSize: 11, fontFamily: FONT }}>
                  {done} of {EXERCISES.length} exercises complete
                </Text>
                <Text style={{ color: '#fff', fontSize: 11, fontWeight: '700', fontFamily: FONT }}>{pct}%</Text>
              </View>
              <ProgressBar pct={pct} color="#fff" glow={false} height={5} />
            </View>
          </LinearGradient>

          <View>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
              <Text style={{ color: '#fff', fontSize: 14, fontWeight: '700', fontFamily: FONT }}>Today's Exercises</Text>
              <Badge color={A}>{EXERCISES.length} total</Badge>
            </View>
            <View style={{ gap: 8 }}>
              {EXERCISES.map((ex) => (
                <View
                  key={ex.name}
                  style={{
                    backgroundColor: ex.done ? 'rgba(21,21,23,0.6)' : '#151517',
                    borderWidth: 1,
                    borderColor: ex.progress > 0 && !ex.done ? 'rgba(59,130,246,0.26)' : 'rgba(255,255,255,0.08)',
                    borderRadius: 14,
                    paddingHorizontal: 14,
                    paddingVertical: 12,
                    opacity: ex.done ? 0.62 : 1,
                  }}
                >
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 8 }}>
                    <Icon name={ex.done ? 'check-circle-2' : 'circle'} size={20} color={ex.done ? A : '#71717A'} />
                    <View style={{ flex: 1 }}>
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 7 }}>
                        <Text
                          style={{
                            color: '#fff',
                            fontSize: 13,
                            fontWeight: '700',
                            textDecorationLine: ex.done ? 'line-through' : 'none',
                            fontFamily: FONT,
                          }}
                        >
                          {ex.name}
                        </Text>
                        <Badge color={A} size="sm">
                          {ex.muscle.toUpperCase()}
                        </Badge>
                      </View>
                      <Text style={{ color: '#71717A', fontSize: 11, marginTop: 2, fontFamily: FONT }}>
                        {ex.sets} sets · {ex.reps} reps · {ex.weight}
                      </Text>
                    </View>
                    <Text style={{ color: ex.done ? '#71717A' : ex.progress > 0 ? A : '#71717A', fontSize: 15, fontWeight: '800', fontFamily: FONT }}>
                      {ex.progress}%
                    </Text>
                  </View>
                  <ProgressBar pct={ex.progress} color={A} />
                </View>
              ))}
            </View>
          </View>

          <Button
            variant="primary"
            accent={A}
            accentDeep={A3}
            size="lg"
            fullWidth
            onPress={() => router.push('/workout-complete')}
            icon={<Icon name="play" size={14} color="#fff" />}
          >
            Begin Workout
          </Button>
        </View>
      </ScrollView>
      <LiveWorkoutPlayer />
    </View>
  );
}
