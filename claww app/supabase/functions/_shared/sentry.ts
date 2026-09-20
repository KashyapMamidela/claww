import * as Sentry from 'npm:@sentry/deno@^8';

// SHIP PHASE 9.1 — Edge Function side. Deliberately separate from
// generationFailures.ts: that table tracks *expected* Groq degradation
// (rate limits, bad JSON) as product telemetry queried from the app side.
// This is for genuine bugs (a thrown error nothing here already classifies)
// that an operator needs to be paged/alerted on, not queried later.
// No-ops until the SENTRY_DSN secret is set
// (`supabase secrets set SENTRY_DSN=... --project-ref <ref>`).
//
// Follows Supabase's own Sentry guide (supabase.com/docs/guides/functions/
// examples/sentry-monitoring): defaultIntegrations disabled and every call
// wrapped in Sentry.withScope, because the Deno SDK doesn't instrument
// Deno.serve — without that, tags/extra from one request can leak into
// another's report when the runtime is reused across invocations.
const dsn = Deno.env.get('SENTRY_DSN');

let initialized = false;
function ensureInit() {
  if (initialized || !dsn) return;
  Sentry.init({
    dsn,
    defaultIntegrations: false,
    environment: Deno.env.get('SENTRY_ENVIRONMENT') ?? 'production',
    tracesSampleRate: 0,
    // Edge Function requests carry a user JWT and, for parse-meal-photo, a
    // base64 image — never forward request bodies/headers to Sentry.
    sendDefaultPii: false,
  });
  initialized = true;
}

/** Best-effort: never throws, never blocks the response the function already builds. */
export async function reportEdgeError(functionName: string, error: unknown, extra?: Record<string, unknown>) {
  if (!dsn) return;
  ensureInit();
  try {
    Sentry.withScope((scope) => {
      scope.setTag('function', functionName);
      if (extra) scope.setExtras(extra);
      Sentry.captureException(error);
    });
    // The Edge Function process can exit right after the response is sent —
    // without this, the capture above may never actually reach Sentry.
    await Sentry.flush(2000);
  } catch {
    // Reporting the error must never itself throw and mask the real response.
  }
}
