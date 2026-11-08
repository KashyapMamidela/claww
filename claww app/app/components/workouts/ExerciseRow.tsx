import React, { useState } from 'react';
import { Surface } from '../ui/Surface';
import { Pressable, Text, View } from 'react-native';
import { COLORS, FONT, FONT_HAND, BG, bg } from '../../lib/theme';
import type { PlanMark } from '../../lib/planMarks';
import { Icon } from '../ui/Icon';
import { BodyMap, type Muscle } from '../BodyMap';

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
  /** "last: 60 kg", the weight this exercise was last done at. */
  lastText?: string | null;
  /** Primary muscle, lit on the tile. */
  muscle?: Muscle | null;
  mark?: PlanMark;
  onOpenGuide: () => void;
}

const BACK = new Set<Muscle>(['back', 'triceps', 'hamstrings', 'glutes', 'calves']);

export function ExerciseRow({ index, name, sub, setsText, weightText, lastText, muscle, mark, onOpenGuide }: ExerciseRowProps) {
  const [open, setOpen] = useState(false);
  const marked = !!mark && mark.kind === 'weight';
  return (
    <Surface radius={18} padding={14} borderColor={open ? 'rgba(59,130,246,0.55)' : undefined}>
    <View style={{ gap: 8 }}>
      <Pressable onPress={onOpenGuide} accessibilityRole="button" accessibilityLabel={`${name}: how to do it`} style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
        {/* Premium W4: a 44 pt tile with the worked muscle lit; the exercise number sits in its corner. */}
        <View style={{ width: 44, height: 44, borderRadius: 12, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(59,130,246,0.12)', borderWidth: 1, borderColor: 'rgba(59,130,246,0.3)' }}>
          {muscle ? <BodyMap muscles={[{ muscle, intensity: 1 }]} height={34} color={A} views={BACK.has(muscle) ? 'back' : 'front'} /> : <Text style={{ color: A, fontSize: 15, fontFamily: BG[800] }}>{index}</Text>}
          {muscle ? <Text style={{ position: 'absolute', top: 2, left: 5, color: A, fontSize: 11, fontVariant: ['tabular-nums'], fontFamily: BG[800] }}>{index}</Text> : null}
        </View>
        <View style={{ flex: 1 }}>
          <Text style={{ color: COLORS.fg, fontSize: 17, fontFamily: BG[800] }}>{name}</Text>
          {sub ? <Text style={{ color: COLORS.textMuted, fontSize: 13, fontFamily: BG[400] }}>{sub}</Text> : null}
        </View>
        <View style={{ alignItems: 'flex-end' }}>
          <Text style={{ color: COLORS.fg, fontSize: 17, fontVariant: ['tabular-nums'], fontFamily: BG[800] }}>{setsText}</Text>
          {lastText ? <Text style={{ color: COLORS.textFaint, fontSize: 13, fontVariant: ['tabular-nums'], fontFamily: BG[400] }}>{lastText}</Text> : null}
          {weightText && !marked ? <Text style={{ color: COLORS.textMuted, fontSize: 15, fontVariant: ['tabular-nums'], fontFamily: BG[400] }}>{weightText}</Text> : null}
          {marked ? (
            <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: 6 }}>
              <Text style={{ color: COLORS.textMuted, fontSize: 15, textDecorationLine: 'line-through', fontVariant: ['tabular-nums'], fontFamily: BG[400] }}>{mark!.oldText}</Text>
              <Text style={{ color: COLORS.pen, fontSize: 17, textDecorationLine: 'underline', fontVariant: ['tabular-nums'], fontFamily: BG[800] }}>{mark!.newText}</Text>
            </View>
          ) : null}
        </View>
      </Pressable>

      {mark && !marked ? (
        <View style={{ flexDirection: 'row', justifyContent: 'flex-end', alignItems: 'baseline', gap: 6 }}>
          <Text style={{ color: COLORS.textMuted, fontSize: 15, textDecorationLine: 'line-through', fontFamily: BG[400] }}>{mark.oldText}</Text>
          <Text style={{ color: COLORS.pen, fontSize: 17, fontVariant: ['tabular-nums'], textDecorationLine: 'underline', fontFamily: BG[800] }}>{mark.newText}</Text>
        </View>
      ) : null}

      {mark?.note ? (
        <Pressable onPress={() => setOpen((v) => !v)} accessibilityRole="button" accessibilityLabel={`${mark.note}. Tap for the reason`} style={{ flexDirection: 'row', justifyContent: 'flex-end', alignItems: 'center', gap: 6, minHeight: 32 }}>
          <Text style={{ color: COLORS.textMuted, fontSize: 20, fontFamily: FONT_HAND }}>{mark.note}</Text>
          <Icon name={open ? 'chevron-up' : 'chevron-down'} size={14} color={COLORS.textMuted} />
        </Pressable>
      ) : null}

      {mark && open ? (
        <View style={{ borderRadius: 14, backgroundColor: 'rgba(0,0,0,0.35)', padding: 12, gap: 10 }}>
          <Text style={{ color: COLORS.fg, fontSize: 15, lineHeight: 21, fontFamily: BG[400] }}>{mark.reason}</Text>
          <Pressable
            onPress={() => setOpen(false)}
            accessibilityRole="button"
            accessibilityLabel="Keep the mark"
            style={{ alignSelf: 'flex-start', minHeight: 44, paddingHorizontal: 16, borderRadius: 12, borderWidth: 1, borderColor: COLORS.borderStrong, justifyContent: 'center' }}
          >
            <Text style={{ color: COLORS.fg, fontSize: 15, fontFamily: BG[800] }}>Keep the mark</Text>
          </Pressable>
        </View>
      ) : null}
    </View>
    </Surface>
  );
}
