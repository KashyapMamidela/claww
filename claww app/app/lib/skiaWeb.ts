/**
 * Native (iOS/Android) default: CanvasKit is linked in-process by
 * @shopify/react-native-skia's native module, so there's nothing to load.
 * The real work happens in skiaWeb.web.ts, which Metro picks instead of
 * this file when bundling for web — deliberately a separate file rather
 * than a `Platform.OS === 'web'` runtime check in one shared file, because
 * Metro statically resolves every `import()` target regardless of a
 * runtime guard around it. A runtime-only check here previously pulled
 * canvaskit-wasm (which needs Node's `fs`) into the Android bundle and
 * broke the build with "Unable to resolve module fs".
 */
export function ensureSkiaWebLoaded(): Promise<void> {
  return Promise.resolve();
}
