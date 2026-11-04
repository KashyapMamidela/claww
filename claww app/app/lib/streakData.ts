// The one streak (NG PHASE 12 follow-up): plan days followed, with rest days, protected by an exam week. Home's tile,
// its sheet, the Tracker and the session-complete card all read this, so they can never disagree.

import { supabase } from './supabase';
import { getCompletedSessionDates, getLatestWorkout, getProfile } from './data';
import { dateKey, planStreakStats, type PlanStreakStats } from './planStreak';
import { weekdayIndex } from './trainingWeek';

export interface LoadedStreak {
  stats: PlanStreakStats;
  inputs: { plannedWeekdays: number[] | null; examWeek: { from: string; until: string } | null; planStart: string | undefined };
}

export async function loadPlanStreak(userId: string): Promise<LoadedStreak> {
  const [dates, workout, profile, first] = await Promise.all([
    getCompletedSessionDates(userId, 400),
    getLatestWorkout(userId),
    getProfile(userId),
    supabase.from('workouts').select('created_at').eq('user_id', userId).order('created_at', { ascending: true }).limit(1).maybeSingle(),
  ]);
  const labels = workout?.plan.days.map((d) => d.day) ?? [];
  const idx = labels.map((l) => weekdayIndex(l));
  const plannedWeekdays = labels.length > 0 && idx.every((i) => i !== null) ? (idx as number[]) : null;
  const examWeek = profile?.personalization_profile?.examWeek ?? null;
  const planStart = first.data?.created_at ? dateKey(new Date(first.data.created_at as string)) : undefined;
  const stats = planStreakStats({ today: dateKey(new Date()), plannedWeekdays, completedDates: new Set(dates), examWeek, planStart });
  return { stats, inputs: { plannedWeekdays, examWeek, planStart } };
}
