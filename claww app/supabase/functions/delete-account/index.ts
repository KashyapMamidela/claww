import { createClient } from 'npm:@supabase/supabase-js@2';
import { corsHeaders, jsonHeaders } from '../_shared/cors.ts';
import { UnauthorizedError, requireUser, userClientFromRequest } from '../_shared/supabaseClient.ts';
import { reportEdgeError } from '../_shared/sentry.ts';

// SHIP PHASE 7.1 — the one other legitimate service-role use in this codebase
// besides check_and_increment_generation_usage's SECURITY DEFINER function.
// Deleting an auth.users row requires the admin API, which only the service
// role can call — but the *target* of that deletion is never taken from the
// request. It is always the id embedded in the caller's own JWT, verified via
// requireUser() against a client scoped to that same JWT. There is no code
// path here that can delete any account other than the one making the call.
//
// Deploy normally (JWT verification stays ON, unlike health-check):
// `npx supabase functions deploy delete-account`
//
// Every user_id-scoped table in database/schema.sql references profiles(id)
// ON DELETE CASCADE, and profiles.id references auth.users(id) ON DELETE
// CASCADE (see profiles_id_fkey) — confirmed directly against the schema,
// not assumed: user_stats, workouts, nutrition_logs, sleep_logs,
// workout_logs, workout_day_events, meal_logs, water_logs, xp_events,
// generation_usage, and generation_failures all cascade automatically.
// Deleting the auth.users row is therefore sufficient — no manual per-table
// deletes needed, and none of the alternative approaches (deleting the rows
// first) would be more correct, only more code to keep in sync with the
// schema.

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    if (req.method !== 'POST') {
      return new Response(JSON.stringify({ error: 'Method not allowed' }), { status: 405, headers: jsonHeaders });
    }

    const supabase = userClientFromRequest(req);
    const user = await requireUser(supabase);

    // Cheap extra guard against an accidental/automated call — the real
    // confirmation gate lives in the client UI (type-to-confirm), this is a
    // second, independent check that this specific irreversible endpoint
    // was called deliberately, not just that *some* authenticated request
    // arrived.
    const body = await req.json().catch(() => ({}));
    if (body?.confirm !== 'DELETE') {
      return new Response(
        JSON.stringify({ error: 'Confirmation required: pass { "confirm": "DELETE" } in the request body.' }),
        { status: 400, headers: jsonHeaders }
      );
    }

    const serviceRoleUrl = Deno.env.get('SUPABASE_URL')!;
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const adminClient = createClient(serviceRoleUrl, serviceRoleKey);

    // user.id comes only from the verified JWT above — never from the
    // request body. This is the one line that actually performs the
    // deletion; everything else in this function exists to make sure it's
    // scoped correctly and called deliberately.
    const { error: deleteError } = await adminClient.auth.admin.deleteUser(user.id);
    if (deleteError) {
      throw new Error(`Failed to delete account: ${deleteError.message}`);
    }

    console.log(`[delete-account] Deleted account ${user.id}`);
    return new Response(JSON.stringify({ deleted: true }), { headers: jsonHeaders });
  } catch (error) {
    if (!(error instanceof UnauthorizedError)) await reportEdgeError('delete-account', error);
    const status = error instanceof UnauthorizedError ? 401 : 500;
    return new Response(JSON.stringify({ error: (error as Error).message }), { status, headers: jsonHeaders });
  }
});
