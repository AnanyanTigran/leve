// --- Enums ---

export type Intent = 'sell_product' | 'story_sale' | 'marketplace_upload'

export type TemplateCategory = 'beauty' | 'retail' | 'marketplace'

export type JobStatus =
  | 'queued'
  | 'processing'
  | 'done'
  | 'failed'
  | 'credit_refunded'

export type CreditPack = 'starter' | 'creator' | 'pro_monthly'

export type PaymentProvider = 'idram' | 'telcell' | 'arca'

export type PaymentStatus = 'pending' | 'completed' | 'failed' | 'refunded'

export type AIProvider = 'fal' | 'replicate'

export type Locale = 'hy' | 'ru' | 'en'

// Product categories — drives both UI and prompt engineering
export const PRODUCT_CATEGORIES = [
  'beauty_cosmetics',
  'jewelry_accessories',
  'fashion_clothing',
  'food_cafe',
  'electronics_gadgets',
  'home_decor',
  'toys_children',
  'custom',
] as const

export type ProductCategory = typeof PRODUCT_CATEGORIES[number]

export type MarketplacePlatform = 'wildberries' | 'ozon'

export interface MarketplaceSettings {
  platform: MarketplacePlatform | null
  // When platform is set, these override user scene and ratio choices at generation time
  forceSceneId: 'wb_white_strict' | 'pure_white_studio' | null
  forceAspectRatio: AspectRatio | null
  forcePaddingChip: boolean // auto-applies 85% fill compliance padding
}

// Platform export targets
export type ExportPlatform =
  | 'instagram_feed'    // 1080×1080
  | 'instagram_story'   // 1080×1920
  | 'facebook_post'     // 1200×630
  | 'wildberries'       // 900×1200, white bg
  | 'ozon'              // 1000×1000, white bg
  | 'telegram'          // 1080×1080
  | 'list_am'           // 1200×900
  | 'original_hd'       // full resolution

export interface PlatformSpec {
  id: ExportPlatform
  label: string
  labelHY: string
  labelRU: string
  width: number
  height: number
  forceWhiteBg: boolean
  padding?: number // fraction 0-1
}

export type AuthMethod = 'phone' | 'email'

export type RegistrationStatus =
  | 'anonymous'
  | 'pending_otp'
  | 'verified'


export interface GenerationPrompt {
  templateId: string
  category: ProductCategory
  categoryBasePrompt: string      // server-side, never exposed to user
  refinementChips: string[]       // chip IDs selected
  refinementPromptFragment: string // compiled from chips, server-side
  customText?: string             // user's free text, original language
  customTextTranslated?: string   // translated to English, server-side
  finalPrompt: string             // full compiled prompt, server-side only
}

export const PLATFORM_SPECS: Record<ExportPlatform, PlatformSpec> = {
  instagram_feed: {
    id: 'instagram_feed',
    label: 'Instagram Feed',
    labelHY: 'Instagram Feed',
    labelRU: 'Instagram Feed',
    width: 1080, height: 1080,
    forceWhiteBg: false,
  },
  instagram_story: {
    id: 'instagram_story',
    label: 'Instagram Story',
    labelHY: 'Instagram Story',
    labelRU: 'Instagram Story',
    width: 1080, height: 1920,
    forceWhiteBg: false,
  },
  facebook_post: {
    id: 'facebook_post',
    label: 'Facebook Post',
    labelHY: 'Facebook Post',
    labelRU: 'Facebook Post',
    width: 1200, height: 630,
    forceWhiteBg: false,
  },
  wildberries: {
    id: 'wildberries',
    label: 'Wildberries',
    labelHY: 'Wildberries',
    labelRU: 'Wildberries',
    width: 900, height: 1200,
    forceWhiteBg: true,
    padding: 0.15,
  },
  ozon: {
    id: 'ozon',
    label: 'Ozon',
    labelHY: 'Ozon',
    labelRU: 'Ozon',
    width: 1000, height: 1000,
    forceWhiteBg: true,
    padding: 0.1,
  },
  telegram: {
    id: 'telegram',
    label: 'Telegram',
    labelHY: 'Telegram',
    labelRU: 'Telegram',
    width: 1080, height: 1080,
    forceWhiteBg: false,
  },
  list_am: {
    id: 'list_am',
    label: 'list.am',
    labelHY: 'list.am',
    labelRU: 'list.am',
    width: 1200, height: 900,
    forceWhiteBg: false,
  },
  original_hd: {
    id: 'original_hd',
    label: 'Original HD',
    labelHY: 'Բնօրինակ HD',
    labelRU: 'Оригинал HD',
    width: 0, height: 0,
    forceWhiteBg: false,
  },
}

