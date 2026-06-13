// ─── Scene Prompt Library ──────────────────────────────────────────────────────
// All prompts follow Kontext's canonical edit pattern from the BFL prompting
// guide and community findings (mimicpc.com, fluxai.pro, kontext-dev.com):
//   imperative verb → object → key descriptors → photographic vocabulary.
// Grounding, quality, and preservation suffixes are assembled by compilePrompt
// from scene metadata — they are not embedded in scene strings, which eliminates
// the contradiction classes (shadowless scene demanding contact shadow, angle chip
// fighting the preservation suffix, floating scene demanding grounding shadow).

// ─── Types ────────────────────────────────────────────────────────────────────

type Grounding = 'contact_shadow' | 'reflection' | 'shadowless' | 'floating' | 'embedded'

interface SceneDef {
  action: string          // background/surface replacement instruction (imperative verb first)
  lighting: string        // default lighting sentence — REPLACED (not appended) when a
                          // lighting chip is selected
  grounding: Grounding    // drives which grounding sentence and quality suffix variant to use
  allowsReframe?: boolean // true only for flat-lay scenes; angle chips are silently dropped
                          // on all other scenes (they fight Kontext's i2i nature)
  guidanceScale?: number  // scene-specific override; replaces the DARK_SCENES set in worker
}

// ─── Grounding Sentences ──────────────────────────────────────────────────────
// "Shadow Contact Anchors" — the single most effective cue for preventing floating
// objects. Each grounding type gets a precise sentence tuned to its visual logic.
//
// Multi-instance preservation (audit A): contact_shadow / reflection / shadowless
// are phrased per-item ("the products … each item … all items kept in their
// original arrangement") so a pair/set on an empty studio surface is not collapsed
// to a single hero object. The count-completeness clause in buildPreservationSuffix
// (audit B) pins the count to the source so this plural phrasing cannot make a
// genuine single product sprout a phantom second item. floating and embedded keep
// their singular phrasing — they do not exhibit the collapse.

const GROUNDING_SENTENCES: Record<Grounding, string> = {
  contact_shadow:
    'The products rest firmly together on the surface, each item with its own soft natural contact shadow directly beneath it where it meets the surface, all items kept in their original arrangement, and the ambient scene light wraps gently around every item so they sit believably in the environment.',
  reflection:
    'The products stand firmly together on the reflective surface, each item with its own clean subtle mirror reflection directly beneath it and a thin soft contact occlusion where it touches the surface, all items kept in their original arrangement.',
  shadowless:
    'The products rest naturally together on the white surface, each item with only a faint ambient occlusion line where it touches the surface, all items kept in their original arrangement, keeping the backdrop itself completely clean and shadowless.',
  floating:
    'A soft diffused shadow pool on the ground surface far beneath the levitating product anchors the levitation effect and prevents the product from appearing cut out.',
  embedded:
    'The product is partially settled into the surface material with the surface texture and context realistically displaced around its base, anchoring it naturally to the scene.',
}

// ─── Quality Suffix ───────────────────────────────────────────────────────────
// Grounding-aware: shadowless and floating scenes must not demand "realistic
// soft shadowing" because the scene premise is explicitly shadow-free or aerial.

function buildQualitySuffix(grounding: Grounding): string {
  const base =
    'Deliver high-resolution professional product photography with sharp focus on the product, accurate true-to-source colours, and crisp commercial detail.'
  if (grounding === 'shadowless' || grounding === 'floating') return base
  return (
    base +
    ' Realistic soft shadowing and light wrap integrate the product naturally into the scene.'
  )
}

// ─── Preservation Suffix ──────────────────────────────────────────────────────
// Conflict-aware: when an angle chip was actually emitted (allowsReframe scene),
// omit the camera-angle lock — the user explicitly requested a reframe and
// locking angle would contradict the instruction.

