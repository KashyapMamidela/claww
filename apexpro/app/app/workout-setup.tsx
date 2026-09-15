import React, { useState } from 'react';
import { ScrollView, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { COLORS, FONT } from '../lib/theme';
import { useAppState } from '../lib/appState';
import {
  saveWorkoutIntake,
  generateWorkoutPlan,
  type ActivityLevel,
  type Equipment,
  type ExperienceLevel,
  type Goal,
  type Modality,
} from '../lib/data';
import { Icon } from '../components/ui/Icon';
import { Button } from '../components/ui/Button';
import { Chip } from '../components/ui/Chip';

const A = COLORS.blue;

const GOALS: { value: Goal; label: string }[] = [
  { value: 'muscle_gain', label: 'Build Muscle' },
  { value: 'fat_loss', label: 'Lose Fat' },
  { value: 'endurance', label: 'Endurance' },
  { value: 'maintenance', label: 'Maintain' },
  { value: 'flexibility', label: 'Flexibility' },
];

const EXPERIENCE: { value: ExperienceLevel; label: string }[] = [
  { value: 'beginner', label: 'Beginner' },
  { value: 'intermediate', label: 'Intermediate' },
  { value: 'advanced', label: 'Advanced' },
];

const EQUIPMENT: { value: Equipment; label: string }[] = [
  { value: 'gym', label: 'Full Gym' },
  { value: 'home', label: 'Home Equipment' },
  { value: 'none', label: 'Bodyweight Only' },
];

const MODALITIES: { value: Modality; label: string }[] = [
  { value: 'strength', label: 'Strength' },
  { value: 'cardio', label: 'Cardio' },
  { value: 'mobility', label: 'Mobility' },
  { value: 'yoga', label: 'Yoga' },
];

const ACTIVITY: { value: ActivityLevel; label: string }[] = [
  { value: 'sedentary', label: 'Sedentary' },
  { value: 'moderate', label: 'Moderately Active' },
  { value: 'active', label: 'Very Active' },
];

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <View style={{ marginBottom: 22 }}>
      <Text style={{ color: '#fff', fontSize: 13, fontWeight: '700', marginBottom: 10, fontFamily: FONT }}>{title}</Text>
      {children}
    </View>
  );
}

function ChipRow<T extends string>({
  options,
  selected,
  onToggle,
}: {
  options: { value: T; label: string }[];
  selected: T[];
  onToggle: (value: T) => void;
}) {
  return (
    <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
      {options.map((opt) => (
        <Chip key={opt.value} active={selected.includes(opt.value)} accent={A} accentDeep={COLORS.blueDeep} onPress={() => onToggle(opt.value)}>
          {opt.label}
        </Chip>
      ))}
    </View>
  );
}

