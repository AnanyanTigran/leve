# AI Pipeline Agent — LEVE Model Router

You are responsible for all AI provider integrations in LEVE. Your job is to maintain the model router abstraction and implement generation pipelines that preserve product shape and deliver consistent, commercially-useful output.

## Core Principle

LEVE users care about ONE thing: their product looks like their product, but better.
This means product shape preservation is more important than creativity or style.

## Model Router Interface

ALL AI calls in the codebase go through this interface. Never call providers directly.

```typescript
interface GenerationRequest {
  templateId: string
  inputImageS3Key: string
  outputFormat: 'preview' | 'hd'
  sessionId: string
  jobId: string
}

interface GenerationResult {
  success: boolean
  outputS3Keys?: string[]    // 4 variants for preview, 1 for HD
  provider?: string          // which provider was used (for logging)
  latencyMs?: number
  error?: string
}

// The model router — implement this
async function routeGeneration(request: GenerationRequest): Promise<GenerationResult>
```

## Provider Implementations

### fal.ai (Primary)

Used for: all preview generation (FLUX.1-schnell) and HD generation (FLUX.1-dev)

```typescript
import * as fal from '@fal-ai/serverless-client'

// Preview: FLUX.1-schnell — fast, lower quality
const previewResult = await fal.subscribe('fal-ai/flux/schnell', {
  input: {
    prompt: buildPrompt(template, 'preview'),
    image_url: getS3PresignedUrl(inputImageS3Key),
    num_images: 4,
    image_size: 'square_hd',
    num_inference_steps: 4,  // schnell is optimized for low steps
  }
})

// HD: FLUX.1-dev — slower, better quality, better prompt following
const hdResult = await fal.subscribe('fal-ai/flux/dev', {
  input: {
    prompt: buildPrompt(template, 'hd'),
    image_url: getS3PresignedUrl(inputImageS3Key),
    num_images: 1,
    image_size: 'square_hd',
    num_inference_steps: 28,
    guidance_scale: 3.5,
  }
})
```

### Replicate (Fallback + IP-Adapter for product preservation)

Use IP-Adapter when product shape preservation is critical (jewelry, cosmetics, fashion).

```typescript
import Replicate from 'replicate'

const replicate = new Replicate({ auth: process.env.REPLICATE_API_TOKEN })

// IP-Adapter for product-faithful generation
const output = await replicate.run(
  'lucataco/ip-adapter-sdxl:...',  // use latest stable hash
  {
    input: {
      image: getS3PresignedUrl(inputImageS3Key),
      prompt: buildPrompt(template, 'hd'),
      negative_prompt: GLOBAL_NEGATIVE_PROMPT,
      scale: 0.8,  // 0.8 balances style vs preservation
      num_outputs: 1,
    }
  }
)
```

## Prompt Compilation from CATEGORY_CONFIG

The frontend collects the user's category, selected refinement chips, and optional
custom text. The backend compiles these into the final prompt using `CATEGORY_CONFIG`
(defined in `apps/web/lib/constants.ts` — the backend should mirror this or import
from `@leve/types`).

```typescript
// Input from sessionStorage (passed to API on job dispatch)
interface GenerationInput {
  category: ProductCategory          // e.g. 'beauty_cosmetics'
  templateId: string                 // e.g. 'luxury-cosmetics'
  chips: string[]                   // e.g. ['bg_marble', 'mood_luxury']
  customText?: string               // user's free-text (any language)
}

// Prompt compilation logic
function buildGenerationPrompt(input: GenerationInput): GenerationPrompt {
  const categoryConfig = CATEGORY_CONFIG[input.category] ?? CATEGORY_CONFIG.custom
  const selectedChips = categoryConfig.refinementChips
    .filter(chip => input.chips.includes(chip.id))
    .map(chip => chip.prompt)

  // Custom text: translate via DeepL to English first, then append
  const customFragment = input.customText
    ? await translateToEnglish(input.customText)   // DeepL or similar
    : null

  const fullPrompt = [
    GLOBAL_POSITIVE_BASE,
    categoryConfig.basePrompt,
    ...selectedChips,
    customFragment,
  ].filter(Boolean).join(', ')

  const negativePrompt = [
    GLOBAL_NEGATIVE_PROMPT,
    categoryConfig.negativeAddition,
  ].join(', ')

  return { prompt: fullPrompt, negativePrompt }
}
```

