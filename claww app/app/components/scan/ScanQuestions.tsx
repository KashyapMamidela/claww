import React from 'react';
import { Pressable, ScrollView, Text, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { BG, COLORS } from '../../lib/theme';
import { Icon } from '../ui/Icon';
import type { Oil, Place, Portion, ScanContext } from '../../lib/engine';
import type { ShownRows } from '../../lib/scanQuestions';
import { contextText } from '../../lib/scanHabit';

// The three answers a photo cannot give (where it is from, how oily, how big), as one compact card of chips with small
// icons instead of three stacked segmented controls. The answers start from habit, so most scans need no tap at all.

const G = COLORS.green;

type Opt<T> = { value: T; label: string; icon: string; size?: number };

const PLACES: Opt<Place>[] = [
  { value: 'home', label: 'Home', icon: 'home' },
  { value: 'mess', label: 'Mess', icon: 'utensils' },
  { value: 'restaurant', label: 'Restaurant', icon: 'store' },
  { value: 'street', label: 'Street', icon: 'footprints' },
];
const OILS: Opt<Oil>[] = [
  { value: 'none', label: 'No oil', icon: 'x', size: 14 },
  { value: 'light', label: 'Light', icon: 'droplets', size: 13 },
  { value: 'normal', label: 'Normal', icon: 'droplets', size: 16 },
  { value: 'heavy', label: 'Heavy', icon: 'droplets', size: 19 },
];
const PORTIONS: Opt<Portion>[] = [
  { value: 'small', label: 'Small', icon: 'circle', size: 11 },
  { value: 'regular', label: 'Regular', icon: 'circle', size: 15 },
  { value: 'large', label: 'Large', icon: 'circle', size: 19 },
  { value: 'shared', label: 'Shared', icon: 'repeat', size: 15 },
];

function Row<T extends string>({ label, options, value, onChange }: { label: string; options: Opt<T>[]; value: T; onChange: (v: T) => void }) {
  return (
    <View style={{ gap: 8 }}>
      <Text style={{ color: COLORS.textMuted, fontSize: 13, fontFamily: BG[600] }}>{label}</Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }}>
        {options.map((o) => {
          const on = o.value === value;
          return (
            <Pressable
              key={o.value}
              onPress={() => onChange(o.value)}
              accessibilityRole="radio"
              accessibilityState={{ selected: on }}
              accessibilityLabel={`${label}: ${o.label}`}
              style={({ pressed }) => ({ opacity: pressed ? 0.85 : 1, transform: [{ scale: pressed ? 0.97 : 1 }] })}
            >
              {on ? (
                <LinearGradient colors={[COLORS.greenDeep, G]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={{ height: 44, borderRadius: 22, paddingHorizontal: 16, flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                  <Icon name={o.icon} size={o.size ?? 16} color="#fff" />
                  <Text style={{ color: '#fff', fontSize: 15, fontFamily: BG[800] }}>{o.label}</Text>
                </LinearGradient>
              ) : (
                <View style={{ height: 44, borderRadius: 22, paddingHorizontal: 16, flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: 'rgba(255,255,255,0.06)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.10)' }}>
                  <Icon name={o.icon} size={o.size ?? 16} color={COLORS.textMuted} />
                  <Text style={{ color: COLORS.fg, fontSize: 15, fontFamily: BG[600] }}>{o.label}</Text>
                </View>
              )}
            </Pressable>
          );
        })}
      </ScrollView>
    </View>
  );
}

export function ScanQuestions({ context, onChange, reading, found, last, onUseLast, rows, onShowAll, oilAuto }: {
  context: ScanContext;
  onChange: (c: ScanContext) => void;
  reading: boolean;
  found: number | null;
  last?: ScanContext | null;
  onUseLast?: () => void;
  rows: ShownRows;
  /** Brings every question back for this scan. Shown when some are hidden. */
  onShowAll?: () => void;
  /** True when oil was set to "none" without asking because the plate has no cooked food. */
  oilAuto?: boolean;
}) {
  const none = !rows.place && !rows.oil && !rows.portion;
  const hidden = !(rows.place && rows.oil && rows.portion);
  return (
    <View style={{ gap: 16 }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
        <View style={{ flex: 1 }}>
          <Text style={{ color: COLORS.fg, fontSize: 20, fontFamily: BG[800] }}>{none ? 'Ready to check' : 'Quick answers'}</Text>
          <Text style={{ color: reading ? G : COLORS.textMuted, fontSize: 13, fontFamily: BG[600], marginTop: 2 }} accessibilityLiveRegion="polite">
            {reading ? 'Reading your plate' : found ? `${found} ${found === 1 ? 'food' : 'foods'} spotted` : 'Plate read'}
            {oilAuto && !reading ? ' · no cooking oil on this plate' : ''}
          </Text>
        </View>
        {last && onUseLast && !none ? (
          <Pressable onPress={onUseLast} accessibilityRole="button" accessibilityLabel={`Use last time's answers: ${contextText(last)}`} style={{ minHeight: 44, paddingHorizontal: 14, borderRadius: 22, borderWidth: 1, borderColor: COLORS.greenBorderMd, justifyContent: 'center' }}>
            <Text style={{ color: G, fontSize: 14, fontFamily: BG[800] }}>Same as last time</Text>
          </Pressable>
        ) : null}
      </View>
      {none ? (
        <Text style={{ color: COLORS.textMuted, fontSize: 15, fontFamily: BG[400] }}>{contextText(context)}</Text>
      ) : null}
      {rows.place ? <Row label="Where is it from" options={PLACES} value={context.place} onChange={(place) => onChange({ ...context, place })} /> : null}
      {rows.oil ? <Row label="How oily" options={OILS} value={context.oil} onChange={(oil) => onChange({ ...context, oil })} /> : null}
      {rows.portion ? <Row label="How much" options={PORTIONS} value={context.portion} onChange={(portion) => onChange({ ...context, portion })} /> : null}
      {hidden && onShowAll ? (
        <Pressable onPress={onShowAll} accessibilityRole="button" accessibilityLabel="Change the answers" style={{ alignSelf: 'flex-start', minHeight: 44, justifyContent: 'center' }}>
          <Text style={{ color: G, fontSize: 15, fontFamily: BG[800] }}>Change answers</Text>
        </Pressable>
      ) : null}
    </View>
  );
}
