import { getProfile, getTodaysMealLogs, getTodaysWaterMl } from './data';
import { getTodaySteps } from './steps';
import { DEFAULT_STEPS_GOAL } from './activityMath';
import type { DayTargets, DayTotals } from './moments';

/** Today's totals and targets, for the goals a finish moment can announce. Every read is allowed to fail on its own. */
export async function loadDayGoals(userId: string): Promise<{ totals: DayTotals; targets: DayTargets }> {
  const [profile, meals, steps, water] = await Promise.all([
    getProfile(userId).catch(() => null),
    getTodaysMealLogs(userId).catch(() => []),
    getTodaySteps().catch(() => null),
    getTodaysWaterMl(userId).catch(() => 0),
  ]);
  const defaults = profile?.personalization_profile?.nutritionDefaults ?? null;
  const logged = meals.filter((m) => (m as { plan_status?: string | null }).plan_status !== 'skipped');
  return {
    totals: {
      kcal: logged.reduce((s, m) => s + (m.calories ?? 0), 0),
      proteinG: logged.reduce((s, m) => s + (m.protein_g ?? 0), 0),
      steps: steps && steps.available ? steps.steps : 0,
      waterMl: water,
    },
    targets: {
      kcal: defaults?.calories ?? null,
      proteinG: defaults?.protein_g ?? null,
      steps: profile?.personalization_profile?.stepsGoal ?? DEFAULT_STEPS_GOAL,
      waterMl: 2000,
    },
  };
}
