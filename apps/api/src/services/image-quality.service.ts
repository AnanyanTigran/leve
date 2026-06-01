import sharp from 'sharp'

// Non-blocking quality hints surfaced to the FE so the user can be warned
// before they spend a generation on a low-quality source photo. These are
// hints only — the upload still proceeds. Generation quality on bad input is
// the most common "LEVE failed me" complaint per the audit.

export type QualityWarning =
  | 'too_dark'         // mean luminance < DARK_MEAN
  | 'too_bright'       // mean luminance > BRIGHT_MEAN OR > BRIGHT_PIXEL_PCT % at 255
  | 'low_contrast'     // luminance stddev below LOW_VARIANCE — likely flat/blurry

const DARK_MEAN = 60
const BRIGHT_MEAN = 220
const LOW_VARIANCE = 18

export async function probeImageQuality(buffer: Buffer): Promise<QualityWarning | null> {
  let stats: sharp.Stats
  try {
    stats = await sharp(buffer).stats()
  } catch {
    // Probe is best-effort — failures fall back to "no warning" so the upload
    // is never blocked by a probe error.
    return null
  }

  // sharp returns per-channel stats; collapse to an approximate luminance via
  // the standard ITU-R BT.601 weights when we have at least 3 channels, else
  // fall back to channel 0.
  const ch = stats.channels
  const mean =
    ch.length >= 3
      ? 0.299 * ch[0].mean + 0.587 * ch[1].mean + 0.114 * ch[2].mean
      : ch[0]?.mean ?? 128

  const stdev =
    ch.length >= 3
      ? 0.299 * ch[0].stdev + 0.587 * ch[1].stdev + 0.114 * ch[2].stdev
      : ch[0]?.stdev ?? 0

  if (mean < DARK_MEAN) return 'too_dark'
  if (mean > BRIGHT_MEAN) return 'too_bright'
  if (stdev < LOW_VARIANCE) return 'low_contrast'
  return null
}
