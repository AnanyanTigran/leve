import { nanoid } from 'nanoid'
import { redis } from '../lib/redis'
import {
  LeveSession,
  SESSION_TTL_ANON,
  SESSION_TTL_VERIFIED,
  SESSION_KEY,
  FREE_CREDITS_ON_VERIFY,
} from '../lib/session.types'
import { UserService } from './user.service'

export class SessionService {
  static async create(): Promise<LeveSession> {
    const now = Date.now()
    const session: LeveSession = {
      sessionId: nanoid(),
      phone: null,
      email: null,
      identifierType: null,
      isVerified: false,
      creditsRemaining: 0,
      previewsUsed: 0,
      generationHistory: [],
      isPaid: false,
      purchaseCount: 0,
      brandName: null,
      favoriteSceneId: null,
      anonGenerationsUsed: 0,
      dailyGenerationsUsed: 0,
      dailyGenerationsDate: new Date().toISOString().split('T')[0]!,
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

    // Backfill defaults for sessions created before this migration
    session.identifierType = session.identifierType ?? null
    session.brandName = session.brandName ?? null
    session.favoriteSceneId = session.favoriteSceneId ?? null
    session.anonGenerationsUsed = session.anonGenerationsUsed ?? 0
    session.dailyGenerationsUsed = session.dailyGenerationsUsed ?? 0
    session.dailyGenerationsDate = session.dailyGenerationsDate ?? new Date().toISOString().split('T')[0]

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

    // Upsert User record in DB
    const { user, isReturning } = await UserService.upsertOnVerify(
      identifier,
      identifierType,
      sessionId,
    )

    // Returning user: restore credits from DB. New user: welcome credits already set by upsert.
    const restoredCredits = isReturning
      ? user.creditsRemaining
      : FREE_CREDITS_ON_VERIFY

    if (identifierType === 'phone') session.phone = identifier
    else session.email = identifier

    session.identifierType = identifierType
    session.isVerified = true
    session.creditsRemaining = restoredCredits
    session.isPaid = user.purchaseCount > 0
    session.purchaseCount = user.purchaseCount
    session.brandName = user.brandName
    session.favoriteSceneId = user.favoriteSceneId
    session.lastActiveAt = Date.now()

    await redis.set(
      SESSION_KEY(sessionId),
      JSON.stringify(session),
      'EX',
      SESSION_TTL_VERIFIED,
    )

    return session
  }

  // Promotes session TTL to verified (30d) regardless of current state.
  // Called at payment initiation so the webhook can land even if anon TTL would have expired.
  static async extendSessionTtl(sessionId: string): Promise<void> {
    const key = SESSION_KEY(sessionId)
    const raw = await redis.get(key)
    if (!raw) return
    await redis.set(key, raw, 'EX', SESSION_TTL_VERIFIED)
  }

  static async addCredits(sessionId: string, credits: number): Promise<void> {
    // Atomic — used ONLY by webhook handler after payment confirmed
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

  // Tracks anonymous generation count — gates at ANON_FREE_GENERATIONS
  static async incrementAnonGeneration(sessionId: string): Promise<number> {
    const key = SESSION_KEY(sessionId)
    const raw = await redis.get(key)
    if (!raw) return 0

    const session: LeveSession = JSON.parse(raw)
    session.anonGenerationsUsed = (session.anonGenerationsUsed ?? 0) + 1
    session.lastActiveAt = Date.now()

    await redis.set(key, JSON.stringify(session), 'EX', SESSION_TTL_ANON)
    return session.anonGenerationsUsed
  }

  // Tracks daily generation count for soft cap (15/day for verified users).
  // Resets when the date changes.
  static async incrementDailyGeneration(sessionId: string): Promise<number> {
    const key = SESSION_KEY(sessionId)
    const raw = await redis.get(key)
    if (!raw) return 0

    const session: LeveSession = JSON.parse(raw)
    const today = new Date().toISOString().split('T')[0]!

    if (session.dailyGenerationsDate !== today) {
      session.dailyGenerationsUsed = 0
      session.dailyGenerationsDate = today
    }

    session.dailyGenerationsUsed = (session.dailyGenerationsUsed ?? 0) + 1
    session.lastActiveAt = Date.now()

    const ttl = session.isVerified ? SESSION_TTL_VERIFIED : SESSION_TTL_ANON
    await redis.set(key, JSON.stringify(session), 'EX', ttl)
    return session.dailyGenerationsUsed
  }

  static async updateBrandName(sessionId: string, brandName: string): Promise<void> {
    const key = SESSION_KEY(sessionId)
    const raw = await redis.get(key)
    if (!raw) return

    const session: LeveSession = JSON.parse(raw)
    session.brandName = brandName.trim().slice(0, 60)

    const ttl = session.isVerified ? SESSION_TTL_VERIFIED : SESSION_TTL_ANON
    await redis.set(key, JSON.stringify(session), 'EX', ttl)

    if (session.phone || session.email) {
      const identifier = session.phone ?? session.email!
      const identifierType = session.phone ? 'phone' : 'email'
      await UserService.saveBrandName(identifier, identifierType, brandName)
        .catch((err) => console.error('[SessionService] saveBrandName DB sync failed', err))
    }
  }

  static async updateFavoriteScene(sessionId: string, sceneId: string): Promise<void> {
    const key = SESSION_KEY(sessionId)
    const raw = await redis.get(key)
    if (!raw) return

    const session: LeveSession = JSON.parse(raw)
    session.favoriteSceneId = sceneId

    const ttl = session.isVerified ? SESSION_TTL_VERIFIED : SESSION_TTL_ANON
    await redis.set(key, JSON.stringify(session), 'EX', ttl)

    if (session.phone || session.email) {
      const identifier = session.phone ?? session.email!
      const identifierType = session.phone ? 'phone' : 'email'
      await UserService.saveFavoriteScene(identifier, identifierType, sceneId)
        .catch((err) => console.error('[SessionService] saveFavoriteScene DB sync failed', err))
    }
  }
}
