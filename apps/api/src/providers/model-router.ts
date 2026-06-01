import * as fal from '@fal-ai/serverless-client'
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

// Aspect ratio → pixel dimensions (long edge = 2048px for verified users)
export const ASPECT_RATIO_SIZES: Record<string, { width: number; height: number }> = {
  '1:1':  { width: 2048, height: 2048 },
  '4:5':  { width: 1638, height: 2048 },
  '3:4':  { width: 1536, height: 2048 },
  '9:16': { width: 1152, height: 2048 },
  '16:9': { width: 2048, height: 1152 },
}

// Anonymous users get lower resolution (same cost, lower quality — creates upgrade incentive)
const ANON_SIZE = { width: 1024, height: 1024 }

export interface GenerationInput {
  sessionId: string
  jobId: string
  uploadS3Key: string      // user's product photo in S3
  compiledPrompt: string   // scene + chips + translated custom text (NO text overlay content)
  isVerified: boolean      // determines output resolution
  aspectRatio?: string     // '1:1' | '4:5' | '3:4' | '9:16' | '16:9', default '1:1'
  isEdit?: boolean         // true = iterative edit, sourceImageS3Key is prior output
  sourceImageS3Key?: string // for iterative edits: the previously generated image
}

export interface GenerationOutput {
  s3Key: string      // single output image stored in S3
  outputBuffer: Buffer // raw image bytes — used by worker for quality gate without extra S3 round trip
  provider: string
  durationMs: number
}

// Single entry point for ALL generation. No routing logic needed — always Kontext [pro].
export async function runGeneration(input: GenerationInput): Promise<GenerationOutput> {
  const start = Date.now()

  // Determine image_size based on verification state and chosen aspect ratio
  const imageSize = input.isVerified
    ? (ASPECT_RATIO_SIZES[input.aspectRatio ?? '1:1'] ?? ASPECT_RATIO_SIZES['1:1'])
    : ANON_SIZE

  // Use uploaded photo as input for initial generation,
  // or previously generated image for iterative edits
  const sourceKey = input.isEdit && input.sourceImageS3Key
    ? input.sourceImageS3Key
    : input.uploadS3Key

  // Get presigned URL for the source image so fal.ai can read it
  const sourcePresignedUrl = await getS3PresignedUrl(sourceKey)

  // Enforce product preservation in every prompt — never allow Kontext to alter the product
  const safePrompt = buildSafePrompt(input.compiledPrompt, input.isEdit ?? false)

  if (circuitBreaker.isOpen()) {
    throw new Error('kontext_circuit_open')
  }

  let falResult: { images: { url: string }[] }

  try {
    falResult = await Promise.race([
      fal.run('fal-ai/flux-pro/kontext', {
        input: {
          image_url: sourcePresignedUrl,
          prompt: safePrompt,
          image_size: imageSize,
          // 40 steps moves us closer to BFL's canonical 50-step recommendation
          // for [pro] without busting the 8s preview target. At 32 the model
          // visibly under-resolved fine product detail (jewelry, label text);
          // 50+ is diminishing returns at significant runtime cost.
          num_inference_steps: 40,
          // 3.5 is the BFL-documented default and community-validated sweet
          // spot. 4.0 was over-constraining edits and producing over-contrasty
          // artifacts. Preservation strength is now carried by the prompt's
          // trailing constraint (see prompt.service.ts PRODUCT_PRESERVATION_SUFFIX),
          // not by elevated guidance.
          guidance_scale: 3.5,
        },
      }) as Promise<{ images: { url: string }[] }>,
      timeout(30000, 'kontext_timeout'),
    ])
    circuitBreaker.recordSuccess()
  } catch (err) {
    circuitBreaker.recordFailure()
    const message = err instanceof Error ? err.message : 'kontext_failed'
    throw new Error(message)
  }

  const imageUrl = falResult.images?.[0]?.url
  if (!imageUrl) throw new Error('kontext_no_output')

  // Download from fal.ai CDN and store in our S3
  const imageBuffer = await downloadImageFromUrl(imageUrl)
  const s3Key = buildS3Key('previews', input.sessionId, `${input.jobId}-output.jpg`)
  await uploadToS3(s3Key, imageBuffer, 'image/jpeg')

  return {
    s3Key,
    outputBuffer: imageBuffer,
    provider: 'fal_kontext_pro',
    durationMs: Date.now() - start,
  }
}

// ── Helpers ───────────────────────────────────────────────────────────────────

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

function timeout(ms: number, label: string): Promise<never> {
  return new Promise((_, reject) =>
    setTimeout(() => reject(new Error(label)), ms),
  )
}
