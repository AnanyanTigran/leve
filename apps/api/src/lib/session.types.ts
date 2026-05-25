export interface LeveSession {
  sessionId: string
  phone: string | null
  email: string | null
  identifierType: 'phone' | 'email' | null
  isVerified: boolean       // OTP completed — gates generation
  creditsRemaining: number
  previewsUsed: number      // not used in Option A but keep for future
  generationHistory: string[] // last 50 GenerationJob IDs
  isPaid: boolean
  purchaseCount: number
  brandName: string | null
  favoriteSceneId: string | null
  anonGenerationsUsed: number   // tracks anonymous generation count
  dailyGenerationsUsed: number  // tracks soft cap (resets daily)
  dailyGenerationsDate: string  // ISO date string 'YYYY-MM-DD' for reset check
  lastActiveAt: number
  createdAt: number
}

export const SESSION_TTL_ANON = 60 * 60 * 48        // 48h in seconds
export const SESSION_TTL_VERIFIED = 60 * 60 * 24 * 30 // 30d
export const SESSION_KEY = (id: string) => `session:${id}`
export const FREE_CREDITS_ON_VERIFY = 2

// Soft daily cap — after this many free generations show a nudge, not a hard block
export const FREE_DAILY_GENERATION_SOFT_CAP = 15

// Anonymous users: max generations before OTP wall
export const ANON_FREE_GENERATIONS = 2

// Anonymous preview resolution (px) — lower quality, watermarked
export const ANON_GENERATION_SIZE = 1024

// Verified user preview resolution (px)
export const VERIFIED_GENERATION_SIZE = 2048
