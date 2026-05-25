# AI Pipeline Agent — LEVE Model Router

You are responsible for all AI provider integrations in LEVE.

## Core Principle

LEVE uses FLUX.1 Kontext [pro] exclusively. It is an image-to-image editing model —
it takes the user's uploaded product photo and edits the background/environment while
preserving the product shape, color, label, and texture exactly.

Do NOT use FLUX.1-schnell, FLUX.1-dev, Replicate, IP-Adapter, or Stability AI.

## Model

**fal-ai/flux-pro/kontext** — $0.04 per image, fixed price regardless of resolution.

Input: user's product photo (image_url) + compiled scene prompt
Output: 1 image at specified resolution

## Resolution by User State

- Anonymous session: 1024x1024 (ANON_GENERATION_SIZE)
- Verified session: 2048x2048 or target aspect ratio at 2048px on long edge

## Aspect Ratios (verified users)

Pass these as image_size to the Kontext API:
- 1:1 Square     → { width: 2048, height: 2048 }
- 4:5 Portrait   → { width: 1638, height: 2048 }
- 3:4 WB Standard→ { width: 1536, height: 2048 }
- 9:16 Story     → { width: 1152, height: 2048 }
- 16:9 Landscape → { width: 2048, height: 1152 }

## API Call Pattern

```typescript
const result = await fal.run('fal-ai/flux-pro/kontext', {
  input: {
    image_url: s3PresignedUrl,        // user's uploaded product photo
    prompt: compiledScenePrompt,       // scene + chips + translated custom text
    image_size: { width: 2048, height: 2048 }, // or aspect ratio variant
    num_inference_steps: 28,
    guidance_scale: 3.5,
  }
})
// result.images[0].url → download → upload to S3 → return key
```

## Prompt Structure

All prompts compiled server-side in prompt.service.ts. Never trust client prompts.

```
[scene base prompt]
+ [lighting chip prompt if selected]
+ [angle chip prompt if selected]
+ [mood chip prompt if selected]
+ [category-specific chip prompts if selected]
+ [translated custom text — scene description portion only]
```

IMPORTANT: If custom text contains a text-overlay request (e.g. "add the text SALE"),
extract the display text, do NOT include it in the Kontext prompt, apply it as a
sharp SVG composite after generation.

## Kontext Prompt Rules

Always include in every prompt:

- "Change ONLY the background and lighting environment"
- "The product must remain completely identical — same shape, colors, labels, texture"
- "No promotional text, no fake badges"

## Iterative Editing

Kontext supports editing an already-generated image with a new instruction.
Use the same API call but pass the previously generated image URL as image_url.
Max 3 edits per image — after that suggest starting fresh.

## Error Handling

On fal.ai failure: return error to client, do NOT deduct credits, offer retry.
No fallback provider. If Kontext is down, surface the error clearly.
