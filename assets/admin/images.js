// Admin panel — photo preparation, in the browser: decode, fix the phone's rotation, scale to
// 1600 / 800 / 400 px (longest side, never enlarged) and encode as WebP (JPEG where the browser
// can't encode WebP). Storing only small files keeps the shop fast on mobile data.

import { PHOTO_WIDTHS, fitSize } from './logic.js';

export const MAX_INPUT_BYTES = 20 * 1024 * 1024;

const toBlob = (canvas, type, quality) => new Promise((resolve) => canvas.toBlob(resolve, type, quality));

async function decode(file) {
  if (typeof createImageBitmap === 'function') {
    try {
      return await createImageBitmap(file, { imageOrientation: 'from-image' });
    } catch { /* fall through to <img> */ }
  }
  const url = URL.createObjectURL(file);
  try {
    const img = new Image();
    img.decoding = 'async';
    img.src = url;
    await img.decode();
    return img;
  } finally {
    URL.revokeObjectURL(url);
  }
}

// -> [{ width, blob, ext }] largest first
export async function processImage(file) {
  if (!file || !/^image\//.test(file.type || '')) throw new Error('not_image');
  if (file.size > MAX_INPUT_BYTES) throw new Error('too_big');
  const src = await decode(file);
  const sw = src.naturalWidth || src.width;
  const sh = src.naturalHeight || src.height;
  if (!sw || !sh) throw new Error('not_image');

  const out = [];
  let ext = 'webp';
  for (const max of PHOTO_WIDTHS) {
    const { w, h } = fitSize(sw, sh, max);
    const canvas = document.createElement('canvas');
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext('2d');
    ctx.imageSmoothingQuality = 'high';
    ctx.drawImage(src, 0, 0, w, h);
    let blob = ext === 'webp' ? await toBlob(canvas, 'image/webp', 0.82) : null;
    if (!blob || blob.type !== 'image/webp') {
      ext = 'jpg';
      blob = await toBlob(canvas, 'image/jpeg', 0.86);
    }
    out.push({ width: max, blob, ext });
  }
  if (src.close) src.close();
  // every size must share one extension (the stored path names the 1600 file; the others sit beside it)
  if (out.some((o) => o.ext !== ext)) {
    for (const o of out) o.ext = ext;
  }
  return out;
}
