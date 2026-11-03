declare const __DEV__: boolean;

/**
 * Developer/test controls (e.g. Settings' "Send a test reminder"). On in dev
 * builds, and in EAS preview builds through EXPO_PUBLIC_SHOW_DEV_TOOLS=1 in
 * eas.json — so a tester on an installed APK can run the manual checks.
 * Never set in the production profile.
 */
export const SHOW_DEV_TOOLS = (typeof __DEV__ !== 'undefined' && __DEV__) || process.env.EXPO_PUBLIC_SHOW_DEV_TOOLS === '1';
