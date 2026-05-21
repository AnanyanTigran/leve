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
