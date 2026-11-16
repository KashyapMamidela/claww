import React, { useEffect, useMemo, useState } from 'react';
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { COLORS, FONT, BG, bg } from '../lib/theme';
import { useAppState } from '../lib/appState';
import { basicsSummary, hasBasics, profileBasics, useProfile } from '../lib/profile';
import { saveWorkoutIntake, type Equipment, type Goal, type SplitPreference, type WorkoutIntensity } from '../lib/data';
import { INJURY_PARTS, SEVERITIES, SPLIT_BLURBS, SPLIT_DAYS, SPLIT_IDS, SPLIT_LABELS, cleanTrainStyles, type Injury, type InjuryPart, type Severity, type Split } from '../lib/engine';
import { planCard } from '../lib/planCard';
import { trainingDaysPerWeek } from '../lib/trainingWeek';
import { Button } from '../components/ui/Button';
import { CardCarousel } from '../components/ui/CardCarousel';
import { Chip } from '../components/ui/Chip';
import { Hero } from '../components/ui/Hero';
import { Icon } from '../components/ui/Icon';
import { Segmented } from '../components/ui/Segmented';
import { SectionLabel } from '../components/ui/SectionLabel';
import { SectionHeader } from '../components/ui/SectionHeader';
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

// The style of week: stored as the older SplitPreference words, shown with the plain names from the blueprints.
const SPLIT_PREF: Record<Split, SplitPreference> = { FB: 'full_body', UL: 'upper_lower', PPL: 'push_pull_legs', BRO: 'body_part' };
const splitFromPref = (p: unknown): Split | null => (SPLIT_IDS.find((id) => SPLIT_PREF[id] === p) ?? null);

const INTENSITY_OPTIONS: { value: WorkoutIntensity; label: string; note: string }[] = [
  { value: 'easy', label: 'Easy', note: 'Fewer sets, more in reserve. Gentle on a busy or low-energy week.' },
  { value: 'standard', label: 'Standard', note: 'The plan as written.' },
  { value: 'hard', label: 'Hard', note: 'One more set on the main lifts, closer to failure.' },
];

