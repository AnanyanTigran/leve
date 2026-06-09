import sharp from 'sharp'
import { fileTypeFromBuffer } from 'file-type'
import {
  RekognitionClient,
  DetectModerationLabelsCommand,
} from '@aws-sdk/client-rekognition'
import { validateEnv } from '../config/env'

const env = validateEnv()

const rekognition = new RekognitionClient({
  region: env.AWS_REGION,
  credentials: {
    accessKeyId: env.AWS_ACCESS_KEY_ID,
    secretAccessKey: env.AWS_SECRET_ACCESS_KEY,
  },
})

const ALLOWED_MIME_TYPES = new Set([
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/heic',
  'image/heif',
  'image/avif',
  'image/tiff',
])
// Formats Kontext / Rekognition can't consume directly — convert to JPEG.
const CONVERT_TO_JPEG_MIMES = new Set([
  'image/heic',
  'image/heif',
  'image/avif',
  'image/tiff',
  'image/webp',
])
const MAX_BYTES = 20 * 1024 * 1024 // 20MB
const MIN_DIMENSION = 512
const MAX_DIMENSION = 8000
const MODERATION_CONFIDENCE_THRESHOLD = 70

export type ValidationError =
  | 'invalid_file_type'
  | 'file_too_large'
  | 'resolution_too_low'
  | 'resolution_too_high'
  | 'content_policy_violation'
  | 'validation_failed'

export interface ValidationResult {
  valid: boolean
  error?: ValidationError
  width?: number
  height?: number
  mimeType?: string
  // Populated when the original was HEIC/HEIF/AVIF/TIFF and we re-encoded
  // to JPEG. Callers should upload this buffer instead of the original.
  convertedBuffer?: Buffer
}

export async function validateImage(buffer: Buffer, originalExtension?: string): Promise<ValidationResult> {
  // 1. File size
  if (buffer.byteLength > MAX_BYTES) {
    return { valid: false, error: 'file_too_large' }
  }

  // 2. Magic bytes — do NOT trust extension or Content-Type header
  const fileType = await fileTypeFromBuffer(buffer)

  // HEIC/HEIF files from Chrome on Mac are often misidentified as video/mp4
  // because HEIC uses the same ISOBMFF container (ftyp brand 'mif1'/'msf1').
  // If fileType says video/* but the original extension is .heic or .heif,
  // trust the extension — it's an iPhone photo, not a video.
  const effectiveMime = (() => {
    if (!fileType) {
      if (originalExtension === 'heic' || originalExtension === 'heif') return 'image/heic'
      if (originalExtension === 'avif') return 'image/avif'
      if (originalExtension === 'tif' || originalExtension === 'tiff') return 'image/tiff'
      if (originalExtension === 'jpg' || originalExtension === 'jpeg') return 'image/jpeg'
      if (originalExtension === 'png') return 'image/png'
      if (originalExtension === 'webp') return 'image/webp'
      return null
    }
    if (
      fileType.mime.startsWith('video/') &&
      (originalExtension === 'heic' || originalExtension === 'heif')
    ) {
      return 'image/heic'
    }
    return fileType.mime
  })()

  if (!effectiveMime || !ALLOWED_MIME_TYPES.has(effectiveMime)) {
    return { valid: false, error: 'invalid_file_type' }
  }

  // 2a. Transcode HEIC/HEIF/AVIF/TIFF to JPEG so downstream Sharp ops,
  // Rekognition, and Kontext receive a format they can read.
  const needsConversion = CONVERT_TO_JPEG_MIMES.has(effectiveMime)
  let workingBuffer = buffer
  let workingMime = effectiveMime
  let convertedBuffer: Buffer | undefined

  if (needsConversion) {
    try {
      workingBuffer = await sharp(buffer).rotate().jpeg({ quality: 92 }).toBuffer()
      workingMime = 'image/jpeg'
      convertedBuffer = workingBuffer
    } catch {
      return { valid: false, error: 'invalid_file_type' }
    }
  }

  // 3. Dimensions
  let meta: sharp.Metadata
  try {
    meta = await sharp(workingBuffer).metadata()
  } catch {
    return { valid: false, error: 'invalid_file_type' }
  }

  const { width = 0, height = 0 } = meta
  if (width < MIN_DIMENSION || height < MIN_DIMENSION) {
    return { valid: false, error: 'resolution_too_low' }
  }
  if (width > MAX_DIMENSION || height > MAX_DIMENSION) {
    return { valid: false, error: 'resolution_too_high' }
  }

  // 4. AWS Rekognition NSFW moderation
  try {
    const cmd = new DetectModerationLabelsCommand({
      Image: { Bytes: workingBuffer },
      MinConfidence: MODERATION_CONFIDENCE_THRESHOLD,
    })
    const result = await rekognition.send(cmd)
    const flagged = (result.ModerationLabels ?? []).some(
      (label) => (label.Confidence ?? 0) >= MODERATION_CONFIDENCE_THRESHOLD,
    )
    if (flagged) {
      // Do NOT specify which label — prevents policy probing
      return { valid: false, error: 'content_policy_violation' }
    }
  } catch (err: any) {
    if (err?.__type === 'InvalidImageFormatException') {
      return { valid: false, error: 'invalid_file_type' }
    }
    console.error({ service: 'rekognition', event: 'moderation_unavailable', err }, '[upload] blocking upload — moderation service unavailable')
    return { valid: false, error: 'validation_failed' }
  }

  return { valid: true, width, height, mimeType: workingMime, convertedBuffer }
}
