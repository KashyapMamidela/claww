import { Platform } from 'react-native';
import { EMPTY_SNAPSHOT, sameSnapshot, type WidgetSnapshot } from './widgetSnapshot';

// Premium F2: Home (and the water row) call this with what changed. Android only; on iOS, web and builds without the
// native module it does nothing. The widgets redraw only when what they show has changed. Several callers each send their
// own fields, so the pieces are merged into one snapshot.

let current: WidgetSnapshot | null = null;
let chain: Promise<void> = Promise.resolve();

export function syncWidget(patch: Partial<Omit<WidgetSnapshot, 'updatedAt'>>): Promise<void> {
  if (Platform.OS !== 'android') return Promise.resolve();
  chain = chain.then(async () => {
    try {
      const { readSnapshot, writeSnapshot, redrawAll } = require('../widgets/widgetTaskHandler');
      const base: WidgetSnapshot = current ?? (await readSnapshot());
      const next: WidgetSnapshot = { ...EMPTY_SNAPSHOT, ...base, ...patch, updatedAt: Date.now() };
      if (current && sameSnapshot(current, next)) return;
      current = next;
      await writeSnapshot(next);
      await redrawAll(next);
    } catch (e) {
      // No native module in this build, or no widget on the home screen: nothing to do.
      if (__DEV__) console.log('[widget] not updated:', (e as Error)?.message);
    }
  });
  return chain;
}
