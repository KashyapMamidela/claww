import { describe, expect, it } from 'vitest';
import { buildRecap, recapShareText } from './recapStory';

const facts = { sessionsDone: 4, sessionsPlanned: 4, proteinDays: 5, mealDays: 6, bestLift: { name: 'Bench press', weightKg: 62.5, reps: 8 }, streakDays: 9 };

describe('buildRecap (Premium F5)', () => {
  it('makes four cards in order when a lift was logged', () => {
    const cards = buildRecap(facts);
    expect(cards.map((c) => c.id)).toEqual(['sessions', 'protein', 'lift', 'streak']);
    expect(cards[0].big).toBe('4 of 4');
    expect(cards[0].line).toBe('Every planned session done.');
    expect(cards[2].big).toBe('62.5');
  });
  it('drops the lift card when nothing was lifted', () => {
    expect(buildRecap({ ...facts, bestLift: null }).map((c) => c.id)).toEqual(['sessions', 'protein', 'streak']);
  });
  it('reads kindly after a quiet week', () => {
    const c = buildRecap({ ...facts, sessionsDone: 0, proteinDays: 0, mealDays: 0, bestLift: null, streakDays: 0 });
    expect(c[0].line).toBe('A quiet week. The plan is still there.');
    expect(c[1].line).toBe('Log your meals and this fills in.');
    expect(c[2].line).toBe('Follow the plan today and it starts.');
  });
  it('shares one line', () => {
    expect(recapShareText(buildRecap(facts))).toContain('4 of 4 sessions');
  });
});
