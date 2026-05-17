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
