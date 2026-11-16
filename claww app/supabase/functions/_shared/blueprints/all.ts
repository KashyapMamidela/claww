// Every blueprint the planner can pick: the reviewed JSON ones (generated into index.ts) and the training styles
// (splits.ts). One list, so the Edge Function, the app and the tests all see the same set.

import type { Blueprint } from './schema.ts';
import { BLUEPRINTS } from './index.ts';
import { SPLIT_BLUEPRINTS } from './splits.ts';

export const ALL_BLUEPRINTS: Blueprint[] = [...BLUEPRINTS, ...SPLIT_BLUEPRINTS];
