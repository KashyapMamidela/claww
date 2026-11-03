import { describe, expect, it } from 'vitest';
import { ADAPTIVE_CONFIG, restRole, restSecondsFor } from './adaptive';

describe('rest by role (NG PHASE 3.2, user decision 150 / 90 / 60 s)', () => {
  it('uses the decided numbers', () => {
    expect(ADAPTIVE_CONFIG.rest).toEqual({ mainSec: 150, accessorySec: 90, isolationSec: 60 });
  });

  it('main lifts rest 150 s', () => {
    expect(restSecondsFor('main', 'compound')).toBe(150);
  });

  it('strength accessories rest 90 s', () => {
    expect(restSecondsFor('accessory', 'compound')).toBe(90);
  });

  it('isolation and other short work rest 60 s', () => {
    for (const st of ['isolation', 'isometric', 'plyometric', 'conditioning', 'mobility']) {
      expect(restSecondsFor('accessory', st)).toBe(60);
    }
  });

  it('an exercise without catalog data gets the accessory rest', () => {
    expect(restSecondsFor(null, null)).toBe(90);
    expect(restRole(undefined, undefined)).toBe('accessory');
  });

  it('role wins over stimulus for main lifts', () => {
    expect(restRole('main', 'isolation')).toBe('main');
  });
});
