/** A rectangle in the photo's own pixels. */
export interface Crop { x: number; y: number; w: number; h: number }

/** Opens a photo (from your device or a web address) so it can be cropped. Phone photos come out the right way up. */
export async function loadPhoto(source: Blob | string): Promise<ImageBitmap> {
  const blob = typeof source === "string" ? await (await fetch(source)).blob() : source;
  return createImageBitmap(blob, { imageOrientation: "from-image" }).catch(() => {
    const name = source instanceof File ? `"${source.name}"` : "the photo";
    throw new Error(`Couldn't read ${name}. Try a JPG or PNG (iPhone HEIC photos may need converting).`);
  });
}

/**
 * Cuts out `crop` and shrinks it so the longest side is at most `max` pixels, saved as a JPEG.
 * Phone photos go from several MB to about 150–250 KB, so the site stays fast.
 */
export function cropToJpeg(img: ImageBitmap, crop: Crop, max = 1600, quality = 0.82): Promise<Blob> {
  const scale = Math.min(1, max / Math.max(crop.w, crop.h));
  const canvas = document.createElement("canvas");
  canvas.width = Math.max(1, Math.round(crop.w * scale));
  canvas.height = Math.max(1, Math.round(crop.h * scale));
  const ctx = canvas.getContext("2d")!;
  ctx.imageSmoothingQuality = "high";
  ctx.drawImage(img, crop.x, crop.y, crop.w, crop.h, 0, 0, canvas.width, canvas.height);
  return new Promise((resolve, reject) =>
    canvas.toBlob((b) => (b ? resolve(b) : reject(new Error("Couldn't process the photo."))), "image/jpeg", quality));
}
