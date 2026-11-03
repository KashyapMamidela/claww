import React, { useEffect, useState } from 'react';
import { Text, View } from 'react-native';
import { COLORS, FONT } from '../../lib/theme';
import { catalogKey, type CatalogEntry } from '../../lib/muscleRecovery';
import { getCatalog, getSwapPool } from '../../lib/adaptiveData';
import { swapCandidates } from '../../lib/swapCandidates';
import { useAppState } from '../../lib/appState';
import { useProfile } from '../../lib/profile';
import { BottomSheet } from '../ui/BottomSheet';
import { Button } from '../ui/Button';
import { Icon } from '../ui/Icon';
import { PressScale } from '../ui/PressScale';
import { Skeleton } from '../ui/Skeleton';

// "Swap · bench taken?" (NG PHASE 3.4, screen 07). Up to six exercises that work the same muscle with the
// same movement, from the user's equipment and not excluded by their injuries. Picking one swaps it into
// the slot: same sets and reps, starting from its own last weight (or finding one if it is new).

const EQUIPMENT_LABEL: Record<string, string> = { gym: 'Gym', home: 'Home equipment', none: 'Bodyweight' };

const titleCase = (s: string) => s.replace(/_/g, ' ').replace(/^\w/, (c) => c.toUpperCase());

export interface SwapSheetProps {
  visible: boolean;
  exerciseName: string;
  /** Names already in today's session, so none is offered twice. */
  todayNames: string[];
  onPick: (entry: CatalogEntry) => void;
  onClose: () => void;
}

type Load = { kind: 'loading' } | { kind: 'ready'; muscle: string; options: CatalogEntry[] } | { kind: 'none'; muscle: string | null };

export function SwapSheet({ visible, exerciseName, todayNames, onPick, onClose }: SwapSheetProps) {
  const { userId } = useAppState();
  const { profile } = useProfile(userId);
  const [load, setLoad] = useState<Load>({ kind: 'loading' });

  useEffect(() => {
    if (!visible) return;
    let cancelled = false;
    setLoad({ kind: 'loading' });
    (async () => {
      const current = (await getCatalog([exerciseName]))[catalogKey(exerciseName)] ?? null;
      if (!current?.primaryMuscle || !current.movementPattern) {
        if (!cancelled) setLoad({ kind: 'none', muscle: current?.primaryMuscle ?? null });
        return;
      }
      const pool = await getSwapPool(current.primaryMuscle, current.movementPattern);
      const options = swapCandidates(current, pool, {
        todayNames,
        equipment: profile?.equipment ?? null,
        injuriesText: profile?.personalization_profile?.workoutDefaults?.injuries ?? null,
      });
      if (!cancelled) setLoad(options.length ? { kind: 'ready', muscle: current.primaryMuscle, options } : { kind: 'none', muscle: current.primaryMuscle });
    })().catch(() => {
      if (!cancelled) setLoad({ kind: 'none', muscle: null });
    });
    return () => {
      cancelled = true;
    };
    // todayNames changes identity every render; the exercise name is what decides the list
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visible, exerciseName, profile?.equipment]);

  return (
    <BottomSheet visible={visible} onClose={onClose} maxHeightFraction={0.8}>
      <View style={{ gap: 12 }}>
        <View style={{ gap: 4 }}>
          <Text accessibilityRole="header" style={{ color: COLORS.fg, fontSize: 21, fontWeight: '800', fontFamily: FONT }}>
            Swap {exerciseName}
          </Text>
          <Text style={{ color: COLORS.textMuted, fontSize: 13, lineHeight: 19, fontFamily: FONT }}>
            Same muscle, same movement. Your sets and reps stay; weight starts from what you last did.
          </Text>
        </View>

        {load.kind === 'loading' ? (
          <View style={{ gap: 8 }}>
            <Skeleton height={60} borderRadius={14} />
            <Skeleton height={60} borderRadius={14} />
            <Skeleton height={60} borderRadius={14} />
          </View>
        ) : load.kind === 'none' ? (
          <View style={{ gap: 12, paddingVertical: 8 }}>
            <Text style={{ color: COLORS.fgGray, fontSize: 14, lineHeight: 20, fontFamily: FONT }}>
              {load.muscle
                ? `No other ${load.muscle} exercise fits your equipment and injuries right now. Skip it with a swipe, or carry on with this one.`
                : 'This exercise has no swap options yet. Skip it with a swipe, or carry on with it.'}
            </Text>
            <Button variant="ghost" fullWidth onPress={onClose}>
              Keep {exerciseName}
            </Button>
          </View>
        ) : (
          <View style={{ gap: 8 }}>
            {load.options.map((o) => (
              <PressScale key={o.id} onPress={() => onPick(o)} accessibilityRole="button" accessibilityLabel={`Swap to ${o.name}`}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, minHeight: 60, paddingHorizontal: 14, borderRadius: 16, backgroundColor: 'rgba(255,255,255,0.04)', borderWidth: 1, borderColor: COLORS.border }}>
                  <View style={{ flex: 1 }}>
                    <Text numberOfLines={1} style={{ color: COLORS.fg, fontSize: 15, fontWeight: '700', fontFamily: FONT }}>
                      {o.name}
                    </Text>
                    <Text numberOfLines={1} style={{ color: COLORS.textMuted, fontSize: 12, marginTop: 2, fontFamily: FONT }}>
                      {[titleCase(load.muscle), EQUIPMENT_LABEL[o.equipment ?? ''] ?? null].filter(Boolean).join(' · ')}
                    </Text>
                  </View>
                  <Icon name="chevron-right" size={16} color={COLORS.textMuted} />
                </View>
              </PressScale>
            ))}
          </View>
        )}
      </View>
    </BottomSheet>
  );
}
