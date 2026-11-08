import React from 'react';
import { Pressable, Text, View } from 'react-native';
import { COLORS, FONT, FONT_HAND, BG, bg } from '../../lib/theme';
import type { StripCell, WeekStrip } from '../../lib/weekStrip';
import { Icon } from '../ui/Icon';
import { Surface } from '../ui/Surface';

// NG PHASE 12 (screen 06): the week as seven tappable days. Done days carry a check, missed days a struck name,
// rest days are dim and not tappable, today has a ring, and the selected day is filled.

const A = COLORS.blue;

function Cell({ cell, selected, onPress }: { cell: StripCell; selected: boolean; onPress: () => void }) {
  const rest = cell.planIndex === null;
  const missed = cell.state === 'missed';
  const done = cell.state === 'done';
  const today = cell.state === 'today';
  const fg = selected ? '#fff' : rest ? COLORS.textFaint : COLORS.fg;
  const a11y = `${cell.letter === 'T' || cell.letter === 'S' ? '' : ''}${['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'][cell.weekday]} ${cell.dateNumber}: ${rest ? 'rest day' : cell.label}${done ? ', done' : ''}${missed ? ', missed' : ''}${today ? ', today' : ''}`;
  return (
    <Pressable
      onPress={onPress}
      disabled={rest}
      accessibilityRole="button"
      accessibilityState={{ selected, disabled: rest }}
      accessibilityLabel={a11y}
      style={{ flex: 1 }}
    >
      <View
        style={{
          minHeight: 76,
          borderRadius: 22,
          alignItems: 'center',
          justifyContent: 'center',
          gap: 2,
          borderWidth: 1,
          borderColor: selected ? A : today ? 'rgba(59,130,246,0.55)' : 'transparent',
          backgroundColor: selected ? 'rgba(59,130,246,0.30)' : 'transparent',
        }}
      >
        <Text style={{ color: selected ? '#fff' : COLORS.textMuted, fontSize: 13, fontFamily: BG[700] }}>{cell.letter}</Text>
        <Text style={{ color: fg, fontSize: 20, fontVariant: ['tabular-nums'], fontFamily: BG[800] }}>{cell.dateNumber}</Text>
        {/* Premium W2: a dot says what the day is: filled = done, ring = planned, small ring in amber = missed, dash = rest. */}
        {rest ? (
          <View style={{ width: 10, height: 2, borderRadius: 1, backgroundColor: COLORS.textFaint }} />
        ) : done ? (
          <View style={{ width: 10, height: 10, borderRadius: 5, backgroundColor: COLORS.green }} />
        ) : missed ? (
          <View style={{ width: 10, height: 10, borderRadius: 5, borderWidth: 2, borderColor: COLORS.amber }} />
        ) : (
          <View style={[{ width: 10, height: 10, borderRadius: 5, borderWidth: 2, borderColor: selected ? '#fff' : A }, today ? ({ boxShadow: `0px 0px 8px ${A}` } as object) : null]} />
        )}
      </View>
    </Pressable>
  );
}

export function WeekStripView({ strip, selectedPlanIndex, onSelect }: { strip: WeekStrip; selectedPlanIndex: number; onSelect: (planIndex: number) => void }) {
  return (
    <Surface padding={10}>
      <View style={{ flexDirection: 'row', gap: 2 }}>
        {strip.cells.map((c) => (
          <Cell key={c.weekday} cell={c} selected={c.planIndex !== null && c.planIndex === selectedPlanIndex} onPress={() => c.planIndex !== null && onSelect(c.planIndex)} />
        ))}
      </View>
      {strip.note ? (
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 6, paddingTop: 8 }}>
          <Icon name="arrow-up-right" size={14} color={COLORS.textMuted} />
          <Text style={{ color: COLORS.textMuted, fontSize: 17, fontFamily: FONT_HAND, flex: 1 }}>{strip.note}</Text>
        </View>
      ) : null}
    </Surface>
  );
}
