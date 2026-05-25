import { redis } from './redis'

// Returns true if allowed, false if rate limit exceeded
export async function checkRateLimit(
  key: string,
  maxRequests: number,
  windowSeconds: number,
): Promise<boolean> {
  const current = await redis.incr(key)
  if (current === 1) {
    await redis.expire(key, windowSeconds)
  }
  return current <= maxRequests
}

export function uploadRateLimitKey(sessionId: string): string {
  return `ratelimit:upload:${sessionId}`
}

export function anonIpGenerationKey(ip: string): string {
  return `ratelimit:anon_gen:ip:${ip}`
}

// Returns true if the IP is within its 24h anonymous generation allowance.
// Allows ~10 per IP per day — enough for several legitimate users on one network.
export async function checkAnonIpGenerationLimit(ip: string): Promise<boolean> {
  const key = anonIpGenerationKey(ip)
  const current = await redis.incr(key)
  if (current === 1) {
    await redis.expire(key, 60 * 60 * 24)
  }
  return current <= 10
}
