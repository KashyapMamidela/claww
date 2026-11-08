import { describe, expect, it } from 'vitest';
import { penLine } from './penLine';

const base = { sleepHours: null, sessionPlanned: false, sessionDone: false, hour: 10 };

describe('penLine', () => {
  it('celebrates a finished session first', () => {
    expect(penLine({ ...base, sessionPlanned: true, sessionDone: true, sleepHours: 5 })).toBe('session done, eat well tonight');
  });
  it('is gentle after a short night', () => {
    expect(penLine({ ...base, sessionPlanned: true, sleepHours: 5.5 })).toBe('short night, keep today easy');
  });
  it('says well rested on a training day after 7 hours', () => {
    expect(penLine({ ...base, sessionPlanned: true, sleepHours: 8 })).toBe('well rested, make it count');
  });
  it('varies the rest-day line by time of day', () => {
    expect(penLine({ ...base, hour: 10 })).toBe('rest day, a walk helps');
    expect(penLine({ ...base, hour: 20 })).toBe('rest day, bed early tonight');
  });
  it('stays silent on a training day with no sleep logged', () => {
    expect(penLine({ ...base, sessionPlanned: true })).toBeNull();
  });
  it('every line is 40 characters or fewer', () => {
    for (const l of ['session done, eat well tonight', 'short night, keep today easy', 'well rested, make it count', 'rest day, a walk helps', 'rest day, bed early tonight']) expect(l.length).toBeLessThanOrEqual(40);
  });
});
