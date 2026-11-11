import { describe, expect, it } from 'vitest';
import { PLATE_EDGE_PX, targetSize } from './photo';

describe('targetSize', () => {
  it('shrinks a phone photo to 1,024 px on the long edge, keeping its shape', () => {
    expect(targetSize(4000, 3000)).toEqual({ width: 1024, height: 768 });
    expect(targetSize(3000, 4000)).toEqual({ width: 768, height: 1024 });
  });
  it('leaves a photo that is already small alone', () => {
    expect(targetSize(1024, 700)).toBeNull();
    expect(targetSize(800, 600)).toBeNull();
  });
  it('ignores sizes that make no sense', () => {
    expect(targetSize(0, 0)).toBeNull();
    expect(PLATE_EDGE_PX).toBe(1024);
  });
});
