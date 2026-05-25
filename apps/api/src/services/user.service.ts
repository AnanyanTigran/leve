import { prisma } from '../lib/prisma'
import { FREE_CREDITS_ON_VERIFY } from '../lib/session.types'

export interface UserRecord {
  id: string
  phone: string | null
  email: string | null
  creditsRemaining: number
  totalCreditsPurchased: number
  totalCreditsUsed: number
  generationCount: number
  purchaseCount: number
  brandName: string | null
  favoriteSceneId: string | null
  lastSessionId: string | null
}

export class UserService {
  // Called on every OTP verification.
  // Finds existing user by identifier or creates new one.
  static async upsertOnVerify(
    identifier: string,
    identifierType: 'phone' | 'email',
    sessionId: string,
  ): Promise<{ user: UserRecord; isReturning: boolean }> {
    const where = identifierType === 'phone'
      ? { phone: identifier }
      : { email: identifier }

    const existing = await prisma.user.findUnique({ where })

    if (existing) {
      const updated = await prisma.user.update({
        where: { id: existing.id },
        data: { lastSessionId: sessionId },
      })
      return { user: updated as UserRecord, isReturning: true }
    }

    const created = await prisma.user.create({
      data: {
        ...(identifierType === 'phone' ? { phone: identifier } : { email: identifier }),
        creditsRemaining: FREE_CREDITS_ON_VERIFY,
        lastSessionId: sessionId,
      },
    })

    return { user: created as UserRecord, isReturning: false }
  }

  // Called after every successful payment webhook to persist credits to DB.
  static async addCredits(
    identifier: string,
    identifierType: 'phone' | 'email',
    credits: number,
    _amountAMD: number,
  ): Promise<void> {
    const where = identifierType === 'phone'
      ? { phone: identifier }
      : { email: identifier }

    await prisma.user.update({
      where,
      data: {
        creditsRemaining: { increment: credits },
        totalCreditsPurchased: { increment: credits },
        purchaseCount: { increment: 1 },
      },
    })
  }

  // Called when a generation job completes successfully.
  static async recordGeneration(
    identifier: string,
    identifierType: 'phone' | 'email',
  ): Promise<void> {
    if (!identifier) return

    const where = identifierType === 'phone'
      ? { phone: identifier }
      : { email: identifier }

    await prisma.user.update({
      where,
      data: {
        creditsRemaining: { decrement: 1 },
        totalCreditsUsed: { increment: 1 },
        generationCount: { increment: 1 },
      },
    }).catch((err) => {
      // Non-fatal — Redis is source of truth for real-time credits
      console.error('[UserService] recordGeneration DB sync failed', err)
    })
  }

  // Called on session recovery — returns DB credit balance to restore into Redis
  static async getByIdentifier(
    identifier: string,
    identifierType: 'phone' | 'email',
  ): Promise<UserRecord | null> {
    const where = identifierType === 'phone'
      ? { phone: identifier }
      : { email: identifier }

    const user = await prisma.user.findUnique({ where })
    return user as UserRecord | null
  }

  static async saveBrandName(
    identifier: string,
    identifierType: 'phone' | 'email',
    brandName: string,
  ): Promise<void> {
    const where = identifierType === 'phone'
      ? { phone: identifier }
      : { email: identifier }

    await prisma.user.update({
      where,
      data: { brandName: brandName.trim().slice(0, 60) },
    })
  }

  static async saveFavoriteScene(
    identifier: string,
    identifierType: 'phone' | 'email',
    sceneId: string,
  ): Promise<void> {
    const where = identifierType === 'phone'
      ? { phone: identifier }
      : { email: identifier }

    await prisma.user.update({
      where,
      data: { favoriteSceneId: sceneId },
    })
  }
}
