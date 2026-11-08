import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Pressable, ScrollView, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { COLORS, FONT } from '../lib/theme';
import { useAppState, type MealLogRow } from '../lib/appState';
import { catchUpSlots, countLine, type Slot } from '../lib/dayMoments';
import { clockLabel } from '../lib/homeMoment';
import { ELSE_LABEL, dinnerReason, elseChoices, mealForAnswer, type AnsweredMeal, type CatchAnswer, type ElseChoice } from '../lib/catchUp';
import { ensureMealPlans, loadPlanInputs, replanToday, type StoredPlan } from '../lib/mealPlanData';
import type { MealType } from '../lib/data';
import type { PlanDiet } from '../lib/engine';
import { itemsText } from '../lib/mealPlanMeal';
import { MealThumb } from '../components/MealPhoto';
import { Chip } from '../components/ui/Chip';
import { Display } from '../components/ui/Typography';
import { Icon } from '../components/ui/Icon';
import { PenMark } from '../components/ui/PenMark';
import { SectionLabel } from '../components/ui/SectionLabel';
import { Segmented } from '../components/ui/Segmented';
import { Skeleton } from '../components/ui/Skeleton';
import { Surface } from '../components/ui/Surface';

// NG PHASE 10 (screen 15): the quick catch-up. Each meal with no answer is a card with its plan and three choices.
// Every answer is saved the moment it is chosen (no Save button) and dinner is planned again from what was eaten.

const G = COLORS.green;
type Mode = 'planned' | 'else' | 'skipped';

const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

interface SlotState {
  mode: Mode;
  choice?: ElseChoice;
  rowId?: string;
}

