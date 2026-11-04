// NG PHASE 12: the share card is the session hero drawn at 1080 x 1920 (a story-sized image) and handed to the
// system share sheet. These constants and the capture options are pure so the size is tested.

export const SHARE_WIDTH = 1080;
export const SHARE_HEIGHT = 1920;

export interface ShareCaptureOptions {
  format: 'png';
  quality: 1;
  width: number;
  height: number;
  result: 'tmpfile';
}

export function shareCaptureOptions(): ShareCaptureOptions {
  return { format: 'png', quality: 1, width: SHARE_WIDTH, height: SHARE_HEIGHT, result: 'tmpfile' };
}

/** The card is laid out at its real pixel size and shown scaled down on screen. */
export function previewScale(availableWidth: number): number {
  return Math.min(1, Math.max(0.1, availableWidth / SHARE_WIDTH));
}

export function shareFileName(date: Date): string {
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `claww-session-${date.getFullYear()}-${m}-${d}.png`;
}
