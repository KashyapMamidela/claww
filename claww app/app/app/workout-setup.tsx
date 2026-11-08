import React, { useEffect, useMemo, useState } from 'react';
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { COLORS, FONT } from '../lib/theme';
import { useAppState } from '../lib/appState';
import { basicsSummary, hasBasics, profileBasics, useProfile } from '../lib/profile';
import { saveWorkoutIntake, type Equipment, type Goal } from '../lib/data';
import { INJURY_PARTS, SEVERITIES, cleanTrainStyles, type Injury, type InjuryPart, type Severity } from '../lib/engine';
import { planCard } from '../lib/planCard';
import { trainingDaysPerWeek } from '../lib/trainingWeek';
import { Button } from '../components/ui/Button';
import { Chip } from '../components/ui/Chip';
import { Hero } from '../components/ui/Hero';
import { Icon } from '../components/ui/Icon';
import { Segmented } from '../components/ui/Segmented';
import { SectionLabel } from '../components/ui/SectionLabel';
import { Surface } from '../components/ui/Surface';
import { BottomSheet } from '../components/ui/BottomSheet';
import { ErrorCard } from '../components/ui/ErrorCard';
import { ProfileBasicsCard } from '../components/ProfileBasicsCard';
import { PressScale } from '../components/ui/PressScale';
import { BasicsInputs } from '../components/workouts/BasicsInputs';
import { PlanTile } from '../components/workouts/PlanTile';

// NG PHASE 5.5: the workout setup on one screen (05-workout-setup.jpg). Basic details come from the profile
// and are only asked when missing. The "Your plan" card runs the same pickBlueprint as generate-plan on the same
// inputs, so what it shows is the plan that gets generated. The weekday picker is the next screen.

const A = COLORS.blue;

const GOALS: { value: Goal; title: string; sub: string; icon: string }[] = [
  { value: 'muscle_gain', title: 'Build muscle', sub: 'Look bigger, fuller', icon: 'dumbbell' },
  { value: 'fat_loss', title: 'Lose fat', sub: 'Keep muscle, drop fat', icon: 'flame' },
  { value: 'strength', title: 'Get stronger', sub: 'Lift heavier', icon: 'trophy' },
  { value: 'maintenance', title: 'Stay fit', sub: 'Feel good, move well', icon: 'heart' },
];

const PLACES: { value: Equipment; label: string }[] = [
  { value: 'gym', label: 'Gym' },
  { value: 'home', label: 'Home, with dumbbells' },
  { value: 'none', label: 'No equipment' },
];

type Experience = 'new' | 'mid' | 'long';
const EXPERIENCE: { value: Experience; label: string; months: number }[] = [
  { value: 'new', label: 'New', months: 0 },
  { value: 'mid', label: '6 mo – 2 yrs', months: 12 },
  { value: 'long', label: '2 yrs +', months: 36 },
];
const experienceOf = (months: number): Experience => (months < 6 ? 'new' : months < 24 ? 'mid' : 'long');

type Minutes = '30' | '45' | '60' | '75';
const MINUTES: { value: Minutes; label: string }[] = [
  { value: '30', label: '30 min' },
  { value: '45', label: '45 min' },
  { value: '60', label: '60 min' },
  { value: '75', label: '75 min' },
];

const SEVERITY_TEXT: Record<Severity, { label: string; note: string }> = {
  mild: { label: 'Mild', note: 'A niggle. I train around it.' },
  moderate: { label: 'Moderate', note: 'It hurts under load.' },
  severe: { label: 'Severe', note: 'It hurts day to day.' },
};

const goalFromProfile = (g: string | null | undefined): Goal => (g === 'muscle_gain' || g === 'fat_loss' || g === 'strength' ? g : 'maintenance');

