import { describe, expect, it } from 'vitest';
import { adaptiveSummary, isRestDay } from './adaptiveSummary';

const labels = ['Monday', 'Wednesday', 'Saturday'];
const FRI = new Date(2026, 9, 9, 10); // Friday 9 Oct 2026, a rest day on this plan
const WED = new Date(2026, 9, 7, 10);

describe('adaptive card summary', () => {
  it('says rest day and names the next session, with nothing about changes', () => {
    expect(isRestDay(labels, FRI)).toBe(true);
    const s = adaptiveSummary({ dayLabels: labels, focus: 'Full body', dayLabel: 'Saturday', changed: 2, answered: 1, now: FRI });
    expect(s).toBe('Rest day · next is Full body on Saturday');
    expect(s).not.toMatch(/change/);
  });
  it('on a training day keeps the changes line', () => {
    expect(adaptiveSummary({ dayLabels: labels, focus: 'Pull', dayLabel: 'Wednesday', changed: 0, answered: 0, now: WED })).toBe('Pull today · plan as written');
    expect(adaptiveSummary({ dayLabels: labels, focus: 'Pull', dayLabel: 'Wednesday', changed: 1, answered: 1, now: WED })).toBe('Pull today · 1 change from your plan · check-in saved');
  });
  it('a Day 1 / Day 2 plan has no rest days to name', () => {
    expect(isRestDay(['Day 1', 'Day 2'], FRI)).toBe(false);
  });
});
