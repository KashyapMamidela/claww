import React, { useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import { COLORS, FONT, FONT_HAND } from '../../lib/theme';
import type { PlanMark } from '../../lib/planMarks';
import { Icon } from '../ui/Icon';

// NG PHASE 12 (screen 06): one numbered exercise in "Today's exercises". When the engine marked today's number,
// the old value is struck, the new one bold with the pen underline, the short note in Caveat, and a tap opens the
// reason. Tapping the name opens the guide.

const A = COLORS.blue;

export interface ExerciseRowProps {
  index: number;
  name: string;
  /** "Chest · triceps" */
  sub: string | null;
  /** "4 × 6–8" */
  setsText: string;
  /** "60 kg", null for bodyweight and timed work. */
  weightText: string | null;
  mark?: PlanMark;
  onOpenGuide: () => void;
}

export function ExerciseRow({ index, name, sub, setsText, weightText, mark, onOpenGuide }: ExerciseRowProps) {
  const [open, setOpen] = useState(false);
  const marked = !!mark && mark.kind === 'weight';
  return (
    <View
      style={{
        borderRadius: 18,
        borderWidth: 1,
        borderColor: open ? 'rgba(59,130,246,0.55)' : COLORS.border,
        backgroundColor: COLORS.card,
        padding: 14,
        gap: 8,
      }}
    >
      <Pressable onPress={onOpenGuide} accessibilityRole="button" accessibilityLabel={`${name}: how to do it`} style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
        <View style={{ width: 38, height: 38, borderRadius: 11, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(59,130,246,0.14)', borderWidth: 1, borderColor: 'rgba(59,130,246,0.3)' }}>
          <Text style={{ color: A, fontSize: 15, fontWeight: '900', fontFamily: FONT }}>{index}</Text>
        </View>
        <View style={{ flex: 1 }}>
          <Text style={{ color: COLORS.fg, fontSize: 17, fontWeight: '800', fontFamily: FONT }}>{name}</Text>
          {sub ? <Text style={{ color: COLORS.textMuted, fontSize: 13, fontFamily: FONT }}>{sub}</Text> : null}
        </View>
        <View style={{ alignItems: 'flex-end' }}>
          <Text style={{ color: COLORS.fg, fontSize: 16, fontWeight: '800', fontVariant: ['tabular-nums'], fontFamily: FONT }}>{setsText}</Text>
          {weightText && !marked ? <Text style={{ color: COLORS.textMuted, fontSize: 14, fontVariant: ['tabular-nums'], fontFamily: FONT }}>{weightText}</Text> : null}
          {marked ? (
            <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: 6 }}>
              <Text style={{ color: COLORS.textMuted, fontSize: 14, textDecorationLine: 'line-through', fontVariant: ['tabular-nums'], fontFamily: FONT }}>{mark!.oldText}</Text>
              <Text style={{ color: COLORS.pen, fontSize: 18, fontWeight: '900', textDecorationLine: 'underline', fontVariant: ['tabular-nums'], fontFamily: FONT }}>{mark!.newText}</Text>
            </View>
          ) : null}
        </View>
      </Pressable>

      {mark && !marked ? (
        <View style={{ flexDirection: 'row', justifyContent: 'flex-end', alignItems: 'baseline', gap: 6 }}>
          <Text style={{ color: COLORS.textMuted, fontSize: 14, textDecorationLine: 'line-through', fontFamily: FONT }}>{mark.oldText}</Text>
          <Text style={{ color: COLORS.pen, fontSize: 17, fontWeight: '900', textDecorationLine: 'underline', fontFamily: FONT }}>{mark.newText}</Text>
        </View>
      ) : null}

      {mark?.note ? (
        <Pressable onPress={() => setOpen((v) => !v)} accessibilityRole="button" accessibilityLabel={`${mark.note}. Tap for the reason`} style={{ flexDirection: 'row', justifyContent: 'flex-end', alignItems: 'center', gap: 6, minHeight: 32 }}>
          <Text style={{ color: COLORS.textMuted, fontSize: 19, fontFamily: FONT_HAND }}>{mark.note}</Text>
          <Icon name={open ? 'chevron-up' : 'chevron-down'} size={14} color={COLORS.textMuted} />
        </Pressable>
      ) : null}

      {mark && open ? (
        <View style={{ borderRadius: 14, backgroundColor: 'rgba(0,0,0,0.35)', padding: 12, gap: 10 }}>
          <Text style={{ color: COLORS.fg, fontSize: 14, lineHeight: 21, fontFamily: FONT }}>{mark.reason}</Text>
          <Pressable
            onPress={() => setOpen(false)}
            accessibilityRole="button"
            accessibilityLabel="Keep the mark"
            style={{ alignSelf: 'flex-start', minHeight: 44, paddingHorizontal: 16, borderRadius: 12, borderWidth: 1, borderColor: COLORS.borderStrong, justifyContent: 'center' }}
          >
            <Text style={{ color: COLORS.fg, fontSize: 14, fontWeight: '800', fontFamily: FONT }}>Keep the mark</Text>
          </Pressable>
        </View>
      ) : null}
    </View>
  );
}
