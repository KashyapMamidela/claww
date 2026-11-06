// Polish step 1, item 7: tell a plan made by the old (pre NG PHASE 5, model-written) builder from one made by the
// blueprint builder. New plans carry `blueprint_id`; old ones have it null. When the column is not applied yet the key is
// absent, and then we cannot tell, so no card is shown.

export const OLD_PLAN_CARD_KEY = 'claww.oldPlanCard.dismissed';

export function isOldBuilderPlan(workout: { blueprint_id?: string | null } | null | undefined): boolean {
  return !!workout && Object.prototype.hasOwnProperty.call(workout, 'blueprint_id') && workout.blueprint_id === null;
}

/** Whether to show "Your plan was made with the old builder": an old plan the user has not dismissed for this plan id. */
export function showOldPlanCard(workout: { id: string; blueprint_id?: string | null } | null | undefined, dismissedId: string | null): boolean {
  return isOldBuilderPlan(workout) && workout!.id !== dismissedId;
}
