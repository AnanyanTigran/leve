import sharp from 'sharp'
import { uploadToS3, buildS3Key } from '../lib/s3'
import { downloadFromS3 } from '../lib/cloudfront'

export interface PlatformSpec {
  width: number
  height: number
}

export const SERVER_PLATFORM_SPECS: Record<string, PlatformSpec> = {
  instagram_feed:  { width: 1080, height: 1080 },
  instagram_story: { width: 1080, height: 1920 },
  facebook_post:   { width: 1200, height: 630  },
  wildberries:     { width: 900,  height: 1200 },
  ozon:            { width: 1000, height: 1000 },
  telegram:        { width: 1080, height: 1080 },
  list_am:         { width: 1200, height: 900  },
  original_hd:     { width: 0,    height: 0    },
}

// User-defined crop, sent from the FE as fractions of the source image
// (top-left origin). When omitted the image is center-cropped (`fit: 'cover'`)
// to the target ratio. The export never pads — the product always fills the
// frame, on every platform and every path.
export interface CropRegion {
  x: number
  y: number
  width: number
  height: number
}

function isValidCrop(c: CropRegion | undefined): c is CropRegion {
  if (!c) return false
  if (c.width <= 0 || c.height <= 0) return false
  if (c.x < 0 || c.y < 0) return false
  if (c.x + c.width > 1.0001 || c.y + c.height > 1.0001) return false
  return true
}

// Apply a user crop to the source buffer up front so the rest of the pipeline
// (resize / pad / overlay) sees the chosen region as if it were the original.
async function applyUserCrop(buffer: Buffer, crop: CropRegion): Promise<Buffer> {
  const meta = await sharp(buffer).metadata()
  const srcW = meta.width ?? 0
  const srcH = meta.height ?? 0
  if (srcW <= 0 || srcH <= 0) return buffer

  const left = Math.max(0, Math.min(srcW - 1, Math.round(crop.x * srcW)))
  const top = Math.max(0, Math.min(srcH - 1, Math.round(crop.y * srcH)))
  const width = Math.max(1, Math.min(srcW - left, Math.round(crop.width * srcW)))
  const height = Math.max(1, Math.min(srcH - top, Math.round(crop.height * srcH)))

  return sharp(buffer).extract({ left, top, width, height }).toBuffer()
}

export async function exportForPlatform(
  sourceS3Key: string,
  platform: string,
  sessionId: string,
  jobId: string,
  cropRegion?: CropRegion,
): Promise<string> {
  const spec = SERVER_PLATFORM_SPECS[platform]
  if (!spec) throw new Error('invalid_platform')

  if (platform === 'original_hd') return sourceS3Key

  // sourceS3Key (hdS3Key) is a PNG — model-router stores the lossless fal
  // output as PNG so the preview watermark is the only lossy encode in the
  // preview chain. sharp handles PNG input transparently; no change needed here.
  let sourceBuffer = await downloadFromS3(sourceS3Key)

  if (isValidCrop(cropRegion)) {
    sourceBuffer = await applyUserCrop(sourceBuffer, cropRegion)
  }

  // Always crop-to-fill: scale to cover the target frame and center-crop the
  // overflow. `fit: 'cover'` never introduces margins, so no platform — not
  // even Wildberries/Ozon — gets white bars. When a user crop was applied
  // above it already matches the target ratio, so cover is a clean exact fit.
  const outputBuffer = await sharp(sourceBuffer)
    .resize(spec.width, spec.height, {
      fit: 'cover',
      position: 'centre',
    })
    .jpeg({ quality: 92 })
    .toBuffer()

  const exportKey = buildS3Key('hd', sessionId, `${jobId}-${platform}.jpg`)
  await uploadToS3(exportKey, outputBuffer, 'image/jpeg')

  return exportKey
}
