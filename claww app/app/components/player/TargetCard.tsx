import React from 'react';
import { Text, View } from 'react-native';
import { COLORS, FONT } from '../../lib/theme';
import { PLATE_COLORS, plateLoad, plateText, targetDiffers } from '../../lib/plateMath';
import { PenMark } from '../ui/PenMark';
import { Surface } from '../ui/Surface';

// The player's target card (NG PHASE 3.3, screen 07): today's prescription, shown as a compact
// pen mark when it differs from the plan (old value struck, new value bold with the underline,
// a one-line note, tap for the reason and "Use <old>"), and the live plate math on the right.
// Dumbbells, machines and bodyweight get no bar drawing.

const PLATE_HEIGHT: Record<number, number> = { 25: 46, 20: 42, 15: 36, 10: 30, 5: 24, 2.5: 19, 1.25: 15 };

/** One side of the bar, collar outward: the bar, then each plate as a coloured block. */
function PlateBar({ perSide }: { perSide: number[] }) {
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', height: 50 }} accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
      <View style={{ width: 26, height: 7, borderRadius: 3.5, backgroundColor: '#9CA3AF' }} />
      <View style={{ width: 4, height: 24, borderRadius: 2, backgroundColor: '#D1D5DB', marginHorizontal: 1 }} />
      {perSide.map((p, i) => (
        <View key={`${p}-${i}`} style={{ width: 8, height: PLATE_HEIGHT[p] ?? 20, borderRadius: 2.5, backgroundColor: PLATE_COLORS[p] ?? '#9CA3AF', marginRight: 1.5 }} />
      ))}
      <View style={{ width: 8, height: 7, borderRadius: 3.5, backgroundColor: '#9CA3AF' }} />
    </View>
  );
}

export interface TargetCardProps {
  /** The weight of the set being done now (the steppers change it, so the plates follow). */
  currentKg: number;
  /** Plan's weight before today's recovery check, and today's prescription; null for bodyweight. */
  planKg: number | null;
  todayKg: number | null;
  /** Short handwritten note: the engine's command label ("Weight down"). */
  note: string;
  /** The engine's full reason, shown on tap. */
  reason: string;
  barKg: number;
  barbell: boolean;
  /** "Use my old plan": put the plan's weight back on the sets still to do. */
  onUsePlan: () => void;
}

const fmt = (n: number) => `${Math.round(n * 100) / 100}`;

export function TargetCard({ currentKg, planKg, todayKg, note, reason, barKg, barbell, onUsePlan }: TargetCardProps) {
  const differs = targetDiffers(planKg, todayKg);
  const load = barbell && currentKg > 0 ? plateLoad(currentKg, barKg) : null;
  if (!differs && !load) return null;

  return (
    <Surface padding={16} grain={0.06} accessibilityLabel={load ? `Target ${fmt(currentKg)} kilograms. ${plateText(load)}` : undefined}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 14 }}>
        <View style={{ flex: 1 }}>
          {differs ? (
            <PenMark
              compact
              area="workout"
              item="Target"
              oldValue={`${fmt(planKg as number)} kg`}
              newValue={`${fmt(todayKg as number)} kg`}
              note={note}
              reason={reason}
              useOldLabel={`Use ${fmt(planKg as number)} kg`}
              onUseOld={onUsePlan}
            />
          ) : (
            <View style={{ gap: 4 }}>
              <Text style={{ color: COLORS.textMuted, fontSize: 13, fontWeight: '600', fontFamily: FONT }}>Target</Text>
              <Text style={{ color: COLORS.fg, fontSize: 24, fontWeight: '900', fontFamily: FONT, fontVariant: ['tabular-nums'] }}>{fmt(currentKg)} kg</Text>
            </View>
          )}
        </View>
        {load ? (
          <View style={{ alignItems: 'flex-end', gap: 6, maxWidth: 150 }}>
            <PlateBar perSide={load.perSide} />
            <Text style={{ color: COLORS.textMuted, fontSize: 12, fontFamily: FONT, textAlign: 'right' }}>{plateText(load)}</Text>
            {load.note ? <Text style={{ color: COLORS.amber, fontSize: 11, fontFamily: FONT, textAlign: 'right' }}>{load.note}</Text> : null}
          </View>
        ) : null}
      </View>
    </Surface>
  );
}
