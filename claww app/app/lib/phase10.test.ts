import { describe, expect, it } from 'vitest';
import { CATCH_UP_FROM, NIGHT_CLOSE_FROM, catchUpSlots, countLine, momentFor, nightCloseText, unanswered } from './dayMoments';
import { LESS_FACTOR, dinnerReason, elseChoices, mealForAnswer, templateForChoice } from './catchUp';
import { DEFAULT_REMINDER_SETTINGS, normalizeReminderSettings, planReminders, type TodayState } from './reminderPlan';
import { MEAL_TEMPLATES, planDay, replanRemaining, type PlanInput, type Resources } from './engine';
import { remainingSlots, slotViews } from './mealPlanView';

const at = (h: number, m = 0) => ({ hour: h, minute: m });
const DIET_RANK = ['vegan', 'veg', 'egg', 'nonveg'];

describe('momentFor boundaries', () => {
  it('is morning from 05:00 to 10:59 with nothing logged', () => {
    expect(momentFor({ ...at(4, 59), answeredTypes: [] })).toBe('day');
    expect(momentFor({ ...at(5), answeredTypes: [] })).toBe('morning');
    expect(momentFor({ ...at(10, 59), answeredTypes: [] })).toBe('morning');
    expect(momentFor({ ...at(11), answeredTypes: [] })).toBe('day');
  });
  it('is no longer morning once anything is logged', () => {
    expect(momentFor({ ...at(8), answeredTypes: ['Breakfast'] })).toBe('day');
  });
  it('is catch-up from 19:30 with breakfast or lunch unanswered', () => {
    expect(momentFor({ ...at(19, 29), answeredTypes: ['Dinner'] })).toBe('day');
    expect(momentFor({ ...at(19, 30), answeredTypes: [] })).toBe('catch_up');
    expect(momentFor({ ...at(20), answeredTypes: ['Breakfast'] })).toBe('catch_up');
    expect(momentFor({ ...at(20), answeredTypes: ['Lunch'] })).toBe('catch_up');
  });
  it('is not catch-up when only dinner is open', () => {
    expect(momentFor({ ...at(20, 30), answeredTypes: ['Breakfast', 'Lunch'] })).toBe('day');
  });
  it('is night close from 21:30 with any meal unanswered, and a skipped meal counts as answered', () => {
    expect(momentFor({ ...at(21, 29), answeredTypes: ['Breakfast', 'Lunch'] })).toBe('day');
    expect(momentFor({ ...at(21, 30), answeredTypes: ['Breakfast', 'Lunch'] })).toBe('night_close');
    expect(momentFor({ ...at(22), answeredTypes: [] })).toBe('night_close');
    expect(momentFor({ ...at(22), answeredTypes: ['breakfast', 'lunch', 'dinner'] })).toBe('day');
  });
  it('constants match the plan', () => {
    expect(CATCH_UP_FROM).toBe(19 * 60 + 30);
    expect(NIGHT_CLOSE_FROM).toBe(21 * 60 + 30);
  });
});

describe('catch-up slots', () => {
  it('asks about breakfast and lunch, and dinner only at the close', () => {
    expect(catchUpSlots([], 20, 0)).toEqual(['breakfast', 'lunch']);
    expect(catchUpSlots([], 21, 30)).toEqual(['breakfast', 'lunch', 'dinner']);
    expect(catchUpSlots(['Lunch'], 20, 0)).toEqual(['breakfast']);
    expect(unanswered(['Breakfast', null])).toEqual(['lunch', 'dinner']);
  });
  it('words the count and the night close text', () => {
    expect(countLine(2)).toContain('Two meals');
    expect(countLine(1)).toContain('One meal');
    expect(nightCloseText(0)).toBeNull();
    expect(nightCloseText(2)?.title).toBe('Close your day in 10 seconds');
  });
});

