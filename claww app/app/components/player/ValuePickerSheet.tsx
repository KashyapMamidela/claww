import React, { useMemo, useState } from 'react';
import { Modal, Pressable, Text, View } from 'react-native';
import * as Haptics from 'expo-haptics';
import { COLORS, FONT } from '../../lib/theme';
import { quickValues, wheelValues } from '../../lib/sessionPlan';
import { ITEM_HEIGHT, PAD, WheelColumn } from '../ui/TimeWheelPicker';
import { PressScale } from '../ui/PressScale';

export type PickerKind = 'kg' | 'reps';

const CONFIG: Record<PickerKind, { step: number; max: number; unit: string }> = {
  kg: { step: 2.5, max: 300, unit: 'kg' },
  reps: { step: 1, max: 100, unit: 'reps' },
};

export interface ValuePickerSheetProps {
  kind: PickerKind;
  title: string;
  value: number;
  prescribed: number;
  last: number | null;
  onPick: (value: number) => void;
  onClose: () => void;
}

function format(kind: PickerKind, v: number): string {
  return kind === 'kg' ? `${v}` : `${Math.round(v)}`;
}

/** The quick picker: the 4 likeliest values as one-tap chips, then a wheel for anything else. */
export function ValuePickerSheet({ kind, title, value, prescribed, last, onPick, onClose }: ValuePickerSheetProps) {
  const { step, max, unit } = CONFIG[kind];
  const chips = useMemo(() => quickValues(prescribed, step, last), [prescribed, step, last]);
  const items = useMemo(() => wheelValues(step, max), [step, max]);
  const initialIndex = Math.max(0, Math.min(items.length - 1, Math.round(value / step)));
  const [pending, setPending] = useState(items[initialIndex]);

  const pickChip = (v: number) => {
    Haptics.selectionAsync().catch(() => {});
    onPick(v);
  };

  return (
    <Modal visible transparent animationType="fade" onRequestClose={onClose} statusBarTranslucent>
      <Pressable onPress={onClose} style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'flex-end' }}>
        <Pressable
          onPress={() => {}}
          style={{
            backgroundColor: COLORS.card,
            borderTopLeftRadius: 22,
            borderTopRightRadius: 22,
            borderWidth: 1,
            borderColor: COLORS.border,
            paddingHorizontal: 20,
            paddingTop: 16,
            paddingBottom: 28,
            gap: 16,
          }}
        >
          <Text style={{ color: '#fff', fontSize: 15, fontWeight: '800', fontFamily: FONT }}>{title}</Text>

          <View style={{ flexDirection: 'row', gap: 8 }}>
            {chips.map((v) => {
              const selected = v === value;
              const tag = v === prescribed ? 'plan' : last !== null && v === last ? 'last' : null;
              return (
                <PressScale key={v} onPress={() => pickChip(v)} style={{ flex: 1 }} hitSlop={4}>
                  <View
                    style={{
                      height: 56,
                      borderRadius: 14,
                      alignItems: 'center',
                      justifyContent: 'center',
                      backgroundColor: selected ? COLORS.blue : 'rgba(255,255,255,0.06)',
                      borderWidth: 1,
                      borderColor: selected ? COLORS.blue : 'rgba(255,255,255,0.12)',
                    }}
                  >
                    <Text style={{ color: '#fff', fontSize: 18, fontWeight: '800', fontFamily: FONT }}>{format(kind, v)}</Text>
                    {tag ? (
                      <Text style={{ color: selected ? 'rgba(255,255,255,0.8)' : '#71717A', fontSize: 9.5, fontWeight: '700', fontFamily: FONT }}>
                        {tag.toUpperCase()}
                      </Text>
                    ) : null}
                  </View>
                </PressScale>
              );
            })}
          </View>

          <View style={{ alignItems: 'center' }}>
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              <WheelColumn items={items.map((v) => format(kind, v))} initialIndex={initialIndex} onChange={(i) => setPending(items[i])} width={110} />
              <Text style={{ color: '#71717A', fontSize: 14, fontWeight: '700', fontFamily: FONT, marginLeft: 6 }}>{unit}</Text>
            </View>
            <View
              pointerEvents="none"
              style={{ position: 'absolute', top: PAD, height: ITEM_HEIGHT, left: 0, right: 0, borderTopWidth: 1, borderBottomWidth: 1, borderColor: 'rgba(255,255,255,0.16)' }}
            />
          </View>

          <PressScale onPress={() => onPick(pending)}>
            <View style={{ height: 52, borderRadius: 16, backgroundColor: '#fff', alignItems: 'center', justifyContent: 'center' }}>
              <Text style={{ color: COLORS.blueDeep, fontSize: 15, fontWeight: '800', fontFamily: FONT }}>
                Use {format(kind, pending)} {unit}
              </Text>
            </View>
          </PressScale>
        </Pressable>
      </Pressable>
    </Modal>
  );
}