/** "Nearest: 4 days" for a style that has no week for the days picked, else null. */
function styleDaysNote(split: Split, days: number): string | null {
  const have = SPLIT_DAYS[split];
  if (have.includes(days)) return null;
  const nearest = [...have].sort((a, b) => Math.abs(a - days) - Math.abs(b - days) || a - b)[0];
  return `Nearest: ${nearest} days`;
}

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
  const [split, setSplit] = useState<Split | null>(null);
  const [qIdx, setQIdx] = useState(0);
  const [qView, setQView] = useState<'cards' | 'list'>('cards');
  // While a finger is on the question deck the page does not scroll, so a swipe on the deck is never a scroll.
  const [qTouched, setQTouched] = useState(false);
  const [intensity, setIntensity] = useState<WorkoutIntensity>('standard');
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
    const wd = profile.personalization_profile?.workoutDefaults;
    setSplit(splitFromPref(wd?.splitPreference));
    if (wd?.intensity === 'easy' || wd?.intensity === 'hard') setIntensity(wd.intensity);
    if (profile.height) setHeight(String(profile.height));
    if (profile.weight) setWeight(String(profile.weight));
  }, [seeded, loading, profile]);

  const card = useMemo(
    () => planCard({ goal, equipment: place, daysPerWeek: days, trainingMonths: months, sessionMinutes: Number(minutes), injuries, styles, split, intensity }),
    [goal, place, days, months, minutes, injuries, styles, split, intensity]
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
      splitPreference: split ? SPLIT_PREF[split] : 'auto',
      intensity,
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
          <Text style={{ color: COLORS.fg, fontSize: 20, fontFamily: BG[800] }}>Build your workout plan</Text>
          <Text style={{ color: COLORS.textMuted, fontSize: 13, fontFamily: BG[400] }}>{inOnboarding ? 'Set up your plan · step 3 of 4 · about a minute' : 'Step 1 of 2 · about 1 minute'}</Text>
        </View>
      </View>

      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }}>
        <ScrollView contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 32, gap: 14 }} keyboardShouldPersistTaps="handled" scrollEnabled={!qTouched}>
          {known && !editing ? (
            <ProfileBasicsCard summary={basicsSummary(basics, ['heightCm', 'weightKg'])} accent={A} onEdit={() => setEditing(true)} />
          ) : showInputs ? (
            <BasicsInputs initialHeight={height} initialWeight={weight} onChange={(h, w) => { setHeight(h); setWeight(w); }} />
          ) : null}

          {(() => {
            // Each question is a card. Swipe up for the next one, down for the one before (or use the buttons);
            // List shows them all at once, as before.
            const questions: { id: string; title: string; body: React.ReactNode }[] = [
              ...(inOnboarding
                ? []
                : [
                    { id: 'goal', title: 'Your goal', body: <View style={{ gap: 12 }}>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10 }}>
            {GOALS.map((g) => {
              const on = goal === g.value;
              return (
                <PressScale key={g.value} onPress={() => setGoal(g.value)} accessibilityRole="radio" accessibilityState={{ selected: on }} accessibilityLabel={`${g.title}. ${g.sub}`} style={{ width: '47.5%' }}>
                  <View style={{ minHeight: 100, borderRadius: 18, borderWidth: 1, borderColor: on ? A : COLORS.border, overflow: 'hidden', padding: 14, gap: 10, backgroundColor: COLORS.card }}>
                    {on ? <LinearGradient pointerEvents="none" colors={['rgba(59,130,246,0.30)', 'rgba(29,78,216,0.10)']} style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 }} /> : null}
                    <View style={{ width: 32, height: 32, borderRadius: 10, alignItems: 'center', justifyContent: 'center', backgroundColor: on ? 'rgba(255,255,255,0.12)' : 'rgba(59,130,246,0.14)' }}>
                      <Icon name={g.icon} size={17} color={on ? '#fff' : A} />
                    </View>
                    <View>
                      <Text style={{ color: COLORS.fg, fontSize: 15, fontFamily: BG[800] }}>{g.title}</Text>
                      <Text style={{ color: COLORS.textMuted, fontSize: 13, fontFamily: BG[400] }}>{g.sub}</Text>
                    </View>
                  </View>
                </PressScale>
              );
            })}
          </View>
          </View> },
                    { id: 'days', title: 'Days a week you can train', body: <View style={{ gap: 12 }}>
          <View style={{ flexDirection: 'row', gap: 8 }} accessibilityRole="radiogroup">
            {[2, 3, 4, 5, 6].map((n) => {
              const on = days === n;
              return (
                <Pressable key={n} onPress={() => setDays(n)} accessibilityRole="radio" accessibilityState={{ selected: on }} accessibilityLabel={`${n} days a week`} style={{ flex: 1 }}>
                  <View style={{ height: 50, borderRadius: 25, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: on ? A : COLORS.border, backgroundColor: on ? 'rgba(59,130,246,0.22)' : COLORS.card }}>
                    <Text style={{ color: on ? '#fff' : COLORS.textMuted, fontSize: 20, fontVariant: ['tabular-nums'], fontFamily: BG[800] }}>{n}</Text>
                  </View>
                </Pressable>
              );
            })}
          </View>
          </View> },
                    { id: 'style', title: 'Training style', body: <View style={{ gap: 12 }}>
          <View style={{ gap: 8 }} accessibilityRole="radiogroup">
            {([null, ...SPLIT_IDS] as (Split | null)[]).map((id) => {
              const on = split === id;
              const title = id ? SPLIT_LABELS[id] : 'Let CLAWW choose';
              const blurb = id ? SPLIT_BLURBS[id] : 'Picks the gentlest style that fits your days.';
              const note = id ? styleDaysNote(id, days) : null;
              return (
                <PressScale key={id ?? 'auto'} onPress={() => setSplit(id)} accessibilityRole="radio" accessibilityState={{ selected: on }} accessibilityLabel={`${title}. ${blurb}${note ? ` ${note}.` : ''}`}>
                  <View style={{ borderRadius: 16, borderWidth: 1, borderColor: on ? A : COLORS.border, overflow: 'hidden', paddingHorizontal: 14, paddingVertical: 12, flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: COLORS.card }}>
                    {on ? <LinearGradient pointerEvents="none" colors={['rgba(59,130,246,0.26)', 'rgba(29,78,216,0.08)']} style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 }} /> : null}
                    <View style={{ flex: 1, minWidth: 0 }}>
                      <Text style={{ color: COLORS.fg, fontSize: 15, fontFamily: BG[800] }}>{title}</Text>
                      <Text style={{ color: COLORS.textMuted, fontSize: 13, lineHeight: 17, fontFamily: BG[400] }}>{blurb}</Text>
                      {note ? <Text style={{ color: COLORS.amber, fontSize: 12, fontFamily: BG[700], marginTop: 2 }}>{note}</Text> : null}
                    </View>
                    {on ? <Icon name="check" size={18} color={A} /> : null}
                  </View>
                </PressScale>
              );
            })}
          </View>
          </View> },
                    { id: 'place', title: 'Where you train', body: <View style={{ gap: 12 }}>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10 }}>
            {PLACES.map((p) => (
              <Chip key={p.value} active={place === p.value} accent={A} accentDeep={COLORS.blueDeep} onPress={() => setPlace(p.value)}>
                {p.label}
              </Chip>
            ))}
          </View>
          </View> },
                  ]),
              { id: 'experience', title: 'How long have you trained?', body: <View style={{ gap: 12 }}>
          <Segmented
            options={EXPERIENCE.map((e) => ({ value: e.value, label: e.label }))}
            value={experienceOf(months)}
            onChange={(v) => setMonths(EXPERIENCE.find((e) => e.value === v)!.months)}
            accessibilityLabel="How long you have trained"
          />
          </View> },
              { id: 'minutes', title: 'Time per session', body: <View style={{ gap: 12 }}>
          <Segmented options={MINUTES} value={minutes} onChange={setMinutes} accessibilityLabel="Time per session" />
          </View> },
              { id: 'hard', title: 'How hard should it feel?', body: <View style={{ gap: 12 }}>
          <Segmented options={INTENSITY_OPTIONS.map((o) => ({ value: o.value, label: o.label }))} value={intensity} onChange={setIntensity} accessibilityLabel="How hard the sessions feel" />
          <Text style={{ color: COLORS.textMuted, fontSize: 13, lineHeight: 17, fontFamily: BG[400] }}>{INTENSITY_OPTIONS.find((o) => o.value === intensity)!.note}</Text>
          </View> },
              { id: 'hurts', title: 'Anything that hurts?', body: <View style={{ gap: 12 }}>
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
            <Text style={{ color: COLORS.textMuted, fontSize: 13, lineHeight: 17, fontFamily: BG[400] }}>
              Your plan leaves out movements that load these areas. This isn't medical advice: see a doctor or physiotherapist for anything serious.
            </Text>
          ) : null}
          </View> },
            ];
            const n = questions.length;
            const idx = Math.min(qIdx, n - 1);
            if (qView === 'list') {
              return (
                <>
                  <PressScale onPress={() => setQView('cards')} accessibilityRole="button" accessibilityLabel="Show the questions as cards" style={{ alignSelf: 'flex-end' }}>
                    <View style={{ minHeight: 36, justifyContent: 'center' }}>
                      <Text style={{ color: A, fontSize: 13, fontFamily: BG[700] }}>Show as cards</Text>
                    </View>
                  </PressScale>
                  {questions.map((q) => (
                    <React.Fragment key={q.id}>
                      <SectionHeader>{q.title}</SectionHeader>
                      {q.body}
                    </React.Fragment>
                  ))}
                </>
              );
            }
            return (
              <View style={{ gap: 12 }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                  <View style={{ flex: 1, flexDirection: 'row', gap: 4 }} accessibilityLabel={`Question ${idx + 1} of ${n}`}>
                    {questions.map((q, i) => (
                      <View key={q.id} style={{ flex: 1, height: 4, borderRadius: 2, backgroundColor: i <= idx ? A : 'rgba(255,255,255,0.12)' }} />
                    ))}
                  </View>
                  <PressScale onPress={() => setQView('list')} accessibilityRole="button" accessibilityLabel="Show all the questions as a list">
                    <View style={{ minHeight: 36, justifyContent: 'center' }}>
                      <Text style={{ color: COLORS.textMuted, fontSize: 13, fontFamily: BG[600] }}>List</Text>
                    </View>
                  </PressScale>
                </View>
                <CardCarousel
                  items={questions}
                  keyOf={(q) => q.id}
                  index={idx}
                  onIndexChange={setQIdx}
                  onTouching={setQTouched}
                  renderCard={(q, i) => (
                    <Surface radius={24} padding={18}>
                      <View style={{ gap: 14 }}>
                        <Text style={{ color: COLORS.textMuted, fontSize: 12, letterSpacing: 0.8, fontFamily: BG[700] }}>{`QUESTION ${i + 1} OF ${n}`}</Text>
                        <Text style={{ color: COLORS.fg, fontSize: 24, letterSpacing: -0.4, fontFamily: BG[800] }}>{q.title}</Text>
                        {q.body}
                        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 4 }}>
                          {i > 0 ? (
                            <PressScale onPress={() => setQIdx(i - 1)} accessibilityRole="button" accessibilityLabel="Previous question">
                              <View style={{ minHeight: 44, paddingHorizontal: 4, flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                                <Icon name="chevron-up" size={14} color={COLORS.textMuted} />
                                <Text style={{ color: COLORS.textMuted, fontSize: 14, fontFamily: BG[700] }}>Back</Text>
                              </View>
                            </PressScale>
                          ) : <View />}
                          {i < n - 1 ? (
                            <PressScale onPress={() => setQIdx(i + 1)} accessibilityRole="button" accessibilityLabel="Next question">
                              <View style={{ minHeight: 44, paddingHorizontal: 16, borderRadius: 22, flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: 'rgba(59,130,246,0.22)', borderWidth: 1, borderColor: A }}>
                                <Text style={{ color: '#fff', fontSize: 14, fontFamily: BG[800] }}>Next</Text>
                                <Icon name="chevron-down" size={14} color="#fff" />
                              </View>
                            </PressScale>
                          ) : null}
                        </View>
                      </View>
                    </Surface>
                  )}
                />
              </View>
            );
          })()}

          <PlanTile
            title={card.title}
            days={card.days}
            meta={`${card.weeks} weeks · ${card.minutes} min · ${card.repStyle}`}
            chips={[GOALS.find((g) => g.value === goal)!.title, `${card.days} days`, PLACES.find((p) => p.value === place)!.label.split(',')[0], EXPERIENCE.find((e) => e.months === months)!.label]}
            nearest={card.nearest}
          />

          {error ? <ErrorCard message={error} onRetry={submit} retrying={saving} /> : null}

          <Button variant="primary" accent={A} accentDeep={COLORS.blueDeep} size="lg" fullWidth saving={saving} disabled={!basicsOk || !userId} onPress={submit}>
            Use this plan
          </Button>
        </ScrollView>
      </KeyboardAvoidingView>

      <BottomSheet visible={sheetPart !== null} onClose={() => setSheetPart(null)}>
        {sheetPart ? (
          <View style={{ padding: 20, gap: 12 }}>
            <Text style={{ color: COLORS.fg, fontSize: 20, fontFamily: BG[800] }}>
              {INJURY_PARTS.find((p) => p.part === sheetPart)!.label}: how bad is it?
            </Text>
            {SEVERITIES.map((s) => (
              <PressScale key={s} onPress={() => setSeverity(sheetPart, s)} accessibilityRole="button" accessibilityLabel={`${SEVERITY_TEXT[s].label}. ${SEVERITY_TEXT[s].note}`}>
                <Surface padding={14}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                    <View style={{ flex: 1 }}>
                      <Text style={{ color: COLORS.fg, fontSize: 17, fontFamily: BG[800] }}>{SEVERITY_TEXT[s].label}</Text>
                      <Text style={{ color: COLORS.textMuted, fontSize: 13, fontFamily: BG[400] }}>{SEVERITY_TEXT[s].note}</Text>
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


