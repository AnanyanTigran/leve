// ─── Scene Prompt Library ──────────────────────────────────────────────────────
// All prompts follow Kontext's canonical edit pattern from the BFL prompting
// guide and community findings (mimicpc.com, fluxai.pro, kontext-dev.com):
//   imperative verb → object → key descriptors → photographic vocabulary.
// Composition lock (position, scale, camera angle) lives in the trailing
// PRODUCT_PRESERVATION_SUFFIX, not in scene prompts — putting it in both
// wastes the 512-token budget and dilutes the scene instruction.

const SCENE_PROMPTS: Record<string, string> = {
  // ─── Studio ────────────────────────────────────────────────────────────────
  // "Cyclorama" + "softbox" are the canonical photography tokens Kontext
  // responds to; "backdrop" is fuzzier and renders flatter.
  pure_white_studio:
    'Replace the background with a pure white seamless studio cyclorama. Light the product with even shadowless commercial softbox lighting wrapping it from all sides.',

  // Contact shadow is the single most useful "ground the product" cue.
  soft_shadow_studio:
    'Replace the background with a clean white studio surface and add a soft natural contact shadow directly beneath the product. Light with diffused overhead studio softbox lighting.',

  // Gradient backdrop — explicit fade direction reduces banding.
  gray_gradient:
    'Replace the background with a smooth light-gray seamless studio gradient that fades slightly darker near the bottom. Add a subtle soft drop shadow beneath the product.',

  // Lightbox = shadowless wraparound. "Catalog photography" anchors style.
  light_box:
    'Place the product inside a brightly lit white lightbox with evenly diffused light wrapping every side. Use crisp shadowless packshot lighting suitable for catalog photography.',

  // Dark luxury — rim light is the highest-value cue for editorial moods.
  black_studio:
    'Replace the background with a deep matte-black studio backdrop. Add a single soft rim light grazing the product edges for a dramatic luxury editorial mood.',

  // ─── Lifestyle Surfaces ────────────────────────────────────────────────────
  // "Replace the surface beneath the product" is more precise than "place on" —
  // it tells Kontext to edit only the surface plane, not reposition the product.
  marble_luxury:
    'Replace the surface beneath the product with polished white marble featuring delicate gray veining. Light with soft natural daylight from the upper left. Softly blur the background with a shallow depth of field.',

  dark_wood:
    'Replace the surface beneath the product with a dark walnut wood tabletop showing visible natural grain. Light the scene with warm ambient indoor lighting for a cozy editorial atmosphere.',

  light_wood:
    'Replace the surface beneath the product with a light oak wooden tabletop showing visible natural grain. Light the scene with bright soft morning daylight in a Scandinavian minimal aesthetic.',

  concrete_industrial:
    'Replace the surface beneath the product with raw textured concrete showing subtle imperfections. Light with a single directional side light for an urban industrial editorial feel.',

  linen_fabric:
    'Replace the surface beneath the product with softly draped natural linen fabric, including gentle folds and wrinkles. Light with soft diffused daylight for an organic lifestyle aesthetic.',

  velvet_dark:
    'Replace the surface beneath the product with deep dark velvet that softly absorbs light. Add a single rim light grazing the product edges, surrounded by rich shadow for a luxury editorial mood.',

  silk_white:
    'Replace the surface beneath the product with smooth white silk fabric featuring elegant gentle folds. Light with soft diffused light for a refined luxury feel.',

  terrazzo:
    'Replace the surface beneath the product with a pastel-toned terrazzo composite featuring scattered colored chips. Light with bright even modern lighting for a clean contemporary aesthetic.',

  // ─── Environment ───────────────────────────────────────────────────────────
  // Each environment names the foreground surface AND a softly blurred
  // background depth cue separately. Kontext renders environments more
  // reliably when surface and background are split into two clauses.
  bathroom_shelf:
    'Place the product on a clean white bathroom shelf with a softly blurred white tile wall behind it and a folded towel out of focus to one side. Use soft natural light coming through a nearby window.',

  kitchen_counter:
    'Place the product on a clean light kitchen countertop with fresh herbs and a few cooking ingredients softly blurred in the background. Light the scene with bright morning daylight.',

  vanity_table:
    'Place the product on a wooden makeup vanity with a softly blurred mirror behind it. Light the scene with warm soft beauty lighting from vanity bulbs.',

  cafe_table:
    'Place the product on a small wooden cafe table with a warm cafe interior softly blurred behind it. Light the scene with warm ambient indoor lighting and gentle window-light highlights.',

  outdoor_garden:
    'Place the product on a wooden garden table with green plants and leaves softly blurred behind it. Light the scene with bright natural sunlight for a fresh outdoor feel.',

  office_desk:
    'Place the product on a clean modern minimal office desk with a softly blurred laptop and notebook behind it. Light with bright soft professional daylight.',

  bed_pillows:
    'Place the product on crisp white bedding with softly arranged pillows around it. Light the scene with soft morning sunlight filtering through sheer curtains for a cozy lifestyle feel.',

  beach_sand:
    'Place the product on smooth golden beach sand with the ocean softly blurred in the background. Light with warm golden-hour sunlight for a sun-kissed lifestyle scene.',

  // ─── Seasonal ──────────────────────────────────────────────────────────────
  // "Surround the product with..." is the precise Kontext verb for adding
  // props around a preserved subject — far stronger than "scene with X around".
  holiday_new_year:
    'Surround the product with elegant Christmas decorations — gold ornaments, pine branches, and warm fairy lights softly blurred behind. Light with warm festive ambient lighting.',

  spring_bloom:
    'Surround the product with fresh spring flowers and soft cherry blossom petals in pastel pinks and whites. Light with bright airy daylight for a seasonal spring feel.',

  autumn_warm:
    'Place the product on a wooden surface with scattered autumn leaves in red, orange, and gold tones around it. Light with warm golden afternoon sunlight for a cozy autumn atmosphere.',

  summer_fresh:
    'Place the product on a bright clean surface with ice cubes, fresh water droplets, and citrus slices arranged around it. Light with bright crisp daylight for a vibrant summer feel.',

  // Marketing scene — explicit empty area for the post-composite text overlay.
  sale_promo:
    'Replace the background with a vibrant solid colored backdrop. Light with bold dynamic studio lighting and leave a clean empty area on the left side of the frame for promotional text overlay.',

  // ─── Creative ──────────────────────────────────────────────────────────────
  // "Make the product appear to float" — instructional framing for the effect.
  floating_levitation:
    'Make the product appear to float in mid-air against a clean soft light-gray gradient background. Add a soft dramatic contact shadow on the surface directly beneath it.',

  // High-speed water — "frozen motion" + "commercial beverage photography"
  // gives Kontext the strongest reference style.
  splash_water:
    'Surround the product with dynamic frozen splashes of clear water suspended in mid-air. Use crisp high-speed studio lighting that captures the water motion as in commercial beverage photography.',

  ingredients_flat_lay:
    'Compose the scene as a flat lay shot from directly overhead, with the product centered and surrounded by its natural ingredients. Use soft even top-down lighting.',

  neon_glow:
    'Place the product on a dark surface with vivid neon light reflections in pink, cyan, and purple washing across the background. Use a moody cyberpunk editorial aesthetic.',

  minimal_pastel:
    'Replace the background with a soft single-tone pastel seamless backdrop. Light with even soft minimal studio lighting for a clean modern composition.',

  editorial_dark:
    'Place the product in a moody dark editorial scene with deep shadows and a single dramatic key light from the side. Use a high-contrast luxury brand aesthetic.',

  // ─── Additions (2026-06) ───────────────────────────────────────────────────
  // Backed by competitor research (Pebblely top templates, Photoroom
  // best-converting backgrounds) and cultural anchoring for the Armenian SME
  // audience. See audit deliverable 3 for rationale.

  // Solid vibrant color backdrop — Pebblely's most-used template type.
  colored_pop:
    'Replace the background with a vibrant solid bright color such as deep coral, sage green, or sky blue. Light the product with crisp even studio softbox lighting for a bold modern aesthetic.',

  // Armenian apricot — national symbolic color (Pantone 1235 family).
  // Flatters skincare, jewelry, and warm-toned product palettes.
  apricot_warm:
    'Replace the background with a warm seamless apricot-peach gradient that fades slightly darker near the bottom. Light with soft diffused warm studio lighting.',

  // Armenian copper jezve coffee context — culturally specific cafe scene.
  coffee_jezve:
    'Place the product on a small wooden cafe table beside a small Armenian copper coffee jezve and a tiny cup of black coffee, with a warm cafe interior softly blurred behind. Light the scene with warm ambient indoor lighting.',

  // Wildberries-compliant packshot: neutral white, 15% padding, 70% fill.
  wb_white_strict:
    'Replace the background with a clean neutral white seamless backdrop. Light with even shadowless commercial softbox lighting. Leave approximately 15 percent empty padding around the product. Compose the product to fill approximately 70 percent of the frame, perfectly centered.',

  // Best-converting lifestyle framing without a full model — "in hand".
  handheld_lifestyle:
    'Place the product as if gently held in a person’s hand, with only the hand visible and the rest of the frame softly blurred. Light with soft natural daylight from the side. Use a shallow depth of field for a candid lifestyle feel.',
}

