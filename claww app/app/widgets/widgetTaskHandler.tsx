import React from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { requestWidgetUpdate, type WidgetInfo, type WidgetTaskHandlerProps } from 'react-native-android-widget';
import { EMPTY_SNAPSHOT, WIDGET_KEY, dayKey, forToday, type WidgetSnapshot } from '../lib/widgetSnapshot';
import { ActivityWidget } from './ActivityWidget';
import { NutritionWidget } from './NutritionWidget';
import { WaterWidget } from './WaterWidget';
import { StepsWidget } from './StepsWidget';

// Provider names are fixed once a widget is on someone's home screen: "Today" is the activity widget and "Quick" the
// water widget (their first names); "Nutrition" and "Steps" are newer.
export const WIDGET_NAMES = ['Today', 'Nutrition', 'Steps', 'Quick'] as const;

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
    // The widgets keep their last picture.
  }
}

export function widgetFor(name: string, snapshot: WidgetSnapshot, info: Pick<WidgetInfo, 'width' | 'height'>) {
  const now = new Date();
  const s = forToday(snapshot, now);
  if (__DEV__) console.log('[widget]', name, 'size', info.width, 'x', info.height);
  const width = info.width || 330;
  const height = info.height || 180;
  if (name === 'Quick') return <WaterWidget snapshot={s} width={width} height={height} />;
  if (name === 'Steps') return <StepsWidget snapshot={s} width={width} height={height} />;
  if (name === 'Nutrition') return <NutritionWidget snapshot={s} width={width} height={height} />;
  return <ActivityWidget snapshot={s} width={width} height={height} now={now} />;
}

/** Redraws every CLAWW widget on the home screen from one snapshot, each at its own size. */
export async function redrawAll(snapshot: WidgetSnapshot): Promise<void> {
  for (const name of WIDGET_NAMES) {
    await requestWidgetUpdate({ widgetName: name, renderWidget: (info) => widgetFor(name, snapshot, info) });
  }
}

/** Runs when Android adds, resizes, refreshes (every 30 min) or taps a widget, even with the app closed. */
export async function widgetTaskHandler(props: WidgetTaskHandlerProps) {
  const { widgetInfo, widgetAction } = props;
  if (widgetAction === 'WIDGET_DELETED') return;

  let snapshot = forToday(await readSnapshot(), new Date());

  if (widgetAction === 'WIDGET_CLICK' && props.clickAction === 'ADD_WATER') {
    const ml = Number((props.clickActionData as { ml?: number } | undefined)?.ml) || 250;
    if (snapshot.userId) {
      // The same write path as the app: saved on the phone first, sent from there (lib/writeQueue), so a tap without
      // signal is not lost.
      const { logWater } = require('../lib/data');
      await logWater(snapshot.userId, ml);
      snapshot = { ...snapshot, day: snapshot.day || dayKey(new Date()), waterMl: snapshot.waterMl + ml, updatedAt: Date.now() };
      await writeSnapshot(snapshot);
    }
    props.renderWidget(widgetFor(widgetInfo.widgetName, snapshot, widgetInfo));
    redrawAll(snapshot).catch(() => {});
    return;
  }

  props.renderWidget(widgetFor(widgetInfo.widgetName, snapshot, widgetInfo));
}
