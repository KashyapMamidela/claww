import { describe, expect, it } from 'vitest';
import { planCard } from './planCard';

const base = { goal: 'muscle_gain', equipment: 'gym', daysPerWeek: 4, trainingMonths: 12, sessionMinutes: 60, injuries: [] };

describe('planCard', () => {
  it('describes the blueprint generate-plan will use', () => {
    const c = planCard(base);
    expect(c.blueprintId).toBe('muscle-gym-4d');
    expect(c.title).toBe('Upper / Lower · gym');
    expect(c.days).toBe(4);
    expect(c.weeks).toBe(6);
    expect(c.nearest).toBeNull();
    expect(c.repStyle).toBe('6–10 reps, progressive');
  });
  it('caps the minutes at the chosen session length, in steps of 5', () => {
    expect(planCard({ ...base, sessionMinutes: 30 }).minutes).toBeLessThanOrEqual(30);
    expect(planCard({ ...base, sessionMinutes: 75 }).minutes % 5).toBe(0);
  });
  it('says so when it is the nearest plan', () => {
    const c = planCard({ ...base, daysPerWeek: 6, trainingMonths: 1 });
    expect(c.days).toBeLessThan(6);
    expect(c.nearest).toMatch(/Nearest/);
  });
  it('strength and general goals map to their own plans', () => {
    expect(planCard({ ...base, goal: 'strength', daysPerWeek: 3 }).blueprintId).toBe('strength-gym-3d');
    expect(planCard({ ...base, goal: 'maintenance', daysPerWeek: 2 }).blueprintId).toBe('general-gym-2d');
  });
});
