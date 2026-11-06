import React, { useState } from 'react';
import { ScrollView, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { COLORS, FONT } from '../../../lib/theme';
import { useAppState } from '../../../lib/appState';
import { OnboardingTopBar } from '../../../components/OnboardingTopBar';
import { Button } from '../../../components/ui/Button';
import { Chip } from '../../../components/ui/Chip';
import { Icon } from '../../../components/ui/Icon';
import { ErrorCard } from '../../../components/ui/ErrorCard';
import { generateWorkoutPlan, saveTrainingSchedule } from '../../../lib/data';
import { defaultWeekdays, sortWeekdays } from '../../../lib/trainingWeek';

const A = COLORS.blue;

const WEEKDAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

const TIME_OPTIONS: { value: string; label: string }[] = [
  { value: '', label: 'No fixed time' },
  { value: '07:00', label: 'Morning' },
  { value: '12:30', label: 'Midday' },
  { value: '18:00', label: 'Evening' },
  { value: '20:30', label: 'Night' },
];

/**
 * Step 2 of the workout setup: which weekdays the plan lands on, then generate (V2 PHASE 6.1, NG PHASE 5.5).
 * The plan picked on the first screen has `planDays` sessions, so exactly that many weekdays are chosen and
 * the plan's days take those names. The split comes from the reviewed plan, so there is no split picker.
 */
export default function WorkoutSetupSchedule() {
  const router = useRouter();
  const { userId, generatePlan, bumpXp } = useAppState();
  const { planDays, onboarding } = useLocalSearchParams<{ planDays: string; onboarding?: string }>();
  const need = Math.min(6, Math.max(2, Number(planDays) || 3));

  const [trainingDays, setTrainingDays] = useState<string[]>(() => defaultWeekdays(need));
  const [usualTime, setUsualTime] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const toggleDay = (day: string) => {
    setTrainingDays((prev) => (prev.includes(day) ? prev.filter((d) => d !== day) : prev.length >= need ? prev : [...prev, day]));
  };

  const ready = trainingDays.length === need;

  const submit = async () => {
    if (!userId || submitting || !ready) return;
    setSubmitting(true);
    setError(null);

    const saved = await saveTrainingSchedule(userId, sortWeekdays(trainingDays), usualTime);
    if (!saved) {
      setError('Could not save your days. Check your connection and try again.');
      setSubmitting(false);
      return;
    }

    const { workout, error: genError } = await generateWorkoutPlan(userId);
    setSubmitting(false);
    if (!workout) {
      setError(genError ?? 'Saved your answers, but the plan could not be built right now. Try again from the Workouts tab shortly.');
      return;
    }

    generatePlan();
    bumpXp(50); // matches awardXp(userId, 50, 'plan_generated') in generateWorkoutPlan
    // Polish step 7: the plan arrives as four stories. They end with the reminder soft-ask during onboarding.
    router.replace({ pathname: '/plan-story', params: onboarding === '1' ? { onboarding: '1' } : {} });
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: COLORS.bg }}>
      <OnboardingTopBar step={1} totalSteps={2} accent={A} showBack={!submitting} />
      <ScrollView contentContainerStyle={{ paddingHorizontal: 24, paddingTop: 30, paddingBottom: 24, flexGrow: 1 }}>
        <Text style={{ color: COLORS.fg, fontSize: 28, fontWeight: '900', letterSpacing: -0.6, lineHeight: 32, fontFamily: FONT }}>
          Which {need} days work for you?
        </Text>
        <Text style={{ color: COLORS.textMuted, fontSize: 13, marginTop: 10, marginBottom: 22, lineHeight: 19, fontFamily: FONT }}>
          Your plan has {need} sessions. Pick the weekdays and each session lands exactly there.
        </Text>

        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10 }}>
          {WEEKDAYS.map((day) => (
            <Chip key={day} active={trainingDays.includes(day)} accent={A} accentDeep={COLORS.blueDeep} onPress={() => toggleDay(day)}>
              {day.slice(0, 3)}
            </Chip>
          ))}
        </View>
        <Text style={{ color: ready ? COLORS.textMuted : COLORS.amber, fontSize: 13, marginTop: 12, fontFamily: FONT }}>
          {ready ? `${need} of ${need} picked` : `${trainingDays.length} of ${need} picked. Tap ${need - trainingDays.length} more.`}
        </Text>

        <Text style={{ color: COLORS.textMuted, fontSize: 11, fontWeight: '700', letterSpacing: 0.9, marginTop: 28, marginBottom: 12, fontFamily: FONT }}>USUAL TIME (OPTIONAL)</Text>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10 }}>
          {TIME_OPTIONS.map((opt) => (
            <Chip key={opt.label} active={usualTime === opt.value} accent={A} accentDeep={COLORS.blueDeep} onPress={() => setUsualTime(opt.value)}>
              {opt.label}
            </Chip>
          ))}
        </View>

        <View style={{ flex: 1, minHeight: 24 }} />
        {error ? (
          <View style={{ marginBottom: 12 }}>
            <ErrorCard message={error} onRetry={submit} retrying={submitting} />
          </View>
        ) : null}
        <Button variant="primary" accent={A} accentDeep={COLORS.blueDeep} size="lg" fullWidth disabled={submitting || !ready} onPress={submit} icon={<Icon name="wand-2" size={16} color="#fff" />}>
          {submitting ? 'Building your plan…' : 'Build my plan'}
        </Button>
      </ScrollView>
    </SafeAreaView>
  );
}
