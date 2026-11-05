// NG PHASE 11: the Coach's Pen in the app. Stores marks (pen_marks), reads the user's own logs into the trend reader,
// turns findings into marks within the daily limits, applies a mark's change to the plan, and puts the exact old value
// back on undo. The table may not exist yet on an old database: every read then returns nothing and every write is a no-op.

import { supabase } from './supabase';
import { getLatestWorkout, getMealLogsBetween, getProfile, getSuggestedDayIndex, getWeightLogs, getWorkoutDayEvents, saveNutritionTargets, type WorkoutPlan } from './data';
import { ADD_ONS, MEAL_TEMPLATES, cheapestFix, scaleTemplate, swapOptions, type PenKind, type PenMark, type PenStatus, type PenTarget, type NewMark, type RuleContext, type SwapChoice } from './engine';
import { applyRules, createWithinLimits, dayKeyOf, expireMarks, readTrends, undoPatch, type Finding, type TrendInput } from './engine';
import { loadPlanInputs, planFor, setPlannedMeal } from './mealPlanData';
import { loadDayPrescription } from './todayPlan';
import { epley1RM, toTrainLogs } from './trackerMath';
import { dateKey } from './planStreak';
import { WEEKDAY_NAMES, localWeekday, weekdayIndex } from './trainingWeek';

interface Row {
  id: string;
  area: 'workout' | 'nutrition';
  kind: PenKind;
  target: PenTarget;
  old_value: string | null;
  new_value: string;
  note: string;
  reason: string;
  evidence: Record<string, unknown> | null;
  status: PenStatus;
  created_at: string;
  decided_at: string | null;
}

const toMark = (r: Row): PenMark => ({
  id: r.id, area: r.area, kind: r.kind, target: r.target, oldValue: r.old_value, newValue: r.new_value, note: r.note, reason: r.reason,
  evidence: r.evidence, status: r.status, createdAt: r.created_at, decidedAt: r.decided_at,
});

const COLUMNS = 'id, area, kind, target, old_value, new_value, note, reason, evidence, status, created_at, decided_at';

/** Marks from the last `days` days, newest first. */
export async function getMarks(userId: string, days = 35): Promise<PenMark[]> {
  const since = new Date(Date.now() - days * 86_400_000).toISOString();
  const { data, error } = await supabase.from('pen_marks').select(COLUMNS).eq('user_id', userId).gte('created_at', since).order('created_at', { ascending: false });
  if (error) return [];
  return ((data ?? []) as Row[]).map(toMark);
}

async function insertMarks(userId: string, marks: NewMark[]): Promise<PenMark[]> {
  if (marks.length === 0) return [];
  const rows = marks.map((m) => ({ user_id: userId, area: m.area, kind: m.kind, target: m.target, old_value: m.oldValue, new_value: m.newValue, note: m.note, reason: m.reason, evidence: m.evidence }));
  const { data, error } = await supabase.from('pen_marks').insert(rows).select(COLUMNS);
  if (error) {
    console.warn('[Claww] Could not save pen marks:', error.message);
    return [];
  }
  return ((data ?? []) as Row[]).map(toMark);
}

async function setStatus(userId: string, id: string, status: PenStatus): Promise<boolean> {
  const { error } = await supabase.from('pen_marks').update({ status, decided_at: new Date().toISOString() }).eq('id', id).eq('user_id', userId);
  return !error;
}

// ─── Applying a mark and undoing it ────────────────────────────────────────────────────────────────────────

const templateById = (id: unknown) => MEAL_TEMPLATES.find((t) => t.id === id) ?? null;

/** Puts a mark's change into the plan. Holds and added foods change nothing stored: the mark itself is the note. */
async function applyChange(userId: string, mark: PenMark): Promise<void> {
  const r = mark.target.restore ?? {};
  if (mark.kind === 'swap_item' && mark.target.planDate && r.toTemplateId) {
    const t = templateById(r.toTemplateId);
    if (t) await setPlannedMeal(userId, mark.target.planDate, scaleTemplate(t, Number(r.toFactor ?? 1)));
  } else if (mark.kind === 'change_number' && mark.target.key === 'calories') {
    await setCalories(userId, Number(mark.newValue));
  } else if (mark.kind === 'move_day' && mark.oldValue) {
    await relabelDay(userId, mark.oldValue, mark.newValue);
  }
}

