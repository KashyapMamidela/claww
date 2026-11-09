import type { Diet } from './resourceDefaults';

// The food profile lets people list foods to avoid in their own words ("Non vegetarian, Egg"). The meal planner already
// skips any meal that names an avoided word, but the diet itself (and so the "can you get these?" answers and the
// suggested add-ons) must follow it too, or a vegetarian who once ticked "Eggetarian" keeps seeing egg fixes.

const hasAny = (avoid: string[], words: string[]) => avoid.some((a) => words.some((w) => a.includes(w)));

const EGG = ['egg'];
const MEAT = ['non veg', 'non-veg', 'nonveg', 'meat', 'chicken', 'mutton', 'fish', 'prawn', 'seafood', 'beef', 'pork'];

/** The diet to plan with: the saved one, narrowed by what the user says they avoid. Never widens a diet. */
export function effectiveDiet(diet: Diet, avoid: string[]): Diet {
  const noEgg = hasAny(avoid, EGG);
  const noMeat = hasAny(avoid, MEAT);
  if (diet === 'nonveg') {
    if (noMeat && noEgg) return 'veg';
    if (noMeat) return 'egg';
    if (noEgg) return 'nonveg'; // meat eater who skips eggs: the planner's avoid words drop the egg dishes
    return diet;
  }
  if (diet === 'egg' && noEgg) return 'veg';
  return diet;
}

/** Availability that agrees with the effective diet: avoided foods are "no". */
export function effectiveAvailability<T extends Record<string, string>>(availability: T, avoid: string[], diet: Diet): T {
  const out: Record<string, string> = { ...availability };
  if (hasAny(avoid, EGG) || diet === 'veg' || diet === 'vegan' || diet === 'jain') out.eggs = 'no';
  if (hasAny(avoid, MEAT) || diet !== 'nonveg') out.chicken = 'no';
  return out as T;
}