// ─── Chip Prompt Fragments ─────────────────────────────────────────────────────
// Each chip group emits ONE sentence in compilePrompt. Lighting / angle / mood
// fragments are noun phrases that slot into a group-specific wrapper sentence,
// matching Kontext's "verb-first, object next" pattern. Category-specific chips
// are full imperative sentences because they describe distinct prop actions.

const CHIP_PROMPTS: Record<string, string> = {
  // Lighting — wrapped as "Light the scene with [phrase]."
  // Uses canonical photography vocabulary Kontext responds to:
  // softbox, chiaroscuro, golden-hour, color temperature.
  light_natural:   'soft natural daylight pouring in from a large side window',
  light_studio:    'soft diffused studio softbox lighting from above with controlled fall-off',
  light_dramatic:  'hard directional key lighting with deep chiaroscuro shadows and high contrast',
  light_golden:    'warm golden-hour sunlight with long soft amber-toned shadows',
  light_cool:      'crisp cool daylight with clean neutral color temperature',

  // Angle — wrapped as "Frame the shot [phrase]."
  // NOTE: Kontext is image-to-image; it inherits camera angle from the source.
  // Angle chips fight that inheritance and often produce subtle distortion.
  // See [[ux-angle-chip-removal]] for the recommendation to drop the angle
  // chip group from the universal panel; the prompts remain valid for the
  // few cases where the user genuinely wants a re-frame (flat-lay especially).
  angle_front:     'from a straight head-on camera angle at product height',
  angle_45:        'from a three-quarter 45-degree camera angle showing depth',
  angle_top:       'as a top-down flat lay seen from directly overhead',
  angle_low:       'from a low camera angle looking slightly up at the product',
  angle_closeup:   'as a tight macro close-up with shallow depth of field',

  // Mood — wrapped as "The overall atmosphere is [phrase]."
  mood_minimal:    'minimal and restrained with generous negative space',
  mood_luxury:     'premium and aspirational with editorial sophistication',
  mood_warm:       'warm cozy and inviting throughout',
  mood_fresh:      'fresh clean bright and energetic',
  mood_bold:       'bold saturated and graphically striking',

  // Brand color accent — wrapped as "Tint the background and surrounding props
  // with subtle [phrase] tones." Lets users align outputs with a brand palette
  // without overriding the chosen scene.
  accent_cream:    'warm cream and ivory',
  accent_sage:     'soft sage green',
  accent_pink:     'dusty pink',
  accent_blue:     'soft sky blue',
  accent_charcoal: 'deep charcoal gray',
  accent_apricot:  'warm apricot peach',

  // Beauty — full imperative sentences.
  // Each chip describes a distinct prop action that Kontext should apply
  // around the preserved product.
  beauty_flowers:      'Place small fresh flowers around the product as a soft floral accent.',
  beauty_water:        'Scatter fresh water droplets on the surface around the product.',
  beauty_ingredients:  'Arrange the natural ingredients of the product around it as visual accents.',
  beauty_dewy:         'Give the surrounding surfaces a soft dewy moist glow.',
  beauty_matte:        'Give the surrounding surfaces a soft matte powdery finish.',

  // Jewelry — full imperative sentences.
  jewelry_macro:       'Compose as an extreme macro view that reveals fine jewel and metal detail.',
  jewelry_reflection:  'Add a subtle symmetrical mirror reflection of the product on the surface beneath it.',
  jewelry_box:         'Place an elegant open jewelry box beside the product.',
  jewelry_pair:        'Display a second matching item beside the product.',

  // Fashion — full imperative sentences.
  fashion_hanger:      'Display the garment on an elegant wooden or brass hanger.',
  fashion_flatlay:     'Style the garment as a neat flat lay seen from directly above.',
  fashion_folded:      'Display the garment neatly folded on the surface.',
  fashion_accessories: 'Style complementary fashion accessories beside the product.',

  // Food — full imperative sentences.
  food_steam:          'Add gentle wisps of rising steam to suggest a fresh hot product.',
  food_cut:            'Place a portion of the product sliced open beside it, revealing the fresh interior.',
  food_cutlery:        'Arrange elegant cutlery beside the food.',
  food_top:            'Compose from directly overhead with complementary ingredients around the product.',

  // Marketplace — full imperative sentences.
  // Explicit percentages because Wildberries enforces ~70-80% product fill
  // and 15% edge safe zone for platform badges.
  market_padding:      'Leave approximately 15 percent empty padding around the product to meet marketplace requirements.',
  market_fill:         'Compose the product to fill approximately 85 percent of the frame, perfectly centered.',
  market_noprops:      'Keep the background completely clean with no props or decorative elements.',
}

