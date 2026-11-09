import React from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import type { WidgetTaskHandlerProps } from 'react-native-android-widget';
import { EMPTY_SNAPSHOT, WIDGET_KEY, type WidgetSnapshot } from '../lib/widgetSnapshot';
import { TodayWidget } from './TodayWidget';

export async function readSnapshot(): Promise<WidgetSnapshot> {
  try {
    const raw = await AsyncStorage.getItem(WIDGET_KEY);
    return raw ? { ...EMPTY_SNAPSHOT, ...JSON.parse(raw) } : EMPTY_SNAPSHOT;
  } catch {
    return EMPTY_SNAPSHOT;
  }
}

/** Runs when Android adds, resizes or refreshes the widget, even if the app is closed. */
export async function widgetTaskHandler(props: WidgetTaskHandlerProps) {
  if (props.widgetInfo.widgetName !== 'Today') return;
  if (props.widgetAction === 'WIDGET_DELETED') return;
  props.renderWidget(<TodayWidget snapshot={await readSnapshot()} />);
}
