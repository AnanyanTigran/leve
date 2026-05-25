// ─── Scene Prompt Library ──────────────────────────────────────────────────────
// These are the server-side prompt cores for each scene.
// Never exposed to client — compiled server-side only.

const SCENE_PROMPTS: Record<string, string> = {
  // Studio
  pure_white_studio:      'product on pure white background, even studio lighting, no shadows, centered, product photography, marketplace compliant',
  soft_shadow_studio:     'product on white surface with natural soft shadow beneath, clean studio lighting, minimal, professional',
  gray_gradient:          'product on light gray gradient background, subtle shadow, studio photography, professional',
  light_box:              'product inside a white lightbox, even diffused lighting from all sides, packshot, sharp detail, product photography',
  black_studio:           'product on black surface, dark background, dramatic studio lighting, rim light on product edges, luxury editorial',

  // Lifestyle Surfaces
  marble_luxury:          'product on white marble surface, soft natural light from left, shallow depth of field, luxury feel, product photography',
  dark_wood:              'product on dark walnut wood table, warm ambient lighting, cozy atmosphere, lifestyle photography',
  light_wood:             'product on light oak wooden table, bright natural morning light, Scandinavian minimal, lifestyle',
  concrete_industrial:    'product on raw concrete surface, industrial aesthetic, directional light, urban, editorial',
  linen_fabric:           'product on natural linen fabric, soft daylight, organic aesthetic, gentle wrinkles, lifestyle',
  velvet_dark:            'product on dark velvet surface, dramatic rim lighting, luxury editorial, deep shadows',
  silk_white:             'product on white silk fabric, soft diffused light, elegant, slight fabric folds, luxury',
  terrazzo:               'product on terrazzo surface, pastel colors, modern design aesthetic, bright even light',

  // Environment
  bathroom_shelf:         'product on a bathroom shelf, white tiles background, towels nearby, natural light through window, lifestyle',
  kitchen_counter:        'product on a clean kitchen countertop, morning light, herbs and ingredients nearby, lifestyle photography',
  vanity_table:           'product on a makeup vanity table, mirror in background, warm soft light, beauty setup, lifestyle',
  cafe_table:             'product on a cafe table, blurred cafe interior background, warm ambient lighting, lifestyle photography',
  outdoor_garden:         'product on a garden table, green plants around, natural sunlight, fresh outdoor feel, lifestyle',
  office_desk:            'product on a modern minimal office desk, laptop in background blurred, professional lifestyle',
  bed_pillows:            'product on white bedding, morning sunlight through curtains, soft cozy atmosphere, lifestyle',
  beach_sand:             'product on sandy beach surface, ocean blurred in background, golden hour lighting, lifestyle',

  // Seasonal
  holiday_new_year:       'product surrounded by Christmas decorations, gold ornaments, pine branches, warm festive lighting, holiday campaign',
  spring_bloom:           'product surrounded by fresh spring flowers, cherry blossoms, soft pastel colors, bright light, seasonal',
  autumn_warm:            'product on surface with autumn leaves, warm golden tones, cozy atmosphere, seasonal photography',
  summer_fresh:           'product on bright surface with ice cubes, water droplets, citrus slices, vibrant fresh feel, summer',
  sale_promo:             'product on vibrant colored background, dynamic composition, promotional photography, space on left side for text',

  // Creative
  floating_levitation:    'product floating in mid-air, clean gradient background, dramatic shadow below, editorial product photography',
  splash_water:           'product with water splash around it, dynamic movement, studio lighting, high speed photography, commercial',
  ingredients_flat_lay:   'product viewed from above surrounded by its natural ingredients, flat lay composition, even lighting, editorial',
  neon_glow:              'product with colorful neon light reflections, dark background, cyberpunk aesthetic, vibrant, editorial',
  minimal_pastel:         'product on soft pastel colored background, minimal composition, even lighting, clean commercial photography',
  editorial_dark:         'product in dramatic dark editorial scene, moody lighting, luxury brand aesthetic, high contrast',
}

// ─── Chip Prompt Fragments ─────────────────────────────────────────────────────

const CHIP_PROMPTS: Record<string, string> = {
  // Lighting
  light_natural:          'soft natural daylight, window light',
  light_studio:           'soft studio lighting, diffused from above',
  light_dramatic:         'dramatic hard lighting, deep shadows, high contrast',
  light_golden:           'warm golden hour lighting, sun-kissed',
  light_cool:             'cool daylight, crisp clean light',

  // Angle
  angle_front:            'straight front-facing camera angle',
  angle_45:               '45-degree angle, three-quarter view',
  angle_top:              'overhead top-down view',
  angle_low:              'low camera angle, looking up at product',
  angle_closeup:          'extreme close-up, macro detail, shallow depth of field',

  // Mood
  mood_minimal:           'minimalist composition, clean, restrained',
  mood_luxury:            'luxury editorial feel, premium, aspirational',
  mood_warm:              'warm inviting tones, cozy atmosphere',
  mood_fresh:             'fresh clean bright feel, energetic',
  mood_bold:              'bold vivid colors, strong contrast, eye-catching',

  // Beauty-specific
  beauty_flowers:         'small fresh flowers in the scene, floral accent',
  beauty_water:           'water droplets on surface, dewy fresh feel',
  beauty_ingredients:     'natural ingredients surrounding the product',
  beauty_dewy:            'dewy glow, fresh skin feel, moisture',
  beauty_matte:           'matte finish aesthetic, powdery soft texture',

  // Jewelry-specific
  jewelry_macro:          'extreme macro close-up, jewel detail, sharp stones',
  jewelry_reflection:     'mirror reflection beneath product, symmetrical',
  jewelry_box:            'elegant open ring box or jewelry case in scene',
  jewelry_pair:           'pair of matching items displayed together',

  // Fashion-specific
  fashion_hanger:         'garment on elegant hanger',
  fashion_flatlay:        'flat lay composition from above',
  fashion_folded:         'neatly folded garment',
  fashion_accessories:    'styled with complementary accessories',

  // Food-specific
  food_steam:             'gentle steam rising, hot fresh food',
  food_cut:               'product sliced open showing fresh interior',
  food_cutlery:           'elegant cutlery arranged beside the food',
  food_top:               'overhead flat lay with complementary ingredients',

  // Marketplace-specific
  market_padding:         '15% padding around product, marketplace standard',
  market_fill:            'product fills 85% of frame, centered',
  market_noprops:         'clean background only, no props or decoration',
}

