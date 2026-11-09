import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { WIDGET_KEY, sameSnapshot, type WidgetSnapshot } from './widgetSnapshot';

// Premium F2: Home calls this with today's numbers. Android only; on iOS, web and builds without the native module it does
// nothing. The widget redraws only when what it shows has changed.

let last: WidgetSnapshot | null = null;

export async function syncWidget(next: Omit<WidgetSnapshot, 'updatedAt'>): Promise<void> {
  if (Platform.OS !== 'android') return;
  const snap: WidgetSnapshot = { ...next, updatedAt: Date.now() };
  if (last && sameSnapshot(last, snap)) return;
  last = snap;
  try {
    await AsyncStorage.setItem(WIDGET_KEY, JSON.stringify(snap));
    const { requestWidgetUpdate } = require('react-native-android-widget');
    const { TodayWidget } = require('../widgets/TodayWidget');
    const React = require('react');
    await requestWidgetUpdate({ widgetName: 'Today', renderWidget: () => React.createElement(TodayWidget, { snapshot: snap }) });
  } catch (e) {
    // No native module in this build, or no widget on the home screen: nothing to do.
    if (__DEV__) console.log('[widget] not updated:', (e as Error)?.message);
  }
}
