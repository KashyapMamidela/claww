import * as Sentry from '@sentry/react-native';
import Constants from 'expo-constants';

// SHIP PHASE 9.1 — crash/error reporting for the app. No-ops until
// EXPO_PUBLIC_SENTRY_DSN is set (empty string in .env until the user
// creates a Sentry project and supplies the DSN), so this is safe to ship
// even before that happens — Sentry.* calls elsewhere become harmless.
//
// NOTE: "@sentry/react-native" is deliberately NOT in app.json's plugins
// array right now. That native config plugin patches android/app/build.gradle
// to apply Sentry's Gradle script, which (a) fails the release build with
// "An organization ID or slug is required" since no org/project is
// configured yet, and (b) its bundled JS ships private-class-field syntax
// that broke Hermes compilation in the same build. Neither matters without
// a real DSN anyway — re-add the plugin (with organization/project set)
// once Sentry is actually configured, then re-verify a production build.
const dsn = process.env.EXPO_PUBLIC_SENTRY_DSN;

export const sentryEnabled = Boolean(dsn);

export function initSentry() {
  if (!dsn) {
    console.warn('[Claww] EXPO_PUBLIC_SENTRY_DSN not set — Sentry disabled.');
    return;
  }

  Sentry.init({
    dsn,
    release: `claww@${Constants.expoConfig?.version ?? 'dev'}`,
    dist: String(Constants.expoConfig?.ios?.buildNumber ?? Constants.expoConfig?.android?.versionCode ?? '1'),
    environment: __DEV__ ? 'development' : 'production',
    tracesSampleRate: 0.2,
    // Never let Sentry auto-attach request/response bodies or device
    // contact info — CLAWW's Supabase calls carry auth tokens and the
    // Groq/photo-estimate payloads carry meal photos, neither of which
    // belong in a crash report.
    sendDefaultPii: false,
    beforeSend(event) {
      if (event.request) {
        delete event.request.cookies;
        delete event.request.headers;
      }
      return event;
    },
  });
}

/** Route a caught error to Sentry without also throwing — mirrors the app's
 * existing "log the failure, keep going" pattern (see generation_failures). */
export function reportError(error: unknown, context?: Record<string, unknown>) {
  if (!dsn) return;
  Sentry.captureException(error, context ? { extra: context } : undefined);
}