export default function CatchUpScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { userId, meals, saveMeal, removeMeal } = useAppState();
  const [plan, setPlan] = useState<StoredPlan | null>(null);
  const [diet, setDiet] = useState<PlanDiet>('veg');
  const [ready, setReady] = useState(false);
  const [slots, setSlots] = useState<Slot[] | null>(null);
  const [state, setState] = useState<Partial<Record<Slot, SlotState>>>({});
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [savedOnce, setSavedOnce] = useState(false);
  const mealsRef = useRef<MealLogRow[]>(meals);
  mealsRef.current = meals;

  // The plan and the user's diet; the list of cards is fixed once, so a meal does not vanish as soon as it is answered.
  useEffect(() => {
    if (!userId) return;
    let cancelled = false;
    (async () => {
      const [p, inputs] = await Promise.all([ensureMealPlans(userId), loadPlanInputs(userId)]);
      if (cancelled) return;
      setPlan(p);
      if (inputs) setDiet(inputs.input.resources.diet);
      setReady(true);
    })();
    return () => {
      cancelled = true;
    };
  }, [userId]);

  useEffect(() => {
    if (!ready || slots !== null) return;
    const now = new Date();
    setSlots(catchUpSlots(mealsRef.current.map((m) => m.meal_type), now.getHours(), now.getMinutes()));
  }, [ready, slots]);

  const plannedFor = (slot: Slot) => plan?.meals.find((m) => m.meal === slot) ?? null;
  const loggedFor = (slot: Slot) => meals.find((m) => (m.meal_type ?? '').toLowerCase() === slot) ?? null;

  const answer = async (slot: Slot, a: CatchAnswer) => {
    if (!userId || busy) return;
    setError(null);
    const prev = state[slot];
    if (a.kind === 'else' && a.choice === 'photo') {
      router.push({ pathname: '/scan', params: { mealType: cap(slot) } });
      return;
    }
    const saved = mealForAnswer(slot, a, plannedFor(slot), diet);
    if (!saved) {
      setError('That is not available for this meal.');
      return;
    }
    setBusy(true);
    let current = mealsRef.current;
    if (prev?.rowId) {
      await removeMeal(prev.rowId);
      current = current.filter((m) => m.id !== prev.rowId);
    }
    const row = await saveMeal(cap(slot) as MealType, saved);
    if (!row) {
      setBusy(false);
      setError('Could not save that. Check your connection and try again.');
      return;
    }
    setState((s) => ({ ...s, [slot]: { mode: a.kind === 'else' ? 'else' : a.kind, choice: a.kind === 'else' ? a.choice : undefined, rowId: row.id } }));
    const next = await replanToday(userId, [...current, row]);
    if (next) setPlan(next);
    setSavedOnce(true);
    setBusy(false);
  };

  const modeOf = (slot: Slot): Mode | null => state[slot]?.mode ?? (loggedFor(slot) ? (loggedFor(slot)!.plan_status === 'skipped' ? 'skipped' : 'else') : null);

  const pickMode = (slot: Slot, m: Mode) => {
    if (m === 'planned') answer(slot, { kind: 'planned' });
    else if (m === 'skipped') answer(slot, { kind: 'skipped' });
    else setState((s) => ({ ...s, [slot]: { ...(s[slot] ?? {}), mode: 'else' } }));
  };

  const answered: AnsweredMeal[] = useMemo(
    () =>
      (slots ?? []).flatMap((slot) => {
        const st = state[slot];
        const row = meals.find((m) => (m.meal_type ?? '').toLowerCase() === slot);
        if (!st?.rowId || !row) return [];
        return [{ slot, kind: st.mode === 'else' ? ('else' as const) : st.mode, choice: st.choice, kcal: row.calories ?? 0, plannedKcal: plan?.meals.find((m) => m.meal === slot)?.kcal ?? null }];
      }),
    [slots, state, meals, plan]
  );

  const dinner = plan?.meals.find((m) => m.meal === 'dinner') ?? null;
  const dinnerLogged = meals.some((m) => (m.meal_type ?? '').toLowerCase() === 'dinner');
  const dinnerOld = plan?.replaced?.dinner ?? null;
  const reason = dinnerReason(answered);
  const showDinner = savedOnce && dinner && !dinnerLogged;
  const remaining = slots ? slots.filter((s) => !state[s]?.rowId && !loggedFor(s)).length : 0;

  return (
    <View style={{ flex: 1, backgroundColor: COLORS.bg }}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingTop: insets.top + 12, paddingHorizontal: 16, paddingBottom: insets.bottom + 40, gap: 14 }}>
        <Pressable onPress={() => router.back()} accessibilityRole="button" accessibilityLabel="Back" style={{ minHeight: 44, justifyContent: 'center' }}>
          <SectionLabel color={G}>{`TODAY · ${clockLabel(new Date()).toUpperCase()}`}</SectionLabel>
        </Pressable>
        <Display>Quick catch-up</Display>

        {slots === null ? (
          <View style={{ gap: 12 }}>
            <Skeleton height={120} />
            <Skeleton height={120} />
          </View>
        ) : slots.length === 0 ? (
          <Surface>
            <View style={{ padding: 18, gap: 6 }}>
              <Text style={{ color: COLORS.fg, fontSize: 17, fontWeight: '800', fontFamily: FONT }}>Every meal has an answer</Text>
              <Text style={{ color: COLORS.textMuted, fontSize: 15, lineHeight: 20, fontFamily: FONT }}>Nothing to catch up on. Dinner will show up here if it is still open at the end of the day.</Text>
            </View>
          </Surface>
        ) : (
          <>
            <Text style={{ color: COLORS.textMuted, fontSize: 17, lineHeight: 23, fontFamily: FONT }}>
              {countLine(slots.length)} A rough answer is enough; it keeps <Text style={{ color: COLORS.fg, fontWeight: '700' }}>dinner and tomorrow</Text> right.
            </Text>

            {slots.map((slot) => {
              const planned = plannedFor(slot);
              const mode = modeOf(slot);
              const options: { value: Mode; label: string }[] = [
                ...(planned ? [{ value: 'planned' as Mode, label: 'As planned' }] : []),
                { value: 'else', label: 'Different' },
                { value: 'skipped', label: 'Skipped' },
              ];
              const chosen = state[slot]?.choice;
              const answeredNow = !!state[slot]?.rowId || !!loggedFor(slot);
              return (
                <Surface key={slot}>
                  <View style={{ padding: 14, gap: 12 }}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                      <MealThumb photoPath={loggedFor(slot)?.photo_url} mealType={cap(slot)} size={52} />
                      <View style={{ flex: 1 }}>
                        <Text style={{ color: COLORS.textMuted, fontSize: 15, fontFamily: FONT }}>{`${cap(slot)} · ${answeredNow ? 'saved' : 'not logged'}`}</Text>
                        <Text style={{ color: COLORS.fg, fontSize: 17, fontWeight: '800', fontFamily: FONT }} numberOfLines={2}>
                          {planned ? `Plan: ${planned.name}` : 'What did you have?'}
                        </Text>
                        {planned && mode === null ? <Text style={{ color: COLORS.textMuted, fontSize: 13, fontFamily: FONT }} numberOfLines={1}>{itemsText(planned)}</Text> : null}
                      </View>
                    </View>
                    <Segmented
                      accent={G}
                      accentDeep={COLORS.greenDeep}
                      accessibilityLabel={`${cap(slot)} answer`}
                      options={options}
                      value={mode}
                      onChange={(m) => pickMode(slot, m)}
                    />
                    {mode === 'else' ? (
                      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
                        {elseChoices(slot, diet, planned).map((c) => (
                          <Chip
                            key={c}
                            accent={G}
                            accentDeep={COLORS.greenDeep}
                            active={chosen === c}
                            icon={c === 'photo' ? <Icon name="camera" size={14} color={chosen === c ? '#fff' : G} /> : undefined}
                            onPress={() => answer(slot, { kind: 'else', choice: c })}
                          >
                            {ELSE_LABEL[c]}
                          </Chip>
                        ))}
                      </View>
                    ) : null}
                  </View>
                </Surface>
              );
            })}

            {showDinner ? (
              <PenMark
                area="nutrition"
                item="Your dinner, marked"
                oldValue={dinnerOld}
                newValue={dinner!.name}
                note={reason ?? 'dinner stays as planned'}
                reason={reason ? 'Dinner was planned again from what you ate today, so the day still lands near your targets.' : 'What you ate fits the plan, so dinner is unchanged.'}
                context={`${dinner!.kcal} kcal · P ${Math.round(dinner!.protein)} g`}
              />
            ) : null}

            {error ? <Text style={{ color: COLORS.danger, fontSize: 15, fontFamily: FONT }} accessibilityRole="alert">{error}</Text> : null}

            {savedOnce ? (
              <View accessibilityLiveRegion="polite" style={{ minHeight: 56, borderRadius: 16, borderWidth: 1, borderColor: COLORS.greenBorderMd, backgroundColor: 'rgba(34,197,94,0.08)', flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingHorizontal: 14 }}>
                <Icon name="check" size={16} color={G} strokeWidth={3} />
                <Text style={{ color: G, fontSize: 17, fontWeight: '800', fontFamily: FONT }}>{`Saved as you answer${showDinner ? ' · dinner updated' : ''}`}</Text>
              </View>
            ) : null}

            {remaining === 0 ? (
              <Pressable onPress={() => router.replace('/(tabs)/nutrition')} accessibilityRole="button" style={{ minHeight: 48, alignItems: 'center', justifyContent: 'center' }}>
                <Text style={{ color: G, fontSize: 15, fontWeight: '800', fontFamily: FONT }}>Done</Text>
              </Pressable>
            ) : null}
          </>
        )}
      </ScrollView>
    </View>
  );
}
