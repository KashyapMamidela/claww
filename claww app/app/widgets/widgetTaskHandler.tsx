import React from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { requestWidgetUpdate, type WidgetTaskHandlerProps } from 'react-native-android-widget';
import { EMPTY_SNAPSHOT, WIDGET_KEY, type WidgetSnapshot } from '../lib/widgetSnapshot';
import { TodayWidget } from './TodayWidget';
import { QuickWidget } from './QuickWidget';

export async function readSnapshot(): Promise<WidgetSnapshot> {
  try {
    const raw = await AsyncStorage.getItem(WIDGET_KEY);
    return raw ? { ...EMPTY_SNAPSHOT, ...JSON.parse(raw) } : EMPTY_SNAPSHOT;
  } catch {
    return EMPTY_SNAPSHOT;
  }
}

export async function writeSnapshot(s: WidgetSnapshot): Promise<void> {
  try {
    await AsyncStorage.setItem(WIDGET_KEY, JSON.stringify(s));
  } catch {
    // The widget just keeps its last picture.
  }
}

export const WIDGET_NAMES = ['Today', 'Quick'] as const;

export function widgetFor(name: string, snapshot: WidgetSnapshot) {
  return name === 'Quick' ? <QuickWidget snapshot={snapshot} /> : <TodayWidget snapshot={snapshot} />;
}

/** Redraws every widget on the home screen from one snapshot. */
export async function redrawAll(snapshot: WidgetSnapshot): Promise<void> {
  for (const name of WIDGET_NAMES) {
    await requestWidgetUpdate({ widgetName: name, renderWidget: () => widgetFor(name, snapshot) });
  }
}

/** Runs when Android adds, resizes, refreshes or taps the widgets, even if the app is closed. */
export async function widgetTaskHandler(props: WidgetTaskHandlerProps) {
  const name = props.widgetInfo.widgetName;
  if (props.widgetAction === 'WIDGET_DELETED') return;

  let snapshot = await readSnapshot();

  if (props.widgetAction === 'WIDGET_CLICK' && props.clickAction === 'ADD_WATER') {
    const ml = Number((props.clickActionData as { ml?: number } | undefined)?.ml) || 250;
    if (snapshot.userId) {
      // The same write path as the app: saved on the phone first, sent from there (see lib/writeQueue).
      const { logWater } = require('../lib/data');
      await logWater(snapshot.userId, ml);
    }
    snapshot = { ...snapshot, waterMl: snapshot.waterMl + ml, updatedAt: Date.now() };
    await writeSnapshot(snapshot);
    props.renderWidget(widgetFor(name, snapshot));
    // The other widget shows no water, but a future one might: redraw them all.
    redrawAll(snapshot).catch(() => {});
    return;
  }

  props.renderWidget(widgetFor(name, snapshot));
}
