import React, { useEffect, useMemo, useState } from 'react';
import { ScrollView, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { COLORS, FONT, BG, bg } from '../../../lib/theme';
import { track } from '../../../lib/analytics';
import { FOOD_ROWS, GROUP_TITLES, countAvailability, dietLabel, proteinVerdict, visibleFoods, cookLabel, sourcesLabel, type FoodKey, type FoodGroup, type Availability } from '../../../lib/resourceDefaults';
import { draftAvailability, getDraft, patchDraft, setFood, type MealSetupDraft } from '../../../lib/mealSetupDraft';
import { MealSetupHeader } from '../../../components/MealSetupHeader';
import { TriState } from '../../../components/TriState';
import { FoodDeck } from '../../../components/nutrition/FoodDeck';
import { FoodSearchSheet } from '../../../components/nutrition/FoodSearchSheet';
import { addCustom, removeCustom, MAX_CUSTOM_FOODS } from '../../../lib/customFoods';
import { Button } from '../../../components/ui/Button';
import { Icon } from '../../../components/ui/Icon';
import { PressScale } from '../../../components/ui/PressScale';
import { SectionLabel } from '../../../components/ui/SectionLabel';
import { Surface } from '../../../components/ui/Surface';

const G = COLORS.green;

// NG PHASE 6, step 2 (screen 12): "Can you get these?", pre-filled from step 1. Fix only what is wrong.

export default function MealSetupFoods() {
  const router = useRouter();
  const [draft, setDraft] = useState<MealSetupDraft>(getDraft());
  // Cards first (swipe up yes, down no, tap sometimes); the full list stays one tap away.
  const [view, setView] = useState<'deck' | 'list'>('deck');
  const [searchOpen, setSearchOpen] = useState(false);
  const customFoods = draft.customFoods ?? [];
  const availability = useMemo(() => draftAvailability(draft), [draft]);
  const visible = useMemo(() => new Set(visibleFoods(draft.diet)), [draft.diet]);

  useEffect(() => {
    track('nutrition_setup_step_2');
  }, []);

  const set = (key: FoodKey, value: Availability) => setDraft(patchDraft(setFood(getDraft(), key, value)));
  const allYes = (group: FoodGroup) => {
    let d = getDraft();
    for (const r of FOOD_ROWS) if (r.group === group && visible.has(r.key)) d = setFood(d, r.key, 'yes');
    setDraft(patchDraft(d));
  };

  const shown = FOOD_ROWS.filter((r) => visible.has(r.key));
  const counts = countAvailability(availability, shown.map((r) => r.key));
  const because = `${sourcesLabel(draft.sources).toLowerCase().replace(/ \+ eating out$/, '')} + ${cookLabel(draft.cookWith).toLowerCase()}`;

  const group = (g: FoodGroup, title: string) => {
    const rows = shown.filter((r) => r.group === g);
    if (rows.length === 0) return null;
    return (
      <Surface padding={16}>
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
          <SectionLabel color={G}>{title}</SectionLabel>
          <PressScale onPress={() => allYes(g)} accessibilityRole="button" accessibilityLabel={`Mark every ${title.toLowerCase()} food as yes`}>
            <View style={{ minHeight: 44, paddingHorizontal: 16, borderRadius: 22, borderWidth: 1, borderColor: COLORS.greenBorderMd, alignItems: 'center', justifyContent: 'center' }}>
              <Text style={{ color: G, fontSize: 13, fontFamily: BG[700] }}>All yes</Text>
            </View>
          </PressScale>
        </View>
        {rows.map((r, i) => (
          <View key={r.key} style={{ flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 12, borderTopWidth: i === 0 ? 0 : 1, borderTopColor: COLORS.border }}>
            <View style={{ flex: 1 }}>
              <Text style={{ color: COLORS.fg, fontSize: 17, fontFamily: BG[800] }}>{r.title}</Text>
              <Text style={{ color: COLORS.textMuted, fontSize: 13, fontFamily: BG[400] }}>{r.sub}</Text>
            </View>
            <TriState value={availability[r.key]} onChange={(v) => set(r.key, v)} label={r.title} />
          </View>
        ))}
      </Surface>
    );
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: COLORS.bg }}>
      <MealSetupHeader step={2} sub="can you get these?" />
      <ScrollView contentContainerStyle={{ paddingHorizontal: 20, paddingTop: 18, paddingBottom: 32, gap: 14 }}>
        <Text style={{ color: COLORS.fg, fontSize: 28, fontVariant: ['tabular-nums'], letterSpacing: -0.6, fontFamily: BG[800] }}>Can you get these?</Text>
        <Text style={{ color: COLORS.textMuted, fontSize: 15, lineHeight: 21, fontFamily: BG[400] }}>
          We filled these in from <Text style={{ color: COLORS.fg, fontWeight: '800' }}>{because}</Text>. Fix only what is wrong; the diary learns the rest.
          {draft.diet ? ` (${dietLabel(draft.diet)})` : ''}
        </Text>

        <View style={{ flexDirection: 'row', backgroundColor: 'rgba(0,0,0,0.45)', borderRadius: 14, padding: 3, borderWidth: 1, borderColor: COLORS.border, overflow: 'hidden' }} accessibilityRole="radiogroup">
          {(['deck', 'list'] as const).map((v) => (
            <PressScale key={v} onPress={() => setView(v)} accessibilityRole="radio" accessibilityState={{ selected: view === v }} accessibilityLabel={v === 'deck' ? 'Cards' : 'List'} style={{ flex: 1 }}>
              <View style={{ minHeight: 40, borderRadius: 11, alignItems: 'center', justifyContent: 'center', backgroundColor: view === v ? 'rgba(34,197,94,0.22)' : 'transparent' }}>
                <Text style={{ color: view === v ? G : COLORS.textMuted, fontSize: 14, fontFamily: BG[800] }}>{v === 'deck' ? 'Cards' : 'List'}</Text>
              </View>
            </PressScale>
          ))}
        </View>

        {view === 'deck' ? (
          <FoodDeck rows={shown} availability={availability} onAnswer={(key, value) => setDraft(patchDraft(setFood(getDraft(), key, value)))} groupTitle={(r) => GROUP_TITLES[r.group]} />
        ) : (
          <>
            {(['protein', 'everyday', 'staple', 'fresh'] as FoodGroup[]).map((g) => (
              <React.Fragment key={g}>{group(g, GROUP_TITLES[g])}</React.Fragment>
            ))}
          </>
        )}

        <Surface padding={16}>
          <SectionLabel color={G}>NOT ON THE LIST?</SectionLabel>
          <Text style={{ color: COLORS.textMuted, fontSize: 14, lineHeight: 20, marginTop: 4, fontFamily: BG[400] }}>
            Add any food you can get, such as rajma, ragi malt or sattu. The plan uses it to top up protein.
          </Text>
          {customFoods.length > 0 ? (
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 12 }}>
              {customFoods.map((name) => (
                <PressScale key={name} onPress={() => setDraft(patchDraft({ customFoods: removeCustom(getDraft().customFoods ?? [], name) }))} accessibilityRole="button" accessibilityLabel={`Remove ${name}`}>
                  <View style={{ minHeight: 40, paddingHorizontal: 12, borderRadius: 20, flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: 'rgba(34,197,94,0.18)', borderWidth: 1, borderColor: COLORS.greenBorderMd }}>
                    <Text style={{ color: '#86EFAC', fontSize: 14, fontFamily: BG[700] }}>{name}</Text>
                    <Icon name="x" size={13} color="#86EFAC" />
                  </View>
                </PressScale>
              ))}
            </View>
          ) : null}
          <View style={{ marginTop: 12 }}>
            <Button variant="secondary" size="md" fullWidth disabled={customFoods.length >= MAX_CUSTOM_FOODS} onPress={() => setSearchOpen(true)} icon={<Icon name="plus" size={16} color={COLORS.fg} />}>
              Add a food I get
            </Button>
          </View>
        </Surface>

        <Surface padding={14}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
            <Pill text={`${counts.yes} yes`} bg="rgba(34,197,94,0.20)" fg="#86EFAC" />
            <Pill text={`${counts.sometimes} sometimes`} bg="rgba(245,158,11,0.20)" fg="#FCD34D" />
            <Pill text={`${counts.no} no`} bg="rgba(255,255,255,0.10)" fg={COLORS.textMuted} />
            <Text style={{ color: COLORS.textMuted, fontSize: 13, flex: 1, textAlign: 'right', minWidth: 120, fontFamily: BG[400] }}>{proteinVerdict(availability, draft.diet)}</Text>
          </View>
        </Surface>

        <Button variant="primary" accent={G} accentDeep={COLORS.greenDeep} size="lg" fullWidth onPress={() => router.push('/screens/nutrition-setup/summary')} icon={<Icon name="chevron-right" size={16} color="#fff" />}>
          See what you have
        </Button>
      </ScrollView>
      <FoodSearchSheet
        visible={searchOpen}
        mealType="Snack"
        recent={[]}
        pickImmediately
        onPickFood={(food) => {
          setDraft(patchDraft({ customFoods: addCustom(getDraft().customFoods ?? [], food.name) }));
          setSearchOpen(false);
        }}
        onClose={() => setSearchOpen(false)}
        onLogged={() => setSearchOpen(false)}
      />
    </SafeAreaView>
  );
}

function Pill({ text, bg, fg }: { text: string; bg: string; fg: string }) {
  return (
    <View style={{ borderRadius: 10, paddingHorizontal: 10, paddingVertical: 6, backgroundColor: bg }}>
      <Text style={{ color: fg, fontSize: 13, fontFamily: BG[800] }}>{text}</Text>
    </View>
  );
}