**Key rule:** custom text is always translated to English before injection into the
prompt, because FLUX and Replicate perform better with English prompts. Use DeepL Free
API (endpoint in `DEEPL_API_URL` constant) with auto-detect source language.

## Prompt Building

```typescript
const GLOBAL_NEGATIVE_PROMPT = [
  'distorted product',
  'melted edges',
  'morphed shape',
  'unrealistic proportions',
  'blurry product',
  'duplicate product',
  'cropped product',
  'floating inconsistently',
  'cartoon',
  'illustration',
  'text on product',
  'watermark',
].join(', ')

const GLOBAL_POSITIVE_BASE = [
  'preserve product shape exactly',
  'maintain product proportions',
  'photorealistic',
  'commercial photography',
  'product photography',
  'sharp focus on product',
].join(', ')

function buildPrompt(template: GenerationTemplate, mode: 'preview' | 'hd'): string {
  return `${GLOBAL_POSITIVE_BASE}, ${template.stylePrompt}${mode === 'hd' ? ', 8k resolution, studio grade' : ''}`
}
```

## Template Registry (V1 Hero Templates — 10 total)

```typescript
const TEMPLATES: Record<string, GenerationTemplate> = {
  // BEAUTY (3)
  luxury_beauty: {
    id: 'luxury_beauty',
    name: { hy: 'Լյուքս Կոսմետիկա', ru: 'Люкс Косметика', en: 'Luxury Beauty' },
    stylePrompt: 'luxury cosmetics studio, marble surface, soft backlight, gold accents, premium packaging photography',
    category: 'beauty',
    suitableFor: ['cosmetics', 'skincare', 'perfume'],
  },
  beauty_clinic: {
    id: 'beauty_clinic',
    name: { hy: 'Բյուտի Կլինիկա', ru: 'Бьюти Клиника', en: 'Beauty Clinic' },
    stylePrompt: 'clean medical aesthetic, white studio, clinical precision, professional beauty treatment visualization',
    category: 'beauty',
    suitableFor: ['treatments', 'procedures', 'before_after'],
  },
  // ... etc

  // MARKETPLACE (4)
  wildberries_standard: {
    id: 'wildberries_standard',
    name: { hy: 'Wildberries', ru: 'Wildberries', en: 'Wildberries' },
    stylePrompt: 'pure white background, centered product, even lighting, no shadows, marketplace standard',
    negativePromptAddition: 'colored background, gradient, shadow, lifestyle elements',
    category: 'marketplace',
    outputBackground: 'white',
    padding: 0.15,  // 15% padding as per Wildberries spec
    suitableFor: ['all'],
  },
  // ...
}
```

## Routing Logic

```typescript
async function routeGeneration(request: GenerationRequest): Promise<GenerationResult> {
  const template = TEMPLATES[request.templateId]
  const startTime = Date.now()

  // Jewelry + cosmetics get IP-Adapter for better preservation
  const needsStrictPreservation = ['jewelry', 'cosmetics', 'perfume']
    .some(cat => template.suitableFor.includes(cat))

  if (needsStrictPreservation && request.outputFormat === 'hd') {
    return replicateIPAdapter(request, template)
  }

  // Default: fal.ai FLUX
  try {
    return await falFlux(request, template)
  } catch (err) {
    // Fallback to Replicate on fal.ai failure
    logger.warn({ jobId: request.jobId, err }, 'fal.ai failed, falling back to Replicate')
    return replicateIPAdapter(request, template)
  }
}
```

## Error Handling

All generation failures should:
1. Log full error with provider name, jobId, latency
2. Return `{ success: false, error: 'generation_failed' }` to the worker
3. BullMQ worker handles retry logic (max 2 retries with exponential backoff)
4. After 2 failures: mark job as failed, notify session, offer credit refund

## Quality Validation (Post-Generation)

Before storing output images:
1. Verify output dimensions match expected format
2. Run CLIP similarity score between input and output (ensure product is present)
3. If CLIP score < 0.3: flag for retry (product likely not preserved)
4. Log all quality metrics per job for model performance tracking
