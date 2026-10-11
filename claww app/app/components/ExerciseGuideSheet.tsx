import React from 'react';
import { Modal, Pressable, ScrollView, Text, View } from 'react-native';
import { COLORS, FONT } from '../lib/theme';
import type { ExerciseForm } from '../lib/exerciseForm';
import { BodyMap, MUSCLES, viewsFor, type Muscle, type MuscleIntensity } from './BodyMap';
import { PressScale } from './ui/PressScale';

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

export interface ExerciseGuideSheetProps {
  name: string;
  form: ExerciseForm;
  onClose: () => void;
}

/**
 * The full exercise guide (opened by Demo in the player's form strip). Opens
 * as a sheet over the player — the session and rest timer keep running
 * underneath. V2 PHASE 8 adds the History tab and the demo-clip area.
 */
export function ExerciseGuideSheet({ name, form, onClose }: ExerciseGuideSheetProps) {
  const muscles = formMuscles(form);
  return (
    <Modal visible transparent animationType="fade" onRequestClose={onClose} statusBarTranslucent>
      <Pressable onPress={onClose} style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'flex-end' }}>
        <Pressable onPress={() => {}} style={{ backgroundColor: COLORS.card, borderTopLeftRadius: 22, borderTopRightRadius: 22, maxHeight: '88%' }}>
          <ScrollView contentContainerStyle={{ padding: 20, paddingBottom: 32, gap: 16 }}>
            <Text style={{ color: '#fff', fontSize: 20, fontWeight: '900', fontFamily: FONT }}>{name}</Text>

            {muscles.length > 0 ? (
              <View style={{ alignItems: 'center', paddingVertical: 8, borderRadius: 16, backgroundColor: '#0B0B0D' }}>
                <BodyMap muscles={muscles} height={170} views={viewsFor(muscles.map((m) => m.muscle))} />
              </View>
            ) : null}

            {form.primaryMuscle || form.secondaryMuscles.length > 0 ? (
              <Text style={{ color: '#A1A1AA', fontSize: 13, lineHeight: 19, fontFamily: FONT }}>
                {form.primaryMuscle ? (
                  <Text style={{ color: COLORS.blue, fontWeight: '800' }}>{capitalize(form.primaryMuscle)}</Text>
                ) : null}
                {form.secondaryMuscles.length > 0 ? `${form.primaryMuscle ? ' · also ' : ''}${form.secondaryMuscles.join(', ')}` : ''}
              </Text>
            ) : null}

            <View style={{ gap: 10 }}>
              {form.formSteps.map((step, i) => (
                <View key={i} style={{ flexDirection: 'row', gap: 12 }}>
                  <View style={{ width: 26, height: 26, borderRadius: 13, backgroundColor: 'rgba(59,130,246,0.16)', alignItems: 'center', justifyContent: 'center' }}>
                    <Text style={{ color: COLORS.blue, fontSize: 13, fontWeight: '800', fontFamily: FONT }}>{i + 1}</Text>
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

            <PressScale onPress={onClose}>
              <View style={{ height: 50, borderRadius: 14, backgroundColor: 'rgba(255,255,255,0.07)', alignItems: 'center', justifyContent: 'center' }}>
                <Text style={{ color: '#fff', fontSize: 14, fontWeight: '700', fontFamily: FONT }}>Back to workout</Text>
              </View>
            </PressScale>
          </ScrollView>
        </Pressable>
      </Pressable>
    </Modal>
  );
}
