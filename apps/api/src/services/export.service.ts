import sharp from 'sharp'
import { uploadToS3, buildS3Key } from '../lib/s3'
import { downloadFromS3 } from '../lib/cloudfront'

export interface PlatformSpec {
  width: number
  height: number
  forceWhiteBg: boolean
  padding: number
}

export const SERVER_PLATFORM_SPECS: Record<string, PlatformSpec> = {
  instagram_feed:  { width: 1080, height: 1080, forceWhiteBg: false, padding: 0 },
  instagram_story: { width: 1080, height: 1920, forceWhiteBg: false, padding: 0 },
  facebook_post:   { width: 1200, height: 630,  forceWhiteBg: false, padding: 0 },
  wildberries:     { width: 900,  height: 1200, forceWhiteBg: true,  padding: 0.15 },
  ozon:            { width: 1000, height: 1000, forceWhiteBg: true,  padding: 0.10 },
  telegram:        { width: 1080, height: 1080, forceWhiteBg: false, padding: 0 },
  list_am:         { width: 1200, height: 900,  forceWhiteBg: false, padding: 0 },
  original_hd:     { width: 0,    height: 0,    forceWhiteBg: false, padding: 0 },
}

export async function exportForPlatform(
  sourceS3Key: string,
  platform: string,
  sessionId: string,
  jobId: string,
): Promise<string> {
  const spec = SERVER_PLATFORM_SPECS[platform]
  if (!spec) throw new Error('invalid_platform')

  if (platform === 'original_hd') return sourceS3Key

  const sourceBuffer = await downloadFromS3(sourceS3Key)

  let pipeline: sharp.Sharp

  if (spec.forceWhiteBg) {
    // White background with padding — Wildberries/Ozon marketplace compliance
    const paddingPx = Math.round(Math.min(spec.width, spec.height) * spec.padding)
    const innerWidth = spec.width - paddingPx * 2
    const innerHeight = spec.height - paddingPx * 2

    const contained = await sharp(sourceBuffer)
      .resize(innerWidth, innerHeight, {
        fit: 'contain',
        background: { r: 255, g: 255, b: 255, alpha: 1 },
      })
      .toBuffer()

    pipeline = sharp(contained).extend({
      top: paddingPx,
      bottom: paddingPx,
      left: paddingPx,
      right: paddingPx,
      background: { r: 255, g: 255, b: 255, alpha: 1 },
    })
  } else {
    pipeline = sharp(sourceBuffer).resize(spec.width, spec.height, {
      fit: 'cover',
      position: 'centre',
    })
  }

  const outputBuffer = await pipeline.jpeg({ quality: 92 }).toBuffer()

  const exportKey = buildS3Key('hd', sessionId, `${jobId}-${platform}.jpg`)
  await uploadToS3(exportKey, outputBuffer, 'image/jpeg')

  return exportKey
}
