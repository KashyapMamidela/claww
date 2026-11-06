import { describe, expect, it } from 'vitest';
import { ADD_ONS, MEAL_TEMPLATES, planDay } from './engine';
import { eatenTotals, planLine, remainingSlots, slotViews, upNextSlot } from './mealPlanView';
import { itemsText, plannedToMeal } from './mealPlanMeal';

const plan = planDay({
  target: { kcal: 2200, protein: 120 },
  resources: { sources: ['home'], cookWith: ['stove'], diet: 'nonveg', availability: {}, avoid: [], style: 'varied' },
  date: '2026-11-04',
  seed: 's',
  history: [],
  templates: MEAL_TEMPLATES,
  addOns: ADD_ONS,
});
const log = (meal: string, status: string | null = null) => ({ id: meal, meal_type: meal, plan_status: status, logged_at: new Date(2026, 10, 4, 9).toISOString(), description: meal, calories: 400, protein_g: 20 });

describe('meal plan view', () => {
  it('up next follows the clock and what is logged', () => {
    expect(upNextSlot([], 8)).toBe('breakfast');
    expect(upNextSlot([log('breakfast')], 8)).toBe('lunch');
    expect(upNextSlot([log('breakfast')], 13)).toBe('lunch');
    expect(upNextSlot([log('breakfast'), log('lunch')], 14)).toBe('dinner');
    expect(upNextSlot([log('breakfast'), log('lunch'), log('dinner')], 20)).toBeNull();
  });
  it('slot states: as planned, swapped, up next, later', () => {
    expect(slotViews(plan, [log('breakfast', 'as_planned'), log('lunch', 'swapped')], 19).map((v) => v.state)).toEqual(['as_planned', 'swapped', 'up_next']);
    expect(slotViews(plan, [], 8).map((v) => v.state)).toEqual(['up_next', 'later', 'later']);
    expect(slotViews(null, [], 8).map((v) => v.state)).toEqual(['up_next', 'unplanned', 'unplanned']);
    expect(slotViews(plan, [log('lunch', null)], 8)[1].state).toBe('swapped');
    expect(slotViews(null, [log('lunch', null)], 8)[1].state).toBe('extra');
  });
  it('remaining meals and what was eaten', () => {
    expect(remainingSlots([log('breakfast')])).toEqual(['lunch', 'dinner']);
    expect(eatenTotals([log('breakfast'), log('lunch')])).toEqual({ kcal: 800, protein: 40 });
  });
  it('the plan line says it fits or what is short', () => {
    expect(planLine({ ...plan, ok: true })).toContain('kcal');
    expect(planLine({ ...plan, ok: false, shortfall: { kcalGap: 0, proteinGapG: 20, fix: null } })).toContain('20 g protein short');
  });
});

describe('"Ate as planned"', () => {
  it('writes the template items and its micronutrients, all from the database', () => {
    const first = plan.meals[0];
    const m = plannedToMeal(first);
    expect(m.planStatus).toBe('as_planned');
    expect(m.calories).toBe(first.kcal);
    expect(m.items).toHaveLength(first.items.length);
    expect(m.nutrients.sodiumMg === null || typeof m.nutrients.sodiumMg === 'number').toBe(true);
    expect(itemsText(first).length).toBeGreaterThan(5);
  });

  // Polish step 1: a meal whose window passed with no answer is missed, and keeps its card.
  it('marks an unlogged breakfast as missed at 13:10 while lunch is up next', () => {
    expect(slotViews(plan, [], 13).map((v) => v.state)).toEqual(['missed', 'up_next', 'later']);
  });
  it('a skipped breakfast is no longer missed', () => {
    expect(slotViews(plan, [log('breakfast', 'skipped')], 13).map((v) => v.state)).toEqual(['skipped', 'up_next', 'later']);
  });
  it('dinner is never missed, and a logged lunch leaves dinner up next in the afternoon', () => {
    expect(slotViews(plan, [log('breakfast', 'as_planned'), log('lunch', 'as_planned')], 23)[2].state).toBe('up_next');
    expect(slotViews(plan, [], 17).map((v) => v.state)).toEqual(['missed', 'missed', 'up_next']);
  });
});
