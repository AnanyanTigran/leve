// Compares the CURRENT prompt approach vs. the NEW prompt approach across 3
// representative scenes, using the fal.ai SDK directly. No BullMQ, no S3, no
// session, no DB.
//
// Usage:
//   FAL_API_KEY=... pnpm tsx apps/api/scripts/test-prompt.ts <public-image-url>
//
// Output:
//   apps/api/scripts/out/<scene>-<variant>.jpg
//   Logs the compiled prompt and duration for each generation.

import * as fal from '@fal-ai/serverless-client'
import * as fs from 'node:fs'
import * as path from 'node:path'
import * as https from 'node:https'
import 'dotenv/config'

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

// ─── CURRENT approach (snapshot of pre-overhaul production values) ───────────

const CURRENT_PRESERVATION =
  'Keep the product itself completely unchanged — preserve its exact shape, colors, materials, labels, printed text, logo, and proportions. ' +
  'Keep the product in the same position, scale, and orientation as in the source image. ' +
  'Do not add any new text, badges, stickers, or promotional graphics to the product or scene.'

const CURRENT_QUALITY =
  'Render with sharp focus on the product, true-to-life colors, realistic soft contact shadows that ground the product to the surface, and crisp commercial-grade detail.'

const CURRENT_SCENES: Record<string, string> = {
  pure_white_studio:
    'Replace the background with a pure white seamless studio backdrop. Light the product with even shadowless commercial lighting and center it in the frame.',
  marble_luxury:
    'Place the product on a polished white marble surface with delicate gray veining. Light the scene with soft natural daylight from the upper left and softly blur the background with a shallow depth of field.',
  vanity_table:
    'Place the product on a wooden makeup vanity table with a softly blurred mirror behind it. Light the scene with warm soft beauty lighting from vanity bulbs.',
}

function compileCurrent(sceneId: string): string {
  return `${CURRENT_SCENES[sceneId]} ${CURRENT_QUALITY} ${CURRENT_PRESERVATION}`
}

// ─── NEW approach (mirrors apps/api/src/services/prompt.service.ts) ──────────

const NEW_PRESERVATION =
  'Keep the product itself identical to the source image — preserve its exact shape, colors, materials, labels, printed text, logos, and proportions. ' +
  'Maintain the exact same product position, scale, orientation, and camera angle as in the source. ' +
  'Do not add any new text, badges, stickers, watermarks, or promotional graphics to the product or scene.'

const NEW_QUALITY =
  'Deliver high-resolution professional product photography quality with sharp focus on the product, accurate true-to-source colors, realistic soft contact shadows grounding it to the surface, and crisp commercial detail.'

const NEW_SCENES: Record<string, string> = {
  pure_white_studio:
    'Replace the background with a pure white seamless studio cyclorama. Light the product with even shadowless commercial softbox lighting wrapping it from all sides.',
  marble_luxury:
    'Replace the surface beneath the product with polished white marble featuring delicate gray veining. Light with soft natural daylight from the upper left. Softly blur the background with a shallow depth of field.',
  vanity_table:
    'Place the product on a wooden makeup vanity with a softly blurred mirror behind it. Light the scene with warm soft beauty lighting from vanity bulbs.',
}

function compileNew(sceneId: string): string {
  return `${NEW_SCENES[sceneId]} ${NEW_QUALITY} ${NEW_PRESERVATION}`
}

// ─── Variant matrix ──────────────────────────────────────────────────────────

interface Variant {
  name: string
  prompt: string
  guidance: number
  steps: number
}

const SCENES = ['pure_white_studio', 'marble_luxury', 'vanity_table'] as const

const variants: Variant[] = SCENES.flatMap((sceneId) => [
  // Current: guidance 4.0, 32 steps (production values before the overhaul).
  { name: `${sceneId}-current`, prompt: compileCurrent(sceneId), guidance: 4.0, steps: 32 },
  // New: guidance 3.5 (BFL default), 40 steps (closer to BFL canonical 50).
  { name: `${sceneId}-new`,     prompt: compileNew(sceneId),     guidance: 3.5, steps: 40 },
])

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
  console.log(`guidance_scale=${variant.guidance}  num_inference_steps=${variant.steps}`)
  console.log(`prompt: ${variant.prompt}`)
  const t0 = Date.now()

  try {
    const result = (await fal.run('fal-ai/flux-pro/kontext', {
      input: {
        image_url: imageUrl,
        prompt: variant.prompt,
        image_size: { width: 1024, height: 1024 },
        num_inference_steps: variant.steps,
        guidance_scale: variant.guidance,
      },
    })) as { images: { url: string }[] }

    const url = result.images?.[0]?.url
    if (!url) throw new Error('no output image returned')
    const filePath = path.join(outDir, `${variant.name}.jpg`)
    await downloadToFile(url, filePath)
    console.log(`OK  saved ${filePath}  (${Date.now() - t0}ms)`)
  } catch (err) {
    console.error(`ERR ${variant.name} failed (${Date.now() - t0}ms):`, err instanceof Error ? err.message : err)
  }
}

;(async () => {
  console.log(`Source image: ${imageUrl}`)
  console.log(`Output dir:   ${outDir}`)
  console.log(`Variants:     ${variants.length}`)
  // Sequential to avoid concurrent-request spikes on fal.ai during testing.
  for (const v of variants) await runOne(v)
  console.log(`\nDone. ${variants.length} runs.`)
})()
