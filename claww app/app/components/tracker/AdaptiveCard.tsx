import React, { useCallback, useMemo, useState } from 'react';
import { sessionName } from '../../lib/format';
import { adaptiveSummary } from '../../lib/adaptiveSummary';
import { Pressable, ScrollView, Text, View } from 'react-native';
import { BottomSheet } from '../ui/BottomSheet';
import { useFocusEffect } from '@react-navigation/native';
import { AREA_COLORS, COLORS, FONT, tint, BG, bg } from '../../lib/theme';
import { useAppState } from '../../lib/appState';
import { getLatestWorkout, getSuggestedDayIndex, getWorkoutDayEvents, type WorkoutRow } from '../../lib/data';
import type { Readiness } from '../../lib/engine';
import { trainedAgoLabel, type Checkin } from '../../lib/muscleRecovery';
import { commandPill, reasonLine } from '../../lib/sessionPrescription';
import { getTodayCheckins, loadBundle, planDayFor, setTodayCheckins, type Bundle } from '../../lib/sessionStart';
import { Icon } from '../ui/Icon';
import { PressScale } from '../ui/PressScale';
import { Surface } from '../ui/Surface';

// The adaptive system, as a small card in the CLAWW Tracker that opens to the muscle check-in and today's prescription
// (it used to be a full screen between Begin Workout and the player). The answers are optional, kept on the phone for
// the day and used when the session starts.

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

function Pill({ label, tone }: { label: string; tone: 'up' | 'down' | 'hold' | 'info' }) {
  const color = tone === 'up' ? COLORS.green : tone === 'down' ? COLORS.amber : tone === 'info' ? E : COLORS.textMuted;
  return (
    <View style={{ paddingHorizontal: 9, paddingVertical: 3, borderRadius: 100, backgroundColor: tint(color, 0.16) }}>
      <Text style={{ color, fontSize: 11, letterSpacing: 0.3, fontFamily: BG[800] }}>{label.toUpperCase()}</Text>
    </View>
  );
}

function Option({ label, active, onPress }: { label: string; active: boolean; onPress: () => void }) {
  return (
    <PressScale onPress={onPress} accessibilityRole="button" accessibilityState={{ selected: active }} accessibilityLabel={label}>
      <View style={{ minWidth: 44, height: 44, paddingHorizontal: 12, borderRadius: 12, alignItems: 'center', justifyContent: 'center', backgroundColor: active ? T : 'rgba(255,255,255,0.06)' }}>
        <Text style={{ color: active ? '#050505' : COLORS.fgGray, fontSize: 13, fontFamily: BG[700] }}>{label}</Text>
      </View>
    </PressScale>
  );
}