// Chip ID → group. Server-side mapping so we do not need to ship the FE
// RefinementChip type into the API. ID prefixes already encode the group;
// the explicit map is kept for clarity and to catch typos at lookup time.
const CHIP_GROUPS: Record<string, 'lighting' | 'angle' | 'mood' | 'accent' | 'category'> = {
  light_natural: 'lighting', light_studio: 'lighting', light_dramatic: 'lighting',
  light_golden: 'lighting', light_cool: 'lighting',

  angle_front: 'angle', angle_45: 'angle', angle_top: 'angle',
  angle_low: 'angle', angle_closeup: 'angle',

  mood_minimal: 'mood', mood_luxury: 'mood', mood_warm: 'mood',
  mood_fresh: 'mood', mood_bold: 'mood',

  accent_cream: 'accent', accent_sage: 'accent', accent_pink: 'accent',
  accent_blue: 'accent', accent_charcoal: 'accent', accent_apricot: 'accent',

  beauty_flowers: 'category', beauty_water: 'category', beauty_ingredients: 'category',
  beauty_dewy: 'category', beauty_matte: 'category',

  jewelry_macro: 'category', jewelry_reflection: 'category',
  jewelry_box: 'category', jewelry_pair: 'category',

  fashion_hanger: 'category', fashion_flatlay: 'category',
  fashion_folded: 'category', fashion_accessories: 'category',

  food_steam: 'category', food_cut: 'category',
  food_cutlery: 'category', food_top: 'category',

  market_padding: 'category', market_fill: 'category', market_noprops: 'category',
}

