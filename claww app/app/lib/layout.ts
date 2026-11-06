// Polish step 1: how far a tab screen's content must stop above the bottom of the screen so the last card clears the
// tab bar, and, while a workout is running, the minimized session bar that floats above it. Pure.

import { TAB_BAR_CONTENT_HEIGHT } from './theme';

/** Height of the minimized workout bar (and a little air) that sits above the tab bar during a session. */
export const SESSION_BAR_CLEARANCE = 84;

export function tabBottomPad(insetsBottom: number, extra: number, sessionActive: boolean): number {
  return Math.max(insetsBottom, 20) + TAB_BAR_CONTENT_HEIGHT + extra + (sessionActive ? SESSION_BAR_CLEARANCE : 0);
}
