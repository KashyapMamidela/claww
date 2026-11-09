// Must be the very first import — Reanimated needs to initialize before
// anything else touches the native module.
import 'react-native-reanimated';

// Entry point for Expo Router file-based routing.
// Expo Router uses this to auto-discover and register routes from the /app directory.
import 'expo-router/entry';

// Premium F2: the Android home-screen widget draws itself from a saved snapshot, even when the app is closed.
import { Platform } from 'react-native';
if (Platform.OS === 'android') {
  try {
    const { registerWidgetTaskHandler } = require('react-native-android-widget');
    const { widgetTaskHandler } = require('./widgets/widgetTaskHandler');
    registerWidgetTaskHandler(widgetTaskHandler);
  } catch {
    // A build without the widget module just has no widget.
  }
}
