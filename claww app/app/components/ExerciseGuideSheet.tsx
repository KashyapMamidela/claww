import React, { useEffect, useState } from 'react';
import { Modal, Pressable, ScrollView, Text, View } from 'react-native';
import { AREA_COLORS, COLORS, FONT, tint } from '../lib/theme';
import { getExerciseForms } from '../lib/data';
import { getExerciseHistory } from '../lib/adaptiveData';
import { useAppState } from '../lib/appState';
import type { ExerciseForm } from '../lib/exerciseForm';
import { formatSets, type HistorySession } from '../lib/exerciseHistory';
import { BodyMap, MUSCLES, viewsFor, type Muscle, type MuscleIntensity } from './BodyMap';
import { Icon } from './ui/Icon';
import { PressScale } from './ui/PressScale';
import { Skeleton } from './ui/Skeleton';

export function formMuscles(form: ExerciseForm): MuscleIntensity[] {
  const out: MuscleIntensity[] = [];
  const asMuscle = (m: string | null): Muscle | null => (m && (MUSCLES as string[]).includes(m) ? (m as Muscle) : null);
  const primary = asMuscle(form.primaryMuscle);
  if (primary) out.push({ muscle: primary, intensity: 1 });
  for (const m of form.secondaryMuscles) {
    const s = asMuscle(m);
    if (s && s !== primary) out.push({ muscle: s, intensity: 0.4 });
  }
  return out;
}

