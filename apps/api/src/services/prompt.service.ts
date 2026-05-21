const CATEGORY_BASE_PROMPTS: Record<string, string> = {
  beauty_cosmetics:
    'professional product photography of beauty or cosmetic product, preserve exact packaging design and label text, color-accurate, soft diffused studio lighting, clean luxury aesthetic, sharp product focus',
  jewelry_accessories:
    'professional jewelry photography, preserve exact shape and metal finish, macro detail, studio lighting with soft reflections, luxury aesthetic, sharp focus on product',
  fashion:
    'professional fashion product photography, preserve fabric texture and color accuracy, clean background, studio lighting, sharp focus',
  food:
    'professional food photography, appetizing presentation, natural lighting, preserve product colors and textures, sharp focus',
  marketplace:
    'professional marketplace product photo, white or neutral background, sharp product focus, accurate colors, clean composition',
  custom:
    'professional product photography, studio lighting, sharp focus, accurate colors',
}

const NEGATIVE_BASE =
  'blurry, distorted, deformed, watermark, text, logo, duplicate, bad quality, low resolution'

export interface CompilePromptInput {
  templateId: string
  category: string
  refinementChips: string[]
  customText?: string
}

export function compilePrompt(input: CompilePromptInput): string {
  const base = CATEGORY_BASE_PROMPTS[input.category] ?? CATEGORY_BASE_PROMPTS['custom']
  const chips = input.refinementChips.filter(Boolean).join(', ')
  const custom = sanitizeCustomText(input.customText ?? '')

  const parts = [base, chips, custom].filter(Boolean)
  return parts.join(', ')
}

export function getNegativePrompt(category: string): string {
  const categoryNeg: Record<string, string> = {
    beauty_cosmetics: 'distorted packaging, unreadable labels, incorrect colors',
    jewelry_accessories: 'distorted shape, wrong metal color, broken chain',
  }
  return [NEGATIVE_BASE, categoryNeg[category] ?? ''].filter(Boolean).join(', ')
}

export function sanitizeCustomText(text: string): string {
  return text
    .replace(/<[^>]*>/g, '')
    .replace(/ignore\s+(previous|all|above)/gi, '')
    .replace(/system\s*prompt/gi, '')
    .replace(/\[INST\]|\[\/INST\]/g, '')
    .trim()
    .slice(0, 200)
}
