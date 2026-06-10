import sharp from 'sharp'

// Kontext [pro] effective working resolution ceiling.
// Sending larger inputs wastes bandwidth without quality benefit.
const KONTEXT_MAX_EDGE = 1568

/**
 * Normalise an upload buffer before it is stored as the generation source:
 * - Bake EXIF orientation into pixel data (prevents sideways outputs on all
 *   camera-shot JPEGs, not just HEIC)
 * - Resize to KONTEXT_MAX_EDGE on the long side (no enlargement)
 * - Re-encode as JPEG with 4:4:4 chroma subsampling (preserves label/logo
 *   colour edges) and mozjpeg compression
 * - Strip all EXIF metadata including GPS (sharp strips EXIF by default when
 *   re-encoding; verify this is the case with your sharp version)
 */
export async function preprocessForGeneration(buffer: Buffer): Promise<Buffer> {
  return sharp(buffer)
    .rotate()                                   // bake EXIF orientation — ALWAYS
    .resize(KONTEXT_MAX_EDGE, KONTEXT_MAX_EDGE, {
      fit: 'inside',
      withoutEnlargement: true,
      kernel: 'lanczos3',
    })
    .jpeg({
      quality: 92,
      chromaSubsampling: '4:4:4',
      mozjpeg: true,
    })
    .toBuffer()
}

/**
 * Pad an image buffer to a target aspect ratio with a neutral background so
 * Kontext outpaints the padding while the product's pixel geometry stays
 * fixed. Only used when the requested generation ratio differs significantly
 * from the source image ratio.
 *
 * targetRatio: width / height  (e.g. 9/16 = 0.5625)
 */
export async function padToAspect(buffer: Buffer, targetRatio: number): Promise<Buffer> {
  const meta = await sharp(buffer).metadata()
  const w = meta.width ?? 0
  const h = meta.height ?? 0
  if (!w || !h) return buffer
  const current = w / h
  if (Math.abs(current - targetRatio) < 0.01) return buffer

  const targetW = current < targetRatio ? Math.round(h * targetRatio) : w
  const targetH = current < targetRatio ? h : Math.round(w / targetRatio)

  const padTop = Math.round((targetH - h) / 2)
  const padBottom = targetH - h - padTop
  const padLeft = Math.round((targetW - w) / 2)
  const padRight = targetW - w - padLeft

  return sharp(buffer)
    .extend({
      top: padTop,
      bottom: padBottom,
      left: padLeft,
      right: padRight,
      background: { r: 245, g: 245, b: 245, alpha: 1 },
    })
    .jpeg({ quality: 92 })
    .toBuffer()
}
