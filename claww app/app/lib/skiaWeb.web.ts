/** Web-only implementation — see skiaWeb.ts for why this is a separate
 * file rather than a runtime Platform.OS check. Cached as a module-level
 * singleton so every ProgressRing instance awaits the same one load. */
let loadPromise: Promise<void> | null = null;

export function ensureSkiaWebLoaded(): Promise<void> {
  if (!loadPromise) {
    loadPromise = import('@shopify/react-native-skia/lib/module/web')
      .then(({ LoadSkiaWeb }) => LoadSkiaWeb())
      .catch(() => {});
  }
  return loadPromise;
}
