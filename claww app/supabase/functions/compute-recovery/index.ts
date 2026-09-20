import { corsHeaders, jsonHeaders } from '../_shared/cors.ts';
import { computeRecoveryScore } from '../_shared/recovery.ts';
import { UnauthorizedError, requireUser, userClientFromRequest } from '../_shared/supabaseClient.ts';
import { reportEdgeError } from '../_shared/sentry.ts';

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const supabase = userClientFromRequest(req);
    const user = await requireUser(supabase);

    const [{ data: sleepLog }, { data: workoutLog }] = await Promise.all([
      supabase
        .from('sleep_logs')
        .select('hours, bedtime, wake_time, logged_at')
        .eq('user_id', user.id)
        .order('logged_at', { ascending: false })
        .limit(1)
        .maybeSingle(),
      supabase
        .from('workout_logs')
        .select('sets, reps_achieved, reps_prescribed, completed_at')
        .eq('user_id', user.id)
        .order('completed_at', { ascending: false })
        .limit(1)
        .maybeSingle(),
    ]);

    const result = computeRecoveryScore(sleepLog, workoutLog);

    return new Response(JSON.stringify(result), { headers: jsonHeaders });
  } catch (error) {
    if (!(error instanceof UnauthorizedError)) await reportEdgeError('compute-recovery', error);
    const status = error instanceof UnauthorizedError ? 401 : 500;
    return new Response(JSON.stringify({ error: (error as Error).message }), {
      status,
      headers: jsonHeaders,
    });
  }
});