/** Puts the exact old value back. */
async function revertChange(userId: string, mark: PenMark): Promise<void> {
  const patch = undoPatch(mark);
  if (!patch) return;
  const r = patch.restore ?? {};
  if (mark.kind === 'swap_item' && mark.target.planDate && r.templateId) {
    const t = templateById(r.templateId);
    if (t) await setPlannedMeal(userId, mark.target.planDate, scaleTemplate(t, Number(r.factor ?? 1)));
  } else if (mark.kind === 'change_number' && mark.target.key === 'calories') {
    await setCalories(userId, Number(patch.value));
  } else if (mark.kind === 'move_day') {
    await relabelDay(userId, mark.newValue, patch.value);
  }
}

async function setCalories(userId: string, calories: number): Promise<void> {
  const profile = await getProfile(userId);
  const d = profile?.personalization_profile?.nutritionDefaults;
  if (!d || !(calories > 0)) return;
  // Carbs take the difference (4 kcal a gram); protein and fat stay where they were set.
  const carbs = Math.max(0, Math.round(d.carbs_g + (calories - d.calories) / 4));
  await saveNutritionTargets(userId, { ...d, calories, carbs_g: carbs });
}

async function relabelDay(userId: string, from: string, to: string): Promise<void> {
  const workout = await getLatestWorkout(userId);
  if (!workout) return;
  const plan: WorkoutPlan = { ...workout.plan, days: workout.plan.days.map((d) => (d.day === from ? { ...d, day: to } : d)) };
  plan.days.sort((a, b) => (weekdayIndex(a.day) ?? 99) - (weekdayIndex(b.day) ?? 99));
  await supabase.from('workouts').update({ plan }).eq('id', workout.id);
}

/** The user's decision on a mark: Keep leaves the change in place, Undo puts the old value back. One tap, no questions. */
export async function decideMark(userId: string, mark: PenMark, status: 'kept' | 'undone'): Promise<PenMark> {
  // The weekly review lets a decision be changed: Keep after Undo puts the change back, Undo after Keep takes it out.
  if (mark.status === 'expired' || mark.status === status) return mark;
  if (!(await setStatus(userId, mark.id, status))) return mark;
  if (status === 'undone') await revertChange(userId, mark);
  else if (mark.status === 'undone') await applyChange(userId, mark);
  return { ...mark, status, decidedAt: new Date().toISOString() };
}

/** Names the user chose "Use my old plan" for today (engine marks): the session start gives them the plan's numbers. */
export async function getKeepPlanNames(userId: string, date: string): Promise<Set<string>> {
  const marks = await getMarks(userId, 2);
  return new Set(
    marks
      .filter((m) => m.status === 'undone' && m.area === 'workout' && m.kind === 'change_number' && m.target.planDate === date && m.target.exercise)
      .map((m) => m.target.exercise!.toLowerCase())
  );
}

// ─── Engine marks become pen marks ─────────────────────────────────────────────────────────────────────────

interface EngineMarkLike {
  name: string;
  kind: 'weight' | 'sets' | 'reps';
  oldText: string;
  newText: string;
  note: string;
  reason: string;
}

/**
 * The engine's prescriptions that differ from the plan are marks too (one coaching voice). They are stored once a day,
 * within the same daily limit. Returns the stored ones, including the ones already decided today.
 */
export async function recordEngineMarks(userId: string, engine: EngineMarkLike[], date: string): Promise<PenMark[]> {
  const existing = await getMarks(userId, 35);
  const now = new Date().toISOString();
  const fresh: NewMark[] = engine
    .filter((m) => !existing.some((e) => e.target.key === `ex:${m.name.toLowerCase()}` && e.target.planDate === date))
    .map((m) => ({
      area: 'workout' as const,
      kind: 'change_number' as const,
      target: { key: `ex:${m.name.toLowerCase()}`, field: m.kind, planDate: date, exercise: m.name },
      oldValue: m.oldText,
      newValue: m.newText,
      note: m.note.slice(0, 40),
      reason: m.reason,
      evidence: { source: 'engine' },
    }));
  const { created } = createWithinLimits(existing, fresh, now, () => '');
  const saved = await insertMarks(userId, created.map(({ id: _id, status: _s, createdAt: _c, decidedAt: _d, ...m }) => m));
  return [...existing, ...saved].filter((m) => m.target.planDate === date && m.area === 'workout' && m.kind === 'change_number');
}

// ─── The trend reader ──────────────────────────────────────────────────────────────────────────────────────

