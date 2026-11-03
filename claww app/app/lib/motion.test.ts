import { describe, expect, it, vi } from 'vitest';

// Reanimated can't load under Vitest; motion.ts only needs these three names from it.
vi.mock('react-native-reanimated', () => ({
  Easing: { bezier: () => (t: number) => t },
  ReduceMotion: { System: 'system' },
  Keyframe: class {
    duration() {
      return this;
    }
    delay() {
      return this;
    }
    reduceMotion() {
      return this;
    }
  },
}));

const { MOTION, riseDelay } = await import('./motion');

describe('motion config', () => {
  it('matches the build plan numbers', () => {
    expect(MOTION.riseDistance).toBe(10);
    expect(MOTION.riseStagger).toBe(40);
    expect(MOTION.ringFillDuration).toBe(1200);
    expect(MOTION.penDrawDuration).toBe(350);
    expect(MOTION.pressScale).toBe(0.96);
  });

  it('staggers cards 40 ms apart', () => {
    expect(riseDelay(0)).toBe(0);
    expect(riseDelay(1)).toBe(40);
    expect(riseDelay(3)).toBe(120);
  });

  it('never makes a long list wait past the eighth card', () => {
    expect(riseDelay(8)).toBe(320);
    expect(riseDelay(50)).toBe(320);
  });

  it('treats bad input as the first card', () => {
    expect(riseDelay(-2)).toBe(0);
    expect(riseDelay(2.7)).toBe(80);
  });
});
