import { beforeEach, describe, expect, it } from 'vitest';
import { draftAvailability, draftBudget, emptyDraft, getDraft, patchDraft, resetDraft, setFood, step1Complete, toggleCook, toggleSource } from './mealSetupDraft';

beforeEach(() => resetDraft());

describe('meal setup draft', () => {
  it('starts empty and incomplete', () => {
    expect(getDraft()).toEqual(emptyDraft());
    expect(step1Complete(getDraft())).toBe(false);
  });
  it('step 1 needs a source, a way to cook (even "nothing") and a diet', () => {
    expect(step1Complete({ ...emptyDraft(), sources: ['mess'], cookWith: ['none'], diet: 'egg' })).toBe(true);
    expect(step1Complete({ ...emptyDraft(), sources: ['mess'], cookWith: ['kettle'] })).toBe(false);
  });
  it('"nothing" and the other cooking options exclude each other', () => {
    expect(toggleCook(['kettle'], 'none')).toEqual(['none']);
    expect(toggleCook(['none'], 'kettle')).toEqual(['kettle']);
    expect(toggleCook(['none'], 'none')).toEqual([]);
    expect(toggleCook(['kettle', 'stove'], 'kettle')).toEqual(['stove']);
  });
  it('sources toggle in and out', () => {
    expect(toggleSource(['mess'], 'outside')).toEqual(['mess', 'outside']);
    expect(toggleSource(['mess', 'outside'], 'mess')).toEqual(['outside']);
  });
  it('hand edits stay when step 1 changes, defaults update for everything else', () => {
    patchDraft({ sources: ['mess'], cookWith: ['kettle'], diet: 'egg' });
    patchDraft(setFood(getDraft(), 'paneer', 'no'));
    expect(draftAvailability(getDraft()).paneer).toBe('no');
    patchDraft({ sources: ['home'], cookWith: ['stove'] });
    const a = draftAvailability(getDraft());
    expect(a.paneer).toBe('no'); // the correction survives
    expect(a.oats).toBe('yes'); // a default that follows the new answers
  });
  it('budget defaults by source until the user changes it', () => {
    patchDraft({ sources: ['mess'] });
    expect(draftBudget(getDraft())).toBe(150);
    patchDraft({ budget: 200 });
    expect(draftBudget(getDraft())).toBe(200);
    patchDraft({ sources: ['home'] });
    expect(draftBudget(getDraft())).toBe(200);
  });
});
