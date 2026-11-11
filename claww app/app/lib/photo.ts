// A plate photo is sent to the scanner and stored, so it is shrunk first: about 1,024 px on the long edge at JPEG 0.6 is
// roughly 100 to 200 KB instead of 500 KB to a few MB. The models see every food at that size; the upload (the slowest
// part on mobile data in the first live scans) is several times quicker. If the resize module is missing (an older
// dev build) or fails, the original photo is used, so nothing breaks.

export interface PlatePhoto {
  uri: string;
  base64: string;
  mime: string;
}

export const PLATE_EDGE_PX = 1024;

/** The size to resize to, keeping the aspect ratio; null when the photo is already small enough. */
export function targetSize(width: number, height: number, edge = PLATE_EDGE_PX): { width: number; height: number } | null {
  const long = Math.max(width, height);
  if (!(long > edge) || !(width > 0) || !(height > 0)) return null;
  const k = edge / long;
  return { width: Math.round(width * k), height: Math.round(height * k) };
}

export async function shrinkPhoto(photo: PlatePhoto, width?: number, height?: number): Promise<PlatePhoto> {
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const M = require('expo-image-manipulator') as typeof import('expo-image-manipulator');
    const size = width && height ? targetSize(width, height) : { width: PLATE_EDGE_PX, height: undefined };
    if (!size) return photo;
    const out = await M.manipulateAsync(photo.uri, [{ resize: size.height ? { width: size.width, height: size.height } : { width: size.width } }], {
      compress: 0.6,
      format: M.SaveFormat.JPEG,
      base64: true,
    });
    if (!out.base64) return photo;
    return { uri: out.uri, base64: out.base64, mime: 'image/jpeg' };
  } catch {
    return photo;
  }
}
