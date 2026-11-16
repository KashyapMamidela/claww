/**
 * Active calories per step per kg of body weight. Walking costs about 0.5 kcal per kg per km above resting
 * (ACSM walking equation, net of the resting metabolic rate), and a step is about 0.7 m: 0.5 x 0.0007 = 0.00035.
 * Net, because "Burned" is active energy like Health Connect's; the old 0.0005 was the gross figure and put 6,000 steps
 * at 210 kcal for a 70 kg person, more than a short workout. Now about 147 kcal.
 */
export const KCAL_PER_STEP_PER_KG = 0.00035;