// ─── Product Preservation Constraint (trails the prompt) ──────────────────────
// Placed AT THE END so Kontext reads scene edits FIRST and locks the product
// as the stability constraint. Phrasing mirrors BFL's canonical guide:
//   "in the exact same position, scale, and pose ... maintain identical
//   subject placement, camera angle, framing, and perspective."
// Including camera angle here is what lets us safely drop angle preservation
// from individual scene prompts.

const PRODUCT_PRESERVATION_SUFFIX =
  'Keep the product itself identical to the source image — preserve its exact shape, colors, materials, labels, printed text, logos, and proportions. ' +
  'Maintain the exact same product position, scale, orientation, and camera angle as in the source. ' +
  'Do not add any new text, badges, stickers, watermarks, or promotional graphics to the product or scene.'

// ─── Global Quality Cue ────────────────────────────────────────────────────────
// Specific photographic vocabulary (high-resolution, sharp focus, true-to-source
// colors, soft contact shadow) shifts Kontext output measurably; generic tokens
// like "photorealistic" or "professional photography" carry near-zero semantic
// weight at inference and were removed.

const GLOBAL_QUALITY_SUFFIX =
  'Deliver high-resolution professional product photography quality with sharp focus on the product, accurate true-to-source colors, realistic soft contact shadows grounding it to the surface, and crisp commercial detail.'

