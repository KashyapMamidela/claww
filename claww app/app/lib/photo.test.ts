import { describe, expect, it } from 'vitest';
import { PLATE_EDGE_PX, pickPictureSize, targetSize } from './photo';

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

describe('pickPictureSize', () => {
  it('takes the biggest size whose long edge is at most 1,280', () => {
    expect(pickPictureSize(['640x480', '1280x960', '1920x1080', '4000x3000'])).toBe('1280x960');
    expect(pickPictureSize(['4000x3000', '1280x720', '960x720'])).toBe('1280x720');
  });
  it('falls back to the smallest when all are bigger, and to nothing when there is no list', () => {
    expect(pickPictureSize(['4000x3000', '3264x2448'])).toBe('3264x2448');
    expect(pickPictureSize([])).toBeUndefined();
    expect(pickPictureSize(['auto'])).toBeUndefined();
  });
});