const PRODUCT_PRESERVATION_PREFIX =
  'Change ONLY the background and lighting environment. ' +
  'The product must remain completely identical — preserve exact shape, colors, labels, text on packaging, texture, and proportions. ' +
  'No promotional text added by AI. No fake badges or stickers. '

const GLOBAL_QUALITY_SUFFIX =
  ', professional commercial photography, sharp focus on product, photorealistic'

// ─── Text-on-Image Detection ───────────────────────────────────────────────────
// Detect when user wants text rendered ON the image.
// We extract the text, do NOT send to Kontext, apply via sharp SVG composite instead.

const TEXT_INTENT_PATTERNS = [
  /add(?:ing)?\s+(?:the\s+)?text/i,
  /write\s+(?:the\s+)?(?:text\s+)?["""'«»]/i,
  /put\s+(?:the\s+)?text/i,
  /include\s+(?:the\s+)?(?:text|word)/i,
  /добавь?\s+(?:текст|надпись)/i,
  /напиши?\s/i,
  /ավելացրու?\s+տեքստ/i,
  /գրիր?\s/i,
  // Detect quoted content — the quoted part is likely display text
  /["""'«»]([^"""'«»]{2,60})["""'«»]/,
]

const TEXT_EXTRACTION_PATTERN = /["""'«»]([^"""'«»]{2,60})["""'«»]/

export interface ParsedCustomText {
  sceneDescription: string   // translated, sent to Kontext
  overlayText: string | null // NOT translated, applied as sharp SVG overlay
  hasTextIntent: boolean
}

export function parseCustomText(rawText: string): ParsedCustomText {
  const cleaned = sanitizeCustomText(rawText)

  const hasTextIntent = TEXT_INTENT_PATTERNS.some((p) => p.test(cleaned))

  if (!hasTextIntent) {
    return { sceneDescription: cleaned, overlayText: null, hasTextIntent: false }
  }

  // Extract the exact quoted text — must NOT be translated
  const quotedMatch = cleaned.match(TEXT_EXTRACTION_PATTERN)
  const overlayText = quotedMatch ? quotedMatch[1].trim() : null

  // Remove the text request from the scene description
  let sceneDescription = cleaned
  if (overlayText) {
    sceneDescription = cleaned.replace(TEXT_EXTRACTION_PATTERN, '').trim()
  }
  // Remove common text-intent phrases to clean up the scene description
  sceneDescription = sceneDescription
    .replace(/add(?:ing)?\s+(?:the\s+)?text\s*/gi, '')
    .replace(/write\s+(?:the\s+)?(?:text\s+)?/gi, '')
    .replace(/put\s+(?:the\s+)?text\s*/gi, '')
    .replace(/добавь?\s+(?:текст|надпись)\s*/gi, '')
    .replace(/напиши?\s*/gi, '')
    .replace(/ավելացրու?\s+տեքստ\s*/gi, '')
    .replace(/գրիր?\s*/gi, '')
    .trim()

  return { sceneDescription, overlayText, hasTextIntent: true }
}

// ─── Main Prompt Compiler ──────────────────────────────────────────────────────

export interface CompilePromptInput {
  sceneId: string
  category: string
  selectedChipIds: string[]
  // Custom text AFTER parsing — already split into scene description and overlay text
  // Only the sceneDescription portion is passed here (overlayText handled separately)
  translatedSceneDescription?: string
}

export function compilePrompt(input: CompilePromptInput): string {
  const scenePrompt =
    SCENE_PROMPTS[input.sceneId] ??
    SCENE_PROMPTS['soft_shadow_studio'] // safe fallback

  const chipFragments = input.selectedChipIds
    .map((id) => CHIP_PROMPTS[id])
    .filter(Boolean)
    .join(', ')

  const customFragment = input.translatedSceneDescription?.trim() ?? ''

  const parts = [
    PRODUCT_PRESERVATION_PREFIX,
    scenePrompt,
    chipFragments,
    customFragment,
    GLOBAL_QUALITY_SUFFIX,
  ].filter(Boolean)

  return parts.join(', ')
}

export function sanitizeCustomText(text: string): string {
  return text
    .replace(/<[^>]*>/g, '')
    .replace(/ignore\s+(previous|all|above)/gi, '')
    .replace(/system\s*prompt/gi, '')
    .replace(/\[INST\]|\[\/INST\]/g, '')
    .trim()
    .slice(0, 300)
}

// ─── Negative prompt (kept for potential future use) ──────────────────────────
export function getNegativePrompt(): string {
  return 'blurry, distorted, deformed, duplicate, bad quality, low resolution, watermark'
}