// --- Core Domain Types ---

export interface Template {
  id: string
  name: string
  category: TemplateCategory
  prompt: string
  thumbnail: string
  requiresIPAdapter: boolean
}

export interface GenerationJob {
  id: string
  sessionId: string
  templateId: string
  intent: Intent
  status: JobStatus
  previewUrls: string[]
  hdUrl: string | null
  provider: AIProvider | null
  createdAt: string
  updatedAt: string
  requestId: string
}

export interface Session {
  id: string
  phone: string | null
  credits: number
  purchaseCount: number
  createdAt: string
  lastActiveAt: string
}


export interface PaymentRecord {
  id: string
  sessionId: string
  provider: PaymentProvider
  pack: CreditPack
  amountAMD: number
  status: PaymentStatus
  idempotencyKey: string
  createdAt: string
  completedAt: string | null
}

// --- API Response Shape ---

export interface APIResponse<T = unknown> {
  success: boolean
  data?: T
  error?: string
  requestId: string
}

// --- Upload ---

export interface UploadResult {
  jobId: string
  previewUrls: string[]
  sessionId: string
  requestId: string
}

// --- Badge Presets (download finishing step) ───────────────────────────────
//
// The download "finishing touch" lets a seller stamp ONE pre-designed label
// onto their image. Sellers never make a design decision — they pick a preset
// and type the words. Each preset is a complete, opinionated look: its colour,
// shape, typography, casing and placement are all fixed here. The same spec
// drives the live CSS preview (web) and the baked SVG composite (api) so the
// downloaded file matches what the seller saw.

export type BadgePresetId = 'price' | 'sale' | 'new' | 'brand'

export type BadgeAnchor = 'top-left' | 'top-center' | 'bottom-center' | 'bottom-right'

export interface BadgePresetSpec {
  id: BadgePresetId
  /** Where the badge sits on the image — fixed per preset. */
  anchor: BadgeAnchor
  /** Background fill (CSS/SVG colour string; may be rgba). */
  fill: string
  /** Text colour. */
  textColor: string
  /** Font size as a fraction of the image's rendered width. */
  fontScale: number
  /** Horizontal padding, in em of the font size. */
  padXEm: number
  /** Vertical padding, in em of the font size. */
  padYEm: number
  /** Corner radius in em of the font size, or 'pill' for fully rounded. */
  radiusEm: number | 'pill'
  uppercase: boolean
  /** Letter spacing, in em. */
  trackingEm: number
  fontWeight: number
  /** Max badge width as a fraction of the image width (text truncates beyond). */
  maxWidthFraction: number
}

/** Margin between the badge and the image edge, as a fraction of image width. */
export const BADGE_INSET_FRACTION = 0.05

