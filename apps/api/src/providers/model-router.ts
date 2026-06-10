import * as fal from '@fal-ai/serverless-client'
import sharp from 'sharp'
import { validateEnv } from '../config/env'
import { uploadToS3, buildS3Key } from '../lib/s3'
import axios from 'axios'

const env = validateEnv()

fal.config({ credentials: env.FAL_API_KEY })

// In-memory circuit breaker for fal.ai — opens after 3 consecutive failures,
// resets after 30 seconds to allow recovery probes.
const CB_THRESHOLD = 3
const CB_RESET_MS = 30_000
const circuitBreaker = {
  failures: 0,
  openedAt: 0,
  isOpen(): boolean {
    if (this.failures < CB_THRESHOLD) return false
    if (Date.now() - this.openedAt > CB_RESET_MS) {
      // Half-open: allow one probe through
      this.failures = 0
      return false
    }
    return true
  },
  recordFailure() {
    this.failures++
    if (this.failures >= CB_THRESHOLD) this.openedAt = Date.now()
  },
  recordSuccess() {
    this.failures = 0
  },
}

// LEVE aspect ratio → Kontext [pro] enum value.
// 4:5 is not in the [pro] enum; generate at 3:4 then center-crop to 4:5.
export const KONTEXT_ASPECT_RATIOS: Record<string, string> = {
  '1:1':  '1:1',
  '4:5':  '3:4',  // generated at 3:4, post-cropped to 4:5
  '3:4':  '3:4',
  '9:16': '9:16',
  '16:9': '16:9',
}

// Ratios that require a center-crop after generation (target ratio as a decimal)
const POST_CROP_TARGETS: Record<string, number> = {
  '4:5': 4 / 5,
}

export interface GenerationInput {
  sessionId: string
  jobId: string
  uploadS3Key: string       // user's product photo in S3
  compiledPrompt: string    // scene + chips + translated custom text (NO text overlay content)
  aspectRatio?: string      // '1:1' | '4:5' | '3:4' | '9:16' | '16:9', default '1:1'
  isEdit?: boolean          // true = iterative edit, sourceImageS3Key is prior output
  sourceImageS3Key?: string // for iterative edits: the previously generated image
  guidanceScale?: number    // override default 3.5; dark scenes use 4.0 to prevent underexposure
  seed?: number             // optional; random seed generated if omitted
  /** @deprecated Kontext [pro] controls resolution; field is accepted but ignored */
  isVerified?: boolean
}

export interface GenerationOutput {
  s3Key: string       // single output image stored in S3
  outputBuffer: Buffer // raw image bytes — used by worker for quality gate without extra S3 round trip
  provider: string
  durationMs: number
  seed: number        // seed actually used — record for reproducible debugging
}

// Single entry point for ALL generation. No routing logic needed — always Kontext [pro].
export async function runGeneration(input: GenerationInput): Promise<GenerationOutput> {
  const start = Date.now()

  // Fail fast before any presign work if the circuit is open
  if (circuitBreaker.isOpen()) {
    throw new Error('kontext_circuit_open')
  }

  const aspectRatio = input.aspectRatio ?? '1:1'
  const kontextRatio = KONTEXT_ASPECT_RATIOS[aspectRatio] ?? '1:1'

  // Use uploaded photo as input for initial generation,
  // or previously generated image for iterative edits
  const sourceKey = input.isEdit && input.sourceImageS3Key
    ? input.sourceImageS3Key
    : input.uploadS3Key

  // Get presigned URL for the source image so fal.ai can read it
  const sourcePresignedUrl = await getS3PresignedUrl(sourceKey)

  // Enforce product preservation in every prompt — never allow Kontext to alter the product
  const safePrompt = buildSafePrompt(input.compiledPrompt, input.isEdit ?? false)

  const seed = input.seed ?? Math.floor(Math.random() * 2 ** 31)

  let falResult: { images: { url: string }[]; seed?: number }

  const cancellableTimeout = createCancellableTimeout(45_000, 'kontext_timeout')
  try {
    falResult = await Promise.race([
      fal.subscribe('fal-ai/flux-pro/kontext', {
        input: {
          image_url: sourcePresignedUrl,
          prompt: safePrompt,
          aspect_ratio: kontextRatio,
          // Default 3.5 is BFL-documented. Dark scenes (black_studio,
          // velvet_dark, editorial_dark, neon_glow) pass 4.0 to strengthen
          // instruction adherence and prevent underexposure.
          guidance_scale: input.guidanceScale ?? 3.5,
          output_format: 'png',
          safety_tolerance: '2',
          enhance_prompt: false,
          seed,
        },
      }) as Promise<{ images: { url: string }[]; seed?: number }>,
      cancellableTimeout.promise,
    ])
    circuitBreaker.recordSuccess()
  } catch (err) {
    circuitBreaker.recordFailure()
    const message = err instanceof Error ? err.message : 'kontext_failed'
    throw new Error(message)
  } finally {
    cancellableTimeout.cancel()
  }

  const imageUrl = falResult.images?.[0]?.url
  if (!imageUrl) throw new Error('kontext_no_output')

  // Download from fal.ai CDN
  let imageBuffer = await downloadImageFromUrl(imageUrl)

  // Center-crop to exact target ratio for aspect ratios not natively in the [pro] enum
  const cropTarget = POST_CROP_TARGETS[aspectRatio]
  if (cropTarget !== undefined) {
    imageBuffer = await cropToAspect(imageBuffer, cropTarget)
  }

  const s3Key = buildS3Key('previews', input.sessionId, `${input.jobId}-output.png`)
  await uploadToS3(s3Key, imageBuffer, 'image/png')

  return {
    s3Key,
    outputBuffer: imageBuffer,
    provider: 'fal_kontext_pro',
    durationMs: Date.now() - start,
    seed: falResult.seed ?? seed,
  }
}