const goalOf = (g: string | null | undefined): TrendInput['goal'] => {
  const s = (g ?? '').toLowerCase();
  if (s.includes('muscle') || s.includes('gain') || s.includes('bulk')) return 'muscle_gain';
  if (s.includes('fat') || s.includes('lose') || s.includes('weight_loss') || s.includes('cut')) return 'fat_loss';
  if (s.includes('maint')) return 'maintain';
  return 'other';
};

async function buildTrendInput(userId: string, today: string): Promise<{ input: TrendInput; plan: WorkoutPlan | null; workoutId: string | null }> {
  const since28 = new Date(Date.now() - 28 * 86_400_000);
  const [setsRes, sleepRes, meals, weights, profile, workout] = await Promise.all([
    supabase.from('workout_logs').select('exercise_name, reps_achieved, reps_prescribed, weight_achieved, weight_prescribed, completed_at').eq('user_id', userId).gte('completed_at', since28.toISOString()).limit(3000),
    supabase.from('sleep_logs').select('hours, logged_at').eq('user_id', userId).gte('logged_at', new Date(Date.now() - 7 * 86_400_000).toISOString()),
    getMealLogsBetween(userId, since28.toISOString(), new Date(Date.now() + 86_400_000).toISOString()),
    getWeightLogs(userId, 28),
    getProfile(userId),
    getLatestWorkout(userId),
  ]);

  // Best estimated max of each exercise on each day, oldest first.
  const best = new Map<string, Map<string, number>>();
  for (const l of toTrainLogs(setsRes.data ?? [])) {
    const e = epley1RM(l.weight, l.reps);
    if (e <= 0) continue;
    const day = dayKeyOf(l.completedAt);
    const byDay = best.get(l.exerciseName) ?? new Map<string, number>();
    byDay.set(day, Math.max(byDay.get(day) ?? 0, e));
    best.set(l.exerciseName, byDay);
  }
  const lifts = [...best.entries()].map(([name, byDay]) => ({ name, sessions: [...byDay.entries()].sort((a, b) => a[0].localeCompare(b[0])).map(([date, e1rm]) => ({ date, e1rm })) }));

  let plannedDays: TrendInput['plannedDays'] = [];
  if (workout && workout.plan.days.every((d) => weekdayIndex(d.day) !== null)) {
    const events = await getWorkoutDayEvents(userId, workout.id);
    const doneDates = new Set(events.filter((e) => e.status === 'completed').map((e) => dayKeyOf(e.createdAt)));
    const trained = new Set(workout.plan.days.map((d) => weekdayIndex(d.day)));
    const planStart = dayKeyOf(workout.created_at);
    for (let i = 1; i <= 27; i++) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const key = dateKey(d);
      if (key < planStart || !trained.has(localWeekday(d))) continue;
      plannedDays.push({ date: key, weekday: WEEKDAY_NAMES[localWeekday(d)], done: doneDates.has(key) });
    }
  }

  const input: TrendInput = {
    today,
    goal: goalOf(profile?.goal),
    lifts,
    meals: meals
      .filter((m) => ['breakfast', 'lunch', 'dinner'].includes((m.meal_type ?? '').toLowerCase()))
      .map((m) => ({ date: dayKeyOf(m.logged_at), slot: (m.meal_type ?? '').toLowerCase() as 'breakfast' | 'lunch' | 'dinner', protein: m.protein_g ?? 0, skipped: m.plan_status === 'skipped' })),
    proteinTarget: profile?.personalization_profile?.nutritionDefaults?.protein_g ?? null,
    sleep: (sleepRes.data ?? []).map((s) => ({ date: dayKeyOf(s.logged_at as string), hours: Number(s.hours) })),
    weights: weights.map((w) => ({ date: dayKeyOf(w.loggedAt), kg: w.weightKg })),
    plannedDays,
  };
  return { input, plan: workout?.plan ?? null, workoutId: workout?.id ?? null };
}

let lastRun = 0;

/**
 * Reads the last weeks, creates the marks the rules allow (at most 3 new a day), applies each change to the plan and
 * expires marks whose day has passed. Safe to call often: it does nothing more than once every 10 minutes, and the
 * limits make it idempotent. Returns the marks created.
 */
