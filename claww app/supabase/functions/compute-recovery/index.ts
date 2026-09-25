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

    const startOfDay = new Date();
    startOfDay.setHours(0, 0, 0, 0);

    const [{ data: sleepLog }, { data: workoutLog }, { data: todaysWater }, { count: todaysMealCount }] = await Promise.all([
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
      supabase.from('water_logs').select('ml').eq('user_id', user.id).gte('logged_at', startOfDay.toISOString()),
      supabase
        .from('meal_logs')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', user.id)
        .gte('logged_at', startOfDay.toISOString()),
    ]);

    const todaysWaterMl = (todaysWater ?? []).reduce((sum, row) => sum + (row.ml ?? 0), 0);
    const result = computeRecoveryScore(
      sleepLog,
      workoutLog,
      { waterMl: todaysWaterMl },
      { loggedMealToday: (todaysMealCount ?? 0) > 0 }
    );

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
