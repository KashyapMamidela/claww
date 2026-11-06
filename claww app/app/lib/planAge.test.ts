import { describe, expect, it } from 'vitest';
import { isOldBuilderPlan, showOldPlanCard } from './planAge';

describe('old builder plans', () => {
  it('a plan with a null blueprint_id is from the old builder', () => {
    expect(isOldBuilderPlan({ blueprint_id: null })).toBe(true);
  });
  it('a plan with a blueprint is new', () => {
    expect(isOldBuilderPlan({ blueprint_id: 'muscle-gym-4d' })).toBe(false);
  });
  it('when the column is not applied yet (key absent) we cannot tell, so it is not called old', () => {
    expect(isOldBuilderPlan({})).toBe(false);
    expect(isOldBuilderPlan(null)).toBe(false);
  });
  it('the card shows once: not again for the plan the user dismissed, but for a different old plan', () => {
    expect(showOldPlanCard({ id: 'a', blueprint_id: null }, null)).toBe(true);
    expect(showOldPlanCard({ id: 'a', blueprint_id: null }, 'a')).toBe(false);
    expect(showOldPlanCard({ id: 'b', blueprint_id: null }, 'a')).toBe(true);
    expect(showOldPlanCard({ id: 'a', blueprint_id: 'x' }, null)).toBe(false);
  });
});
