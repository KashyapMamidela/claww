import React, { useEffect, useState } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { COLORS, FONT } from '../../../lib/theme';
import { useAppState } from '../../../lib/appState';
import { basicsSummary, hasBasics, profileBasics, useProfile } from '../../../lib/profile';
import { track } from '../../../lib/analytics';
import { COOK_OPTIONS, DIET_OPTIONS, SOURCES } from '../../../lib/resourceDefaults';
import { getDraft, patchDraft, step1Complete, toggleCook, toggleSource, type MealSetupDraft } from '../../../lib/mealSetupDraft';
import { MealSetupHeader } from '../../../components/MealSetupHeader';
import { ProfileBasicsCard } from '../../../components/ProfileBasicsCard';
import { Button } from '../../../components/ui/Button';
import { Chip } from '../../../components/ui/Chip';
import { Icon } from '../../../components/ui/Icon';
import { PressScale } from '../../../components/ui/PressScale';
import { SectionLabel } from '../../../components/ui/SectionLabel';

const G = COLORS.green;

// NG PHASE 6, step 1 (screen 11): where the food comes from, what the user can cook with, what they eat.
// Height, weight and age are asked here only when the profile does not have them.

export default function MealSetupWhere() {
  const router = useRouter();
  const { userId } = useAppState();
  const { profile, loading } = useProfile(userId);
  const basics = profileBasics(profile);
  const known = hasBasics(basics, ['heightCm', 'weightKg', 'age']);

  const [draft, setDraft] = useState<MealSetupDraft>(getDraft());
  const [editing, setEditing] = useState(false);
  const [height, setHeight] = useState('');
  const [weight, setWeight] = useState('');
  const [age, setAge] = useState('');

  useEffect(() => {
    track('nutrition_setup_step_1');
  }, []);

  useEffect(() => {
    if (basics.heightCm && !height) setHeight(String(basics.heightCm));
    if (basics.weightKg && !weight) setWeight(String(basics.weightKg));
    if (basics.age && !age) setAge(String(basics.age));
    // fill once when the profile arrives; never overwrite what is being typed
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [basics.heightCm, basics.weightKg, basics.age]);

  const update = (patch: Partial<MealSetupDraft>) => setDraft(patchDraft(patch));
  const showInputs = (!known && !loading) || editing;
  const basicsOk = !showInputs || (Number(height) > 0 && Number(weight) > 0 && Number(age) > 0);
  const ready = step1Complete(draft) && basicsOk;

  const next = () => {
    if (!ready) return;
    patchDraft({ basics: showInputs ? { height: Number(height), weight: Number(weight), age: Number(age) } : undefined });
    router.push('/screens/nutrition-setup/foods');
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: COLORS.bg }}>
      <MealSetupHeader step={1} sub="what you can get" />
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }}>
        <ScrollView contentContainerStyle={{ paddingHorizontal: 20, paddingTop: 18, paddingBottom: 32, gap: 14 }} keyboardShouldPersistTaps="handled">
          <Text style={{ color: COLORS.fg, fontSize: 28, fontWeight: '900', letterSpacing: -0.6, lineHeight: 32, fontFamily: FONT }}>Where does your food come from?</Text>
          <Text style={{ color: COLORS.textMuted, fontSize: 15, lineHeight: 21, fontFamily: FONT }}>
            Everyone eats differently. Pick all that apply; your plan only uses food you can actually get.
          </Text>

          {known && !editing ? (
            <ProfileBasicsCard summary={basicsSummary(basics, ['heightCm', 'weightKg', 'age'])} accent={G} onEdit={() => setEditing(true)} />
          ) : showInputs ? (
            <View style={{ flexDirection: 'row', gap: 10 }}>
              {[
                ['Height (cm)', height, setHeight],
                ['Weight (kg)', weight, setWeight],
                ['Age', age, setAge],
              ].map(([ph, value, set]) => (
                <TextInput
                  key={ph as string}
                  value={value as string}
                  onChangeText={set as (v: string) => void}
                  placeholder={ph as string}
                  placeholderTextColor={COLORS.textFaint}
                  keyboardType="numeric"
                  accessibilityLabel={ph as string}
                  style={{ flex: 1, minWidth: 0, height: 52, backgroundColor: COLORS.card, borderWidth: 1, borderColor: (value as string).length > 0 ? COLORS.greenBorder : COLORS.border, borderRadius: 14, color: COLORS.fg, fontSize: 17, fontWeight: '700', paddingHorizontal: 12, fontFamily: FONT }}
                />
              ))}
            </View>
          ) : null}

          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10 }}>
            {SOURCES.map((s) => {
              const on = draft.sources.includes(s.value);
              return (
                <PressScale
                  key={s.value}
                  onPress={() => update({ sources: toggleSource(draft.sources, s.value) })}
                  accessibilityRole="checkbox"
                  accessibilityState={{ checked: on }}
                  accessibilityLabel={`${s.title}. ${s.sub}`}
                  style={{ width: '48.4%' }}
                >
                  <View style={{ minHeight: 100, borderRadius: 18, borderWidth: 1, borderColor: on ? G : COLORS.border, padding: 14, gap: 10, backgroundColor: on ? 'rgba(34,197,94,0.14)' : COLORS.card }}>
                    <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                      <View style={{ width: 32, height: 32, borderRadius: 10, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(34,197,94,0.14)' }}>
                        <Icon name={s.icon} size={17} color={G} />
                      </View>
                      <View style={{ width: 22, height: 22, borderRadius: 7, borderWidth: 1.5, borderColor: on ? G : COLORS.borderStrong, backgroundColor: on ? G : 'transparent', alignItems: 'center', justifyContent: 'center' }}>
                        {on ? <Icon name="check" size={14} color="#052e16" /> : null}
                      </View>
                    </View>
                    <View>
                      <Text style={{ color: COLORS.fg, fontSize: 15, fontWeight: '800', fontFamily: FONT }}>{s.title}</Text>
                      <Text style={{ color: COLORS.textMuted, fontSize: 13, fontFamily: FONT }}>{s.sub}</Text>
                    </View>
                  </View>
                </PressScale>
              );
            })}
          </View>

          <SectionLabel color={G}>WHAT CAN YOU COOK WITH?</SectionLabel>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10 }}>
            {COOK_OPTIONS.map((c) => (
              <Chip key={c.value} active={draft.cookWith.includes(c.value)} accent={G} accentDeep={COLORS.greenDeep} onPress={() => update({ cookWith: toggleCook(draft.cookWith, c.value) })}>
                {c.label}
              </Chip>
            ))}
          </View>

          <SectionLabel color={G}>YOU EAT</SectionLabel>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10 }}>
            {DIET_OPTIONS.map((d) => (
              <Chip key={d.value} active={draft.diet === d.value} accent={G} accentDeep={COLORS.greenDeep} onPress={() => update({ diet: d.value })}>
                {d.label}
              </Chip>
            ))}
          </View>

          <Button variant="primary" accent={G} accentDeep={COLORS.greenDeep} size="lg" fullWidth disabled={!ready} onPress={next} >
            Next: what you can get
          </Button>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
