import React from 'react';
import { FlexWidget, OverlapWidget, SvgWidget } from 'react-native-android-widget';
import { stepsView, type WidgetSnapshot } from '../lib/widgetSnapshot';
import { stepsGaugeSvg } from '../lib/widgetSvg';
import { GlassCard, Grow, Icon, Pill, SignedOut, Spacer, T } from './parts';
import { F, GLASS, W } from './theme';

// Steps: today's count in a warm arc gauge with a bright knob where you have got to, the distance, and a button that
// opens the activity logger in the app (for the walk, run or game you do not carry the phone for).

const START = { uri: 'claww:///?quicklog=activity' };

export function StepsWidget({ snapshot, width, height }: { snapshot: WidgetSnapshot; width: number; height: number }) {
  if (!snapshot.userId) return <SignedOut width={width} height={height} />;
  const v = stepsView(snapshot);
  const [t1, t2] = GLASS.steps;
  const wide = width >= 280;
  const gauge = wide ? Math.min(126, height - W.pad * 2 - 8) : Math.max(70, Math.min(104, height - W.pad * 2 - 34 - 32 - 12));

  const Gauge = (
    <OverlapWidget style={{ width: gauge, height: gauge }}>
      <SvgWidget svg={stepsGaugeSvg(v.pct)} style={{ width: gauge, height: gauge }} />
      <FlexWidget style={{ width: 'match_parent', height: 'match_parent', justifyContent: 'center', alignItems: 'center', flexDirection: 'column' }}>
        <T text={v.steps} size={Math.max(14, Math.round(gauge / 4.7))} font={F.xb} />
        <T text={`of ${v.goal}`} size={10} font={F.m} color={W.muted} />
      </FlexWidget>
    </OverlapWidget>
  );

  if (wide) {
    return (
      <GlassCard width={width} height={height} tint={t1} tint2={t2} row>
        <FlexWidget style={{ height: 'match_parent', justifyContent: 'center' }}>{Gauge}</FlexWidget>
        <Spacer w={16} />
        <FlexWidget style={{ flex: 1, height: 'match_parent', flexDirection: 'column', justifyContent: 'space-between' }}>
          <FlexWidget style={{ flexDirection: 'row', alignItems: 'center' }}>
            <Icon name="footprints" color={W.steps} size={16} />
            <Spacer w={6} />
            <T text="Steps" size={14} font={F.b} />
          </FlexWidget>
          <FlexWidget style={{ flexDirection: 'column' }}>
            <T text={v.left} size={18} font={F.xb} />
            <T text={v.km} size={12} font={F.m} color={W.muted} />
          </FlexWidget>
          <Pill text="Start activity" icon="play" iconColor={W.steps} bg={W.button} color="#FFFFFF" click="OPEN_URI" data={START} label="Start an activity" height={34} size={13} />
        </FlexWidget>
      </GlassCard>
    );
  }

  return (
    <GlassCard width={width} height={height} tint={t1} tint2={t2}>
      <FlexWidget style={{ width: 'match_parent', height: 34, flexDirection: 'row', alignItems: 'center' }}>
        <Icon name="footprints" color={W.steps} size={16} />
        <Spacer w={6} />
        <T text="Steps" size={14} font={F.b} />
        <Grow />
        <T text={v.km.replace('about ', '')} size={11} font={F.m} color={W.muted} />
      </FlexWidget>
      <FlexWidget style={{ width: 'match_parent', flex: 1, justifyContent: 'center', alignItems: 'center' }}>{Gauge}</FlexWidget>
      <Pill text="Start activity" icon="play" iconColor={W.steps} bg={W.button} color="#FFFFFF" click="OPEN_URI" data={START} label="Start an activity" height={32} size={13} />
    </GlassCard>
  );
}
