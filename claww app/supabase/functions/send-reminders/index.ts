import { createClient, type SupabaseClient } from 'npm:@supabase/supabase-js@2';
import { corsHeaders, jsonHeaders } from '../_shared/cors.ts';
import { reportEdgeError } from '../_shared/sentry.ts';
import {
  EVENING_HOUR,
  MORNING_HOUR,
  decidePush,
  localDayStartUtc,
  localParts,
  localRemindersToday,
  normalizeReminderSettings,
  streakThroughYesterday,
  type PushKind,
  type TodayTimes,
} from '../_shared/pushPlan.ts';

// V2 PHASE 3.4 — server push for what the phone can't know: a missed
// workout (sent the next morning) and a streak about to break (sent in the
// evening). Run every hour by pg_cron through pg_net (see
// docs/push-setup.md); each run only acts on users whose LOCAL time is the
// morning or evening hour, from the timezone their device registered.
//
// Deploy with `npx supabase functions deploy send-reminders --no-verify-jwt`
// (no user calls this — it authenticates the cron job with CRON_SECRET) and
// set `npx supabase secrets set CRON_SECRET=<random>`. Optional:
// EXPO_ACCESS_TOKEN if Expo push security is turned on for the project.
//
// Scale note: this queries per candidate user, which is fine for the
// closed-test cohort; batch the queries before the user base gets large.

const EXPO_PUSH_URL = 'https://exp.host/--/api/v2/push/send';

interface TokenRow {
  user_id: string;
  token: string;
  timezone: string | null;
  updated_at: string;
}

function minutesSinceLocalMidnight(iso: string, tz: string | null): number {
  return localParts(tz, new Date(iso)).minutes;
}

async function buildState(admin: SupabaseClient, userId: string, tz: string | null, now: Date) {
  const today = localParts(tz, now).date;
  const todayStart = localDayStartUtc(tz, now, 0).toISOString();
  const yesterdayStart = localDayStartUtc(tz, now, -1).toISOString();
  const weekBeforeStart = localDayStartUtc(tz, now, -8).toISOString();
  const streakWindowStart = localDayStartUtc(tz, now, -60).toISOString();

  const [plans, logsYesterday, eventsYesterday, logsPriorWeek, sleeps, meals, sets, eventsToday, water, sends] = await Promise.all([
    admin.from('workouts').select('id', { count: 'exact', head: true }).eq('user_id', userId),
    admin.from('workout_logs').select('id', { count: 'exact', head: true }).eq('user_id', userId).gte('completed_at', yesterdayStart).lt('completed_at', todayStart),
    admin.from('workout_day_events').select('status').eq('user_id', userId).gte('created_at', yesterdayStart).lt('created_at', todayStart),
    admin.from('workout_logs').select('id', { count: 'exact', head: true }).eq('user_id', userId).gte('completed_at', weekBeforeStart).lt('completed_at', yesterdayStart),
    admin.from('sleep_logs').select('logged_at').eq('user_id', userId).gte('logged_at', streakWindowStart),
    admin.from('meal_logs').select('logged_at, meal_type').eq('user_id', userId).gte('logged_at', streakWindowStart),
    admin.from('workout_logs').select('completed_at').eq('user_id', userId).gte('completed_at', streakWindowStart),
    admin.from('workout_day_events').select('created_at').eq('user_id', userId).gte('created_at', todayStart).order('created_at', { ascending: true }).limit(1),
    admin.from('water_logs').select('ml, logged_at').eq('user_id', userId).gte('logged_at', todayStart).order('logged_at', { ascending: true }),
    admin.from('push_sends').select('kind').eq('user_id', userId).eq('local_date', today),
  ]);

  const activeDates = new Set<string>();
  const addDate = (iso: string) => activeDates.add(localParts(tz, new Date(iso)).date);
  for (const r of sleeps.data ?? []) addDate(r.logged_at);
  for (const r of meals.data ?? []) addDate(r.logged_at);
  for (const r of sets.data ?? []) addDate(r.completed_at);

  const todayStartMs = new Date(todayStart).getTime();
  const isToday = (iso: string) => new Date(iso).getTime() >= todayStartMs;
  const mealLoggedAt: TodayTimes['mealLoggedAt'] = {};
  for (const r of meals.data ?? []) {
    if (!isToday(r.logged_at) || !r.meal_type) continue;
    const t = minutesSinceLocalMidnight(r.logged_at, tz);
    const key = r.meal_type as keyof TodayTimes['mealLoggedAt'];
    if (mealLoggedAt[key] === undefined || t < (mealLoggedAt[key] as number)) mealLoggedAt[key] = t;
  }
  const todaySleep = (sleeps.data ?? []).filter((r) => isToday(r.logged_at)).map((r) => minutesSinceLocalMidnight(r.logged_at, tz));
  let waterTotal = 0;
  let waterTargetReachedAt: number | null = null;
  for (const r of water.data ?? []) {
    waterTotal += r.ml ?? 0;
    if (waterTargetReachedAt === null && waterTotal >= 2000) waterTargetReachedAt = minutesSinceLocalMidnight(r.logged_at, tz);
  }

  const times: TodayTimes = {
    sessionEventAt: eventsToday.data?.[0] ? minutesSinceLocalMidnight(eventsToday.data[0].created_at, tz) : null,
    mealLoggedAt,
    sleepLoggedAt: todaySleep.length ? Math.min(...todaySleep) : null,
    waterTargetReachedAt,
  };

  const loggedAnythingToday =
    todaySleep.length > 0 ||
    (meals.data ?? []).some((r) => isToday(r.logged_at)) ||
    (sets.data ?? []).some((r) => isToday(r.completed_at));

  return {
    today,
    hasPlan: (plans.count ?? 0) > 0,
    trainedYesterday: (logsYesterday.count ?? 0) > 0 || (eventsYesterday.data ?? []).some((e) => e.status === 'completed'),
    skippedYesterday: (eventsYesterday.data ?? []).some((e) => e.status === 'skipped'),
    trainedInPriorWeek: (logsPriorWeek.count ?? 0) > 0,
    streakThroughYesterday: streakThroughYesterday(activeDates, today),
    loggedAnythingToday,
    times,
    sentToday: (sends.data ?? []).map((s) => s.kind as PushKind),
  };
}

