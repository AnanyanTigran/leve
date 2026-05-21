export interface LeveSession {
  sessionId: string
  phone: string | null
  email: string | null
  isVerified: boolean       // OTP completed — gates generation
  creditsRemaining: number
  previewsUsed: number      // not used in Option A but keep for future
  generationHistory: string[] // last 50 GenerationJob IDs
  isPaid: boolean
  purchaseCount: number
  lastActiveAt: number
  createdAt: number
}

export const SESSION_TTL_ANON = 60 * 60 * 48        // 48h in seconds
export const SESSION_TTL_VERIFIED = 60 * 60 * 24 * 30 // 30d
export const SESSION_KEY = (id: string) => `session:${id}`
export const FREE_CREDITS_ON_VERIFY = 3
