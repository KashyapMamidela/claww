import * as StoreReview from 'expo-store-review';

/**
 * Item #31 — no rating-reminder mechanism existed at all before this; "Rate
 * CLAWW" in More was a purely manual, never-prompted row. Uses the native
 * in-app review sheet (StoreReview.requestReview()) rather than a custom
 * "please rate us" dialog first — Apple/Google's own guidelines discourage
 * that extra step, and the OS throttles how often the real dialog can
 * appear regardless of how often this is called, independent of this
 * app's own one-time gate (see rating_prompt_shown_at).
 */
export async function requestAppReview(): Promise<void> {
  const available = await StoreReview.isAvailableAsync();
  if (!available) return;
  await StoreReview.requestReview();
}
