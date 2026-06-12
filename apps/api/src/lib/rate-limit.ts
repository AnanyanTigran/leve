import { FastifyRequest } from 'fastify'
import { redis } from './redis'
import { validateEnv } from '../config/env'

const env = validateEnv()

export interface RateLimitResult {
  allowed: boolean
  // Seconds until the window resets — populated when blocked so routes can
  // send a Retry-After header instead of an opaque 429.
  retryAfterSeconds: number
}

// TODO(MEDIUM infra-audit 4.7): INCR-then-EXPIRE is not atomic — a crash
// between the two calls leaves a counter with no TTL, permanently rate
// limiting that key once it crosses the threshold. Move the incr+expire into
// a single Lua script (same pattern as session.service.ts atomic ops).
export async function checkRateLimit(
  key: string,
  maxRequests: number,
  windowSeconds: number,
): Promise<RateLimitResult> {
  const current = await redis.incr(key)
  if (current === 1) {
    await redis.expire(key, windowSeconds)
  }
  if (current <= maxRequests) {
    return { allowed: true, retryAfterSeconds: 0 }
  }
  const ttl = await redis.ttl(key)
  return { allowed: false, retryAfterSeconds: ttl > 0 ? ttl : windowSeconds }
}

export function uploadRateLimitKey(sessionId: string): string {
  return `ratelimit:upload:${sessionId}`
}

export function anonIpGenerationKey(ip: string): string {
  return `ratelimit:anon_gen:ip:${ip}`
}

// Anonymous users get 2 free generations each, and Armenian mobile carriers
// NAT thousands of users behind one public IP — 10/day per IP was exhausted
// by the 5th user and silently killed the free-trial funnel for everyone
// after. 50/day still bounds abuse cost (50 × $0.04 = $2/day per hostile IP,
// on top of the per-session cap of 2 and trustProxy: 1 preventing IP spoofing).
const ANON_IP_GENERATIONS_PER_DAY = 50
const ANON_IP_WINDOW_SECONDS = 60 * 60 * 24

// Returns whether the IP is within its 24h anonymous generation allowance.
export async function checkAnonIpGenerationLimit(ip: string): Promise<RateLimitResult> {
  return checkRateLimit(anonIpGenerationKey(ip), ANON_IP_GENERATIONS_PER_DAY, ANON_IP_WINDOW_SECONDS)
}

// keyGenerator factory for @fastify/rate-limit route configs. Keys by session
// (cookie, then the x-session-id localStorage fallback — required on mobile
// Safari where ITP blocks all cross-site cookies), falling back to IP only
// when no session ID is present at all. Session-scoped limits are immune to
// carrier-NAT/proxy IP sharing, which caused real-user 429s on OTP routes.
// NOTE: requires @fastify/cookie to be registered BEFORE @fastify/rate-limit
// (see index.ts) — otherwise request.cookies is empty when this runs.
export function sessionOrIpKey(prefix: string) {
  return (request: FastifyRequest): string => {
    const sid =
      request.cookies?.[env.SESSION_COOKIE_NAME] ??
      (request.headers['x-session-id'] as string | undefined)
    return sid ? `${prefix}:sid:${sid}` : `${prefix}:ip:${request.ip ?? 'unknown'}`
  }
}
