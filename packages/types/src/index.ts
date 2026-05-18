// --- Enums ---

export type Intent = 'sell_product' | 'story_sale' | 'marketplace_upload'

export type TemplateCategory = 'beauty' | 'retail' | 'marketplace'

export type JobStatus =
  | 'pending'
  | 'processing'
  | 'preview_ready'
  | 'hd_processing'
  | 'hd_ready'
  | 'failed'

export type CreditPack = 'trial' | 'volume' | 'pro'

export type PaymentProvider = 'idram' | 'telcell' | 'arca'

export type PaymentStatus = 'pending' | 'completed' | 'failed' | 'refunded'

export type AIProvider = 'fal' | 'replicate'

export type Locale = 'hy' | 'ru' | 'en'

// Product categories — drives both UI and prompt engineering
export type ProductCategory =
  | 'beauty_cosmetics'
  | 'jewelry_accessories'
  | 'fashion_clothing'
  | 'food_cafe'
  | 'marketplace_export'
  | 'custom'

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

export interface LeveSession {
  sessionId: string
  authMethod?: AuthMethod
  contact?: string       // phone or email
  registrationStatus: RegistrationStatus
  freeCreditsRemaining: number  // starts at 3 after verification
  paidCreditsRemaining: number
  purchaseCount: number
  generationHistory: string[]
  selectedCategory?: ProductCategory
  selectedTemplateId?: string
  lastActiveAt: number
}

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

export interface CreditPackDefinition {
  id: CreditPack
  amountAMD: number
  downloads: number
  label: Record<Locale, string>
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

// --- Text Overlay ---

export interface TextOverlay {
  text: string
  locale: Locale
  position: 'top' | 'bottom' | 'center'
  size: 'sm' | 'md' | 'lg'
}

// --- Credit packs (static config, shared) ---

export const CREDIT_PACKS: CreditPackDefinition[] = [
  {
    id: 'trial',
    amountAMD: 1000,
    downloads: 5,
    label: { hy: 'Փորձնական', ru: 'Пробный', en: 'Trial' },
  },
  {
    id: 'volume',
    amountAMD: 3500,
    downloads: 15,
    label: { hy: 'Ծավալային', ru: 'Объёмный', en: 'Volume' },
  },
  {
    id: 'pro',
    amountAMD: 10000,
    downloads: -1, // unlimited
    label: { hy: 'Պրոֆ', ru: 'Профи', en: 'Pro' },
  },
]
