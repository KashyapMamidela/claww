import React, { useEffect, useMemo, useState } from 'react';
import { ScrollView, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { COLORS, FONT, BG, bg } from '../../../lib/theme';
import { track } from '../../../lib/analytics';
import { FOOD_ROWS, countAvailability, dietLabel, proteinVerdict, visibleFoods, cookLabel, sourcesLabel, type FoodKey, type Availability } from '../../../lib/resourceDefaults';
import { draftAvailability, getDraft, patchDraft, setFood, type MealSetupDraft } from '../../../lib/mealSetupDraft';
import { MealSetupHeader } from '../../../components/MealSetupHeader';
import { TriState } from '../../../components/TriState';
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
  const availability = useMemo(() => draftAvailability(draft), [draft]);
  const visible = useMemo(() => new Set(visibleFoods(draft.diet)), [draft.diet]);

  useEffect(() => {
    track('nutrition_setup_step_2');
  }, []);

  const set = (key: FoodKey, value: Availability) => setDraft(patchDraft(setFood(getDraft(), key, value)));
  const allYes = (group: 'protein' | 'everyday') => {
    let d = getDraft();
    for (const r of FOOD_ROWS) if (r.group === group && visible.has(r.key)) d = setFood(d, r.key, 'yes');
    setDraft(patchDraft(d));
  };

  const shown = FOOD_ROWS.filter((r) => visible.has(r.key));
  const counts = countAvailability(availability, shown.map((r) => r.key));
  const because = `${sourcesLabel(draft.sources).toLowerCase().replace(/ \+ eating out$/, '')} + ${cookLabel(draft.cookWith).toLowerCase()}`;

  const group = (g: 'protein' | 'everyday', title: string) => {
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

        {group('protein', 'PROTEIN')}
        {group('everyday', 'EVERYDAY')}

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
