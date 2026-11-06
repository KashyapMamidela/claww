import { describe, expect, it } from 'vitest';
import { GOAL_OPTIONS, choiceFromGoal, cleanStyles, equipmentFromStyles, goalOption, isGainWeight, weekPreview } from './onboardingChoices';

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
  it('previews the week the way the board does', () => {
    expect(weekPreview([]).text).toBe('Pick at least one');
    expect(weekPreview(['gym']).text).toBe('4 days of gym');
    const mix = weekPreview(['gym', 'yoga']);
    expect(mix.text).toBe('3 days gym, yoga on the others');
    expect(mix.days).toEqual(['gym', 'yoga', 'gym', null, 'gym', 'yoga', null]);
    expect(weekPreview(['gym', 'yoga', 'mobility']).days[5]).toBe('mobility');
  });
});
