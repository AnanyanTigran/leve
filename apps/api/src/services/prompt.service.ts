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
    'Replace the background with a clean white studio surface and add a soft natural contact shadow directly beneath the product. Light with diffused overhead studio softbox lighting. Place the product on a clean white matte surface.',

  // Gradient backdrop — explicit fade direction reduces banding.
  gray_gradient:
    'Replace the background with a smooth light-gray seamless studio gradient that fades slightly darker near the bottom. Add a subtle soft drop shadow beneath the product. Place the product on the gradient surface. Add a subtle soft drop shadow beneath it, as in professional packshot photography.',

  // Lightbox = shadowless wraparound. "Catalog photography" anchors style.
  light_box:
    'Enclose the product inside a brightly lit white lightbox with evenly diffused light wrapping every side. Use crisp shadowless packshot lighting suitable for catalog photography.',

  // Dark luxury — rim light is the highest-value cue for editorial moods.
  black_studio:
    'Replace the background with a deep matte-black studio backdrop as used in luxury perfume advertising. Add a single soft rim light grazing the product edges for a dramatic luxury editorial mood. Add a faint reflected highlight on the dark surface directly beneath the product.',

  // ─── Lifestyle Surfaces ────────────────────────────────────────────────────
  // "Replace the surface beneath the product" is more precise than "place on" —
  // it tells Kontext to edit only the surface plane, not reposition the product.
  marble_luxury:
    'Replace the surface beneath the product with polished white marble featuring delicate gray veining. Light with soft natural daylight from the upper left. Softly blur the background with a shallow depth of field.',

  dark_wood:
    'Replace the surface beneath the product with a dark walnut wood tabletop showing visible natural grain. Light the scene with warm ambient indoor lighting for a warm editorial atmosphere. Replace the background behind the product with a softly blurred dark interior wall.',

  light_wood:
    'Replace the surface beneath the product with a light oak wooden tabletop showing visible natural grain. Light the scene with bright soft morning daylight in a Scandinavian minimal aesthetic. Replace the background behind the product with a softly blurred bright white or cream wall.',

  concrete_industrial:
    'Replace the surface beneath the product with raw textured concrete showing subtle imperfections. Light with a single directional side light for an urban industrial editorial feel. Replace the background behind the product with a softly blurred concrete or raw brick wall.',

  linen_fabric:
    'Replace the surface beneath the product with softly draped natural linen fabric, including gentle folds and wrinkles. Light with soft diffused daylight for an organic lifestyle aesthetic.',

  velvet_dark:
    'Replace the surface beneath the product with deep dark velvet that softly absorbs light, with visible short pile texture. Add a single rim light grazing the product edges, surrounded by rich shadow for a luxury editorial mood.',

  silk_white:
    'Replace the surface beneath the product with smooth white silk fabric featuring elegant gentle folds. Light with soft diffused light for a refined luxury feel. Replace the background behind the product with a softly blurred neutral light gray.',

  terrazzo:
    'Replace the surface beneath the product with polished terrazzo stone surface with scattered aggregate chips in muted pastels — cream, dusty pink, sage, and soft blue — with a visible glossy polish finish. Light with bright even modern lighting for a clean contemporary aesthetic.',

  // ─── Environment ───────────────────────────────────────────────────────────
  // Each environment names the foreground surface AND a softly blurred
  // background depth cue separately. Kontext renders environments more
  // reliably when surface and background are split into two clauses.
  // "Replace the surface beneath the product" / "Replace the background behind
  // the product" are the canonical Kontext edit verbs — they instruct the model
  // to modify only the environment, not reposition or recompose the subject.
  bathroom_shelf:
    'Replace the surface beneath the product with a clean white bathroom shelf. Add a softly blurred white tile wall behind it and a folded towel out of focus to one side. Use soft natural light coming through a nearby window.',

  kitchen_counter:
    'Replace the surface beneath the product with a clean light kitchen countertop. Add contextually appropriate props softly blurred in the background. Light the scene with bright morning daylight.',

  vanity_table:
    'Replace the surface beneath the product with a wooden makeup vanity. Add a softly blurred mirror behind it. Light the scene with warm soft beauty lighting from vanity bulbs surrounding the mirror, casting a diffused beauty-studio glow.',

  cafe_table:
    'Replace the surface beneath the product with a small wooden cafe table. Keep a warm cafe interior softly blurred behind it. Light the scene with warm ambient indoor lighting and gentle window-light highlights.',

  outdoor_garden:
    'Replace the surface beneath the product with a wooden garden terrace table. Add lush green foliage and a softly blurred garden terrace behind the product. Light the scene with bright natural sunlight for a fresh outdoor feel.',

  office_desk:
    'Replace the surface beneath the product with a clean modern minimal office desk. Add softly blurred minimal office elements in the background. Light with bright soft professional daylight.',

  bed_pillows:
    'Replace the surface beneath the product with crisp white bedding. Add softly arranged pillows around it. Light the scene with soft morning sunlight filtering through sheer curtains for a cozy lifestyle feel.',

  beach_sand:
    'Replace the surface beneath the product with smooth golden beach sand. Keep the ocean softly blurred in the background. Light with warm golden-hour sunlight for a sun-kissed lifestyle scene.',

  // ─── Seasonal ──────────────────────────────────────────────────────────────
  // "Surround the product with..." is the precise Kontext verb for adding
  // props around a preserved subject — far stronger than "scene with X around".
  holiday_new_year:
    'Surround the product with elegant Christmas decorations — gold ornaments, pine branches, and warm fairy lights softly blurred behind. Light with warm festive ambient lighting.',

  spring_bloom:
    'Surround the product with fresh spring flowers and soft cherry blossom petals in pastel pinks and whites. Light with bright airy daylight for a seasonal spring feel.',

  autumn_warm:
    'Replace the surface beneath the product with a dark wood surface scattered with autumn leaves in red, orange, and gold tones. Surround the product with additional softly blurred falling leaves. Light with warm golden afternoon sunlight for a cozy autumn atmosphere.',

  summer_fresh:
    'Replace the surface beneath the product with a cool white marble or light tile surface. Arrange ice cubes, fresh water droplets, and citrus slices around it. Light with bright crisp daylight for a vibrant summer feel.',

  // Marketing scene — text composited post-generation via sharp, not via Kontext.
  sale_promo:
    'Replace the background with a bold deep red seamless studio backdrop. Light the product with crisp even commercial studio softbox lighting. Keep the composition centered.',

  // ─── Creative ──────────────────────────────────────────────────────────────
  // "Make the product appear to float" — instructional framing for the effect.
  floating_levitation:
    'Make the product appear to float in mid-air against a clean soft light-gray gradient background. Add a soft dramatic contact shadow on the surface directly beneath it. Keep the product in its exact same position, scale, and orientation. Only remove the surface beneath it and replace the background.',

  // High-speed water — "frozen motion" + "commercial beverage photography"
  // gives Kontext the strongest reference style.
  splash_water:
    'Surround the product with dynamic frozen splashes of clear water suspended in mid-air. Use crisp high-speed studio lighting that captures the water motion as in commercial beverage photography. Keep the product itself completely dry and visually unchanged — the water only surrounds it.',

  ingredients_flat_lay:
    'Compose the scene as a flat lay shot from directly overhead, with the product centered and surrounded by its natural ingredients. Use soft even top-down lighting.',

  neon_glow:
    'Replace the surface beneath the product with a dark surface. Cast vivid neon light reflections in pink, cyan, and purple across the background. Use a moody cyberpunk editorial aesthetic. Cast the neon reflections only on the background and the surface around the product, not on the product itself.',

  minimal_pastel:
    'Replace the background with a soft warm cream seamless studio backdrop. Light with even soft minimal studio lighting for a clean modern composition.',

  editorial_dark:
    'Replace the background with a deep dark editorial setting with rich shadows. Add a single hard key light from the upper left casting dramatic deep shadows across the scene. Use a high-contrast luxury brand aesthetic.',

  // ─── Additions (2026-06) ───────────────────────────────────────────────────
  // Backed by competitor research (Pebblely top templates, Photoroom
  // best-converting backgrounds) and cultural anchoring for the Armenian SME
  // audience. See audit deliverable 3 for rationale.

  // Solid vibrant color backdrop — Pebblely's most-used template type.
  colored_pop:
    'Replace the background with a vibrant solid bright color in deep coral-red. Light the product with crisp even studio softbox lighting for a bold modern aesthetic.',

  // Armenian apricot — national symbolic color (Pantone 1235 family).
  // Flatters skincare, jewelry, and warm-toned product palettes.
  apricot_warm:
    'Replace the background with a warm seamless apricot-peach gradient that fades slightly darker near the bottom. Light with soft diffused warm studio lighting. Place the product on the apricot surface with a very soft warm contact shadow beneath it.',

  // Armenian copper jezve coffee context — culturally specific cafe scene.
  coffee_jezve:
    'Replace the surface beneath the product with a small wooden cafe table. Add a small Armenian copper coffee jezve and a tiny cup of black coffee beside the product, with a warm cafe interior softly blurred behind. Light the scene with warm ambient indoor lighting. Keep the jezve and coffee cup visually distinct and clearly separate from the product being photographed.',

  // Wildberries-compliant packshot: pure white (RGB 255,255,255), 15% padding, 85% fill.
  wb_white_strict:
    'Replace the background with a pure white seamless backdrop (RGB 255,255,255). Light with even shadowless commercial softbox lighting. Leave approximately 15 percent empty padding around the product. Compose the product to fill approximately 85 percent of the frame, perfectly centered.',

  // Lifestyle hand framing — product stays locked, hand enters from bottom edge.
  handheld_lifestyle:
    'Replace the background and surface with a softly blurred warm lifestyle setting. Keep the product in exactly its current position, scale, and orientation. Add a partially visible human hand entering the lower edge of the frame as if gently holding the product from below — the hand must not obscure or alter the product itself.',

  // ─── New scenes (2026-06) ───────────────────────────────────────────────────

  acrylic_reflect:
    'Replace the surface beneath the product with a polished clear acrylic or glass sheet. Add a clean subtle mirror reflection of the product on the surface directly beneath it. Light with soft diffused studio lighting to enhance the reflection without glare. Replace the background with a soft neutral light gray.',

  mirror_acrylic:
    'Replace the surface beneath the product with a polished white acrylic mirror surface. Add a clean symmetrical reflection of the product below it. Light with soft even diffused studio lighting that enhances the reflection and adds depth. Replace the background with a clean neutral white or pale gray.',

  stone_texture:
    'Replace the surface beneath the product with a natural stone or slate surface showing visible texture and grain. Light with cool soft directional side light for a refined organic feel. Replace the background behind the product with a softly blurred neutral stone-toned wall.',

  dark_stone:
    'Replace the surface beneath the product with a dark slate or black stone surface showing natural texture. Light with a single directional side light source creating rich deep shadows for a premium moody editorial aesthetic. Replace the background behind the product with a softly blurred very dark wall.',

  tech_desk_setup:
    'Replace the surface beneath the product with a clean minimal dark desk surface. Add softly blurred cool-toned ambient elements in the background — suggesting a modern tech workspace. Light with crisp cool professional daylight from above and a subtle blue ambient fill from the side. Replace the background with a deep dark blue-gray.',

  styled_shelf:
    'Replace the surface beneath the product with a clean light wood or white shelf surface. Add a softly blurred neutral wall behind it with a small out-of-focus green plant to one side. Light with soft warm natural window light from the left. The overall scene should feel like a curated home interior styled corner.',
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
  // Distinct from mood_luxury — leans toward magazine-cover composition with
  // negative space and high contrast, rather than the warm aspirational feel
  // of mood_luxury. Distinct from light_dramatic, which only changes lighting.
  mood_editorial:  'editorial magazine-cover composition with high contrast and negative space',

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

  // Electronics chips
  elec_packshot:  'Compose as a clean commercial packshot with even shadowless lighting.',
  elec_glow:      'Add a subtle LED blue or green light glow reflecting on the surface around the product.',
  elec_cable:     'Place a neatly coiled matching cable beside the product.',
  elec_dark_bg:   'Use a deep dark background to make the product stand out with high contrast.',

  // Home decor chips
  decor_plant:    'Place a small green potted plant beside the product out of focus.',
  decor_candle:   'Place an elegant unlit candle beside the product as a styling accent.',
  decor_flatlay:  'Arrange the composition as a flat lay viewed from slightly above.',
  decor_natural:  'Add natural organic elements — dried branches, stones, or raw linen — around the product.',

  // Toys & children chips
  toy_flatlay:    'Arrange the composition as a flat lay with the product centered from above.',
  toy_pastel:     'Use soft pastel tones throughout the background and surface.',
  toy_colorful:   'Use a bright vibrant background color that complements the product.',
  toy_white_bg:   'Use a clean pure white background suitable for marketplace listings.',
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
  mood_fresh: 'mood', mood_bold: 'mood', mood_editorial: 'mood',

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

  elec_packshot: 'category', elec_glow: 'category',
  elec_cable: 'category', elec_dark_bg: 'category',

  decor_plant: 'category', decor_candle: 'category',
  decor_flatlay: 'category', decor_natural: 'category',

  toy_flatlay: 'category', toy_pastel: 'category',
  toy_colorful: 'category', toy_white_bg: 'category',
}

