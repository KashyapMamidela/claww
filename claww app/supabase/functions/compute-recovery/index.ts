import { corsHeaders, jsonHeaders } from '../_shared/cors.ts';
import { computeRecoveryScore, proteinShare } from '../_shared/recovery.ts';
import { UnauthorizedError, requireUser, userClientFromRequest } from '../_shared/supabaseClient.ts';
import { reportEdgeError } from '../_shared/sentry.ts';

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const supabase = userClientFromRequest(req);
    const user = await requireUser(supabase);

    const last24h = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();

    const [{ data: sleepLog }, { data: workoutLog }, { data: profile }, { data: recentMeals }] = await Promise.all([
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
      supabase.from('profiles').select('personalization_profile').eq('id', user.id).maybeSingle(),
      supabase.from('meal_logs').select('protein_g').eq('user_id', user.id).gte('logged_at', last24h),
    ]);

    const target = (profile?.personalization_profile as { nutritionDefaults?: { protein_g?: number } } | null)?.nutritionDefaults?.protein_g ?? null;
    const pct = proteinShare(recentMeals, target);
    const result = computeRecoveryScore(sleepLog, workoutLog, pct === null ? null : { proteinPct: pct });

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
