import React from 'react';
import { FlexWidget } from 'react-native-android-widget';
import { nutritionView, sizeClass, type WidgetSnapshot } from '../lib/widgetSnapshot';
import { GlassCard, Grow, Bar, Pill, RoundButton, Rings, SignedOut, Spacer, T } from './parts';
import { F, GLASS, W } from './theme';

// Food: what you can still eat, the way Cal AI leads with it. The ring fills as the day's calories go in and the middle
// says what is left (or how far over, in amber); the three macros sit beside it with their own bars, the next meal from
// the plan sits at the foot. Header buttons: scan a plate, scan a barcode, and + (opens Quick log in the app).

const MACRO = {
  protein: { label: W.protein, bar: W.proteinBar },
  carbs: { label: W.carbs, bar: W.carbsBar },
  fat: { label: W.fat, bar: W.fatBar },
} as const;

export function NutritionWidget({ snapshot, width, height }: { snapshot: WidgetSnapshot; width: number; height: number }) {
  if (!snapshot.userId) return <SignedOut width={width} height={height} />;
  const v = nutritionView(snapshot);
  const size = sizeClass(width, height);
  const heroColor = v.over ? W.over : W.text;
  const ringColor = v.over ? W.over : W.ringFood;
  const [t1, t2] = GLASS.food;

  if (size === 'small') {
    const ring = Math.max(60, Math.min(width, height) - W.pad * 2 - 44);
    return (
      <GlassCard width={width} height={height} tint={t1} tint2={t2} center>
        <Rings size={ring} rings={[{ pct: v.ringPct * 100, color: ringColor }]} stroke={10}>
          <T text={v.hero} size={Math.round(ring / 4.6)} font={F.xb} color={heroColor} />
          <T text={v.heroLabel} size={10} font={F.m} color={W.faint} />
        </Rings>
        <Spacer h={8} />
        <Pill text="Log food" bg={W.ringFood} color="#04130A" click="OPEN_URI" data={{ uri: 'claww:///?quicklog=1' }} label="Log food" height={32} />
      </GlassCard>
    );
  }

  const header = 34;
  const footer = v.next && height >= 165 ? 22 : 0;
  const ring = Math.min(124, Math.max(80, height - W.pad * 2 - header - footer - 10));
  const colW = Math.max(100, width - W.pad * 2 - ring - 16);
  return (
    <GlassCard width={width} height={height} tint={t1} tint2={t2}>
      <FlexWidget style={{ width: 'match_parent', height: header, flexDirection: 'row', alignItems: 'center' }}>
        <FlexWidget style={{ flexDirection: 'column' }}>
          <T text="Food" size={15} font={F.b} />
          <T text={v.meals} size={11} font={F.m} color={W.muted} />
        </FlexWidget>
        <Grow />
        <RoundButton icon="camera" bg={W.button} color={W.text} click="OPEN_URI" data={{ uri: 'claww:///scan' }} label="Scan a meal" size={34} />
        <Spacer w={8} />
        <RoundButton icon="barcode" bg={W.button} color={W.text} click="OPEN_URI" data={{ uri: 'claww:///barcode' }} label="Scan a barcode" size={34} />
        <Spacer w={8} />
        <RoundButton icon="plus" bg={W.ringFood} color="#04130A" click="OPEN_URI" data={{ uri: 'claww:///?quicklog=1' }} label="Quick log" size={34} />
      </FlexWidget>
      <Spacer h={10} />
      <FlexWidget style={{ width: 'match_parent', flex: 1, flexDirection: 'row', alignItems: 'center' }}>
        <Rings size={ring} rings={[{ pct: v.ringPct * 100, color: ringColor }]} stroke={Math.round(ring / 11)}>
          <T text={v.hero} size={Math.round(ring / 5)} font={F.xb} color={heroColor} />
          <T text={v.heroLabel} size={10} font={F.m} color={W.faint} />
        </Rings>
        <Spacer w={16} />
        <FlexWidget style={{ flex: 1, height: 'match_parent', flexDirection: 'column', justifyContent: 'space-around' }}>
          {v.macros.map((m) => (
            <FlexWidget key={m.key} style={{ flexDirection: 'column' }}>
              <FlexWidget style={{ width: colW, flexDirection: 'row', alignItems: 'center' }}>
                <T text={m.label} size={12} font={F.sb} color={MACRO[m.key].label} />
                <Grow />
                <T text={m.value} size={12} font={F.b} />
              </FlexWidget>
              <Spacer h={4} />
              <Bar width={colW} pct={m.pct} color={MACRO[m.key].bar} />
            </FlexWidget>
          ))}
        </FlexWidget>
      </FlexWidget>
      {footer ? (
        <FlexWidget style={{ width: 'match_parent', height: footer, flexDirection: 'row', alignItems: 'flex-end' }}>
          <T text={`Up next · ${v.next}`} size={12} font={F.m} color={W.muted} />
        </FlexWidget>
      ) : null}
    </GlassCard>
  );
}
