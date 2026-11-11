// Which questions to ask after a scan. A photo cannot see oil or portion, but asking everything every time is tiresome, so:
//  - oil is asked only when the plate has cooked food (a salad, fruit, a drink or boiled food needs no oil question, and gets
//    "no oil" without asking);
//  - each question can be switched off in Settings, and then the usual answer (from habit) is used;
//  - a "Change" link brings every question back for one scan.
// Pure, so it is tested.

import type { ScanItem } from './engine';

export interface QuestionPrefs {
  place: boolean;
  oil: boolean;
  portion: boolean;
}

export const DEFAULT_PREFS: QuestionPrefs = { place: true, oil: true, portion: true };

export function parsePrefs(raw: string | null): QuestionPrefs {
  if (!raw) return DEFAULT_PREFS;
  try {
    const o = JSON.parse(raw) as Partial<QuestionPrefs>;
    return { place: o.place !== false, oil: o.oil !== false, portion: o.portion !== false };
  } catch {
    return DEFAULT_PREFS;
  }
}

/** Dishes that are made without cooking oil: drinks, curd and fruit dishes, boiled food, plain breads and rice. */
const NO_OIL_DISH = /\b(boiled|chai|tea|coffee|lassi|buttermilk|shake|juice|raita|curd|fruit|salad|papad|sprouts|water|milk|porridge|whey|rice, cooked|roti|idli|payasam|kheer|halwa)\b/i;

/** Words in a name the database did not know that say the food was cooked in oil. */
const COOKED_WORD = /(fried|fry|curry|gravy|masala|sabzi|roast|tadka|biryani|pulao|paratha|dosa|poori|puri|bhaji|korma|tikka|pakora|vada|samosa|noodles)/i;

/** True when this plate may carry cooking oil the photo cannot show: any cooked dish, or an unknown name that sounds cooked. */
export function needsOil(items: ScanItem[]): boolean {
  const shown = items.filter((i) => !i.hidden);
  if (shown.length === 0) return true;
  return shown.some((i) => {
    if (i.food) return i.food.kind === 'dish' && !NO_OIL_DISH.test(i.food.name);
    return COOKED_WORD.test(i.heard);
  });
}

export interface ShownRows {
  place: boolean;
  oil: boolean;
  portion: boolean;
}

/** The rows to show. `oilKnown` is false while the plate is still being read (the oil row stays until we know). */
export function rowsFor(prefs: QuestionPrefs, oilNeeded: boolean, expanded: boolean): ShownRows {
  if (expanded) return { place: true, oil: true, portion: true };
  return { place: prefs.place, oil: prefs.oil && oilNeeded, portion: prefs.portion };
}
