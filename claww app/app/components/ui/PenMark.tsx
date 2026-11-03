import React, { useEffect, useState } from 'react';
import { LayoutChangeEvent, Pressable, Text, View } from 'react-native';
import Animated, { useAnimatedProps, useReducedMotion, useSharedValue, withTiming } from 'react-native-reanimated';
import Svg, { Path } from 'react-native-svg';
import { AREA_COLORS, COLORS, FONT, FONT_HAND } from '../../lib/theme';
import { EASE_OUT, MOTION } from '../../lib/motion';
import { Well } from './Well';

// NG PHASE 1 (build plan 5.4): the Coach's Pen. One white pen everywhere.
// Area label above (blue = workout, green = nutrition), the item, the old value struck
// through in grey, the new value in bold Inter with a hand-drawn underline (drawn once,
// 350 ms, then still), and the one-line reason in Caveat. Tap: the full reason with
// "Keep" and "Use my old plan". Nothing here decides a mark; NG PHASE 11 does.

const AnimatedPath = Animated.createAnimatedComponent(Path);

export type PenArea = 'workout' | 'nutrition';

export interface PenMarkProps {
  area: PenArea;
  /** The thing being changed: "Bench press", "Breakfast". */
  item: string;
  oldValue?: string | null;
  newValue: string;
  /** Handwritten, 40 characters or fewer: "short sleep, hold this week". */
  note: string;
  /** Shown on tap, in plain words. */
  reason: string;
  /** Second part of the area label: "PUSH DAY", "BREAKFAST". */
  context?: string;
  /** Player target card: no area label or item row, just "Target old new" and the note. */
  compact?: boolean;
  /** Label for the undo button; defaults to "Use my old plan". */
  useOldLabel?: string;
  onKeep?: () => void;
  onUseOld?: () => void;
}

/** A gently wavy underline, the same shape every time, scaled to the value's width. */
export function underlinePath(width: number): string {
  const w = Math.max(8, width);
  return `M1 5 C ${(w * 0.3).toFixed(1)} 1.5, ${(w * 0.62).toFixed(1)} 7.5, ${(w - 1).toFixed(1)} 3`;
}

function Underline({ width }: { width: number }) {
  const reduced = useReducedMotion();
  const length = width * 1.08;
  const offset = useSharedValue(reduced ? 0 : length);

  useEffect(() => {
    if (!reduced) offset.set(withTiming(0, { duration: MOTION.penDrawDuration, easing: EASE_OUT }));
  }, [offset, reduced]);

  const animatedProps = useAnimatedProps(() => ({ strokeDashoffset: offset.get() }));

  return (
    <Svg width={width} height={9} style={{ position: 'absolute', left: 0, bottom: -7 }} pointerEvents="none">
      <AnimatedPath
        d={underlinePath(width)}
        stroke={COLORS.pen}
        strokeWidth={2.2}
        strokeLinecap="round"
        fill="none"
        strokeDasharray={[length, length]}
        animatedProps={animatedProps}
      />
    </Svg>
  );
}

function NewValue({ value, size }: { value: string; size: number }) {
  const [width, setWidth] = useState(0);
  const onLayout = (e: LayoutChangeEvent) => setWidth(Math.round(e.nativeEvent.layout.width));
  return (
    <View onLayout={onLayout}>
      <Text style={{ color: COLORS.pen, fontSize: size, fontWeight: '800', fontFamily: FONT, fontVariant: ['tabular-nums'], letterSpacing: -0.3 }}>{value}</Text>
      {width > 0 ? <Underline width={width} /> : null}
    </View>
  );
}

function OldValue({ value, size }: { value: string; size: number }) {
  return (
    <Text style={{ color: COLORS.textFaint, fontSize: size, fontWeight: '600', fontFamily: FONT, textDecorationLine: 'line-through', fontVariant: ['tabular-nums'] }}>
      {value}
    </Text>
  );
}

