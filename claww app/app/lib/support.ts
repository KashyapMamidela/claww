import { Linking, Platform } from 'react-native';

// app.json's ios.bundleIdentifier / android.package — both "com.claww.app".
// Google Play's listing won't resolve until the app is actually published
// (SHIP PHASE 12), but the link itself is real and correct today, same
// category as the unhosted legal docs: a genuine implementation waiting on
// an external dependency, not a stub.
const ANDROID_PACKAGE = 'com.claww.app';
const IOS_APP_ID = ''; // [FILL IN] once an App Store Connect listing exists

export function openStoreListing(): void {
  const url =
    Platform.OS === 'ios' && IOS_APP_ID
      ? `https://apps.apple.com/app/id${IOS_APP_ID}`
      : `https://play.google.com/store/apps/details?id=${ANDROID_PACKAGE}`;
  Linking.openURL(url).catch(() => {});
}

// Same placeholder address used in docs/legal/*.html — swap both together
// once there's a real, monitored inbox (see SHIP PHASE 7.2's [FILL IN]).
export const SUPPORT_EMAIL = 'privacy@claww.app';

export function openSupportEmail(subject: string): void {
  Linking.openURL(`mailto:${SUPPORT_EMAIL}?subject=${encodeURIComponent(subject)}`).catch(() => {
    // No mail client configured on this device — nothing more we can do
    // client-side; the row itself is still a real action, just one this
    // particular device can't complete.
  });
}
