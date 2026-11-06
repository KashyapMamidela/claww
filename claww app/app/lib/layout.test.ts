import { describe, expect, it } from 'vitest';
import { SESSION_BAR_CLEARANCE, tabBottomPad } from './layout';
import { TAB_BAR_CONTENT_HEIGHT } from './theme';

describe('tabBottomPad', () => {
  it('clears the tab bar plus the screen extra, with at least 20 for the home indicator', () => {
    expect(tabBottomPad(0, 28, false)).toBe(20 + TAB_BAR_CONTENT_HEIGHT + 28);
    expect(tabBottomPad(34, 28, false)).toBe(34 + TAB_BAR_CONTENT_HEIGHT + 28);
  });
  it('adds room for the minimized session bar while a workout runs', () => {
    expect(tabBottomPad(34, 28, true) - tabBottomPad(34, 28, false)).toBe(SESSION_BAR_CLEARANCE);
  });
});
