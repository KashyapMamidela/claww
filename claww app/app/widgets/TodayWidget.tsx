import React from 'react';
import { FlexWidget, OverlapWidget, SvgWidget, TextWidget } from 'react-native-android-widget';
import { widgetLines, type WidgetSnapshot } from '../lib/widgetSnapshot';
import { ringsSvg } from '../lib/widgetSvg';

// The Today widget: the three rings from Home (Workout, Nutrition, Recovery) with the Daily goal in the middle, and the
// numbers that matter beside them: calories, protein left, steps, today's session. Tap anywhere to open the app.

const BLUE = '#3B82F6';
const GREEN = '#22C55E';
const TEAL = '#2DD4BF';
const AMBER = '#F59E0B';

export function TodayWidget({ snapshot }: { snapshot: WidgetSnapshot }) {
  const l = widgetLines(snapshot);
  const svg = ringsSvg([
    { pct: snapshot.workoutPct, color: BLUE },
    { pct: snapshot.nutritionPct, color: GREEN },
    { pct: snapshot.recoveryPct, color: TEAL },
  ]);
  return (
    <FlexWidget
      clickAction="OPEN_APP"
      style={{ height: 'match_parent', width: 'match_parent', backgroundColor: '#111114', borderRadius: 28, padding: 14, flexDirection: 'row', alignItems: 'center' }}
    >
      <OverlapWidget style={{ width: 96, height: 96 }}>
        <SvgWidget svg={svg} style={{ width: 96, height: 96 }} />
        <FlexWidget style={{ width: 'match_parent', height: 'match_parent', justifyContent: 'center', alignItems: 'center' }}>
          <TextWidget text={l.daily} style={{ fontSize: 20, fontWeight: '800', color: '#FFFFFF' }} />
          <TextWidget text="of today" style={{ fontSize: 9, fontWeight: '600', color: '#9A9AA3' }} />
        </FlexWidget>
      </OverlapWidget>

      <FlexWidget style={{ flex: 1, height: 'match_parent', flexDirection: 'column', justifyContent: 'space-between', paddingLeft: 14 }}>
        <FlexWidget style={{ width: 'match_parent', flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
          <TextWidget text="CLAWW" style={{ fontSize: 11, fontWeight: '800', color: '#9A9AA3', letterSpacing: 1.5 }} />
          <TextWidget text={l.streak} style={{ fontSize: 11, fontWeight: '700', color: '#F472B6' }} />
        </FlexWidget>
        <TextWidget text={l.kcal} style={{ fontSize: 16, fontWeight: '800', color: GREEN }} />
        <TextWidget text={l.protein} style={{ fontSize: 12, fontWeight: '600', color: '#E4E4E7' }} />
        <TextWidget text={l.steps} style={{ fontSize: 12, fontWeight: '700', color: AMBER }} />
        <TextWidget text={l.session} style={{ fontSize: 12, fontWeight: '700', color: BLUE }} />
      </FlexWidget>
    </FlexWidget>
  );
}
