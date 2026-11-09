import React from 'react';
import { FlexWidget, OverlapWidget, SvgWidget, TextWidget } from 'react-native-android-widget';
import { GLASS_ML, widgetLines, type WidgetSnapshot } from '../lib/widgetSnapshot';
import { ringsSvg } from '../lib/widgetSvg';

// The Quick widget: today's water as a ring with one-tap "+250 ml" (logged without opening the app) and "Log food".

const WATER = '#38BDF8';
const GREEN = '#22C55E';

export function QuickWidget({ snapshot }: { snapshot: WidgetSnapshot }) {
  const l = widgetLines(snapshot);
  const svg = ringsSvg([{ pct: l.waterPct * 100, color: WATER }], 11);
  return (
    <FlexWidget
      clickAction="OPEN_APP"
      style={{ height: 'match_parent', width: 'match_parent', backgroundColor: '#111114', borderRadius: 28, padding: 14, flexDirection: 'row', alignItems: 'center' }}
    >
      <OverlapWidget style={{ width: 92, height: 92 }}>
        <SvgWidget svg={svg} style={{ width: 92, height: 92 }} />
        <FlexWidget style={{ width: 'match_parent', height: 'match_parent', justifyContent: 'center', alignItems: 'center' }}>
          <TextWidget text={l.water} style={{ fontSize: 22, fontWeight: '800', color: '#FFFFFF' }} />
          <TextWidget text={l.waterOf} style={{ fontSize: 9, fontWeight: '600', color: '#9A9AA3' }} />
        </FlexWidget>
      </OverlapWidget>

      <FlexWidget style={{ flex: 1, height: 'match_parent', flexDirection: 'column', justifyContent: 'space-between', paddingLeft: 14 }}>
        <FlexWidget style={{ flexDirection: 'column' }}>
          <TextWidget text="WATER" style={{ fontSize: 11, fontWeight: '800', color: WATER, letterSpacing: 1.5 }} />
          <TextWidget text={l.glasses} style={{ fontSize: 12, fontWeight: '600', color: '#E4E4E7' }} />
        </FlexWidget>
        <FlexWidget style={{ width: 'match_parent', flexDirection: 'row' }}>
          <FlexWidget
            clickAction="ADD_WATER"
            clickActionData={{ ml: GLASS_ML }}
            accessibilityLabel="Add a glass of water"
            style={{ flex: 1, backgroundColor: WATER, borderRadius: 18, paddingVertical: 9, justifyContent: 'center', alignItems: 'center' }}
          >
            <TextWidget text={`+ ${GLASS_ML} ml`} style={{ fontSize: 13, fontWeight: '800', color: '#03121C' }} />
          </FlexWidget>
          <FlexWidget style={{ width: 8, height: 1 }} />
          <FlexWidget
            clickAction="OPEN_URI"
            clickActionData={{ uri: 'claww:///(tabs)/nutrition' }}
            accessibilityLabel="Log food"
            style={{ flex: 1, backgroundColor: GREEN, borderRadius: 18, paddingVertical: 9, justifyContent: 'center', alignItems: 'center' }}
          >
            <TextWidget text="Log food" style={{ fontSize: 13, fontWeight: '800', color: '#04130A' }} />
          </FlexWidget>
        </FlexWidget>
      </FlexWidget>
    </FlexWidget>
  );
}