export default function WorkoutSetupScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { userId, generatePlan } = useAppState();

  const [height, setHeight] = useState('');
  const [weight, setWeight] = useState('');
  const [goal, setGoal] = useState<Goal | null>(null);
  const [experienceLevel, setExperienceLevel] = useState<ExperienceLevel | null>(null);
  const [equipment, setEquipment] = useState<Equipment | null>(null);
  const [modalities, setModalities] = useState<Modality[]>([]);
  const [activityLevel, setActivityLevel] = useState<ActivityLevel | null>(null);
  const [injuries, setInjuries] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const toggleModality = (m: Modality) => {
    setModalities((prev) => (prev.includes(m) ? prev.filter((x) => x !== m) : [...prev, m]));
  };

  const heightNum = Number(height);
  const weightNum = Number(weight);
  const canSubmit =
    !submitting &&
    heightNum > 0 &&
    weightNum > 0 &&
    !!goal &&
    !!experienceLevel &&
    !!equipment &&
    modalities.length > 0 &&
    !!activityLevel;

  const handleSubmit = async () => {
    if (!canSubmit || !userId || !goal || !experienceLevel || !equipment || !activityLevel) return;
    setSubmitting(true);
    setError(null);

    const saved = await saveWorkoutIntake(userId, {
      height: heightNum,
      weight: weightNum,
      goal,
      experienceLevel,
      equipment,
      modalities,
      activityLevel,
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
    <View style={{ flex: 1, backgroundColor: COLORS.bg }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, paddingTop: insets.top + 20, paddingHorizontal: 20, paddingBottom: 4 }}>
        <TouchableOpacity
          activeOpacity={0.8}
          onPress={() => router.back()}
          style={{
            width: 34,
            height: 34,
            borderRadius: 10,
            backgroundColor: '#151517',
            borderWidth: 1,
            borderColor: 'rgba(255,255,255,0.10)',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <Icon name="x" size={16} color="#A1A1AA" />
        </TouchableOpacity>
        <Text style={{ color: '#fff', fontSize: 16, fontWeight: '800', fontFamily: FONT }}>Build Your Plan</Text>
      </View>

      <ScrollView contentContainerStyle={{ paddingHorizontal: 20, paddingTop: 18, paddingBottom: 32 }}>
        <Text style={{ color: '#71717A', fontSize: 13, lineHeight: 19, marginBottom: 22, fontFamily: FONT }}>
          A few details so CLAWW can build a plan that actually fits you — this feeds the AI directly, and only exercises from our
          catalog are ever used.
        </Text>

        <Section title="Height & Weight">
          <View style={{ flexDirection: 'row', gap: 10 }}>
            <TextInput
              value={height}
              onChangeText={setHeight}
              placeholder="Height (cm)"
              placeholderTextColor="#52525B"
              keyboardType="numeric"
              style={inputStyle(height.length > 0)}
            />
            <TextInput
              value={weight}
              onChangeText={setWeight}
              placeholder="Weight (kg)"
              placeholderTextColor="#52525B"
              keyboardType="numeric"
              style={inputStyle(weight.length > 0)}
            />
          </View>
        </Section>

        <Section title="Primary Goal">
          <ChipRow options={GOALS} selected={goal ? [goal] : []} onToggle={setGoal} />
        </Section>

        <Section title="Experience Level">
          <ChipRow options={EXPERIENCE} selected={experienceLevel ? [experienceLevel] : []} onToggle={setExperienceLevel} />
        </Section>

        <Section title="Equipment Access">
          <ChipRow options={EQUIPMENT} selected={equipment ? [equipment] : []} onToggle={setEquipment} />
        </Section>

        <Section title="Preferred Training Types">
          <ChipRow options={MODALITIES} selected={modalities} onToggle={toggleModality} />
        </Section>

        <Section title="Activity Level">
          <ChipRow options={ACTIVITY} selected={activityLevel ? [activityLevel] : []} onToggle={setActivityLevel} />
        </Section>

        <Section title="Injuries or Limitations (optional)">
          <TextInput
            value={injuries}
            onChangeText={setInjuries}
            placeholder="e.g. bad knees, lower back pain, shoulder injury"
            placeholderTextColor="#52525B"
            multiline
            numberOfLines={2}
            style={{
              backgroundColor: COLORS.card,
              borderWidth: 1,
              borderColor: injuries.length > 0 ? 'rgba(59,130,246,0.5)' : 'rgba(255,255,255,0.12)',
              borderRadius: 14,
              color: '#fff',
              fontSize: 14,
              fontWeight: '500' as const,
              padding: 14,
              minHeight: 64,
              textAlignVertical: 'top',
              fontFamily: FONT,
            }}
          />
          <Text style={{ color: '#52525B', fontSize: 10.5, marginTop: 7, lineHeight: 15, fontFamily: FONT }}>
            We'll steer your plan away from exercises that stress these areas. This isn't medical advice — check with a doctor or
            physical therapist for anything serious.
          </Text>
        </Section>

        {error ? <Text style={{ color: COLORS.danger, fontSize: 12.5, marginBottom: 12, fontFamily: FONT }}>{error}</Text> : null}

        <Button
          variant="primary"
          accent={A}
          accentDeep={COLORS.blueDeep}
          size="lg"
          fullWidth
          disabled={!canSubmit}
          onPress={handleSubmit}
          icon={<Icon name="wand-2" size={16} color="#fff" />}
        >
          {submitting ? 'Generating your plan…' : 'Generate My Plan'}
        </Button>
      </ScrollView>
    </View>
  );
}

function inputStyle(active: boolean) {
  return {
    flex: 1,
    minWidth: 0,
    height: 54,
    backgroundColor: COLORS.card,
    borderWidth: 1,
    borderColor: active ? 'rgba(59,130,246,0.5)' : 'rgba(255,255,255,0.12)',
    borderRadius: 14,
    color: '#fff',
    fontSize: 15,
    fontWeight: '600' as const,
    paddingHorizontal: 16,
    fontFamily: FONT,
  };
}
