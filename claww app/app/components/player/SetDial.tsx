import React from 'react';
import { Pressable, Text, View } from 'react-native';
import { COLORS, BG } from '../../lib/theme';
import { StepButton } from '../ui/Stepper';

// The set, as two big numbers you can change where you are looking. The weight and the reps are each one tall card:
// the number (tap it for the wheel), and a wide minus and plus under it (hold to keep stepping). This replaces the huge
// text, the set chips and the stepper sheet, which showed the same two numbers three times.

const BLUE = COLORS.blue;

function Column({
  label,
  value,
  onStep,
  onOpen,
  minusDisabled,
  a11yName,
}: {
  label: string;
  value: string;
  onStep: (dir: 1 | -1) => void;
  onOpen: () => void;
  minusDisabled?: boolean;
  a11yName: string;
}) {
  return (
    <View style={{ flex: 1, borderRadius: 26, paddingVertical: 14, paddingHorizontal: 12, alignItems: 'center', gap: 4, backgroundColor: 'rgba(255,255,255,0.05)', borderWidth: 1, borderColor: COLORS.border }}>
      <Pressable onPress={onOpen} accessibilityRole="adjustable" accessibilityLabel={a11yName} accessibilityValue={{ text: `${value} ${label}` }} style={{ minHeight: 76, justifyContent: 'center', alignSelf: 'stretch', alignItems: 'center' }}>
        <Text numberOfLines={1} adjustsFontSizeToFit style={{ color: COLORS.fg, fontSize: 60, lineHeight: 66, letterSpacing: -2, fontVariant: ['tabular-nums'], fontFamily: BG[800] }}>
          {value}
        </Text>
      </Pressable>
      <Text style={{ color: COLORS.textMuted, fontSize: 15, fontFamily: BG[700], marginBottom: 6 }}>{label}</Text>
      <View style={{ flexDirection: 'row', gap: 10, alignSelf: 'stretch' }}>
        <View style={{ flex: 1 }}>
          <StepWide icon="minus" onPress={() => onStep(-1)} disabled={minusDisabled} a11y={`Less ${label}`} />
        </View>
        <View style={{ flex: 1 }}>
          <StepWide icon="plus" onPress={() => onStep(1)} a11y={`More ${label}`} tone={BLUE} />
        </View>
      </View>
    </View>
  );
}

/** A full-width step button: 56 tall, so it is hit without looking. */
function StepWide({ icon, onPress, disabled, a11y, tone }: { icon: string; onPress: () => void; disabled?: boolean; a11y: string; tone?: string }) {
  return (
    <StepButton icon={icon} onPress={onPress} disabled={disabled} a11y={a11y} size={56} radius={18} tone={tone} wide />
  );
}

export interface SetDialProps {
  /** Null hides the weight card (a bodyweight exercise). */
  weight: number | null;
  reps: number;
  onWeightStep: (dir: 1 | -1) => void;
  onRepsStep: (dir: 1 | -1) => void;
  onOpenWeight: () => void;
  onOpenReps: () => void;
}

export function SetDial({ weight, reps, onWeightStep, onRepsStep, onOpenWeight, onOpenReps }: SetDialProps) {
  return (
    <View style={{ flexDirection: 'row', gap: 12 }}>
      {weight !== null ? <Column label="kg" value={weight > 0 ? `${weight}` : '0'} onStep={onWeightStep} onOpen={onOpenWeight} minusDisabled={weight <= 0} a11yName="Weight" /> : null}
      <Column label="reps" value={`${reps}`} onStep={onRepsStep} onOpen={onOpenReps} minusDisabled={reps <= 1} a11yName="Reps" />
    </View>
  );
}

/** One dot per set: logged, now and still to do. Tapping a logged dot opens its numbers to fix them. */
export function SetDots({ rows, current, onPick }: { rows: { done: boolean }[]; current: number; onPick: (i: number) => void }) {
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }} accessibilityLabel={`${rows.filter((r) => r.done).length} of ${rows.length} sets done`}>
      {rows.map((r, i) => {
        const now = i === current;
        return (
          <Pressable key={i} onPress={() => onPick(i)} hitSlop={10} accessibilityRole="button" accessibilityLabel={`Set ${i + 1}${r.done ? ', logged' : now ? ', now' : ''}`}>
            <View style={{ width: now ? 26 : 14, height: 14, borderRadius: 7, backgroundColor: r.done ? BLUE : now ? 'transparent' : 'rgba(255,255,255,0.14)', borderWidth: now ? 2 : 0, borderColor: BLUE }} />
          </Pressable>
        );
      })}
    </View>
  );
}
