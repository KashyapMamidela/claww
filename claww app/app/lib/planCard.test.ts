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
    const c = planCard({ ...base, daysPerWeek: 6, trainingMonths: 1, split: 'BRO' });
    expect(c.days).toBe(5);
    expect(c.title).toMatch(/^Body-part split/);
    expect(c.nearest).toMatch(/Nearest/);
  });
  it('follows the chosen style and says so in the title', () => {
    expect(planCard({ ...base, split: 'PPL', daysPerWeek: 6, trainingMonths: 0 }).title).toBe('Push / Pull / Legs · gym');
    expect(planCard({ ...base, split: 'FB', daysPerWeek: 3 }).title).toBe('Full body · gym');
    expect(planCard({ ...base, split: 'BRO', daysPerWeek: 5 }).title).toBe('Body-part split · gym');
  });
  it('an easy week is shorter than a hard one', () => {
    const easy = planCard({ ...base, sessionMinutes: 90, intensity: 'easy' });
    const hard = planCard({ ...base, sessionMinutes: 90, intensity: 'hard' });
    expect(easy.minutes).toBeLessThan(hard.minutes);
  });
  it('strength and general goals map to their own plans', () => {
    expect(planCard({ ...base, goal: 'strength', daysPerWeek: 3 }).blueprintId).toBe('strength-gym-3d');
    expect(planCard({ ...base, goal: 'maintenance', daysPerWeek: 2 }).blueprintId).toBe('general-gym-2d');
  });
});
