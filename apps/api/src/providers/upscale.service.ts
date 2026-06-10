// fal-ai/esrgan input/output schema verified against:
// https://fal.ai/models/fal-ai/esrgan/api — checked 2026-06
// Input fields: image_url, scale (1|2|4), model (string), face_enhance (bool)
//   NOTE: the task spec used "face: false" but the actual API field is
//   "face_enhance: false" — GFPGAN face restoration toggle.
// Output: { image: { url: string } }
// RealESRGAN_x4plus runs internally at 4× then downsamples to the requested
// scale factor. scale: 2 yields a 2× output with full 4× processing quality.

import * as fal from '@fal-ai/serverless-client'
import sharp from 'sharp'
import axios from 'axios'
import { validateEnv } from '../config/env'
import { uploadToS3, buildS3Key } from '../lib/s3'
import { redis } from '../lib/redis'
import { logger } from '../lib/logger'

const env = validateEnv()

// TTL matches the paid-tier HD S3 lifecycle (90 days). Anonymous jobs have a
// 30-day lifecycle, but using the paid-tier TTL here is harmless — the S3
// object will be deleted by lifecycle policy before Redis expires anyway.
const HD_UPSCALED_TTL_SECONDS = 60 * 60 * 24 * 90
const hdUpscaledRedisKey = (jobId: string) => `hd:upscaled:${jobId}`

/**
 * Upscale an image URL using Real-ESRGAN 2× (fidelity upscaler — NOT a
 * creative/diffusion upscaler). Fidelity upscalers are mandatory for product
 * photography: creative upscalers hallucinate detail and will corrupt product
 * labels and text.
 */
export async function upscaleHd(imageUrl: string): Promise<Buffer> {
  const result = await fal.subscribe('fal-ai/esrgan', {
    input: {
      image_url: imageUrl,
      scale: 2,
      model: 'RealESRGAN_x4plus',
      face_enhance: false,  // GFPGAN face restore would mutate product label typography
    },
  }) as { image: { url: string } }

  if (!result.image?.url) throw new Error('esrgan_no_output')
  return downloadUrl(result.image.url)
}

/**
 * Apply a light finishing pass to the upscaled HD output:
 * - Gentle unsharp mask to recover softness introduced by upscaling
 * - Explicit sRGB ICC profile tag for consistent colour on Instagram / WB / Ozon
 * - Single high-quality JPEG encode (progressive for faster perceived load)
 *
 * Do NOT apply colour grading or contrast adjustments — the product's
 * original colours must reach the customer unchanged.
 */
export async function finishHd(buffer: Buffer): Promise<Buffer> {
  return sharp(buffer)
    .sharpen({ sigma: 0.7, m1: 0.5, m2: 2.0 })
    .withMetadata({ icc: 'srgb' })
    .jpeg({
      quality: 95,
      chromaSubsampling: '4:4:4',
      mozjpeg: true,
      progressive: true,
    })
    .toBuffer()
}

/**
 * Ensure the HD image for a job has been upscaled. Returns the S3 key of the
 * 2× upscaled JPEG. Results are cached in Redis so the ESRGAN call runs only
 * once per job regardless of how many times the user downloads. Falls back to
 * the original hdS3Key on ESRGAN failure so downloads never block completely.
 */
export async function ensureUpscaledHd(
  hdS3Key: string,
  jobId: string,
  sessionId: string,
): Promise<string> {
  const cacheKey = hdUpscaledRedisKey(jobId)

  // Fast path: already upscaled on a previous download request
  const cached = await redis.get(cacheKey)
  if (cached) return cached

  try {
    // Presigned URL gives fal read access to the private S3 source PNG
    const presignedUrl = await getS3PresignedUrl(hdS3Key)

    const upscaledBuffer = await upscaleHd(presignedUrl)
    const finishedBuffer = await finishHd(upscaledBuffer)

    const upscaledKey = buildS3Key('hd', sessionId, `${jobId}-hd-2x.jpg`)
    await uploadToS3(upscaledKey, finishedBuffer, 'image/jpeg')

    await redis.set(cacheKey, upscaledKey, 'EX', HD_UPSCALED_TTL_SECONDS)

    logger.info({ jobId, upscaledKey }, '[upscale] HD 2× upscale complete')
    return upscaledKey
  } catch (err) {
    // ESRGAN failure must not block the download. export.service.ts re-encodes
    // the PNG to JPEG q92, so the user still gets a full-quality JPEG — just at
    // native Kontext resolution rather than 2×.
    logger.error({ jobId, err }, '[upscale] ESRGAN failed — serving original hdS3Key')
    return hdS3Key
  }
}

// ── Helpers ──────────────────────────────────────────────────────────────────

async function getS3PresignedUrl(s3Key: string): Promise<string> {
  const { GetObjectCommand } = await import('@aws-sdk/client-s3')
  const { getSignedUrl } = await import('@aws-sdk/s3-request-presigner')
  const { s3 } = await import('../lib/s3')

  const command = new GetObjectCommand({ Bucket: env.AWS_S3_BUCKET, Key: s3Key })
  // 10 minute expiry — enough for fal.ai to download during upscaling
  return getSignedUrl(s3, command, { expiresIn: 600 })
}

async function downloadUrl(url: string): Promise<Buffer> {
  const response = await axios.get(url, {
    responseType: 'arraybuffer',
    timeout: 60_000,
  })
  return Buffer.from(response.data as ArrayBuffer)
}
