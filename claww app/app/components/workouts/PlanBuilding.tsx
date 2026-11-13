import React from 'react';
import { Text, View } from 'react-native';
import Animated, { Easing, Keyframe, useReducedMotion } from 'react-native-reanimated';
import { COLORS, FONT_HAND, BG } from '../../lib/theme';
import { Icon } from '../ui/Icon';

// Building a plan, as the coach's pen writing the week: each picked day writes in (about 120 ms apart), and a short
// list of the real steps ticks off as each one finishes (days saved, then the plan). Never a bare spinner.

const EASE = Easing.bezier(0.23, 1, 0.32, 1);
const rowIn = (i: number) =>
  new Keyframe({
    0: { opacity: 0, transform: [{ translateX: -8 }] },
    100: { opacity: 1, transform: [{ translateX: 0 }], easing: EASE },
  })
    .delay(i * 120)
    .duration(260);

export function PlanBuilding({ days, phase }: { days: string[]; phase: 'saving' | 'building' }) {
  const reduced = useReducedMotion();
  const steps: { label: string; done: boolean; active: boolean }[] = [
    { label: 'Saving your days', done: phase === 'building', active: phase === 'saving' },
    { label: 'Choosing exercises for your goal and equipment', done: false, active: phase === 'building' },
  ];
  return (
    <View style={{ gap: 16 }} accessibilityLiveRegion="polite" accessibilityLabel="Building your plan">
      <Text style={{ color: COLORS.fg, fontSize: 26, fontFamily: FONT_HAND, fontWeight: '700' }}>Writing your week…</Text>
      <View style={{ gap: 8 }}>
        {days.map((d, i) => (
          <Animated.View key={d} entering={reduced ? undefined : rowIn(i)} style={{ flexDirection: 'row', alignItems: 'baseline', gap: 12, borderBottomWidth: 1, borderBottomColor: COLORS.border, paddingBottom: 6 }}>
            <Text style={{ width: 44, color: COLORS.textMuted, fontSize: 13, fontFamily: BG[700] }}>{d.slice(0, 3)}</Text>
            <Text style={{ color: COLORS.fg, fontSize: 22, fontFamily: FONT_HAND }}>session {i + 1}</Text>
          </Animated.View>
        ))}
      </View>
      <View style={{ gap: 8 }}>
        {steps.map((s) => (
          <View key={s.label} style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
            {s.done ? (
              <Icon name="check" size={16} color={COLORS.green} strokeWidth={3} />
            ) : (
              <View style={{ width: 16, height: 16, borderRadius: 8, borderWidth: 2, borderColor: s.active ? COLORS.blue : COLORS.border }} />
            )}
            <Text style={{ color: s.done ? COLORS.textMuted : s.active ? COLORS.fg : COLORS.textFaint, fontSize: 15, fontFamily: BG[500] }}>{s.label}</Text>
          </View>
        ))}
      </View>
    </View>
  );
}