const ANGLE_CHIP_IDS = new Set([
  'angle_front', 'angle_45', 'angle_top', 'angle_low', 'angle_closeup',
])
const SCALE_CHIP_IDS = new Set(['market_fill', 'market_padding'])

function buildPreservationSuffix(opts: {
  hasAngleChip: boolean
  hasScaleChip: boolean
}): string {
  const poseLock = opts.hasAngleChip
    ? ''  // angle chip explicitly requested a reframe — do NOT also lock camera angle
    : ' Maintain the exact same product position, scale, orientation, and camera angle as in the source.'
  const identityLock = opts.hasScaleChip
    ? 'Keep the product itself identical to the source image — preserve its exact shape, colours, materials, labels, printed text, logos, and proportions, even if its position in the frame changes.'
    : 'Keep the product itself identical to the source image — preserve its exact shape, colours, materials, labels, printed text, logos, and proportions.'
  // Count/completeness lock (audit B) — ALWAYS emitted, including for single
  // products. This is the guard that lets the pluralized grounding sentences
  // (audit A) stay unconditional: it pins the output count to the source, so a
  // genuine single product cannot gain a phantom second item, and a pair/set
  // cannot be collapsed, merged, or cropped down to one.
  const countLock =
    ' Keep all items from the source fully visible and intact — the number of items must remain exactly the same as the source; do not remove, merge, crop, or duplicate any item.'
  return (
    identityLock +
    poseLock +
    countLock +
    ' Do not add any new text, badges, stickers, or watermarks to the product or scene.' +
    ' Preserve the original exposure and colour of the product itself while the new scene lighting wraps around it.'
  )
}

// ─── Food Preservation Prefix ─────────────────────────────────────────────────
// Food category only — preserves serving vessel which Kontext otherwise replaces.

const FOOD_PRESERVATION_PREFIX =
  'Preserve the food exactly as presented in its original plate, bowl, or serving vessel. Do not remove, replace, or alter the serving vessel in any way. Only modify the background and surrounding environment. '

// ─── Scene Registry ───────────────────────────────────────────────────────────