// ─── Product Preservation Constraint (trails the prompt) ──────────────────────
// Placed AT THE END so Kontext reads scene edits FIRST and locks the product
// as the stability constraint. Phrasing mirrors BFL's canonical guide:
//   "in the exact same position, scale, and pose ... maintain identical
//   subject placement, camera angle, framing, and perspective."
// Including camera angle here is what lets us safely drop angle preservation
// from individual scene prompts.

const FOOD_PRESERVATION_PREFIX =
  'Preserve the food exactly as presented in its original plate, bowl, or serving vessel. Do not remove, replace, or alter the serving vessel in any way. Only modify the background and surrounding environment. '

const PRODUCT_PRESERVATION_SUFFIX =
  'Keep the product itself identical to the source image — preserve its exact shape, colors, materials, labels, printed text, logos, and proportions. ' +
  'Maintain the exact same product position, scale, orientation, and camera angle as in the source. ' +
  'Do not add any new text, badges, stickers, watermarks, or promotional graphics to the product or scene. ' +
  'Preserve the original exposure and brightness of the product. Do not darken, overexpose, or alter the product\'s natural lighting.'

// ─── Global Quality Cue ────────────────────────────────────────────────────────
// Specific photographic vocabulary (high-resolution, sharp focus, true-to-source
// colors, soft contact shadow) shifts Kontext output measurably; generic tokens
// like "photorealistic" or "professional photography" carry near-zero semantic
// weight at inference and were removed.

const GLOBAL_QUALITY_SUFFIX =
  'Deliver high-resolution professional product photography quality with sharp focus on the product, accurate true-to-source colors, realistic soft contact shadows grounding it to the surface, and crisp commercial detail.'

// ─── Main Prompt Compiler ──────────────────────────────────────────────────────
// NOTE: Text-on-image (price tags, "SALE", etc.) is no longer parsed here.
// The user picks the overlay on the results page and it is composited
// deterministically at HD download time. See audit R1.

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
    input.category === 'food_cafe' ? FOOD_PRESERVATION_PREFIX.trim() : '',
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
