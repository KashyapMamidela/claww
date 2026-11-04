// NG PHASE 6: "Gaps your plan works around" on step 3. Each gap names a real shortfall in what the user said they
// can get and the plain-words fix the plan will use, with a Change link back to the step that fixes it.
// Rule-based, never generated. Pure.

import { FOOD_ROWS, visibleFoods, type AvailabilityMap, type Cook, type Diet, type FoodKey, type Source } from './resourceDefaults';

export interface ResourceGap {
  id: string;
  title: string;
  /** Shown handwritten after an arrow, for example "eggs and soya on the kettle". */
  fix: string;
  /** Which setup step Change returns to. */
  step: 1 | 2;
}

export interface GapInput {
  sources: Source[];
  cookWith: Cook[];
  diet: Diet | null;
  availability: AvailabilityMap;
}

const WORD: Record<FoodKey, string> = {
  eggs: 'eggs', paneer: 'paneer', chicken: 'chicken', soya: 'soya', dal: 'dal', curd: 'curd',
  milk: 'milk', peanuts: 'peanuts', banana: 'banana', sprouts: 'sprouts', oats: 'oats', whey: 'whey',
};

function list(items: string[]): string {
  if (items.length <= 1) return items.join('');
  return `${items.slice(0, -1).join(', ')} and ${items[items.length - 1]}`;
}

export function resourceGaps(input: GapInput): ResourceGap[] {
  const { sources, cookWith, diet, availability: a } = input;
  const gaps: ResourceGap[] = [];
  const ok = (k: FoodKey) => a[k] !== 'no';
  const hasStove = cookWith.includes('full_kitchen') || cookWith.includes('stove');
  const canHeat = cookWith.some((c) => c !== 'none');
  const fixed = sources.includes('mess') || sources.includes('pg_tiffin');
  const visible = new Set(visibleFoods(diet));

  if (sources.length > 0 && !hasStove && !sources.includes('home')) {
    const quick = (['eggs', 'soya'] as FoodKey[]).filter((k) => visible.has(k) && ok(k));
    if (quick.length > 0 && cookWith.includes('kettle')) {
      gaps.push({ id: 'no_stove', title: 'No stove', fix: `${list(quick.map((k) => WORD[k]))} on the kettle`, step: 1 });
    } else if (canHeat) {
      gaps.push({ id: 'no_stove', title: 'No stove', fix: 'meals that need only a microwave or rice cooker', step: 1 });
    } else {
      const ready = (['curd', 'peanuts', 'banana'] as FoodKey[]).filter(ok).map((k) => WORD[k]);
      gaps.push({ id: 'no_kitchen', title: 'No way to cook', fix: `ready-to-eat food: ${list(ready) || 'whatever you can buy'}`, step: 1 });
    }
  }

  if (fixed) {
    const add = (['eggs', 'soya', 'paneer', 'chicken', 'curd'] as FoodKey[]).filter((k) => visible.has(k) && ok(k));
    gaps.push({
      id: 'fixed_meal_protein',
      title: sources.includes('mess') ? 'Mess dinner low in protein' : 'Tiffin meals low in protein',
      fix: add.length > 0 ? `${WORD[add[0]]} added at dinner` : 'ask for extra dal at dinner',
      step: 2,
    });
  }

  if (diet === 'nonveg' && !ok('chicken')) {
    const swap = (['eggs', 'paneer', 'soya'] as FoodKey[]).filter(ok).map((k) => WORD[k]);
    gaps.push({ id: 'no_chicken', title: 'No chicken', fix: `${list(swap) || 'dal and curd'} for protein`, step: 2 });
  }

  if (!ok('whey')) {
    const snacks = (['curd', 'peanuts'] as FoodKey[]).filter(ok).map((k) => WORD[k]);
    if (snacks.length > 0) gaps.push({ id: 'no_whey', title: 'No whey', fix: `${snacks.join(' + ')} as snacks`, step: 2 });
  }

  const protein = FOOD_ROWS.filter((r) => r.group === 'protein' && visible.has(r.key)).map((r) => r.key);
  if (protein.filter(ok).length < 2) {
    gaps.push({ id: 'few_protein', title: 'Few protein options', fix: 'soya chunks and dal give the most protein per rupee', step: 2 });
  }
  return gaps;
}