const resources: Resources = {
  sources: ['home', 'mess'],
  cookWith: ['full_kitchen', 'stove'],
  diet: 'nonveg',
  availability: { eggs: 'yes', paneer: 'yes', chicken: 'yes', soya: 'yes', curd: 'yes', milk: 'yes', peanuts: 'yes', banana: 'yes', sprouts: 'yes', oats: 'yes', whey: 'sometimes' } as Resources['availability'],
  avoid: [],
  style: 'varied',
};
const input: PlanInput = { target: { kcal: 2200, protein: 120 }, resources, seed: 'u1', date: '2026-11-05', history: [], templates: MEAL_TEMPLATES, addOns: [] };

describe('catch-up answers', () => {
  const plan = planDay(input);
  const lunch = plan.meals.find((m) => m.meal === 'lunch')!;

  it('as planned saves the plan, with the database numbers', () => {
    const s = mealForAnswer('lunch', { kind: 'planned' }, lunch, 'nonveg');
    expect(s?.planStatus).toBe('as_planned');
    expect(s?.calories).toBe(lunch.kcal);
    expect(mealForAnswer('lunch', { kind: 'planned' }, null, 'nonveg')).toBeNull();
  });
  it('skipped saves an empty meal with no items', () => {
    const s = mealForAnswer('breakfast', { kind: 'skipped' }, null, 'veg')!;
    expect(s).toMatchObject({ planStatus: 'skipped', calories: 0, protein_g: 0 });
    expect(s.items).toBeUndefined();
  });
  it('something else resolves to a template for the slot that the diet allows', () => {
    for (const diet of ['veg', 'vegan', 'jain', 'egg', 'nonveg'] as const) {
      for (const slot of ['breakfast', 'lunch', 'dinner'] as const) {
        for (const c of elseChoices(slot, diet, null)) {
          if (c === 'photo' || c === 'less') continue;
          const t = templateForChoice(c, slot, diet)!;
          expect(t.meal).toBe(slot);
          expect(DIET_RANK.indexOf(t.diet)).toBeLessThanOrEqual(DIET_RANK.indexOf(diet === 'jain' ? 'veg' : diet));
        }
      }
    }
  });
  it('the biryani chip is vegetarian for a vegetarian', () => {
    const t = templateForChoice('biryani', 'lunch', 'veg')!;
    expect(t.name.toLowerCase()).toContain('biryani');
    expect(['veg', 'vegan']).toContain(t.diet);
  });
  it('a swap counts as swapped when it was planned and extra when it was not', () => {
    expect(mealForAnswer('lunch', { kind: 'else', choice: 'biryani' }, lunch, 'nonveg')?.planStatus).toBe('swapped');
    expect(mealForAnswer('lunch', { kind: 'else', choice: 'biryani' }, null, 'nonveg')?.planStatus).toBe('extra');
  });
  it('same as plan, less is smaller than the plan and needs a plan', () => {
    const s = mealForAnswer('lunch', { kind: 'else', choice: 'less' }, lunch, 'nonveg')!;
    expect(s.calories).toBeLessThan(lunch.kcal);
    expect(s.calories).toBeGreaterThan(lunch.kcal * (LESS_FACTOR - 0.25));
    expect(s.items!.every((i) => i.qty > 0)).toBe(true);
    expect(mealForAnswer('lunch', { kind: 'else', choice: 'less' }, null, 'nonveg')).toBeNull();
  });
  it('snacks only is smaller than the smallest full meal it is based on', () => {
    const t = templateForChoice('snacks', 'dinner', 'nonveg')!;
    const s = mealForAnswer('dinner', { kind: 'else', choice: 'snacks' }, null, 'nonveg')!;
    expect(s.calories).toBeLessThan(t.kcal);
  });
  it('photo is saved by the scanner, not here', () => {
    expect(mealForAnswer('lunch', { kind: 'else', choice: 'photo' }, lunch, 'nonveg')).toBeNull();
  });
});