export const BADGE_PRESETS: Record<BadgePresetId, BadgePresetSpec> = {
  // Money is the hero — solid apricot sticker, bottom-right, mixed case.
  price: {
    id: 'price',
    anchor: 'bottom-right',
    fill: '#D64C1A',
    textColor: '#FFFFFF',
    fontScale: 0.05,
    padXEm: 0.72,
    padYEm: 0.42,
    radiusEm: 0.42,
    uppercase: false,
    trackingEm: 0,
    fontWeight: 600,
    maxWidthFraction: 0.6,
  },
  // A loud shout — sharper accent block, top-left, uppercase.
  sale: {
    id: 'sale',
    anchor: 'top-left',
    fill: '#D64C1A',
    textColor: '#FFFFFF',
    fontScale: 0.052,
    padXEm: 0.6,
    padYEm: 0.36,
    radiusEm: 0.22,
    uppercase: true,
    trackingEm: 0.02,
    fontWeight: 600,
    maxWidthFraction: 0.55,
  },
  // Editorial — clean white pill with dark text, centred at the top, wide tracking.
  new: {
    id: 'new',
    anchor: 'top-center',
    fill: '#FFFFFF',
    textColor: '#0A0A0A',
    fontScale: 0.032,
    padXEm: 0.95,
    padYEm: 0.55,
    radiusEm: 'pill',
    uppercase: true,
    trackingEm: 0.2,
    fontWeight: 600,
    maxWidthFraction: 0.8,
  },
  // A quiet signature — translucent dark pill, centred at the bottom.
  brand: {
    id: 'brand',
    anchor: 'bottom-center',
    fill: 'rgba(10,10,10,0.45)',
    textColor: '#FFFFFF',
    fontScale: 0.03,
    padXEm: 0.9,
    padYEm: 0.5,
    radiusEm: 'pill',
    uppercase: true,
    trackingEm: 0.14,
    fontWeight: 600,
    maxWidthFraction: 0.7,
  },
}

export const BADGE_PRESET_ORDER: BadgePresetId[] = ['price', 'sale', 'new', 'brand']

// ─── Scene System ─────────────────────────────────────────────────────────────

export type SceneGroup =
  | 'studio'
  | 'lifestyle_surfaces'
  | 'environment'
  | 'seasonal'
  | 'creative'

export type AspectRatio = '1:1' | '4:5' | '3:4' | '9:16' | '16:9'

export interface Scene {
  id: string
  group: SceneGroup
  name: string              // display name (English)
  nameHY: string            // Armenian
  nameRU: string            // Russian
  thumbnailGradient: string // CSS gradient used as placeholder until real thumbnail loads
  bestFor: string           // short description shown in tooltip/subtitle
}

export interface RefinementChip {
  id: string
  group: 'lighting' | 'angle' | 'mood' | 'accent' | 'category_specific'
  label: string
  labelHY: string
  labelRU: string
  // For 'accent' chips: hex color used to render the swatch in the picker.
  // Ignored for other groups.
  swatch?: string
}

// Category → default scene IDs to show (ordered best-first)
// All 30 scenes accessible via "Show all"
export type CategorySceneMap = Record<ProductCategory, string[]>

export interface AspectRatioOption {
  id: AspectRatio
  label: string
  labelHY: string
  labelRU: string
  description: string  // e.g. "Wildberries standard"
  width: number
  height: number
}

// Canonical list of all valid scene IDs — single source of truth for both
// the web scene picker and the API allowlist in /api/session/favorite-scene.
export const SCENE_IDS = [
  // Studio
  'pure_white_studio', 'soft_shadow_studio', 'gray_gradient', 'light_box', 'black_studio',
  'colored_pop', 'apricot_warm', 'wb_white_strict',
  // Lifestyle surfaces
  'marble_luxury', 'dark_wood', 'light_wood', 'concrete_industrial', 'linen_fabric',
  'velvet_dark', 'silk_white', 'terrazzo', 'acrylic_reflect', 'mirror_acrylic',
  'stone_texture', 'dark_stone',
  // Environment
  'bathroom_shelf', 'kitchen_counter', 'vanity_table', 'cafe_table', 'outdoor_garden',
  'office_desk', 'bed_pillows', 'beach_sand', 'coffee_jezve', 'handheld_lifestyle',
  'tech_desk_setup', 'styled_shelf',
  // Seasonal
  'holiday_new_year', 'spring_bloom', 'autumn_warm', 'summer_fresh', 'sale_promo',
  // Creative
  'floating_levitation', 'splash_water', 'ingredients_flat_lay', 'neon_glow',
  'minimal_pastel', 'editorial_dark',
  // New gap-analysis scenes
  'podium_pedestal', 'water_ripple', 'gift_unboxing', 'silk_pearls',
  'wb_hero_card', 'window_shadow_play', 'color_block_duo',
  'yerevan_tuff', 'pomegranate_luxe',
] as const

export type SceneId = typeof SCENE_IDS[number]