const SCENES: Record<string, SceneDef> = {

  // ── Studio ─────────────────────────────────────────────────────────────────

  pure_white_studio: {
    action: 'Replace the background with a pure white seamless studio cyclorama.',
    lighting:
      'Light the product with even commercial softbox lighting wrapping it from all sides, with a soft specular highlight along the product\'s upper edges.',
    grounding: 'shadowless',
  },

  soft_shadow_studio: {
    action: 'Replace the background with a clean white studio surface.',
    lighting:
      'Light with diffused overhead studio softbox lighting with a slight warm fill from the front.',
    grounding: 'contact_shadow',
  },

  gray_gradient: {
    action:
      'Replace the background with a smooth light-gray seamless studio gradient that fades slightly darker toward the bottom, as in professional packshot photography.',
    lighting: 'Light with soft even commercial studio softbox lighting from above.',
    grounding: 'contact_shadow',
  },

  light_box: {
    action:
      'Enclose the product inside a brightly lit white lightbox suitable for catalog packshot photography.',
    lighting:
      'Use evenly diffused light wrapping every side of the product, with soft white bounce light reflecting up onto its lower edges.',
    grounding: 'shadowless',
  },

  black_studio: {
    action:
      'Replace the background with a deep matte-black studio backdrop as used in luxury perfume advertising.',
    lighting:
      'Light with a single soft rim light grazing the product edges from behind, a dim soft fill from the front keeping the product face legible, and a faint reflected highlight on the dark surface directly beneath it.',
    grounding: 'reflection',
    // guidance_scale left at the 3.5 default (audit C): the 4.0 bump strengthened
    // adherence to the old singular framing and worsened pair-collapse on this
    // empty dark studio backdrop.
  },

  colored_pop: {
    action:
      'Replace the background with a bold solid-colour seamless studio backdrop in a vivid saturated hue that contrasts with the product.',
    lighting: 'Light with clean even commercial studio softbox lighting from above and front.',
    grounding: 'contact_shadow',
  },

  apricot_warm: {
    action:
      'Replace the background with a warm soft apricot-cream seamless studio gradient.',
    lighting:
      'Light with soft warm diffused studio lighting with a gentle golden fill from the side.',
    grounding: 'contact_shadow',
  },

  wb_white_strict: {
    action:
      'Replace the background with a pure white seamless backdrop (RGB 255,255,255). Compose the product to fill approximately 85 percent of the frame, perfectly centred, leaving approximately 15 percent empty padding around it.',
    lighting: 'Light with even shadowless commercial softbox lighting.',
    grounding: 'shadowless',
  },

  // ── Lifestyle Surfaces ─────────────────────────────────────────────────────

  marble_luxury: {
    action:
      'Replace the surface beneath the product with polished white marble featuring delicate gray veining, and softly blur the background with a shallow depth of field.',
    lighting:
      'Light with soft natural daylight from the upper left so the light wraps around the product edges with a gentle highlight on the lit side.',
    grounding: 'contact_shadow',
  },

  dark_wood: {
    action:
      'Replace the surface beneath the product with a dark walnut wood tabletop showing visible natural grain, and softly blur a warm dark background behind it.',
    lighting:
      'Light with warm ambient side lighting with a soft key light from the upper left creating rich wood-grain texture.',
    grounding: 'contact_shadow',
  },

  light_wood: {
    action:
      'Replace the surface beneath the product with a light oak wooden table surface showing natural grain, with a softly blurred neutral wall background.',
    lighting:
      'Light with bright soft natural morning daylight from the left in a clean Scandinavian minimal style.',
    grounding: 'contact_shadow',
  },

  concrete_industrial: {
    action:
      'Replace the surface beneath the product with a raw concrete surface showing texture and grain, with a blurred concrete or brick wall background.',
    lighting:
      'Light with cool directional hard side light creating defined shadows that emphasise the concrete texture.',
    grounding: 'contact_shadow',
  },

  linen_fabric: {
    action:
      'Replace the surface beneath the product with natural linen fabric with soft organic wrinkles and texture.',
    lighting:
      'Light with soft diffused daylight for a clean organic aesthetic.',
    grounding: 'embedded',
  },

  velvet_dark: {
    action:
      'Replace the surface beneath the product with a deep jewel-toned velvet fabric surface.',
    lighting:
      'Light with dramatic rim lighting tracing the product edges and a soft front fill, creating a luxury editorial mood.',
    grounding: 'embedded',
    guidanceScale: 4.0,
  },

  silk_white: {
    action:
      'Replace the surface beneath the product with white silk fabric with elegant soft folds and subtle sheen.',
    lighting:
      'Light with soft diffused elegant overhead light that picks up the silk sheen.',
    grounding: 'embedded',
  },

  terrazzo: {
    action:
      'Replace the surface beneath the product with pastel terrazzo surface in modern design aesthetic.',
    lighting:
      'Light with bright even daylight for a clean modern commercial look.',
    grounding: 'contact_shadow',
  },

  acrylic_reflect: {
    action:
      'Replace the surface beneath the product with a polished clear acrylic sheet and replace the background with a soft neutral light gray.',
    lighting:
      'Light with soft diffused studio lighting that enhances the reflection without glare.',
    grounding: 'reflection',
  },

  mirror_acrylic: {
    action:
      'Replace the surface beneath the product with a polished white acrylic mirror surface and replace the background with a clean neutral white or pale gray.',
    lighting:
      'Light with soft even diffused studio lighting that enhances the reflection and adds depth.',
    grounding: 'reflection',
  },

  stone_texture: {
    action:
      'Replace the surface beneath the product with a natural stone or slate surface showing visible texture and grain, and softly blur a neutral stone-toned wall behind it.',
    lighting:
      'Light with cool soft directional side light for a refined organic feel.',
    grounding: 'contact_shadow',
  },

  dark_stone: {
    action:
      'Replace the surface beneath the product with a dark slate or black stone surface showing natural texture, and softly blur a very dark wall behind it.',
    lighting:
      'Light with a single directional side light source creating rich deep shadows for a premium moody editorial aesthetic.',
    grounding: 'contact_shadow',
    guidanceScale: 4.0,
  },

  // ── Environment / Lifestyle ────────────────────────────────────────────────

  bathroom_shelf: {
    action:
      'Replace the surface and background with a bathroom shelf setting — white tiles, soft towels nearby, and natural light through a frosted window.',
    lighting:
      'Light with soft cool natural light from a window to the side.',
    grounding: 'contact_shadow',
  },

  kitchen_counter: {
    action:
      'Replace the surface and background with a clean kitchen countertop in morning light, with softly blurred herbs or ingredients in the background.',
    lighting:
      'Light with bright soft morning daylight from the left.',
    grounding: 'contact_shadow',
  },

  vanity_table: {
    action:
      'Replace the surface and background with a wooden makeup vanity table with a softly blurred mirror behind it.',
    lighting:
      'Light the scene with warm soft beauty lighting from vanity bulbs.',
    grounding: 'contact_shadow',
  },

  cafe_table: {
    action:
      'Replace the surface and background with a cafe table setting with a softly blurred warm cafe interior behind it.',
    lighting:
      'Light with warm ambient cafe lighting.',
    grounding: 'contact_shadow',
  },

  outdoor_garden: {
    action:
      'Replace the surface and background with an outdoor garden table setting with green plants and foliage softly blurred behind.',
    lighting:
      'Light with natural outdoor sunlight from above and to the side.',
    grounding: 'contact_shadow',
  },

  office_desk: {
    action:
      'Replace the surface and background with a clean minimal modern office desk with a blurred laptop and desk accessories in the background.',
    lighting:
      'Light with crisp cool professional daylight from the side.',
    grounding: 'contact_shadow',
  },

  bed_pillows: {
    action:
      'Replace the surface and background with white bedding and soft pillows, with morning sunlight through blurred curtains behind.',
    lighting:
      'Light with soft warm morning sunlight from the side.',
    grounding: 'embedded',
  },

  beach_sand: {
    action:
      'Replace the surface beneath the product with fine warm beach sand, with the ocean softly blurred in the background.',
    lighting:
      'Light with low golden-hour sunlight from the side, casting a long soft warm shadow from the product across the sand and a warm rim highlight on its sunlit edge.',
    grounding: 'embedded',
  },

  coffee_jezve: {
    action:
      'Replace the surface and background with a traditional Armenian coffee setup — dark wood surface, small copper jezve coffee pot and small cup blurred nearby.',
    lighting:
      'Light with warm intimate ambient lighting.',
    grounding: 'contact_shadow',
  },

  handheld_lifestyle: {
    action:
      'Replace the background and surface with a softly blurred warm lifestyle setting. Keep the product in exactly its current position, scale, and orientation. Add a partially visible human hand entering the lower edge of the frame as if gently holding the product from below — the hand must not obscure or alter the product itself.',
    lighting:
      'Light with soft warm natural lifestyle lighting.',
    grounding: 'contact_shadow',
  },

  tech_desk_setup: {
    action:
      'Replace the surface beneath the product with a clean minimal dark desk surface, with softly blurred cool-toned ambient tech workspace elements in the background. Replace the background with a deep dark blue-gray.',
    lighting:
      'Light with crisp cool professional daylight from above and a subtle blue ambient fill from the side.',
    grounding: 'contact_shadow',
  },

  styled_shelf: {
    action:
      'Replace the surface beneath the product with a clean light wood or white shelf surface, with a softly blurred neutral wall behind it and a small out-of-focus green plant to one side. The overall scene should feel like a curated home interior styled corner.',
    lighting:
      'Light with soft warm natural window light from the left.',
    grounding: 'contact_shadow',
  },

  // ── Seasonal ───────────────────────────────────────────────────────────────

  holiday_new_year: {
    action:
      'Surround the product with elegant Christmas decorations — gold ornaments, pine branches, and warm fairy lights softly blurred behind.',
    lighting:
      'Light with warm festive ambient lighting.',
    grounding: 'contact_shadow',
  },

  spring_bloom: {
    action:
      'Surround the product with fresh spring flowers and soft cherry blossom petals in pastel pinks and whites.',
    lighting:
      'Light with bright airy daylight for a seasonal spring feel.',
    grounding: 'contact_shadow',
  },

  autumn_warm: {
    action:
      'Replace the surface beneath the product with a dark wood surface scattered with autumn leaves in red, orange, and gold tones, with additional softly blurred falling leaves surrounding the product.',
    lighting:
      'Light with warm golden afternoon sunlight for a cozy autumn atmosphere.',
    grounding: 'contact_shadow',
  },

  summer_fresh: {
    action:
      'Replace the surface beneath the product with a cool white marble or light tile surface with ice cubes, fresh water droplets, and citrus slices arranged around it.',
    lighting:
      'Light with bright crisp daylight for a vibrant summer feel.',
    grounding: 'contact_shadow',
  },

  sale_promo: {
    action:
      'Replace the background with a bold deep red seamless studio backdrop. Keep the composition centred.',
    lighting:
      'Light the product with crisp even commercial studio softbox lighting.',
    grounding: 'contact_shadow',
  },

  // ── Creative / Editorial ──────────────────────────────────────────────────

  floating_levitation: {
    action:
      'Make the product appear to float in mid-air against a clean soft light-gray gradient background. Keep the product in its exact same position, scale, and orientation — only remove the surface beneath it.',
    lighting:
      'Light with soft directional studio light from above with a subtle bright rim along the product\'s top edges emphasising the levitation.',
    grounding: 'floating',
  },

  splash_water: {
    action:
      'Surround the product with dynamic frozen splashes of clear water suspended in mid-air around it, as in commercial beverage photography. The product surface stays clean and matte while crisp water droplets hang suspended in the air around it.',
    lighting:
      'Use crisp high-speed studio lighting that captures the water motion.',
    grounding: 'contact_shadow',
  },

  ingredients_flat_lay: {
    action:
      'Compose the scene as a flat lay shot from directly overhead, with the product centred and surrounded by its natural ingredients.',
    lighting:
      'Use soft even top-down lighting.',
    grounding: 'contact_shadow',
    allowsReframe: true,  // flat lay — angle_top chip makes sense here
  },

  neon_glow: {
    action:
      'Replace the surface beneath the product with a dark reflective surface and cast vivid neon light reflections in pink, cyan, and purple across the background behind it, in a moody cyberpunk editorial aesthetic.',
    lighting:
      'The product itself stays lit by a clean neutral white key light from the front, with only thin coloured neon rim highlights tracing its left and right edges.',
    grounding: 'reflection',
    // guidance_scale left at the 3.5 default (audit C): empty dark reflective
    // surface — the 4.0 bump amplified pair-collapse.
  },

  minimal_pastel: {
    action:
      'Replace the background with a soft warm cream seamless studio backdrop.',
    lighting:
      'Light with even soft minimal studio lighting for a clean modern composition.',
    grounding: 'contact_shadow',
  },

  editorial_dark: {
    action:
      'Replace the background with a deep dark editorial setting with rich shadows and moody atmosphere.',
    lighting:
      'Light with a single dramatic key light from the side with deep shadow on the opposite side, and a subtle rim light tracing the product edges.',
    grounding: 'contact_shadow',
    // guidance_scale left at the 3.5 default (audit C): empty dark editorial
    // background — the 4.0 bump amplified pair-collapse.
  },

  // ── New scenes ────────────────────────────────────────────────────────────

  podium_pedestal: {
    action:
      'Place the product on top of a smooth matte cream cylindrical display podium, with a soft beige arched alcove wall behind it and gentle negative space around the composition.',
    lighting:
      'Light with warm directional sunlight from the upper right, casting one clean soft-edged diagonal shadow of the product across the podium top and a soft light wrap along its lit edge.',
    grounding: 'contact_shadow',
  },

  water_ripple: {
    action:
      'Place the product standing upright in very shallow clear water over a soft blue-gray surface, with gentle concentric ripples radiating from its base and a clean reflection on the water.',
    lighting:
      'Light with bright soft daylight from above, with crisp small specular highlights on the ripples.',
    grounding: 'reflection',
  },

  gift_unboxing: {
    action:
      'Place the product emerging from an open kraft gift box with white crinkled tissue paper around its base, a length of satin ribbon resting beside the box on a warm neutral surface.',
    lighting:
      'Light with soft warm window light from the left.',
    grounding: 'embedded',
  },

  silk_pearls: {
    action:
      'Replace the surface beneath the product with softly draped champagne-coloured silk fabric with gentle folds, with a few scattered pearls softly blurred in the foreground and background.',
    lighting:
      'Light with soft diffused beauty lighting from the upper front, creating delicate specular highlights on the product and a soft shadow nestled in the silk folds beneath it.',
    grounding: 'embedded',
    guidanceScale: 4.0,
  },

  wb_hero_card: {
    action:
      'Replace the background with a smooth premium vertical gradient from soft ice-blue at the top to white at the bottom, with the product positioned in the lower two-thirds of the frame and clean empty space above it.',
    lighting:
      'Light with crisp even commercial studio lighting with a subtle cool rim highlight on the product edges.',
    grounding: 'contact_shadow',
  },

  window_shadow_play: {
    action:
      'Place the product on a warm white plaster wall ledge, with hard dappled sunlight casting sharp organic leaf and window-frame shadows across the wall behind it.',
    lighting:
      'Light with hard direct late-afternoon sunlight from the upper left, casting one crisp elongated shadow of the product itself onto the surface and a bright sunlit edge along its lit side.',
    grounding: 'contact_shadow',
  },

  color_block_duo: {
    action:
      'Replace the background with a bold two-tone colour block composition: a warm terracotta upper background meeting a soft cream lower surface in a clean horizontal line behind the product.',
    lighting:
      'Light with even bold studio lighting, casting one clean hard-edged shadow of the product diagonally onto the cream surface.',
    grounding: 'contact_shadow',
  },

  yerevan_tuff: {
    action:
      'Replace the surface and background with warm rose-pink volcanic tuff stone blocks with natural porous texture, like a sunlit Yerevan building facade, softly blurred behind the product.',
    lighting:
      'Light with warm low golden sunlight from the side, casting a soft warm shadow of the product onto the stone and a golden rim highlight along its edge.',
    grounding: 'contact_shadow',
  },

  pomegranate_luxe: {
    action:
      'Place the product on a dark wooden surface beside one whole pomegranate and a halved pomegranate with glistening ruby seeds, with a deep warm dark background softly blurred behind.',
    lighting:
      'Light with warm dramatic side light, creating rich deep shadows, glossy highlights on the pomegranate seeds, and a warm rim light tracing the product edges.',
    grounding: 'contact_shadow',
    guidanceScale: 4.0,
  },
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

// ─── Group Wrappers ───────────────────────────────────────────────────────────

// Group-specific wrapper sentences. Each refinement chip group emits ONE
// sentence so Kontext sees a verb-led instruction per intent, instead of a
// single comma-chained "Use X, Y, Z." blob that dilutes everything.
const GROUP_WRAPPERS = {
  lighting: (phrase: string) => `Light the scene with ${phrase}.`,
  angle:    (phrase: string) => `Frame the shot ${phrase}.`,
  mood:     (phrase: string) => `The overall atmosphere is ${phrase}.`,
  accent:   (phrase: string) => `Tint the background and surrounding props with subtle ${phrase} tones.`,
}

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

// Assembly order (matches BFL canonical "actions first, preservation last"):
//   1. scene.action         — primary background/surface replacement instruction
//   2. lighting             — scene default, or chip override (replaces, not appends)
//   3. grounding sentence   — tailored to scene.grounding type
//   4. mood refinement      — modifies scene atmosphere
//   5. accent refinement    — brand colour tint
//   6. angle refinement     — only emitted for allowsReframe scenes
//   7. category refinement  — props / composition specifics
//   8. custom text          — user free-form intent
//   9. food preservation    — food category only
//  10. quality suffix        — grounding-aware
//  11. preservation suffix  — conflict-aware (no angle lock when chip was emitted)

function bucketChips(
  chipIds: string[],
): Record<'lighting' | 'angle' | 'mood' | 'accent' | 'category', string[]> {
  const result: Record<'lighting' | 'angle' | 'mood' | 'accent' | 'category', string[]> = {
    lighting: [], angle: [], mood: [], accent: [], category: [],
  }
  for (const chipId of chipIds) {
    const phrase = CHIP_PROMPTS[chipId]
    const group = CHIP_GROUPS[chipId]
    if (!phrase || !group) continue
    result[group].push(phrase)
  }
  return result
}

export function compilePrompt(input: CompilePromptInput): string {
  const scene = SCENES[input.sceneId] ?? SCENES['soft_shadow_studio']!

  const byGroup = bucketChips(input.selectedChipIds)

  const hasAngleChip = input.selectedChipIds.some((id) => ANGLE_CHIP_IDS.has(id))
  const hasScaleChip = input.selectedChipIds.some((id) => SCALE_CHIP_IDS.has(id))

  // Lighting chip REPLACES scene default lighting — never appended to it.
  const lightingSentence =
    byGroup.lighting.length > 0
      ? GROUP_WRAPPERS.lighting(byGroup.lighting.join(' and '))
      : scene.lighting

  // Angle chips only emitted for scenes that allow reframing.
  const angleSentence =
    scene.allowsReframe === true && hasAngleChip
      ? GROUP_WRAPPERS.angle(byGroup.angle.join(' and '))
      : ''

  const moodSentence =
    byGroup.mood.length > 0 ? GROUP_WRAPPERS.mood(byGroup.mood.join(' and ')) : ''

  const accentSentence =
    byGroup.accent.length > 0
      ? GROUP_WRAPPERS.accent(byGroup.accent.join(' and '))
      : ''

  const categorySentence = byGroup.category.join(' ')

  const customRaw = input.translatedSceneDescription?.trim() ?? ''
  const customSentence = customRaw
    ? /[.!?]$/.test(customRaw) ? customRaw : `${customRaw}.`
    : ''

  const parts = [
    scene.action,
    lightingSentence,
    GROUNDING_SENTENCES[scene.grounding],
    moodSentence,
    accentSentence,
    angleSentence,
    categorySentence,
    customSentence,
    input.category === 'food_cafe' ? FOOD_PRESERVATION_PREFIX.trim() : '',
    buildQualitySuffix(scene.grounding),
    buildPreservationSuffix({
      hasAngleChip: scene.allowsReframe === true && hasAngleChip,
      hasScaleChip,
    }),
  ].filter(Boolean)

  return parts.join(' ')
}

// Returns the guidance_scale override for a scene, or undefined for scenes that
// use the default (3.5). Exported so the preview worker can replace its hardcoded
// DARK_SCENES set with a single lookup here.
export function getSceneGuidanceScale(sceneId: string): number | undefined {
  return SCENES[sceneId]?.guidanceScale
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
