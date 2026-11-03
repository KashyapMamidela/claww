// Feature flags (NG standing rule 10): unfinished or replaced paths stay behind a flag
// instead of being half-shipped or deleted in the same release.

/**
 * NG PHASE 2: Home's Daily Progress shows Workout / Nutrition / Recovery. Set to true to get the
 * V2 rings back (Recovery / Sleep / Nutrition) for one release, then remove this flag and the old path.
 */
export const RINGS_V1 = false;

/**
 * NG PHASE 3.5: the iOS Live Activity for a running workout (lib/liveActivity.ts). Off until it has been
 * built and tried on an iPhone (needs an Apple Developer account and "expo-live-activity" in the app.json plugins).
 */
export const LIVE_ACTIVITY_ENABLED = false;
