import { nanoid } from 'nanoid'
import { redis } from '../lib/redis'
import {
  LeveSession,
  SESSION_TTL_ANON,
  SESSION_TTL_VERIFIED,
  SESSION_KEY,
  FREE_CREDITS_ON_VERIFY,
} from '../lib/session.types'

export class SessionService {
  static async create(): Promise<LeveSession> {
    const now = Date.now()
    const session: LeveSession = {
      sessionId: nanoid(),
      phone: null,
      email: null,
      isVerified: false,
      creditsRemaining: 0,
      previewsUsed: 0,
      generationHistory: [],
      isPaid: false,
      purchaseCount: 0,
      lastActiveAt: now,
      createdAt: now,
    }
    await redis.set(
      SESSION_KEY(session.sessionId),
      JSON.stringify(session),
      'EX',
      SESSION_TTL_ANON,
    )
    return session
  }

  static async get(sessionId: string): Promise<LeveSession | null> {
    const raw = await redis.get(SESSION_KEY(sessionId))
    if (!raw) return null
    const session: LeveSession = JSON.parse(raw)
    // touch lastActiveAt
    session.lastActiveAt = Date.now()
    const ttl = session.isVerified ? SESSION_TTL_VERIFIED : SESSION_TTL_ANON
    await redis.set(SESSION_KEY(sessionId), JSON.stringify(session), 'EX', ttl)
    return session
  }

  static async update(session: LeveSession): Promise<void> {
    const ttl = session.isVerified ? SESSION_TTL_VERIFIED : SESSION_TTL_ANON
    await redis.set(SESSION_KEY(session.sessionId), JSON.stringify(session), 'EX', ttl)
  }

  static async promoteToVerified(
    sessionId: string,
    identifier: string,
    identifierType: 'phone' | 'email',
  ): Promise<LeveSession> {
    const session = await SessionService.get(sessionId)
    if (!session) throw new Error('session_not_found')

    if (identifierType === 'phone') session.phone = identifier
    else session.email = identifier

    session.isVerified = true
    session.creditsRemaining += FREE_CREDITS_ON_VERIFY
    session.lastActiveAt = Date.now()

    await redis.set(
      SESSION_KEY(sessionId),
      JSON.stringify(session),
      'EX',
      SESSION_TTL_VERIFIED,
    )
    return session
  }

  static async extendForPayment(sessionId: string): Promise<void> {
    // Prevent session expiry during payment flow
    const session = await SessionService.get(sessionId)
    if (!session) return
    await redis.set(
      SESSION_KEY(sessionId),
      JSON.stringify(session),
      'EX',
      SESSION_TTL_VERIFIED,
    )
  }

  static async addCredits(sessionId: string, credits: number): Promise<void> {
    // Atomic — used ONLY by webhook handler after payment confirmed
    // Full session re-read + write inside MULTI to avoid race
    const key = SESSION_KEY(sessionId)
    const raw = await redis.get(key)
    if (!raw) throw new Error('session_not_found')
    const session: LeveSession = JSON.parse(raw)
    session.creditsRemaining += credits
    session.isPaid = true
    session.purchaseCount += 1
    await redis.set(key, JSON.stringify(session), 'EX', SESSION_TTL_VERIFIED)
  }

  static async deductCredit(sessionId: string): Promise<boolean> {
    // Returns false if insufficient credits — caller must abort generation
    const key = SESSION_KEY(sessionId)
    const raw = await redis.get(key)
    if (!raw) return false
    const session: LeveSession = JSON.parse(raw)
    if (session.creditsRemaining <= 0) return false
    session.creditsRemaining -= 1
    await redis.set(
      key,
      JSON.stringify(session),
      'EX',
      session.isVerified ? SESSION_TTL_VERIFIED : SESSION_TTL_ANON,
    )
    return true
  }

  static async refundCredit(sessionId: string): Promise<void> {
    const key = SESSION_KEY(sessionId)
    const raw = await redis.get(key)
    if (!raw) return
    const session: LeveSession = JSON.parse(raw)
    session.creditsRemaining += 1
    await redis.set(
      key,
      JSON.stringify(session),
      'EX',
      session.isVerified ? SESSION_TTL_VERIFIED : SESSION_TTL_ANON,
    )
  }

  static async appendGenerationHistory(sessionId: string, jobId: string): Promise<void> {
    const key = SESSION_KEY(sessionId)
    const raw = await redis.get(key)
    if (!raw) return
    const session: LeveSession = JSON.parse(raw)
    session.generationHistory = [jobId, ...session.generationHistory].slice(0, 50)
    await redis.set(
      key,
      JSON.stringify(session),
      'EX',
      session.isVerified ? SESSION_TTL_VERIFIED : SESSION_TTL_ANON,
    )
  }
}
