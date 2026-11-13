import React, { useState } from 'react';
import { Modal, Text, TouchableOpacity, View } from 'react-native';
import { COLORS, FONT, BG, bg } from '../lib/theme';
import { useAppState } from '../lib/appState';
import { Icon } from './ui/Icon';
import { ExercisePickerModal } from './ExercisePickerModal';
import { logAdHocSession, type CatalogExercise, type Equipment, type Modality } from '../lib/data';

export interface LogSessionModalProps {
  visible: boolean;
  equipment: Equipment;
  onClose: () => void;
  onLogged: () => void;
}

type Step = 'modality' | 'exercise' | 'details';

/** Item #17 — logging a cardio/strength session that isn't part of the
 * generated plan (e.g. an extra run, or an extra lifting session). Real
 * exercises from the same catalog generate-plan uses, real numbers,
 * written straight to workout_logs so it counts toward streak/volume like
 * anything else. */
export function LogSessionModal({ visible, equipment, onClose, onLogged }: LogSessionModalProps) {
  const { userId } = useAppState();
  const [step, setStep] = useState<Step>('modality');
  const [modality, setModality] = useState<Modality>('strength');
  const [exercise, setExercise] = useState<CatalogExercise | null>(null);
  const [reps, setReps] = useState(10);
  const [weight, setWeight] = useState(0);
  const [durationMinutes, setDurationMinutes] = useState(20);
  const [saving, setSaving] = useState(false);

  const reset = () => {
    setStep('modality');
    setExercise(null);
    setReps(10);
    setWeight(0);
    setDurationMinutes(20);
  };

  const close = () => {
    reset();
    onClose();
  };

  const submit = async () => {
    if (!userId || !exercise || saving) return;
    setSaving(true);
    const ok = await logAdHocSession(userId, {
      exerciseName: exercise.name,
      exerciseId: exercise.id,
      modality,
      reps: modality === 'strength' ? reps : undefined,
      weight: modality === 'strength' ? weight : undefined,
      durationMinutes: modality === 'cardio' ? durationMinutes : undefined,
    });
    setSaving(false);
    if (ok) {
      reset();
      onLogged();
    }
  };

  const stepper = (label: string, value: number, unit: string, onChange: (v: number) => void, step: number) => (
    <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
      <Text style={{ color: '#A1A1AA', fontSize: 13, fontFamily: BG[600] }}>{label}</Text>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
        <TouchableOpacity accessibilityRole="button" accessibilityLabel="Decrease" hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }} onPress={() => onChange(Math.max(0, value - step))} style={{ padding: 6 }}>
          <Icon name="chevron-left" size={16} color="#fff" />
        </TouchableOpacity>
        <Text style={{ color: '#fff', fontSize: 17, width: 56, textAlign: 'center', fontFamily: BG[800] }}>
          {value}
          {unit}
        </Text>
        <TouchableOpacity accessibilityRole="button" accessibilityLabel="Increase" hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }} onPress={() => onChange(value + step)} style={{ padding: 6 }}>
          <Icon name="chevron-right" size={16} color="#fff" />
        </TouchableOpacity>
      </View>
    </View>
  );

  if (step === 'exercise') {
    return (
      <ExercisePickerModal
        visible={visible}
        equipment={equipment}
        modality={modality}
        onSelect={(ex) => {
          setExercise(ex);
          setStep('details');
        }}
        onClose={close}
      />
    );
  }

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={close}>
      <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.65)', alignItems: 'center', justifyContent: 'center', padding: 24 }}>
        <View
          style={{
            width: '100%',
            maxWidth: 380,
            backgroundColor: COLORS.card,
            borderWidth: 1,
            borderColor: COLORS.border,
            borderRadius: 18,
            padding: 20,
            gap: 16,
          }}
        >
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
            <Text style={{ color: '#fff', fontSize: 17, fontFamily: BG[800] }}>Log a Session</Text>
            <TouchableOpacity accessibilityRole="button" accessibilityLabel="Close" hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }} onPress={close}>
              <Icon name="x" size={18} color="#A1A1AA" />
            </TouchableOpacity>
          </View>

          {step === 'modality' ? (
            <>
              <Text style={{ color: COLORS.textMuted, fontSize: 13, lineHeight: 18, fontFamily: BG[400] }}>
                Something outside today's plan — an extra lift or a run. Counts toward your streak and stats like anything else.
              </Text>
              <View style={{ flexDirection: 'row', gap: 10 }}>
                {(['strength', 'cardio'] as Modality[]).map((m) => (
                  <TouchableOpacity
                    key={m}
                    activeOpacity={0.8}
                    onPress={() => {
                      setModality(m);
                      setStep('exercise');
                    }}
                    style={{
                      flex: 1,
                      alignItems: 'center',
                      paddingVertical: 16,
                      borderRadius: 14,
                      backgroundColor: 'rgba(255,255,255,0.05)',
                      borderWidth: 1,
                      borderColor: 'rgba(255,255,255,0.14)',
                    }}
                  >
                    <Icon name={m === 'strength' ? 'dumbbell' : 'activity'} size={20} color="#fff" />
                    <Text style={{ color: '#fff', fontSize: 13, marginTop: 6, fontFamily: BG[700] }}>
                      {m === 'strength' ? 'Strength' : 'Cardio'}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </>
          ) : (
            exercise && (
              <>
                <Text style={{ color: '#fff', fontSize: 15, fontFamily: BG[700] }}>{exercise.name}</Text>
                {modality === 'strength' ? (
                  <>
                    {stepper('Reps', reps, '', setReps, 1)}
                    {stepper('Weight', weight, 'kg', setWeight, 2.5)}
                  </>
                ) : (
                  stepper('Duration', durationMinutes, 'min', setDurationMinutes, 5)
                )}
                <TouchableOpacity
                  activeOpacity={0.85}
                  onPress={submit}
                  disabled={saving}
                  style={{
                    height: 48,
                    borderRadius: 14,
                    backgroundColor: '#fff',
                    alignItems: 'center',
                    justifyContent: 'center',
                    opacity: saving ? 0.6 : 1,
                  }}
                >
                  <Text style={{ color: '#000', fontSize: 15, fontFamily: BG[800] }}>
                    {saving ? 'Logging…' : 'Log session'}
                  </Text>
                </TouchableOpacity>
              </>
            )
          )}
        </View>
      </View>
    </Modal>
  );
}
