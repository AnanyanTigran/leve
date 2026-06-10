export interface LeveSession {
  sessionId: string
  userId: string | null
  phone: string | null
  email: string | null
  identifierType: 'phone' | 'email' | null
  isVerified: boolean       // OTP completed — gates HD download and removes generation cap
  creditsRemaining: number
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

// DEPRECATED — these constants drove the `image_size` parameter that was removed
// from model-router.ts in the Kontext [pro] schema fix (image_size is not a valid
// [pro] parameter and was silently ignored). Resolution tiering now happens at HD
// download time via Real-ESRGAN 2× upscale in upscale.service.ts: all tiers
// receive native Kontext output (~1MP) as a watermarked preview; verified users
// who download get the ESRGAN-upscaled 2× JPEG. These constants are kept for
// reference and are no longer imported anywhere.
// export const ANON_GENERATION_SIZE = 1024
// export const VERIFIED_GENERATION_SIZE = 2048
