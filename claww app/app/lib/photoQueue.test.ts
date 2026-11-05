import { describe, expect, it } from 'vitest';
import { MAX_PENDING_PHOTOS, MAX_PHOTO_ATTEMPTS, addPhoto, afterAttempts, type PendingPhoto } from './photoQueueLogic';

const photo = (path: string, attempts = 0): PendingPhoto => ({ userId: 'u1', path, base64: 'AAAA', mimeType: 'image/jpeg', attempts });

describe('pending meal photos', () => {
  it('keeps a photo once per path and caps the queue at the newest ones', () => {
    expect(addPhoto([photo('a')], photo('a')).length).toBe(1);
    let list: PendingPhoto[] = [];
    for (let i = 0; i < MAX_PENDING_PHOTOS + 5; i++) list = addPhoto(list, photo(`p${i}`));
    expect(list.length).toBe(MAX_PENDING_PHOTOS);
    expect(list[list.length - 1].path).toBe(`p${MAX_PENDING_PHOTOS + 4}`);
    expect(list.some((p) => p.path === 'p0')).toBe(false);
  });
  it('removes uploaded photos, counts a failed try, and gives up after too many', () => {
    const list = [photo('a'), photo('b'), photo('c', MAX_PHOTO_ATTEMPTS - 1)];
    const next = afterAttempts(list, new Set(['a']), new Set(['b', 'c']));
    expect(next.map((p) => p.path)).toEqual(['b']);
    expect(next[0].attempts).toBe(1);
  });
  it('leaves untouched photos alone (another account, or after the first failure)', () => {
    const next = afterAttempts([photo('a'), photo('b')], new Set(), new Set(['a']));
    expect(next.map((p) => [p.path, p.attempts])).toEqual([['a', 1], ['b', 0]]);
  });
});