export default function WorkoutSetup() {
  const router = useRouter();
  // Polish step 2: during onboarding the goal and how they train were already asked, so this screen asks the rest.
  const { onboarding } = useLocalSearchParams<{ onboarding?: string }>();
  const inOnboarding = onboarding === '1';
  const { userId } = useAppState();
  const { profile, loading } = useProfile(userId);
  const basics = profileBasics(profile);
  const known = hasBasics(basics, ['heightCm', 'weightKg']);

  const [editing, setEditing] = useState(false);
  const [height, setHeight] = useState('');
  const [weight, setWeight] = useState('');
  const [goal, setGoal] = useState<Goal>('muscle_gain');
  const [days, setDays] = useState(4);
  const [place, setPlace] = useState<Equipment>('gym');
  const [months, setMonths] = useState(12);
  const [minutes, setMinutes] = useState<Minutes>('60');
  const [injuries, setInjuries] = useState<Injury[]>([]);
  const styles = useMemo(() => cleanTrainStyles(profile?.personalization_profile?.workoutDefaults?.styles), [profile]);
  const [sheetPart, setSheetPart] = useState<InjuryPart | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [seeded, setSeeded] = useState(false);

  // Start from what the profile already knows; fill once, never overwrite what the user is choosing.
  useEffect(() => {
    if (seeded || loading || !profile) return;
    setSeeded(true);
    setGoal(goalFromProfile(profile.goal));
    if (profile.equipment) setPlace(profile.equipment);
    const m = profile.training_months ?? (profile.experience_level === 'beginner' ? 0 : profile.experience_level === 'advanced' ? 36 : 12);
    setMonths(experienceOf(m) === 'new' ? 0 : experienceOf(m) === 'mid' ? 12 : 36);
    if (profile.session_minutes && [30, 45, 60, 75].includes(profile.session_minutes)) setMinutes(String(profile.session_minutes) as Minutes);
    setInjuries(Array.isArray(profile.injuries) ? profile.injuries : []);
    const stored = profile.personalization_profile?.workoutDefaults?.daysPerWeek;
    setDays(stored ?? Math.min(6, Math.max(2, trainingDaysPerWeek(profile.experience_level, profile.personalization_profile?.workoutDefaults?.activityLevel ?? null, profile.age))));
    if (profile.height) setHeight(String(profile.height));
    if (profile.weight) setWeight(String(profile.weight));
  }, [seeded, loading, profile]);

  const card = useMemo(
    () => planCard({ goal, equipment: place, daysPerWeek: days, trainingMonths: months, sessionMinutes: Number(minutes), injuries, styles }),
    [goal, place, days, months, minutes, injuries, styles]
  );

  const showInputs = !known && !loading ? true : editing;
  const basicsOk = known ? !editing || (Number(height) > 0 && Number(weight) > 0) : Number(height) > 0 && Number(weight) > 0;

  const setSeverity = (part: InjuryPart, severity: Severity | null) => {
    setInjuries((prev) => {
      const rest = prev.filter((i) => i.part !== part);
      return severity ? [...rest, { part, severity }] : rest;
    });
    setSheetPart(null);
  };
  const injuryOf = (part: InjuryPart) => injuries.find((i) => i.part === part);

  const submit = async () => {
    if (!userId || saving || !basicsOk) return;
    setSaving(true);
    setError(null);
    const ok = await saveWorkoutIntake(userId, {
      height: showInputs ? Number(height) : undefined,
      weight: showInputs ? Number(weight) : undefined,
      goal,
      equipment: place,
      daysPerWeek: days,
      trainingMonths: months,
      sessionMinutes: Number(minutes),
      injuries,
    });
    setSaving(false);
    if (!ok) {
      setError('Could not save your answers. Check your connection and try again.');
      return;
    }
    router.push({ pathname: '/screens/workout-setup/schedule', params: { planDays: String(card.days), ...(inOnboarding ? { onboarding: '1' } : {}) } });
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: COLORS.bg }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 14, paddingHorizontal: 20, paddingTop: 12, paddingBottom: 12 }}>
        <PressScale onPress={() => router.back()} accessibilityRole="button" accessibilityLabel="Go back" hitSlop={6}>
          <Surface radius={14} padding={0} style={{ width: 44, height: 44 }}>
            <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
              <Icon name="chevron-left" size={20} color={COLORS.fg} />
            </View>
          </Surface>
        </PressScale>
        <View style={{ flex: 1 }}>
          <Text style={{ color: COLORS.fg, fontSize: 20, fontWeight: '800', fontFamily: FONT }}>Build your workout plan</Text>
          <Text style={{ color: COLORS.textMuted, fontSize: 13, fontFamily: FONT }}>{inOnboarding ? 'Set up your plan · step 3 of 4 · about a minute' : 'Step 1 of 2 · about 1 minute'}</Text>
        </View>
      </View>

      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }}>
        <ScrollView contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 32, gap: 14 }} keyboardShouldPersistTaps="handled">
          {known && !editing ? (
            <ProfileBasicsCard summary={basicsSummary(basics, ['heightCm', 'weightKg'])} accent={A} onEdit={() => setEditing(true)} />
          ) : showInputs ? (
            <BasicsInputs initialHeight={height} initialWeight={weight} onChange={(h, w) => { setHeight(h); setWeight(w); }} />
          ) : null}

          {inOnboarding ? null : (
            <>
          <SectionLabel color={A}>YOUR GOAL</SectionLabel>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10 }}>
            {GOALS.map((g) => {
              const on = goal === g.value;
              return (
                <PressScale key={g.value} onPress={() => setGoal(g.value)} accessibilityRole="radio" accessibilityState={{ selected: on }} accessibilityLabel={`${g.title}. ${g.sub}`} style={{ width: '48.4%' }}>
                  <View style={{ minHeight: 100, borderRadius: 18, borderWidth: 1, borderColor: on ? A : COLORS.border, overflow: 'hidden', padding: 14, gap: 10, backgroundColor: COLORS.card }}>
                    {on ? <LinearGradient pointerEvents="none" colors={['rgba(59,130,246,0.30)', 'rgba(29,78,216,0.10)']} style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 }} /> : null}
                    <View style={{ width: 32, height: 32, borderRadius: 10, alignItems: 'center', justifyContent: 'center', backgroundColor: on ? 'rgba(255,255,255,0.12)' : 'rgba(59,130,246,0.14)' }}>
                      <Icon name={g.icon} size={17} color={on ? '#fff' : A} />
                    </View>
                    <View>
                      <Text style={{ color: COLORS.fg, fontSize: 15, fontWeight: '800', fontFamily: FONT }}>{g.title}</Text>
                      <Text style={{ color: COLORS.textMuted, fontSize: 13, fontFamily: FONT }}>{g.sub}</Text>
                    </View>
                  </View>
                </PressScale>
              );
            })}
          </View>

            </>
          )}

          {inOnboarding ? null : (
            <>
          <SectionLabel color={A}>DAYS A WEEK YOU CAN TRAIN</SectionLabel>
          <View style={{ flexDirection: 'row', gap: 8 }} accessibilityRole="radiogroup">
            {[2, 3, 4, 5, 6].map((n) => {
              const on = days === n;
              return (
                <Pressable key={n} onPress={() => setDays(n)} accessibilityRole="radio" accessibilityState={{ selected: on }} accessibilityLabel={`${n} days a week`} style={{ flex: 1 }}>
                  <View style={{ height: 50, borderRadius: 25, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: on ? A : COLORS.border, backgroundColor: on ? 'rgba(59,130,246,0.22)' : COLORS.card }}>
                    <Text style={{ color: on ? '#fff' : COLORS.textMuted, fontSize: 20, fontWeight: '900', fontVariant: ['tabular-nums'], fontFamily: FONT }}>{n}</Text>
                  </View>
                </Pressable>
              );
            })}
          </View>

            </>
          )}

          {inOnboarding ? null : (
            <>
          <SectionLabel color={A}>WHERE YOU TRAIN</SectionLabel>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10 }}>
            {PLACES.map((p) => (
              <Chip key={p.value} active={place === p.value} accent={A} accentDeep={COLORS.blueDeep} onPress={() => setPlace(p.value)}>
                {p.label}
              </Chip>
            ))}
          </View>

            </>
          )}

          <SectionLabel color={A}>HOW LONG HAVE YOU TRAINED?</SectionLabel>
          <Segmented
            options={EXPERIENCE.map((e) => ({ value: e.value, label: e.label }))}
            value={experienceOf(months)}
            onChange={(v) => setMonths(EXPERIENCE.find((e) => e.value === v)!.months)}
            accessibilityLabel="How long you have trained"
          />

          <SectionLabel color={A}>TIME PER SESSION</SectionLabel>
          <Segmented options={MINUTES} value={minutes} onChange={setMinutes} accessibilityLabel="Time per session" />

          <SectionLabel color={A}>ANYTHING THAT HURTS?</SectionLabel>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10 }}>
            <Chip active={injuries.length === 0} accent={A} accentDeep={COLORS.blueDeep} onPress={() => setInjuries([])}>
              Nothing
            </Chip>
            {INJURY_PARTS.map((p) => {
              const inj = injuryOf(p.part);
              return (
                <Chip key={p.part} active={!!inj} accent={A} accentDeep={COLORS.blueDeep} onPress={() => setSheetPart(p.part)}>
                  {inj ? `${p.label} · ${SEVERITY_TEXT[inj.severity].label}` : p.label}
                </Chip>
              );
            })}
          </View>
          {injuries.length > 0 ? (
            <Text style={{ color: COLORS.textMuted, fontSize: 13, lineHeight: 17, fontFamily: FONT }}>
              Your plan leaves out movements that load these areas. This isn't medical advice: see a doctor or physiotherapist for anything serious.
            </Text>
          ) : null}

          <PlanTile
            title={card.title}
            days={card.days}
            meta={`${card.weeks} weeks · ${card.minutes} min · ${card.repStyle}`}
            chips={[GOALS.find((g) => g.value === goal)!.title, `${card.days} days`, PLACES.find((p) => p.value === place)!.label.split(',')[0], EXPERIENCE.find((e) => e.months === months)!.label]}
            nearest={card.nearest}
          />

          {error ? <ErrorCard message={error} onRetry={submit} retrying={saving} /> : null}

          <Button variant="primary" accent={A} accentDeep={COLORS.blueDeep} size="lg" fullWidth disabled={saving || !basicsOk || !userId} onPress={submit}>
            {saving ? 'Saving…' : 'Use this plan'}
          </Button>
        </ScrollView>
      </KeyboardAvoidingView>

      <BottomSheet visible={sheetPart !== null} onClose={() => setSheetPart(null)}>
        {sheetPart ? (
          <View style={{ padding: 20, gap: 12 }}>
            <Text style={{ color: COLORS.fg, fontSize: 20, fontWeight: '800', fontFamily: FONT }}>
              {INJURY_PARTS.find((p) => p.part === sheetPart)!.label}: how bad is it?
            </Text>
            {SEVERITIES.map((s) => (
              <PressScale key={s} onPress={() => setSeverity(sheetPart, s)} accessibilityRole="button" accessibilityLabel={`${SEVERITY_TEXT[s].label}. ${SEVERITY_TEXT[s].note}`}>
                <Surface padding={14}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                    <View style={{ flex: 1 }}>
                      <Text style={{ color: COLORS.fg, fontSize: 17, fontWeight: '800', fontFamily: FONT }}>{SEVERITY_TEXT[s].label}</Text>
                      <Text style={{ color: COLORS.textMuted, fontSize: 13, fontFamily: FONT }}>{SEVERITY_TEXT[s].note}</Text>
                    </View>
                    {injuryOf(sheetPart)?.severity === s ? <Icon name="check" size={18} color={A} /> : null}
                  </View>
                </Surface>
              </PressScale>
            ))}
            {injuryOf(sheetPart) ? (
              <Button variant="secondary" size="md" fullWidth onPress={() => setSeverity(sheetPart, null)}>
                Remove {INJURY_PARTS.find((p) => p.part === sheetPart)!.label.toLowerCase()}
              </Button>
            ) : null}
          </View>
        ) : null}
      </BottomSheet>
    </SafeAreaView>
  );
}


