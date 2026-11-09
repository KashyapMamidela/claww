import React from 'react';
import { FlexWidget } from 'react-native-android-widget';
import { GLASS_ML, sizeClass, waterView, type WidgetSnapshot } from '../lib/widgetSnapshot';
import { GlassCard, Grow, Icon, Pill, SignedOut, Spacer, T } from './parts';
import { F, GLASS, W } from './theme';

// Water: one number, a row of glasses and a button that logs a glass without opening the app. Small is the everyday
// size; wider adds a 500 ml button.

function Glasses({ done, total, width }: { done: number; total: number; width: number }) {
  const gap = 4;
  const cell = Math.max(6, Math.floor((width - gap * (total - 1)) / total));
  return (
    <FlexWidget style={{ flexDirection: 'row' }}>
      {Array.from({ length: total }, (_, i) => (
        <FlexWidget key={i} style={{ flexDirection: 'row' }}>
          <FlexWidget style={{ width: cell, height: 8, borderRadius: 4, backgroundColor: i < done ? W.water : W.track }} />
          {i < total - 1 ? <FlexWidget style={{ width: gap, height: 8 }} /> : null}
        </FlexWidget>
      ))}
    </FlexWidget>
  );
}

export function WaterWidget({ snapshot, width, height }: { snapshot: WidgetSnapshot; width: number; height: number }) {
  if (!snapshot.userId) return <SignedOut width={width} height={height} />;
  const v = waterView(snapshot);
  const wide = sizeClass(width, height) !== 'small' && width >= 280;
  const inner = width - W.pad * 2;
  const leftW = wide ? inner - 120 - 14 : inner;
  const [t1, t2] = GLASS.water;

  const summary = (
    <FlexWidget style={{ flex: wide ? 0 : 1, width: leftW, height: wide ? 'match_parent' : undefined, flexDirection: 'column', justifyContent: 'space-between' }}>
      <FlexWidget style={{ width: leftW, flexDirection: 'row', alignItems: 'center' }}>
        <Icon name="droplet" color={W.waterLabel} size={16} />
        <Spacer w={6} />
        <T text="Water" size={14} font={F.b} />
        <Grow />
        <T text={`${v.glassesDone}/${v.glassesGoal}`} size={12} font={F.sb} color={W.muted} />
      </FlexWidget>
      <FlexWidget style={{ flexDirection: 'column' }}>
        <FlexWidget style={{ flexDirection: 'row', alignItems: 'flex-end' }}>
          <T text={v.amount} size={34} font={F.xb} color={v.done ? W.water : W.text} />
          <Spacer w={4} />
          <T text={`of ${v.goal}`} size={13} font={F.sb} color={W.faint} />
        </FlexWidget>
        <T text={v.line} size={12} font={F.m} color={W.muted} />
      </FlexWidget>
      <Glasses done={v.glassesDone} total={v.glassesGoal} width={leftW} />
    </FlexWidget>
  );

  if (wide) {
    return (
      <GlassCard width={width} height={height} tint={t1} tint2={t2} row>
        {summary}
        <Spacer w={14} />
        <FlexWidget style={{ width: 120, height: 'match_parent', flexDirection: 'column', justifyContent: 'center' }}>
          <Pill text={`+ ${GLASS_ML} ml`} bg={W.water} color="#03121C" click="ADD_WATER" data={{ ml: GLASS_ML }} label="Add a glass of water" height={40} />
          <Spacer h={10} />
          <Pill text="+ 500 ml" bg={W.button} color="#BAE6FD" click="ADD_WATER" data={{ ml: 500 }} label="Add 500 millilitres of water" height={40} />
        </FlexWidget>
      </GlassCard>
    );
  }

  return (
    <GlassCard width={width} height={height} tint={t1} tint2={t2}>
      {summary}
      <Spacer h={12} />
      <Pill text={`+ ${GLASS_ML} ml`} bg={W.water} color="#03121C" click="ADD_WATER" data={{ ml: GLASS_ML }} label="Add a glass of water" height={36} />
    </GlassCard>
  );
}