export function AdaptiveCard() {
  const { userId } = useAppState();
  const [open, setOpen] = useState(false);
  const [workout, setWorkout] = useState<WorkoutRow | null>(null);
  const [dayIndex, setDayIndex] = useState(0);
  const [bundle, setBundle] = useState<Bundle | null>(null);
  const [checkins, setCheckins] = useState<Record<string, Checkin>>({});
  const [loaded, setLoaded] = useState(false);

  useFocusEffect(
    useCallback(() => {
      if (!userId) return;
      let cancelled = false;
      (async () => {
        const w = await getLatestWorkout(userId);
        if (!w) {
          if (!cancelled) setLoaded(true);
          return;
        }
        const events = await getWorkoutDayEvents(userId, w.id);
        const idx = getSuggestedDayIndex(w.plan, events);
        const [b, c] = await Promise.all([loadBundle(userId, w, idx), getTodayCheckins()]);
        if (cancelled) return;
        setWorkout(w);
        setDayIndex(idx);
        setBundle(b);
        setCheckins(c);
        setLoaded(true);
      })();
      return () => {
        cancelled = true;
      };
    }, [userId])
  );

  const day = workout?.plan.days[dayIndex];
  const planned = useMemo(() => (bundle && workout ? planDayFor(bundle, workout, dayIndex, checkins) : null), [bundle, workout, dayIndex, checkins]);

  if (!loaded || !workout || !day || !bundle || !planned) return null;

  const changed = planned.prescribed.filter((p) => p.managed && commandPill(p.prescription.commands).tone !== 'hold').length;
  const answered = Object.values(checkins).filter((c) => c.soreness !== null || c.readiness !== null).length;
  const summary = adaptiveSummary({ dayLabels: workout.plan.days.map((d) => d.day), focus: sessionName(day.focus), dayLabel: day.day, changed, answered, now: new Date() });

  const setCheckin = (muscle: string, patch: Partial<Checkin>) => {
    const next = { ...checkins, [muscle]: { ...(checkins[muscle] ?? { soreness: null, readiness: null }), ...patch } };
    setCheckins(next);
    setTodayCheckins(next);
  };

  return (
    <Surface padding={0}>
      <Pressable
        onPress={() => setOpen(true)}
        accessibilityRole="button"
        accessibilityState={{ expanded: open }}
        accessibilityLabel={`Adaptive. ${summary}. Open`}
        style={{ minHeight: 64, paddingHorizontal: 16, paddingVertical: 12, flexDirection: 'row', alignItems: 'center', gap: 12 }}
      >
        <View style={{ width: 40, height: 44, borderRadius: 12, alignItems: 'center', justifyContent: 'center', backgroundColor: tint(E, 0.16) }}>
          <Icon name="activity" size={18} color={E} />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={{ color: COLORS.fg, fontSize: 17, fontFamily: BG[800] }}>Adaptive</Text>
          <Text style={{ color: COLORS.textMuted, fontSize: 13, fontFamily: BG[400] }} numberOfLines={2}>{summary}</Text>
        </View>
        <Icon name="chevron-right" size={20} color={COLORS.textMuted} />
      </Pressable>

      {/* Premium T4: the questions open in a sheet, so the Progress page does not jump down. */}
      <BottomSheet visible={open} onClose={() => setOpen(false)} maxHeightFraction={0.9}>
        <ScrollView contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 24, gap: 14 }}>
          <Text style={{ color: COLORS.fg, fontSize: 22, fontFamily: BG[800] }}>Adaptive</Text>
          {bundle.muscles.length > 0 ? (
            <>
              <Text style={{ color: COLORS.textMuted, fontSize: 13, lineHeight: 19, fontFamily: BG[400] }}>
                How do the muscles you train today feel? Optional. Your answers are used when you start the session.
              </Text>
              {bundle.muscles.map((m) => {
                const c = checkins[m];
                return (
                  <View key={m} style={{ gap: 8 }}>
                    <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: 8, flexWrap: 'wrap' }}>
                      <Text style={{ color: COLORS.fg, fontSize: 17, fontFamily: BG[800] }}>{cap(m)}</Text>
                      <Text style={{ color: COLORS.textMuted, fontSize: 13, fontFamily: BG[400] }}>
                        {trainedAgoLabel(planned.scores[m]?.hoursSinceTrained ?? null)}
                        {planned.scores[m]?.score != null ? ` · score ${planned.scores[m].score}${planned.scores[m].band && planned.scores[m].band !== 'Excellent' && planned.scores[m].band !== 'Good' ? ` · ${planned.scores[m].band}` : ''}` : ''}
                      </Text>
                    </View>
                    <Text style={{ color: COLORS.fgGray, fontSize: 13, fontFamily: BG[700] }}>Soreness (0 none, 5 severe)</Text>
                    <View style={{ flexDirection: 'row', gap: 6, flexWrap: 'wrap' }}>
                      {[0, 1, 2, 3, 4, 5].map((n) => (
                        <Option key={n} label={String(n)} active={c?.soreness === n} onPress={() => setCheckin(m, { soreness: c?.soreness === n ? null : n })} />
                      ))}
                    </View>
                    <Text style={{ color: COLORS.fgGray, fontSize: 13, fontFamily: BG[700] }}>How strong does it feel?</Text>
                    <View style={{ flexDirection: 'row', gap: 6, flexWrap: 'wrap' }}>
                      {READINESS.map((r) => (
                        <Option key={r.value} label={r.label} active={c?.readiness === r.value} onPress={() => setCheckin(m, { readiness: c?.readiness === r.value ? null : r.value })} />
                      ))}
                    </View>
                  </View>
                );
              })}
            </>
          ) : null}

          <Text style={{ color: COLORS.fg, fontSize: 17, marginTop: 4, fontFamily: BG[800] }}>{`Today's prescription · ${sessionName(day.focus)}`}</Text>
          {planned.prescribed.map((p) => {
            const pill = commandPill(p.prescription.commands);
            const reason = reasonLine(p);
            const w = p.prescription.weightKg;
            return (
              <View key={p.name} style={{ gap: 6, paddingTop: 10, borderTopWidth: 1, borderTopColor: COLORS.border }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                  <Text style={{ flex: 1, color: COLORS.fg, fontSize: 15, fontFamily: BG[800] }}>{p.name}</Text>
                  {p.managed ? <Pill label={pill.label} tone={pill.tone} /> : null}
                </View>
                <Text style={{ color: COLORS.fg, fontSize: 15, fontVariant: ['tabular-nums'], fontFamily: BG[700] }}>
                  {w !== null ? `${w} kg · ` : ''}
                  {p.prescription.reps} reps {'×'} {p.prescription.sets} sets
                </Text>
                {reason ? <Text style={{ color: E, fontSize: 13, lineHeight: 18, fontFamily: BG[400] }}>{reason}</Text> : null}
              </View>
            );
          })}
        </ScrollView>
      </BottomSheet>
    </Surface>
  );
}
