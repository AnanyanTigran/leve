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

const ALLOWED_MIME_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp'])
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
}

export async function validateImage(buffer: Buffer): Promise<ValidationResult> {
  // 1. File size
  if (buffer.byteLength > MAX_BYTES) {
    return { valid: false, error: 'file_too_large' }
  }

  // 2. Magic bytes — do NOT trust extension or Content-Type header
  const fileType = await fileTypeFromBuffer(buffer)
  if (!fileType || !ALLOWED_MIME_TYPES.has(fileType.mime)) {
    return { valid: false, error: 'invalid_file_type' }
  }

  // 3. Dimensions
  let meta: sharp.Metadata
  try {
    meta = await sharp(buffer).metadata()
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
      Image: { Bytes: buffer },
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
  } catch (err) {
    // Rekognition failure = fail open with log (do not block legitimate uploads)
    console.error('[Rekognition] moderation check failed', err)
  }

  return { valid: true, width, height, mimeType: fileType.mime }
}
