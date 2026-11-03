import React, { useEffect, useMemo, useState } from 'react';
import { Modal, ScrollView, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { AREA_COLORS, COLORS, FONT, tint } from '../lib/theme';
import { getProfile, type WorkoutRow } from '../lib/data';
import { computeRepRange } from '../lib/engine';
import type { Readiness } from '../lib/engine';
import {
  getCatalog,
  getExerciseProgress,
  getLastWeights,
  getRecentLoggedSets,
  getRecoveryInputs,
  savePrescriptions,
  saveCheckins,
} from '../lib/adaptiveData';
import { catalogKey, muscleScores, musclesForExercises, trainedAgoLabel, type Catalog, type Checkin, type LoggedSet } from '../lib/muscleRecovery';
import { commandPill, prescribeDay, reasonLine, type PrescribedExercise } from '../lib/sessionPrescription';
import type { ExerciseState as EngineState, RepRange } from '../lib/engine';
import { newClientId } from '../lib/setQueueRuntime';
import { Icon } from './ui/Icon';
import { Button } from './ui/Button';
import { PressScale } from './ui/PressScale';
import { Skeleton } from './ui/Skeleton';

const A = COLORS.blue;
const T = AREA_COLORS.recovery;
const E = AREA_COLORS.engine;

const READINESS: { value: Readiness; label: string }[] = [
  { value: 'strong', label: 'Strong' },
  { value: 'normal', label: 'Normal' },
  { value: 'slightly_weak', label: 'Slightly weak' },
  { value: 'weak', label: 'Weak' },
  { value: 'very_weak', label: 'Very weak' },
];

const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

/** What a session needs from the engine: its id and every exercise's prescription. */
export interface SessionStart {
  sessionId: string;
  prescribed: PrescribedExercise[];
  /** The workout with each managed exercise's sets and reps replaced by today's prescription (in memory only; the saved plan is untouched). */
  workout: WorkoutRow;
}

interface Bundle {
  catalog: Catalog;
  progress: Record<string, EngineState>;
  lastWeights: Record<string, number>;
  recentSets: LoggedSet[];
  sleepHours: number | null;
  proteinPct: number | null;
  range: RepRange;
  muscles: string[];
}

export function applyPrescriptions(workout: WorkoutRow, dayIndex: number, prescribed: PrescribedExercise[]): WorkoutRow {
  const byName = new Map(prescribed.map((p) => [p.name, p]));
  const days = workout.plan.days.map((d, i) =>
    i !== dayIndex
      ? d
      : { ...d, exercises: d.exercises.map((ex) => { const p = byName.get(ex.name); return p && p.managed ? { ...ex, sets: p.prescription.sets, reps: p.prescription.reps } : ex; }) }
  );
  return { ...workout, plan: { ...workout.plan, days } };
}

export interface SessionStartFlowProps {
  visible: boolean;
  userId: string | null;
  workout: WorkoutRow;
  dayIndex: number;
  onClose: () => void;
  /** Called with the engine's prescriptions, or with null when the engine has nothing to say (cardio-only day, schema not applied). */
  onBegin: (start: SessionStart | null) => void;
}

function Pill({ label, tone }: { label: string; tone: 'up' | 'down' | 'hold' | 'info' }) {
  const color = tone === 'up' ? COLORS.green : tone === 'down' ? COLORS.amber : tone === 'info' ? E : '#A1A1AA';
  return (
    <View style={{ paddingHorizontal: 9, paddingVertical: 3, borderRadius: 100, backgroundColor: tint(color.startsWith('#') ? color : '#A1A1AA', 0.16) }}>
      <Text style={{ color, fontSize: 10.5, fontWeight: '800', letterSpacing: 0.3, fontFamily: FONT }}>{label.toUpperCase()}</Text>
    </View>
  );
}

function Chip({ label, active, onPress }: { label: string; active: boolean; onPress: () => void }) {
  return (
    <PressScale onPress={onPress} accessibilityRole="button" accessibilityState={{ selected: active }} accessibilityLabel={label}>
      <View style={{ minWidth: 44, height: 40, paddingHorizontal: 12, borderRadius: 12, alignItems: 'center', justifyContent: 'center', backgroundColor: active ? T : 'rgba(255,255,255,0.06)' }}>
        <Text style={{ color: active ? '#050505' : '#D4D4D8', fontSize: 13, fontWeight: '700', fontFamily: FONT }}>{label}</Text>
      </View>
    </PressScale>
  );
}

/**
 * V2 PHASE 7.1 / 7.2 — what happens when the user taps Begin Workout: load
 * the data the engine needs, ask the optional soreness / readiness questions
 * for only the muscles in today's session (Skip always visible, never
 * blocking), then show today's prescription with a command pill and a
 * one-line reason per exercise. Begin saves the check-ins and prescriptions
 * and starts the session.
 */
export function SessionStartFlow({ visible, userId, workout, dayIndex, onClose, onBegin }: SessionStartFlowProps) {
  const [stage, setStage] = useState<'loading' | 'check' | 'plan'>('loading');
  const [bundle, setBundle] = useState<Bundle | null>(null);
  const [checkins, setCheckins] = useState<Record<string, Checkin>>({});
  const [sessionId, setSessionId] = useState('');
  const day = workout.plan.days[dayIndex];

  useEffect(() => {
    if (!visible || !userId || !day) return;
    let cancelled = false;
    setStage('loading');
    setCheckins({});
    setSessionId(newClientId());
    (async () => {
      const names = day.exercises.map((e) => e.name);
      const [catalog, progress, lastWeights, recentSets, recovery, profile] = await Promise.all([
        getCatalog(names),
        getExerciseProgress(userId, names),
        getLastWeights(userId, names),
        getRecentLoggedSets(userId),
        getRecoveryInputs(userId),
        getProfile(userId),
      ]);
      if (cancelled) return;
      const managed = names.some((n) => {
        const c = catalog[catalogKey(n)];
        return c && c.modality === 'strength' && c.primaryMuscle && c.loadable !== null;
      });
      if (!managed) {
        onBegin(null); // nothing for the engine to do: start as before
        return;
      }
      const range = computeRepRange(profile?.goal ?? null, profile?.experience_level ?? null, profile?.age ?? null);
      const muscles = musclesForExercises(names, catalog);
      setBundle({ catalog, progress, lastWeights, recentSets, sleepHours: recovery.sleepHours, proteinPct: recovery.proteinPct, range, muscles });
      setStage(muscles.length > 0 ? 'check' : 'plan');
    })();
    return () => {
      cancelled = true;
    };
    // onBegin is intentionally not a dependency: it changes identity on every render of the caller.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visible, userId, workout.id, dayIndex]);

  const scores = useMemo(
    () => (bundle ? muscleScores(bundle.muscles, bundle.recentSets, bundle.catalog, new Date(), checkins) : {}),
    [bundle, checkins]
  );

  const prescribed = useMemo(
    () =>
      bundle && day
        ? prescribeDay({
            exercises: day.exercises,
            catalog: bundle.catalog,
            progress: bundle.progress,
            range: bundle.range,
            muscleScores: scores,
            sleepHours: bundle.sleepHours,
            proteinPct: bundle.proteinPct,
            lastWeights: bundle.lastWeights,
          })
        : [],
    [bundle, day, scores]
  );

  const setCheckin = (muscle: string, patch: Partial<Checkin>) =>
    setCheckins((prev) => ({ ...prev, [muscle]: { ...(prev[muscle] ?? { soreness: null, readiness: null }), ...patch } }));

  const begin = () => {
    if (userId) {
      saveCheckins(userId, sessionId, checkins).catch(() => {});
      savePrescriptions(userId, sessionId, prescribed).catch(() => {});
    }
    onBegin({ sessionId, prescribed, workout: applyPrescriptions(workout, dayIndex, prescribed) });
  };

  if (!visible) return null;

  return (
    <Modal visible animationType="slide" onRequestClose={onClose} statusBarTranslucent>
      <SafeAreaView style={{ flex: 1, backgroundColor: '#050505' }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 16, paddingTop: 8, paddingBottom: 8 }}>
          <PressScale onPress={onClose} accessibilityRole="button" accessibilityLabel="Close">
            <View style={{ width: 40, height: 40, borderRadius: 12, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(255,255,255,0.06)' }}>
              <Icon name="x" size={18} color="#A1A1AA" />
            </View>
          </PressScale>
          <Text style={{ flex: 1, color: '#A1A1AA', fontSize: 12, fontWeight: '700', letterSpacing: 0.6, fontFamily: FONT }}>
            {stage === 'check' ? 'BEFORE YOU START' : stage === 'plan' ? `TODAY · ${day?.focus?.toUpperCase() ?? ''}` : ''}
          </Text>
        </View>

        {stage === 'loading' || !bundle || !day ? (
          <View style={{ padding: 20, gap: 12 }}>
            <Skeleton height={28} width={200} borderRadius={8} />
            <Skeleton height={110} borderRadius={16} />
            <Skeleton height={110} borderRadius={16} />
          </View>
        ) : stage === 'check' ? (
          <>
            <ScrollView contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 16, gap: 14 }}>
              <Text style={{ color: '#fff', fontSize: 26, fontWeight: '900', letterSpacing: -0.5, fontFamily: FONT }}>How do your muscles feel?</Text>
              <Text style={{ color: '#71717A', fontSize: 13, lineHeight: 19, fontFamily: FONT }}>
                Two quick questions for the muscles you train today. It takes about 10 seconds, and you can skip it.
              </Text>
              {bundle.muscles.map((m) => {
                const c = checkins[m];
                return (
                  <View key={m} style={{ padding: 14, borderRadius: 16, backgroundColor: COLORS.card, borderWidth: 1, borderColor: 'rgba(255,255,255,0.08)', gap: 10 }}>
                    <View>
                      <Text style={{ color: '#fff', fontSize: 16, fontWeight: '800', fontFamily: FONT }}>{cap(m)}</Text>
                      <Text style={{ color: '#71717A', fontSize: 11.5, marginTop: 1, fontFamily: FONT }}>
                        {trainedAgoLabel(scores[m]?.hoursSinceTrained ?? null)}
                      </Text>
                    </View>
                    <Text style={{ color: '#A1A1AA', fontSize: 11.5, fontWeight: '700', fontFamily: FONT }}>Soreness (0 none, 5 severe)</Text>
                    <View style={{ flexDirection: 'row', gap: 6, flexWrap: 'wrap' }}>
                      {[0, 1, 2, 3, 4, 5].map((n) => (
                        <Chip key={n} label={String(n)} active={c?.soreness === n} onPress={() => setCheckin(m, { soreness: c?.soreness === n ? null : n })} />
                      ))}
                    </View>
                    <Text style={{ color: '#A1A1AA', fontSize: 11.5, fontWeight: '700', fontFamily: FONT }}>How strong does it feel?</Text>
                    <View style={{ flexDirection: 'row', gap: 6, flexWrap: 'wrap' }}>
                      {READINESS.map((r) => (
                        <Chip key={r.value} label={r.label} active={c?.readiness === r.value} onPress={() => setCheckin(m, { readiness: c?.readiness === r.value ? null : r.value })} />
                      ))}
                    </View>
                  </View>
                );
              })}
            </ScrollView>
            <View style={{ paddingHorizontal: 20, paddingBottom: 16, gap: 8 }}>
              <Button variant="primary" accent={A} accentDeep={COLORS.blueDeep} size="lg" fullWidth onPress={() => setStage('plan')}>
                See today's plan
              </Button>
              <Button
                variant="ghost"
                fullWidth
                onPress={() => {
                  setCheckins({});
                  setStage('plan');
                }}
              >
                Skip
              </Button>
            </View>
          </>
        ) : (
          <>
            <ScrollView contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 16, gap: 12 }}>
              <Text style={{ color: '#fff', fontSize: 26, fontWeight: '900', letterSpacing: -0.5, fontFamily: FONT }}>Today's prescription</Text>
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>
                {bundle.muscles.map((m) => {
                  const s = scores[m];
                  if (!s || s.score === null) return null;
                  return (
                    <View key={m} style={{ flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 10, paddingVertical: 5, borderRadius: 100, backgroundColor: tint(T, 0.14) }}>
                      <Text style={{ color: T, fontSize: 12, fontWeight: '800', fontFamily: FONT }}>
                        {cap(m)} {s.score}
                        {s.band && s.band !== 'Excellent' && s.band !== 'Good' ? ` · ${s.band}` : ''}
                      </Text>
                    </View>
                  );
                })}
              </View>
              {prescribed.map((p) => {
                const pill = commandPill(p.prescription.commands);
                const reason = reasonLine(p);
                const w = p.prescription.weightKg;
                return (
                  <View key={p.name} style={{ padding: 14, borderRadius: 16, backgroundColor: COLORS.card, borderWidth: 1, borderColor: 'rgba(255,255,255,0.08)', gap: 8 }}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                      <Text style={{ flex: 1, color: '#fff', fontSize: 15.5, fontWeight: '800', fontFamily: FONT }}>{p.name}</Text>
                      {p.managed ? <Pill label={pill.label} tone={pill.tone} /> : null}
                    </View>
                    <Text style={{ color: '#fff', fontSize: 14, fontWeight: '700', fontVariant: ['tabular-nums'], fontFamily: FONT }}>
                      {w !== null ? `${w} kg · ` : ''}
                      {p.prescription.reps} reps × {p.prescription.sets} sets
                    </Text>
                    {reason ? <Text style={{ color: E, fontSize: 12.5, lineHeight: 18, fontFamily: FONT }}>{reason}</Text> : null}
                  </View>
                );
              })}
            </ScrollView>
            <View style={{ paddingHorizontal: 20, paddingBottom: 16 }}>
              <Button variant="primary" accent={A} accentDeep={COLORS.blueDeep} size="lg" fullWidth onPress={begin} icon={<Icon name="play" size={14} color="#fff" />}>
                Begin Workout
              </Button>
            </View>
          </>
        )}
      </SafeAreaView>
    </Modal>
  );
}