// ─── Text-on-Image Detection ───────────────────────────────────────────────────
// Detect when user wants text rendered ON the image.
// We extract the text, do NOT send to Kontext, apply via sharp SVG composite
// instead. Kept verbatim from the previous implementation — these patterns
// are validated and correct.

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
  const overlayText = quotedMatch?.[1]?.trim() ?? null

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
  // Custom text AFTER parsing — already split into scene description and overlay text.
  // Only the sceneDescription portion is passed here (overlayText handled separately).
  translatedSceneDescription?: string
}

// Group-specific wrapper sentences. Each refinement chip group emits ONE
// sentence so Kontext sees a verb-led instruction per intent, instead of a
// single comma-chained "Use X, Y, Z." blob that dilutes everything.
const GROUP_WRAPPERS = {
  lighting: (phrase: string) => `Light the scene with ${phrase}.`,
  angle:    (phrase: string) => `Frame the shot ${phrase}.`,
  mood:     (phrase: string) => `The overall atmosphere is ${phrase}.`,
  accent:   (phrase: string) => `Tint the background and surrounding props with subtle ${phrase} tones.`,
}

// Assembly order (matches BFL canonical "actions first, preservation last"):
//   1. scene instruction      — the primary action to apply
//   2. lighting refinement    — modifies scene lighting
//   3. mood refinement        — modifies scene atmosphere
//   4. angle refinement       — modifies framing (rarely selected; see note above)
//   5. category refinement    — adds props / composition specifics
//   6. translated custom text — user free-form intent
//   7. global quality cue     — output quality constraint
//   8. product preservation   — LAST — locks stability of the product
export function compilePrompt(input: CompilePromptInput): string {
  const scenePrompt =
    SCENE_PROMPTS[input.sceneId] ??
    SCENE_PROMPTS['soft_shadow_studio'] // safe fallback

  // Bucket chip IDs by group so we can emit one wrapping sentence per group.
  const byGroup: Record<'lighting' | 'angle' | 'mood' | 'accent' | 'category', string[]> = {
    lighting: [], angle: [], mood: [], accent: [], category: [],
  }
  for (const chipId of input.selectedChipIds) {
    const phrase = CHIP_PROMPTS[chipId]
    const group = CHIP_GROUPS[chipId]
    if (!phrase || !group) continue
    byGroup[group].push(phrase)
  }

  const lightingSentence = byGroup.lighting.length > 0
    ? GROUP_WRAPPERS.lighting(byGroup.lighting.join(' and '))
    : ''
  const moodSentence = byGroup.mood.length > 0
    ? GROUP_WRAPPERS.mood(byGroup.mood.join(' and '))
    : ''
  const angleSentence = byGroup.angle.length > 0
    ? GROUP_WRAPPERS.angle(byGroup.angle.join(' and '))
    : ''
  const accentSentence = byGroup.accent.length > 0
    ? GROUP_WRAPPERS.accent(byGroup.accent.join(' and '))
    : ''
  // Category chips are already full sentences — concatenate as-is.
  const categorySentence = byGroup.category.length > 0
    ? byGroup.category.join(' ')
    : ''

  const customRaw = input.translatedSceneDescription?.trim() ?? ''
  const customSentence = customRaw
    ? (/[.!?]$/.test(customRaw) ? customRaw : `${customRaw}.`)
    : ''

  const parts = [
    scenePrompt,
    lightingSentence,
    moodSentence,
    accentSentence,
    angleSentence,
    categorySentence,
    customSentence,
    GLOBAL_QUALITY_SUFFIX,
    PRODUCT_PRESERVATION_SUFFIX,
  ].filter(Boolean)

  return parts.join(' ')
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
// FLUX/Kontext do not consume negative prompts at inference, but we retain this
// helper for future model swaps or post-filter logic.
export function getNegativePrompt(): string {
  return 'blurry, distorted, deformed, duplicate, bad quality, low resolution, watermark'
}
