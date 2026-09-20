import PostHog from 'posthog-react-native';

// SHIP PHASE 9.2 — analytics on the core loop only: onboarding completion,
// plan/meal generation (including real-vs-fallback, joining 6.3's
// generation_failures data with actual usage), and workout completion.
// Not instrumented everywhere — this is meant to answer "where do people
// drop off" and "is fallback generation actually hurting retention", not to
// be a full event log. No-ops until EXPO_PUBLIC_POSTHOG_KEY is set.
const apiKey = process.env.EXPO_PUBLIC_POSTHOG_KEY;
const host = process.env.EXPO_PUBLIC_POSTHOG_HOST || 'https://app.posthog.com';

let client: PostHog | null = null;

export const analyticsEnabled = Boolean(apiKey);

export function initAnalytics() {
  if (!apiKey || client) return;
  client = new PostHog(apiKey, { host });
}

type EventProperties = Record<string, string | number | boolean | null>;

export function track(event: string, properties?: EventProperties) {
  client?.capture(event, properties);
}

export function identify(userId: string) {
  client?.identify(userId);
}

/** Called on sign-out — never keep tracking events under a stale user id. */
export function resetAnalytics() {
  client?.reset();
}

// Core-loop event names, centralized so a typo doesn't silently create a
// second, uncorrelated event in the PostHog dashboard.
export const AnalyticsEvent = {
  OnboardingCompleted: 'onboarding_completed',
  WorkoutPlanGenerated: 'workout_plan_generated',
  MealEstimated: 'meal_estimated',
  MealLogged: 'meal_logged',
  WorkoutCompleted: 'workout_completed',
} as const;
