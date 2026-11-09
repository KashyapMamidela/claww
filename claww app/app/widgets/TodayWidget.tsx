import React from 'react';
import { FlexWidget, TextWidget } from 'react-native-android-widget';
import { widgetLines, type WidgetSnapshot } from '../lib/widgetSnapshot';

// The Today widget: calories against the target, protein left, today's session and the streak. Tapping anywhere opens
// the app; the green button opens Food.

export function TodayWidget({ snapshot }: { snapshot: WidgetSnapshot }) {
  const l = widgetLines(snapshot);
  return (
    <FlexWidget
      clickAction="OPEN_APP"
      style={{ height: 'match_parent', width: 'match_parent', backgroundColor: '#111114', borderRadius: 28, padding: 16, flexDirection: 'column', justifyContent: 'space-between' }}
    >
      <FlexWidget style={{ width: 'match_parent', flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
        <TextWidget text="CLAWW" style={{ fontSize: 12, fontWeight: '800', color: '#9A9AA3', letterSpacing: 1.5 }} />
        <TextWidget text={l.streak} style={{ fontSize: 12, fontWeight: '700', color: '#F472B6' }} />
      </FlexWidget>

      <FlexWidget style={{ width: 'match_parent', flexDirection: 'column' }}>
        <FlexWidget style={{ flexDirection: 'row', alignItems: 'flex-end' }}>
          <TextWidget text={l.big} style={{ fontSize: 34, fontWeight: '800', color: '#FFFFFF' }} />
          <TextWidget text={`  ${l.bigUnit}`} style={{ fontSize: 13, fontWeight: '600', color: '#9A9AA3' }} />
        </FlexWidget>
        <FlexWidget style={{ width: 'match_parent', height: 6, borderRadius: 3, backgroundColor: '#2A2A30', marginTop: 6 }}>
          <FlexWidget style={{ width: Math.max(6, Math.round(l.fill * 260)), height: 6, borderRadius: 3, backgroundColor: '#22C55E' }} />
        </FlexWidget>
        <TextWidget text={l.protein} style={{ fontSize: 13, fontWeight: '600', color: '#E4E4E7', marginTop: 8 }} />
      </FlexWidget>

      <FlexWidget style={{ width: 'match_parent', flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
        <TextWidget text={l.session} style={{ fontSize: 14, fontWeight: '700', color: '#60A5FA' }} />
        <FlexWidget
          clickAction="OPEN_URI"
          clickActionData={{ uri: 'claww:///(tabs)/nutrition' }}
          accessibilityLabel="Log food"
          style={{ backgroundColor: '#22C55E', borderRadius: 18, paddingHorizontal: 16, paddingVertical: 8 }}
        >
          <TextWidget text="+ Log food" style={{ fontSize: 13, fontWeight: '800', color: '#04130A' }} />
        </FlexWidget>
      </FlexWidget>
    </FlexWidget>
  );
}