function capitalize(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

type Tab = 'how' | 'muscles' | 'history';
const TABS: { key: Tab; label: string }[] = [
  { key: 'how', label: 'How to' },
  { key: 'muscles', label: 'Muscles' },
  { key: 'history', label: 'History' },
];

const A = COLORS.blue;

export interface ExerciseGuideSheetProps {
  name: string;
  /** Already-loaded form content (the player has it); loaded from the catalog when omitted. */
  form?: ExerciseForm | null;
  onClose: () => void;
}

/**
 * The full exercise guide (V2 PHASE 8): a spot reserved at the top for a demo
 * clip, then How to (three numbered steps and the common mistake), Muscles
 * (the body map, large) and History (the user's last sessions of this
 * exercise). Opens over whatever screen asked for it, so from the player the
 * session and rest timer keep running underneath. Works from any exercise
 * name: it loads its own content and history by name.
 */
export function ExerciseGuideSheet({ name, form: formProp, onClose }: ExerciseGuideSheetProps) {
  const { userId } = useAppState();
  const [form, setForm] = useState<ExerciseForm | null | undefined>(formProp);
  const [tab, setTab] = useState<Tab>('how');
  const [history, setHistory] = useState<HistorySession[] | null>(null);

  useEffect(() => {
    if (formProp !== undefined) return;
    let cancelled = false;
    getExerciseForms([name]).then((f) => {
      if (!cancelled) setForm(f[name] ?? null);
    });
    return () => {
      cancelled = true;
    };
  }, [name, formProp]);

  useEffect(() => {
    if (tab !== 'history' || history !== null || !userId) return;
    let cancelled = false;
    getExerciseHistory(userId, name).then((h) => {
      if (!cancelled) setHistory(h);
    });
    return () => {
      cancelled = true;
    };
  }, [tab, history, userId, name]);

  const muscles = form ? formMuscles(form) : [];

  return (
    <Modal visible transparent animationType="fade" onRequestClose={onClose} statusBarTranslucent>
      <Pressable onPress={onClose} style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'flex-end' }}>
        <Pressable onPress={() => {}} style={{ backgroundColor: COLORS.card, borderTopLeftRadius: 22, borderTopRightRadius: 22, maxHeight: '90%' }}>
          <ScrollView contentContainerStyle={{ padding: 20, paddingBottom: 32, gap: 16 }} showsVerticalScrollIndicator={false}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
              <Text style={{ flex: 1, color: '#fff', fontSize: 20, fontWeight: '900', fontFamily: FONT }}>{name}</Text>
              <PressScale onPress={onClose} accessibilityRole="button" accessibilityLabel="Close guide">
                <View style={{ width: 36, height: 36, borderRadius: 12, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(255,255,255,0.07)' }}>
                  <Icon name="x" size={16} color="#A1A1AA" />
                </View>
              </PressScale>
            </View>

            {/* Reserved for the looping demo clip (V2 PHASE 11 makes them). */}
            <View style={{ height: 150, borderRadius: 16, backgroundColor: '#0B0B0D', borderWidth: 1, borderColor: 'rgba(255,255,255,0.06)', alignItems: 'center', justifyContent: 'center', gap: 6 }} accessibilityLabel="Demo clip placeholder">
              <Icon name="play" size={22} color="#3F3F46" />
              <Text style={{ color: '#52525B', fontSize: 11.5, fontFamily: FONT }}>Demo clip coming soon</Text>
            </View>

            <View style={{ flexDirection: 'row', gap: 6 }}>
              {TABS.map((t) => (
                <PressScale key={t.key} style={{ flex: 1 }} onPress={() => setTab(t.key)} accessibilityRole="button" accessibilityState={{ selected: tab === t.key }}>
                  <View style={{ height: 38, borderRadius: 11, alignItems: 'center', justifyContent: 'center', backgroundColor: tab === t.key ? tint(A, 0.18) : 'rgba(255,255,255,0.05)' }}>
                    <Text style={{ color: tab === t.key ? A : '#A1A1AA', fontSize: 13, fontWeight: '700', fontFamily: FONT }}>{t.label}</Text>
                  </View>
                </PressScale>
              ))}
            </View>

            {tab === 'how' ? (
              form === undefined ? (
                <Skeleton height={120} borderRadius={14} />
              ) : form && form.formSteps.length > 0 ? (
                <>
                  <View style={{ gap: 10 }}>
                    {form.formSteps.map((step, i) => (
                      <View key={i} style={{ flexDirection: 'row', gap: 12 }}>
                        <View style={{ width: 26, height: 26, borderRadius: 13, backgroundColor: tint(A, 0.16), alignItems: 'center', justifyContent: 'center' }}>
                          <Text style={{ color: A, fontSize: 13, fontWeight: '800', fontFamily: FONT }}>{i + 1}</Text>
                        </View>
                        <Text style={{ flex: 1, color: '#fff', fontSize: 14, lineHeight: 21, fontFamily: FONT }}>{step}</Text>
                      </View>
                    ))}
                  </View>
                  {form.commonMistake ? (
                    <View style={{ padding: 14, borderRadius: 14, backgroundColor: COLORS.dangerDim, borderWidth: 1, borderColor: COLORS.dangerBorder }}>
                      <Text style={{ color: COLORS.danger, fontSize: 11, fontWeight: '800', letterSpacing: 0.7, marginBottom: 4, fontFamily: FONT }}>COMMON MISTAKE</Text>
                      <Text style={{ color: '#fff', fontSize: 13.5, lineHeight: 20, fontFamily: FONT }}>{form.commonMistake}</Text>
                    </View>
                  ) : null}
                </>
              ) : (
                <Text style={{ color: '#71717A', fontSize: 13, lineHeight: 19, fontFamily: FONT }}>No how-to for this exercise yet.</Text>
              )
            ) : null}

            {tab === 'muscles' ? (
              form === undefined ? (
                <Skeleton height={220} borderRadius={14} />
              ) : muscles.length > 0 && form ? (
                <>
                  <View style={{ alignItems: 'center', paddingVertical: 14, borderRadius: 16, backgroundColor: '#0B0B0D' }}>
                    <BodyMap muscles={muscles} height={260} views={viewsFor(muscles.map((m) => m.muscle))} />
                  </View>
                  <View style={{ gap: 8 }}>
                    {form.primaryMuscle ? (
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                        <View style={{ width: 10, height: 10, borderRadius: 5, backgroundColor: A }} />
                        <Text style={{ color: '#fff', fontSize: 14, fontWeight: '700', fontFamily: FONT }}>{capitalize(form.primaryMuscle)}</Text>
                        <Text style={{ color: '#71717A', fontSize: 12, fontFamily: FONT }}>main muscle</Text>
                      </View>
                    ) : null}
                    {form.secondaryMuscles.map((m) => (
                      <View key={m} style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                        <View style={{ width: 10, height: 10, borderRadius: 5, backgroundColor: tint(A, 0.4) }} />
                        <Text style={{ color: '#D4D4D8', fontSize: 14, fontWeight: '600', fontFamily: FONT }}>{capitalize(m)}</Text>
                        <Text style={{ color: '#71717A', fontSize: 12, fontFamily: FONT }}>also worked</Text>
                      </View>
                    ))}
                  </View>
                </>
              ) : (
                <Text style={{ color: '#71717A', fontSize: 13, lineHeight: 19, fontFamily: FONT }}>No muscle information for this exercise yet.</Text>
              )
            ) : null}

            {tab === 'history' ? (
              history === null ? (
                <View style={{ gap: 8 }}>
                  <Skeleton height={64} borderRadius={14} />
                  <Skeleton height={64} borderRadius={14} />
                </View>
              ) : history.length === 0 ? (
                <Text style={{ color: '#71717A', fontSize: 13, lineHeight: 19, fontFamily: FONT }}>
                  You haven't logged this exercise yet. Your last sessions will show up here.
                </Text>
              ) : (
                <View style={{ gap: 8 }}>
                  {history.map((s) => (
                    <View key={s.day} style={{ padding: 12, borderRadius: 14, backgroundColor: 'rgba(255,255,255,0.04)', gap: 4 }}>
                      <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                        <Text style={{ color: '#fff', fontSize: 13.5, fontWeight: '800', fontFamily: FONT }}>
                          {new Date(s.startedAt).toLocaleDateString([], { weekday: 'short', day: 'numeric', month: 'short' })}
                        </Text>
                        {s.topWeight > 0 ? (
                          <Text style={{ color: AREA_COLORS.workouts, fontSize: 12, fontWeight: '700', fontFamily: FONT }}>top {Math.round(s.topWeight * 100) / 100} kg</Text>
                        ) : null}
                      </View>
                      <Text style={{ color: '#A1A1AA', fontSize: 12.5, lineHeight: 18, fontVariant: ['tabular-nums'], fontFamily: FONT }}>{formatSets(s.sets)}</Text>
                    </View>
                  ))}
                </View>
              )
            ) : null}

            <PressScale onPress={onClose}>
              <View style={{ height: 50, borderRadius: 14, backgroundColor: 'rgba(255,255,255,0.07)', alignItems: 'center', justifyContent: 'center' }}>
                <Text style={{ color: '#fff', fontSize: 14, fontWeight: '700', fontFamily: FONT }}>Done</Text>
              </View>
            </PressScale>
          </ScrollView>
        </Pressable>
      </Pressable>
    </Modal>
  );
}
