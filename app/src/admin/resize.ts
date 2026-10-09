/**
 * Shrinks a photo in the browser before it's uploaded: longest side at most `max` pixels, saved as a JPEG.
 * Phone photos go from several MB to about 150–250 KB, so the site stays fast.
 */
export async function resizePhoto(file: File, max = 1600, quality = 0.8): Promise<Blob> {
  const bitmap = await createImageBitmap(file, { imageOrientation: "from-image" }).catch(() => {
    throw new Error(`Couldn't read "${file.name}". Try a JPG or PNG (iPhone HEIC photos may need converting).`);
  });
  const scale = Math.min(1, max / Math.max(bitmap.width, bitmap.height));
  const canvas = document.createElement("canvas");
  canvas.width = Math.round(bitmap.width * scale);
  canvas.height = Math.round(bitmap.height * scale);
  canvas.getContext("2d")!.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  bitmap.close();
  return new Promise((resolve, reject) =>
    canvas.toBlob((b) => (b ? resolve(b) : reject(new Error("Couldn't process the photo."))), "image/jpeg", quality));
}