// ── Helpers ───────────────────────────────────────────────────────────────────

// Center-crops a PNG buffer to the given aspect ratio (width/height decimal).
// Returns the buffer unchanged if the ratio already matches within 0.5%.
async function cropToAspect(buffer: Buffer, targetRatio: number): Promise<Buffer> {
  const meta = await sharp(buffer).metadata()
  const { width, height } = meta
  if (!width || !height) return buffer

  const currentRatio = width / height
  if (Math.abs(currentRatio - targetRatio) / targetRatio < 0.005) return buffer

  // Determine crop box that fits inside the image at the target ratio
  let cropWidth: number
  let cropHeight: number
  if (currentRatio > targetRatio) {
    // Image is wider than target — clamp width
    cropHeight = height
    cropWidth = Math.round(height * targetRatio)
  } else {
    // Image is taller than target — clamp height
    cropWidth = width
    cropHeight = Math.round(width / targetRatio)
  }

  const left = Math.floor((width - cropWidth) / 2)
  const top = Math.floor((height - cropHeight) / 2)

  return sharp(buffer)
    .extract({ left, top, width: cropWidth, height: cropHeight })
    .png()
    .toBuffer()
}

// Preservation trails the user prompt — constraint-at-end is the BFL-documented
// Kontext pattern: actions first, then preservation rules.
//
// For the initial-generation path, compilePrompt() in prompt.service.ts already
// appends the preservation + quality suffix. Re-appending here would duplicate
// the constraint and waste the 512-token budget, so we no-op in that case.
//
// For the iterative-edit path, the prompt is raw user text that never flowed
// through compilePrompt, so we add the preservation constraint here as the
// canonical safety net. Phrasing matches the prompt.service.ts suffix so the
// two code paths produce semantically equivalent prompts.
function buildSafePrompt(userPrompt: string, isEdit: boolean): string {
  if (!isEdit) return userPrompt

  return `${userPrompt} Apply only the change described above. ` +
    'Keep the product itself identical to the source image — preserve its exact shape, colors, materials, labels, printed text, logos, and proportions. ' +
    'Maintain the exact same product position, scale, orientation, and camera angle as in the source.'
}

async function getS3PresignedUrl(s3Key: string): Promise<string> {
  const { GetObjectCommand } = await import('@aws-sdk/client-s3')
  const { getSignedUrl } = await import('@aws-sdk/s3-request-presigner')
  const { s3 } = await import('../lib/s3')

  const command = new GetObjectCommand({
    Bucket: env.AWS_S3_BUCKET,
    Key: s3Key,
  })
  // 10 minute expiry — enough for fal.ai to download during generation
  return getSignedUrl(s3, command, { expiresIn: 600 })
}

async function downloadImageFromUrl(url: string): Promise<Buffer> {
  const response = await axios.get(url, {
    responseType: 'arraybuffer',
    timeout: 30000,
  })
  return Buffer.from(response.data as ArrayBuffer)
}

function createCancellableTimeout(
  ms: number,
  label: string,
): { promise: Promise<never>; cancel: () => void } {
  let timer: ReturnType<typeof setTimeout> | undefined
  const promise = new Promise<never>((_, reject) => {
    timer = setTimeout(() => reject(new Error(label)), ms)
  })
  // Swallow the late rejection if Promise.race already resolved with the winner —
  // without this, the timer firing after `cancel()` would surface as an
  // unhandled rejection on the process.
  promise.catch(() => {})
  return {
    promise,
    cancel: () => {
      if (timer) clearTimeout(timer)
    },
  }
}