async function sendExpoPush(messages: { to: string; title: string; body: string; data: Record<string, unknown> }[]) {
  const headers: Record<string, string> = { 'Content-Type': 'application/json', Accept: 'application/json' };
  const accessToken = Deno.env.get('EXPO_ACCESS_TOKEN');
  if (accessToken) headers.Authorization = `Bearer ${accessToken}`;
  const res = await fetch(EXPO_PUSH_URL, {
    method: 'POST',
    headers,
    body: JSON.stringify(messages.map((m) => ({ ...m, sound: 'default', channelId: 'reminders', priority: 'high' }))),
  });
  const json = await res.json().catch(() => null);
  return (json?.data ?? []) as { status: string; details?: { error?: string } }[];
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  const expected = Deno.env.get('CRON_SECRET');
  if (!expected) {
    return new Response(JSON.stringify({ error: 'CRON_SECRET is not configured for this project' }), { status: 500, headers: jsonHeaders });
  }
  if (req.headers.get('x-cron-secret') !== expected) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers: jsonHeaders });
  }

  try {
    const admin = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!);
    const now = new Date();

    const { data: tokenRows, error: tokenError } = await admin.from('push_tokens').select('user_id, token, timezone, updated_at');
    if (tokenError) throw new Error(`Failed to load push tokens: ${tokenError.message}`);

    const byUser = new Map<string, TokenRow[]>();
    for (const row of (tokenRows ?? []) as TokenRow[]) {
      const list = byUser.get(row.user_id) ?? [];
      list.push(row);
      byUser.set(row.user_id, list);
    }

    // Only users at their local morning or evening hour this run.
    const candidates: { userId: string; tz: string | null; tokens: string[]; hour: number }[] = [];
    for (const [userId, rows] of byUser) {
      const tz = [...rows].sort((a, b) => b.updated_at.localeCompare(a.updated_at))[0].timezone;
      const hour = localParts(tz, now).hour;
      if (hour === MORNING_HOUR || hour === EVENING_HOUR) candidates.push({ userId, tz, tokens: rows.map((r) => r.token), hour });
    }
    if (candidates.length === 0) {
      return new Response(JSON.stringify({ candidates: 0, sent: 0 }), { headers: jsonHeaders });
    }

    const { data: profiles } = await admin
      .from('profiles')
      .select('id, notifications_enabled, personalization_profile')
      .in('id', candidates.map((c) => c.userId));
    const profileById = new Map((profiles ?? []).map((p) => [p.id as string, p]));

    let sent = 0;
    const staleTokens: string[] = [];

    for (const c of candidates) {
      const profile = profileById.get(c.userId);
      if (!profile?.notifications_enabled) continue;
      const settings = normalizeReminderSettings((profile.personalization_profile as { reminders?: unknown } | null)?.reminders);
      const s = await buildState(admin, c.userId, c.tz, now);
      const message = decidePush({
        notificationsEnabled: true,
        settings,
        localHour: c.hour,
        hasPlan: s.hasPlan,
        trainedYesterday: s.trainedYesterday,
        skippedYesterday: s.skippedYesterday,
        trainedInPriorWeek: s.trainedInPriorWeek,
        streakThroughYesterday: s.streakThroughYesterday,
        loggedAnythingToday: s.loggedAnythingToday,
        localRemindersToday: localRemindersToday(settings, s.times),
        sentToday: s.sentToday,
      });
      if (!message) continue;

      // Claim the send first: the unique key stops a duplicate if two runs overlap.
      const { error: claimError } = await admin.from('push_sends').insert({ user_id: c.userId, kind: message.kind, local_date: s.today });
      if (claimError) continue;

      const results = await sendExpoPush(c.tokens.map((to) => ({ to, title: message.title, body: message.body, data: { type: message.routeType } })));
      results.forEach((r, i) => {
        if (r.status === 'ok') sent += 1;
        else if (r.details?.error === 'DeviceNotRegistered') staleTokens.push(c.tokens[i]);
      });
    }

    if (staleTokens.length) await admin.from('push_tokens').delete().in('token', staleTokens);

    return new Response(JSON.stringify({ candidates: candidates.length, sent, removedTokens: staleTokens.length }), { headers: jsonHeaders });
  } catch (error) {
    await reportEdgeError('send-reminders', error);
    return new Response(JSON.stringify({ error: (error as Error).message }), { status: 500, headers: jsonHeaders });
  }
});
