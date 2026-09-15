import React, { useState } from 'react';
import { KeyboardAvoidingView, Platform, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { COLORS, FONT } from '../../../lib/theme';
import { useAppState } from '../../../lib/appState';
import { OnboardingTopBar } from '../../../components/OnboardingTopBar';
import { Button } from '../../../components/ui/Button';
import { Icon } from '../../../components/ui/Icon';
import { saveWorkoutIntake, generateWorkoutPlan, type ActivityLevel, type Equipment, type ExperienceLevel, type Goal, type Modality } from '../../../lib/data';

const A = COLORS.blue;
const TOTAL_STEPS = 7;

export default function WorkoutSetupReview() {
  const router = useRouter();
  const { userId, generatePlan } = useAppState();
  const { height, weight, equipment, modalities, goal, experienceLevel, activityLevel } = useLocalSearchParams<{
    height: string;
    weight: string;
    equipment: string;
    modalities: string;
    goal: string;
    experienceLevel: string;
    activityLevel: string;
  }>();

  const [injuries, setInjuries] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async () => {
    if (!userId || submitting) return;
    setSubmitting(true);
    setError(null);

    const saved = await saveWorkoutIntake(userId, {
      height: Number(height),
      weight: Number(weight),
      goal: goal as Goal,
      experienceLevel: experienceLevel as ExperienceLevel,
      equipment: equipment as Equipment,
      modalities: (modalities ?? '').split(',').filter(Boolean) as Modality[],
      activityLevel: activityLevel as ActivityLevel,
      injuries,
    });

    if (!saved) {
      setError('Could not save your details — check your connection and try again.');
      setSubmitting(false);
      return;
    }

    const { workout, error: genError } = await generateWorkoutPlan(userId);
    setSubmitting(false);

    if (!workout) {
      setError(genError ?? 'Saved your details, but plan generation is unavailable right now — try again from the Workouts tab shortly.');
      return;
    }

    generatePlan();
    router.dismissTo('/(tabs)/workouts');
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#050505' }}>
      <OnboardingTopBar step={6} totalSteps={TOTAL_STEPS} accent={A} showBack={!submitting} />
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }}>
        <View style={{ flex: 1, paddingHorizontal: 24, paddingTop: 38, paddingBottom: 24 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 14 }}>
            <View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: A }} />
            <Text style={{ color: A, fontSize: 10, fontWeight: '700', letterSpacing: 1, fontFamily: FONT }}>LAST THING</Text>
          </View>
          <Text style={{ color: '#fff', fontSize: 28, fontWeight: '900', letterSpacing: -0.6, lineHeight: 32, fontFamily: FONT }}>
            Any injuries or limitations?
          </Text>
          <Text style={{ color: '#71717A', fontSize: 13, marginTop: 10, marginBottom: 22, lineHeight: 19, fontFamily: FONT }}>
            Optional — we'll steer your plan away from exercises that stress these areas.
          </Text>

          <TextInput
            value={injuries}
            onChangeText={setInjuries}
            placeholder="e.g. bad knees, lower back pain, shoulder injury"
            placeholderTextColor="#52525B"
            multiline
            numberOfLines={3}
            style={{
              backgroundColor: '#151517',
              borderWidth: 1,
              borderColor: injuries.length > 0 ? 'rgba(59,130,246,0.5)' : 'rgba(255,255,255,0.12)',
              borderRadius: 16,
              color: '#fff',
              fontSize: 14,
              fontWeight: '500',
              padding: 16,
              minHeight: 88,
              textAlignVertical: 'top',
              fontFamily: FONT,
            }}
          />
          <Text style={{ color: '#52525B', fontSize: 10.5, marginTop: 8, lineHeight: 15, fontFamily: FONT }}>
            This isn't medical advice — check with a doctor or physical therapist for anything serious.
          </Text>

          <View style={{ flex: 1 }} />

          {error ? <Text style={{ color: COLORS.danger, fontSize: 12.5, marginBottom: 12, fontFamily: FONT }}>{error}</Text> : null}

          <Button
            variant="primary"
            accent={A}
            accentDeep={COLORS.blueDeep}
            size="lg"
            fullWidth
            disabled={submitting}
            onPress={handleSubmit}
            icon={<Icon name="wand-2" size={16} color="#fff" />}
          >
            {submitting ? 'Generating your plan…' : 'Generate My Plan'}
          </Button>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