describe('re-planning after each answer', () => {
  const plan = planDay(input);
  it('a heavy lunch leaves dinner no bigger than before', () => {
    const dinner = plan.meals.find((m) => m.meal === 'dinner')!;
    const heavy = replanRemaining({ ...input, meals: ['dinner'] }, ['dinner'], { kcal: plan.totals.kcal - dinner.kcal + 500, protein: plan.totals.protein - dinner.protein });
    expect(heavy.meals[0].kcal).toBeLessThanOrEqual(dinner.kcal);
  });
  it('a skipped meal is answered: it leaves the remaining list and shows as skipped', () => {
    const logged = [{ id: '1', meal_type: 'Breakfast', plan_status: 'skipped', logged_at: '', description: 'Skipped', calories: 0, protein_g: 0 }];
    expect(remainingSlots(logged)).toEqual(['lunch', 'dinner']);
    expect(slotViews(plan, logged, 9)[0].state).toBe('skipped');
  });
});

describe('dinner reason', () => {
  it('names what ran heavy, what was skipped, what was light', () => {
    expect(dinnerReason([{ slot: 'lunch', kind: 'else', choice: 'biryani', kcal: 900, plannedKcal: 600 }])).toBe('biryani was heavy, dinner is lighter');
    expect(dinnerReason([{ slot: 'breakfast', kind: 'skipped', kcal: 0, plannedKcal: 400 }])).toBe('breakfast was skipped, dinner covers more');
    expect(dinnerReason([{ slot: 'lunch', kind: 'else', choice: 'snacks', kcal: 200, plannedKcal: 600 }])).toBe('lunch was light, dinner makes it up');
    expect(dinnerReason([{ slot: 'lunch', kind: 'planned', kcal: 600, plannedKcal: 600 }])).toBeNull();
  });
  it('stays within 40 characters', () => {
    for (const choice of ['mess_thali', 'biryani', 'snacks'] as const) {
      expect(dinnerReason([{ slot: 'breakfast', kind: 'else', choice, kcal: 1000, plannedKcal: 300 }])!.length).toBeLessThanOrEqual(40);
    }
  });
});

describe('night close reminder and the daily cap', () => {
  const settings = normalizeReminderSettings({});
  const state = (over: Partial<TodayState>): TodayState => ({
    sessionDoneOrSkippedToday: false,
    trainingWeekdays: null,
    todaysSession: 'Push',
    loggedMealTypes: [],
    sleepLoggedToday: true,
    waterMlToday: 0,
    waterTargetMl: 2000,
    ...over,
  });
  const evening = new Date(2026, 10, 5, 19, 0);

  it('schedules one 21:30 night close for today when meals are unanswered', () => {
    const p = planReminders(settings, state({ unansweredMeals: 2 }), evening, 1);
    const close = p.find((r) => r.routeType === 'catchup')!;
    expect(close.date.getHours()).toBe(21);
    expect(close.date.getMinutes()).toBe(30);
    expect(close.title).toBe('Close your day in 10 seconds');
  });
  it('schedules none when every meal has an answer or the time has passed', () => {
    expect(planReminders(settings, state({ unansweredMeals: 0 }), evening, 1).some((r) => r.routeType === 'catchup')).toBe(false);
    expect(planReminders(settings, state({ unansweredMeals: 2 }), new Date(2026, 10, 5, 22, 0), 1).some((r) => r.routeType === 'catchup')).toBe(false);
  });
  it('never schedules more than 2 reminders a day, and the night close keeps its place', () => {
    const all = normalizeReminderSettings({
      water: { enabled: true, hour: 20, minute: 0 },
      workout: { enabled: true, hour: 20, minute: 15 },
      meals: { enabled: true, hour: 20, minute: 30 },
      sleep: { enabled: true, hour: 20, minute: 45 },
    });
    const p = planReminders(all, state({ unansweredMeals: 3, sleepLoggedToday: false }), new Date(2026, 10, 5, 19, 0), 3);
    const byDay = new Map<string, number>();
    for (const r of p) byDay.set(r.date.toDateString(), (byDay.get(r.date.toDateString()) ?? 0) + 1);
    expect(Math.max(...byDay.values())).toBeLessThanOrEqual(2);
    expect(p.filter((r) => r.date.getDate() === 5).some((r) => r.routeType === 'catchup')).toBe(true);
  });
  it('the meals reminder now defaults to breakfast time', () => {
    expect(DEFAULT_REMINDER_SETTINGS.meals).toEqual({ enabled: true, hour: 8, minute: 30 });
  });
});
