import { describe, expect, it } from 'vitest';
import { GOAL_OPTIONS, choiceFromGoal, cleanStyles, cleanWeekdays, equipmentFromStyles, goalOption, isGainWeight, toggleWeekday, weekPreview } from './onboardingChoices';

describe('goal choices', () => {
  it('has the five goals, each mapped to an existing profile goal', () => {
    expect(GOAL_OPTIONS.map((g) => g.title)).toEqual(['Lose fat', 'Gain weight', 'Build muscle', 'Get stronger', 'Stay fit and healthy']);
    expect(GOAL_OPTIONS.map((g) => g.goal)).toEqual(['fat_loss', 'muscle_gain', 'muscle_gain', 'strength', 'maintenance']);
  });
  it('Gain weight is its own choice on top of muscle_gain', () => {
    expect(isGainWeight('gain')).toBe(true);
    expect(isGainWeight('muscle')).toBe(false);
    expect(goalOption('gain')?.goal).toBe('muscle_gain');
  });
  it('maps a stored goal back to a choice', () => {
    expect(choiceFromGoal('fat_loss')).toBe('fat');
    expect(choiceFromGoal('strength')).toBe('strong');
    expect(choiceFromGoal('maintenance')).toBe('fit');
    expect(choiceFromGoal(null)).toBe('muscle');
  });
});

describe('training styles', () => {
  it('picks the place from the styles: gym first, then home, else none', () => {
    expect(equipmentFromStyles(['yoga', 'gym'])).toBe('gym');
    expect(equipmentFromStyles(['calisthenics', 'home'])).toBe('home');
    expect(equipmentFromStyles(['yoga', 'mobility'])).toBe('none');
    expect(equipmentFromStyles(['calisthenics'])).toBe('none');
  });
  it('cleans stored styles', () => {
    expect(cleanStyles(['gym', 'gym', 'swim', 'yoga'])).toEqual(['gym', 'yoga']);
    expect(cleanStyles(null)).toEqual([]);
  });
  it('previews the week from the weekdays picked', () => {
    expect(weekPreview([], [0, 2]).text).toBe('Pick at least one');
    expect(weekPreview(['gym'], []).text).toBe('Pick the days you can train');
    expect(weekPreview(['gym'], [0, 2, 4, 5]).text).toBe('4 days gym');
    const mix = weekPreview(['gym', 'yoga'], [0, 1, 3, 4]);
    expect(mix.text).toBe('3 days gym + 1 day yoga');
    // Sessions land on the weekdays picked, in order; the other days rest.
    expect(mix.days.filter(Boolean)).toHaveLength(4);
    expect(mix.days[2]).toBeNull();
    expect(mix.days[5]).toBeNull();
    expect(mix.days.filter((d) => d === 'yoga')).toHaveLength(1);
  });
  it('keeps between 2 and 6 training days when toggling', () => {
    expect(toggleWeekday([0, 2], 0)).toEqual([0, 2]); // cannot go under 2
    expect(toggleWeekday([0, 2, 4], 2)).toEqual([0, 4]);
    expect(toggleWeekday([0, 1, 2, 3, 4, 5], 6)).toEqual([0, 1, 2, 3, 4, 5]); // cannot go over 6
    expect(toggleWeekday([0, 2], 1)).toEqual([0, 1, 2]);
    expect(cleanWeekdays([4, 4, 9, -1, 'x', 1])).toEqual([1, 4]);
  });
});