function SmallButton({ label, onPress, primary }: { label: string; onPress?: () => void; primary?: boolean }) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={label}
      style={({ pressed }) => ({
        minHeight: 44,
        paddingHorizontal: 16,
        borderRadius: 12,
        justifyContent: 'center',
        backgroundColor: primary ? 'rgba(255,255,255,0.10)' : 'transparent',
        borderWidth: 1,
        borderColor: COLORS.borderStrong,
        transform: [{ scale: pressed ? MOTION.pressScale : 1 }],
      })}
    >
      <Text style={{ color: COLORS.fg, fontSize: 13, fontWeight: '700', fontFamily: FONT }}>{label}</Text>
    </Pressable>
  );
}

export function PenMark({ area, item, oldValue, newValue, note, reason, context, compact = false, useOldLabel = 'Use my old plan', onKeep, onUseOld }: PenMarkProps) {
  const [open, setOpen] = useState(false);
  const areaColor = area === 'workout' ? AREA_COLORS.workouts : AREA_COLORS.nutrition;
  const areaLabel = `${area === 'workout' ? 'WORKOUT' : 'NUTRITION'}${context ? ` · ${context.toUpperCase()}` : ''}`;
  const a11y = `${item}: ${oldValue ? `changed from ${oldValue} to ` : ''}${newValue}. ${note}. Double tap for the reason.`;

  return (
    <View>
      <Pressable onPress={() => setOpen((o) => !o)} accessibilityRole="button" accessibilityLabel={a11y} accessibilityState={{ expanded: open }}>
        {compact ? (
          <View style={{ gap: 6 }}>
            <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: 10 }}>
              <Text style={{ color: COLORS.textMuted, fontSize: 13, fontWeight: '600', fontFamily: FONT }}>Target</Text>
              {oldValue ? <OldValue value={oldValue} size={15} /> : null}
              <NewValue value={newValue} size={24} />
            </View>
            <Text style={{ color: COLORS.pen, fontSize: 18, fontFamily: FONT_HAND, marginTop: 4 }}>{note}</Text>
          </View>
        ) : (
          <View style={{ gap: 4 }}>
            <Text style={{ color: areaColor, fontSize: 11, fontWeight: '700', letterSpacing: 0.9, fontFamily: FONT }}>{areaLabel}</Text>
            <View style={{ flexDirection: 'row', alignItems: 'baseline', justifyContent: 'space-between', gap: 12 }}>
              <Text style={{ color: COLORS.fg, fontSize: 15, fontWeight: '700', fontFamily: FONT, flexShrink: 1 }} numberOfLines={2}>
                {item}
              </Text>
              <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: 8, flexShrink: 1, justifyContent: 'flex-end' }}>
                {oldValue ? <OldValue value={oldValue} size={14} /> : null}
                <NewValue value={newValue} size={17} />
              </View>
            </View>
            <Text style={{ color: COLORS.pen, fontSize: 18, fontFamily: FONT_HAND, textAlign: 'right', marginTop: 8, textShadowColor: 'rgba(255,255,255,0.25)', textShadowRadius: 6 }}>
              {note}
            </Text>
          </View>
        )}
      </Pressable>
      {open ? (
        <Well padding={12} style={{ marginTop: 10, gap: 10 }}>
          <Text style={{ color: COLORS.fgGray, fontSize: 13, lineHeight: 19, fontFamily: FONT }}>{reason}</Text>
          <View style={{ flexDirection: 'row', gap: 8, flexWrap: 'wrap' }}>
            <SmallButton
              label="Keep the mark"
              primary
              onPress={() => {
                setOpen(false);
                onKeep?.();
              }}
            />
            <SmallButton
              label={useOldLabel}
              onPress={() => {
                setOpen(false);
                onUseOld?.();
              }}
            />
          </View>
        </Well>
      ) : null}
    </View>
  );
}
