// Seeded evaluation harness for Kontext prompt quality comparison.
//
// Pinned seeds make A/B comparisons valid: the same seed × scene pair
// produces identical noise, so visual differences come from the prompt,
// not from random variation. Without pinned seeds you are comparing noise.
//
// How to reproduce a specific run:
//   Find "seed=<N>" in the log for the variant of interest. Add only that
//   seed to FIXED_SEEDS (or filter variants before the loop) and re-run.
//
// How to add a test scene:
//   Add its ID to the SCENES array below. getSceneGuidanceScale() will
//   automatically use any per-scene guidance_scale override from
//   prompt.service.ts; unknown scenes fall back to 3.5.
//
// Usage:
//   FAL_API_KEY=... pnpm tsx apps/api/scripts/test-prompt.ts <public-image-url>
//
// Output:
//   apps/api/scripts/out/<scene>-seed<N>.jpg
//   Logs the compiled prompt, seed, and duration for each generation.

import * as fal from '@fal-ai/serverless-client'
import * as fs from 'node:fs'
import * as path from 'node:path'
import * as https from 'node:https'
import 'dotenv/config'
import { compilePrompt, getSceneGuidanceScale } from '../src/services/prompt.service'

const FAL_KEY = process.env.FAL_API_KEY
if (!FAL_KEY) {
  console.error('FAL_API_KEY missing. Set it in the environment or .env.')
  process.exit(1)
}
fal.config({ credentials: FAL_KEY })

const imageUrl = process.argv[2]
if (!imageUrl) {
  console.error('Usage: pnpm tsx apps/api/scripts/test-prompt.ts <public-image-url>')
  process.exit(1)
}

// ─── Seeds ───────────────────────────────────────────────────────────────────
// Three seeds chosen to be well-separated in the noise space: small, medium,
// large. The specific values are not special — the point is that they are fixed.

const FIXED_SEEDS = [42, 12345, 987654321]

// ─── Scene sample ────────────────────────────────────────────────────────────
// Covers all five grounding types and a range of darkness levels.
// Expand this list to stress-test new scenes.

const SCENES = [
  'pure_white_studio',   // shadowless — baseline studio
  'black_studio',        // reflection + high guidance_scale override
  'marble_luxury',       // reflection — lifestyle surface
  'vanity_table',        // contact_shadow — in-environment
  'floating_levitation', // floating grounding
  'pomegranate_luxe',    // embedded — new Armenian-specific scene
] as const

function compileNew(sceneId: string): string {
  return compilePrompt({
    sceneId,
    category: 'beauty_cosmetics',
    selectedChipIds: [],
  })
}

// ─── Variant matrix ──────────────────────────────────────────────────────────

interface Variant {
  name: string
  prompt: string
  guidance: number
  seed: number
}

const variants: Variant[] = SCENES.flatMap((sceneId) =>
  FIXED_SEEDS.map((seed) => ({
    name: `${sceneId}-seed${seed}`,
    prompt: compileNew(sceneId),
    guidance: getSceneGuidanceScale(sceneId) ?? 3.5,
    seed,
  })),
)

// ─── Output ──────────────────────────────────────────────────────────────────

const outDir = path.resolve(process.cwd(), 'apps/api/scripts/out')
if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true })

function downloadToFile(url: string, filePath: string): Promise<void> {
  return new Promise((resolve, reject) => {
    https.get(url, (res) => {
      if (res.statusCode !== 200) {
        reject(new Error(`HTTP ${res.statusCode} fetching ${url}`))
        return
      }
      const file = fs.createWriteStream(filePath)
      res.pipe(file)
      file.on('finish', () => file.close(() => resolve()))
      file.on('error', reject)
    }).on('error', reject)
  })
}

async function runOne(variant: Variant): Promise<void> {
  console.log(`\n─── ${variant.name} ${'─'.repeat(Math.max(0, 60 - variant.name.length))}`)
  console.log(`guidance_scale=${variant.guidance}  seed=${variant.seed}`)
  console.log(`prompt: ${variant.prompt}`)
  const t0 = Date.now()

  try {
    const result = (await fal.subscribe('fal-ai/flux-pro/kontext', {
      input: {
        image_url: imageUrl,
        prompt: variant.prompt,
        aspect_ratio: '1:1',
        output_format: 'png',
        safety_tolerance: '2',
        enhance_prompt: false,
        guidance_scale: variant.guidance,
        seed: variant.seed,
      },
    })) as { images: { url: string }[] }

    const url = result.images?.[0]?.url
    if (!url) throw new Error('no output image returned')
    const filePath = path.join(outDir, `${variant.name}.jpg`)
    await downloadToFile(url, filePath)
    console.log(`OK  seed=${variant.seed}  saved ${filePath}  (${Date.now() - t0}ms)`)
  } catch (err) {
    console.error(
      `ERR ${variant.name}  seed=${variant.seed}  failed (${Date.now() - t0}ms):`,
      err instanceof Error ? err.message : err,
    )
  }
}

;(async () => {
  console.log(`Source image: ${imageUrl}`)
  console.log(`Output dir:   ${outDir}`)
  console.log(`Variants:     ${variants.length}  (${SCENES.length} scenes × ${FIXED_SEEDS.length} seeds)`)
  // Sequential to avoid concurrent-request spikes on fal.ai during testing.
  for (const v of variants) await runOne(v)
  console.log(`\nDone. ${variants.length} runs.`)
})()
