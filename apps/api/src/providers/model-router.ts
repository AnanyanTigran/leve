import * as fal from '@fal-ai/serverless-client'
import Replicate from 'replicate'
import { validateEnv } from '../config/env'
import { uploadToS3, buildS3Key } from '../lib/s3'
import { getNegativePrompt } from '../services/prompt.service'
import axios from 'axios'

const env = validateEnv()

fal.config({ credentials: env.FAL_API_KEY })
const replicate = new Replicate({ auth: env.REPLICATE_API_TOKEN })

export interface GenerationInput {
  sessionId: string
  jobId: string
  uploadS3Key: string
  compiledPrompt: string
  negativePrompt: string
  requiresIPAdapter: boolean
  isHD: boolean
}

export interface GenerationOutput {
  s3Keys: string[]
  provider: string
  durationMs: number
}

export async function runGeneration(input: GenerationInput): Promise<GenerationOutput> {
  const start = Date.now()
  if (input.isHD) {
    return runHdGeneration(input, start)
  }
  return runPreviewGeneration(input, start)
}

async function runPreviewGeneration(
  input: GenerationInput,
  start: number,
): Promise<GenerationOutput> {
  try {
    const result = await Promise.race([
      falSchnellGenerate(input, 4),
      timeoutReject(15000, 'fal_schnell_timeout'),
    ])

    const s3Keys = await downloadAndStore(result.imageUrls, 'previews', input.sessionId, input.jobId)
    return { s3Keys, provider: 'fal_schnell', durationMs: Date.now() - start }
  } catch {
    const result = await Promise.race([
      replicateSdxlGenerate(input, 4),
      timeoutReject(30000, 'replicate_timeout'),
    ])

    const s3Keys = await downloadAndStore(result.imageUrls, 'previews', input.sessionId, input.jobId)
    return { s3Keys, provider: 'replicate_fallback', durationMs: Date.now() - start }
  }
}

async function runHdGeneration(
  input: GenerationInput,
  start: number,
): Promise<GenerationOutput> {
  if (input.requiresIPAdapter) {
    try {
      const result = await Promise.race([
        replicateIpAdapterGenerate(input),
        timeoutReject(25000, 'replicate_ipadapter_timeout'),
      ])

      const s3Keys = await downloadAndStore(result.imageUrls, 'hd', input.sessionId, input.jobId)
      return { s3Keys, provider: 'replicate_ipadapter', durationMs: Date.now() - start }
    } catch {
      // fall through to fal.ai dev
    }
  }

  try {
    const result = await Promise.race([
      falDevGenerate(input),
      timeoutReject(25000, 'fal_dev_timeout'),
    ])

    const s3Keys = await downloadAndStore(result.imageUrls, 'hd', input.sessionId, input.jobId)
    return { s3Keys, provider: 'fal_dev', durationMs: Date.now() - start }
  } catch (err) {
    throw new Error('all_providers_failed')
  }
}

// ── Provider implementations ──────────────────────────────────────────────────

async function falSchnellGenerate(
  input: GenerationInput,
  numImages: number,
): Promise<{ imageUrls: string[] }> {
  const result = await fal.run('fal-ai/flux/schnell', {
    input: {
      prompt: input.compiledPrompt,
      num_images: numImages,
      image_size: 'square_hd',
      enable_safety_checker: true,
    },
  }) as { images: { url: string }[] }

  return { imageUrls: result.images.map((img) => img.url) }
}

async function falDevGenerate(
  input: GenerationInput,
): Promise<{ imageUrls: string[] }> {
  const result = await fal.run('fal-ai/flux/dev', {
    input: {
      prompt: input.compiledPrompt,
      num_images: 1,
      image_size: 'square_hd',
      enable_safety_checker: true,
    },
  }) as { images: { url: string }[] }

  return { imageUrls: result.images.map((img) => img.url) }
}

async function replicateSdxlGenerate(
  input: GenerationInput,
  numImages: number,
): Promise<{ imageUrls: string[] }> {
  const output = await replicate.run(
    'stability-ai/sdxl:39ed52f2319f9bc3748c78f960f6ef96100f33bd3fee1234b1bc8f62f7d9',
    {
      input: {
        prompt: input.compiledPrompt,
        negative_prompt: input.negativePrompt,
        num_outputs: numImages,
      },
    },
  )

  return { imageUrls: (output as string[]) }
}

async function replicateIpAdapterGenerate(
  input: GenerationInput,
): Promise<{ imageUrls: string[] }> {
  const output = await replicate.run(
    'lucataco/ip-adapter-sdxl:c6e78d2501b3c272768eb1f35f2dd7e753b7e5db2ca1d4e5296cd69ab7cd56d5a26ed5d6a',
    {
      input: {
        prompt: input.compiledPrompt,
        negative_prompt: input.negativePrompt,
        num_outputs: 1,
      },
    },
  )

  return { imageUrls: (output as string[]) }
}

// ── Helpers ───────────────────────────────────────────────────────────────────

async function downloadAndStore(
  urls: string[],
  folder: 'previews' | 'hd',
  sessionId: string,
  jobId: string,
): Promise<string[]> {
  const keys: string[] = []
  for (let i = 0; i < urls.length; i++) {
    const url = urls[i]
    if (!url) continue
    const response = await axios.get(url, { responseType: 'arraybuffer', timeout: 30000 })
    const buffer = Buffer.from(response.data as ArrayBuffer)
    const key = buildS3Key(folder, sessionId, `${jobId}-${i}.jpg`)
    await uploadToS3(key, buffer, 'image/jpeg')
    keys.push(key)
  }
  return keys
}

function timeoutReject(ms: number, label: string): Promise<never> {
  return new Promise((_, reject) =>
    setTimeout(() => reject(new Error(label)), ms),
  )
}
