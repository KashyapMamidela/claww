import React, { useEffect, useState } from 'react';
import { Modal, Pressable, ScrollView, Text, View } from 'react-native';
import { AREA_COLORS, COLORS, FONT, tint, BG, bg } from '../lib/theme';
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
              <Text style={{ flex: 1, color: '#fff', fontSize: 20, fontVariant: ['tabular-nums'], fontFamily: BG[800] }}>{name}</Text>
              <PressScale onPress={onClose} accessibilityRole="button" accessibilityLabel="Close guide">
                <View style={{ width: 36, height: 36, borderRadius: 12, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(255,255,255,0.07)' }}>
                  <Icon name="x" size={16} color="#A1A1AA" />
                </View>
              </PressScale>
            </View>

            {/* The demo clip area returns when V2 PHASE 11's clips exist; an empty placeholder made the guide feel unfinished. */}

            <View style={{ flexDirection: 'row', gap: 6 }}>
              {TABS.map((t) => (
                <PressScale key={t.key} style={{ flex: 1 }} onPress={() => setTab(t.key)} accessibilityRole="button" accessibilityState={{ selected: tab === t.key }}>
                  <View style={{ height: 40, borderRadius: 10, alignItems: 'center', justifyContent: 'center', backgroundColor: tab === t.key ? tint(A, 0.18) : 'rgba(255,255,255,0.05)' }}>
                    <Text style={{ color: tab === t.key ? A : '#A1A1AA', fontSize: 13, fontFamily: BG[700] }}>{t.label}</Text>
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
                          <Text style={{ color: A, fontSize: 13, fontFamily: BG[800] }}>{i + 1}</Text>
                        </View>
                        <Text style={{ flex: 1, color: '#fff', fontSize: 15, lineHeight: 21, fontFamily: BG[400] }}>{step}</Text>
                      </View>
                    ))}
                  </View>
                  {form.commonMistake ? (
                    <View style={{ padding: 14, borderRadius: 14, backgroundColor: COLORS.dangerDim, borderWidth: 1, borderColor: COLORS.dangerBorder }}>
                      <Text style={{ color: COLORS.danger, fontSize: 11, letterSpacing: 0.7, marginBottom: 4, fontFamily: BG[800] }}>COMMON MISTAKE</Text>
                      <Text style={{ color: '#fff', fontSize: 15, lineHeight: 20, fontFamily: BG[400] }}>{form.commonMistake}</Text>
                    </View>
                  ) : null}
                </>
              ) : (
                <Text style={{ color: COLORS.textMuted, fontSize: 13, lineHeight: 19, fontFamily: BG[400] }}>No how-to for this exercise yet.</Text>
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
                        <Text style={{ color: '#fff', fontSize: 15, fontFamily: BG[700] }}>{capitalize(form.primaryMuscle)}</Text>
                        <Text style={{ color: COLORS.textMuted, fontSize: 13, fontFamily: BG[400] }}>main muscle</Text>
                      </View>
                    ) : null}
                    {form.secondaryMuscles.map((m) => (
                      <View key={m} style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                        <View style={{ width: 10, height: 10, borderRadius: 5, backgroundColor: tint(A, 0.4) }} />
                        <Text style={{ color: '#D4D4D8', fontSize: 15, fontFamily: BG[600] }}>{capitalize(m)}</Text>
                        <Text style={{ color: COLORS.textMuted, fontSize: 13, fontFamily: BG[400] }}>also worked</Text>
                      </View>
                    ))}
                  </View>
                </>
              ) : (
                <Text style={{ color: COLORS.textMuted, fontSize: 13, lineHeight: 19, fontFamily: BG[400] }}>No muscle information for this exercise yet.</Text>
              )
            ) : null}

            {tab === 'history' ? (
              history === null ? (
                <View style={{ gap: 8 }}>
                  <Skeleton height={64} borderRadius={14} />
                  <Skeleton height={64} borderRadius={14} />
                </View>
              ) : history.length === 0 ? (
                <Text style={{ color: COLORS.textMuted, fontSize: 13, lineHeight: 19, fontFamily: BG[400] }}>
                  You haven't logged this exercise yet. Your last sessions will show up here.
                </Text>
              ) : (
                <View style={{ gap: 8 }}>
                  {history.map((s) => (
                    <View key={s.day} style={{ padding: 12, borderRadius: 14, backgroundColor: 'rgba(255,255,255,0.04)', gap: 4 }}>
                      <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                        <Text style={{ color: '#fff', fontSize: 15, fontFamily: BG[800] }}>
                          {new Date(s.startedAt).toLocaleDateString([], { weekday: 'short', day: 'numeric', month: 'short' })}
                        </Text>
                        {s.topWeight > 0 ? (
                          <Text style={{ color: AREA_COLORS.workouts, fontSize: 13, fontFamily: BG[700] }}>top {Math.round(s.topWeight * 100) / 100} kg</Text>
                        ) : null}
                      </View>
                      <Text style={{ color: '#A1A1AA', fontSize: 13, lineHeight: 18, fontVariant: ['tabular-nums'], fontFamily: BG[400] }}>{formatSets(s.sets)}</Text>
                    </View>
                  ))}
                </View>
              )
            ) : null}

          </ScrollView>
        </Pressable>
      </Pressable>
    </Modal>
  );
}