export async function syncPenMarks(userId: string, force = false): Promise<PenMark[]> {
  if (!force && Date.now() - lastRun < 10 * 60_000) return [];
  lastRun = Date.now();
  const now = new Date();
  const today = dateKey(now);
  const tomorrowDate = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1);
  const tomorrow = dateKey(tomorrowDate);

  let existing = await getMarks(userId, 35);
  // Expire marks whose day passed, or whose item is done (a meal logged for that slot today).
  const expired = expireMarks(existing, today, new Set(), now.toISOString());
  for (let i = 0; i < existing.length; i++) if (expired[i].status === 'expired' && existing[i].status === 'active') await setStatus(userId, existing[i].id, 'expired');
  existing = expired;

  const { input, plan } = await buildTrendInput(userId, today);
  const findings = readTrends(input);
  if (findings.length === 0) return [];

  const inputs = await loadPlanInputs(userId);
  const profile = await getProfile(userId);

  // What the engine is doing today, so a rule never works against it.
  const enginePushing = new Set<string>();
  const engineLowering = new Set<string>();
  const workout = await getLatestWorkout(userId);
  if (workout) {
    const events = await getWorkoutDayEvents(userId, workout.id);
    const prescribed = await loadDayPrescription(userId, workout, getSuggestedDayIndex(workout.plan, events));
    for (const p of prescribed) {
      const c = p.prescription.commands;
      if (c.some((x) => x === 'INCREASE_WEIGHT' || x === 'INCREASE_SETS' || x === 'INCREASE_REPS')) enginePushing.add(p.name.toLowerCase());
      if (c.some((x) => x === 'DELOAD' || x === 'DECREASE_WEIGHT' || x === 'REDUCE_SETS_TODAY' || x === 'DECREASE_SETS')) engineLowering.add(p.name.toLowerCase());
    }
  }

  const tomorrowPlan = inputs ? await planFor(userId, tomorrow, inputs) : null;

  const gap = findings.filter((f): f is Extract<Finding, { type: 'protein_miss' }> => f.type === 'protein_miss').reduce((m, f) => Math.max(m, f.targetG - f.avgG), 0);
  const fix = inputs && gap > 0 ? cheapestFix(gap, { resources: inputs.input.resources, addOns: ADD_ONS }) : null;

  const labels = plan?.days.map((d) => d.day) ?? [];
  const lastCalorieMark = existing.find((m) => m.target.key === 'calories' && (m.status === 'active' || m.status === 'kept'));

  const ctx: RuleContext = {
    today,
    tomorrow,
    calorieTarget: profile?.personalization_profile?.nutritionDefaults?.calories ?? null,
    lastCalorieMarkDate: lastCalorieMark ? dayKeyOf(lastCalorieMark.createdAt) : null,
    enginePushing,
    engineLowering,
    proteinFix: fix ? { food: fix.key, text: fix.text.replace(/ adds \d+ g protein$/, ''), proteinG: fix.proteinG, kcal: fix.kcal } : null,
    availableFoods: new Set(fix ? [fix.key] : []),
    swapFor: (slot): SwapChoice | null => {
      const current = tomorrowPlan?.meals.find((m) => m.meal === slot);
      if (!current || !inputs) return null;
      const options = swapOptions(current, { ...inputs.input, date: tomorrow, history: [] }, 5);
      // The quickest: fewest ways of cooking needed, then fewest items.
      const rank = (id: string) => {
        const t = templateById(id);
        return t ? t.needsCook.length * 10 + t.items.length : 99;
      };
      const pick = [...options].sort((a, b) => rank(a.templateId) - rank(b.templateId))[0];
      if (!pick) return null;
      return { fromId: current.templateId, fromName: current.name, fromKcal: current.kcal, fromFactor: current.factor, toId: pick.templateId, toName: pick.name, toKcal: pick.kcal, toFactor: pick.factor };
    },
    freeWeekday: (missed) => {
      const from = weekdayIndex(missed);
      if (from === null) return null;
      const used = new Set(labels.map((l) => weekdayIndex(l)));
      for (let step = 1; step <= 6; step++) {
        const idx = (from + step) % 7;
        if (!used.has(idx)) return WEEKDAY_NAMES[idx];
      }
      return null;
    },
  };

  const candidates = applyRules(findings, ctx).map(({ finding: _f, ...m }) => m);
  const { created } = createWithinLimits(existing, candidates, now.toISOString(), () => '');
  const saved = await insertMarks(userId, created.map(({ id: _id, status: _s, createdAt: _c, decidedAt: _d, ...m }) => m));
  for (const m of saved) await applyChange(userId, m);
  return saved;
}
