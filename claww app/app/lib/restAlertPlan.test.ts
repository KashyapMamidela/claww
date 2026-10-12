import { describe, expect, it } from 'vitest';
import { restAlertAction } from './restAlertPlan';

const base = { appState: 'background', resting: true, paused: false, restEndsAt: 2_000, now: 1_000 };

describe('restAlertAction', () => {
  it('schedules while backgrounded with rest time left', () => {
    expect(restAlertAction(base)).toBe('schedule');
    expect(restAlertAction({ ...base, appState: 'inactive' })).toBe('schedule');
  });

  it('cancels in the foreground', () => {
    expect(restAlertAction({ ...base, appState: 'active' })).toBe('cancel');
  });

  it('cancels when not resting, paused, or without an end time', () => {
    expect(restAlertAction({ ...base, resting: false })).toBe('cancel');
    expect(restAlertAction({ ...base, paused: true })).toBe('cancel');
    expect(restAlertAction({ ...base, restEndsAt: null })).toBe('cancel');
  });

  it('cancels once the rest is already over', () => {
    expect(restAlertAction({ ...base, now: 2_000 })).toBe('cancel');
  });
});
