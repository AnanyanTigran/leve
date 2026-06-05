import { prisma } from '../lib/prisma'
import { logger } from '../lib/logger'
import { Sentry } from '../lib/sentry'
import { FREE_CREDITS_ON_VERIFY } from '../lib/session.types'

type PrismaTx = Parameters<Parameters<typeof prisma.$transaction>[0]>[0]

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
  //
  // Identity-merge contract:
  //   The caller passes `sessionOtherIdentifier` — the OTHER identifier already
  //   attached to this session (e.g. when verifying email, this is session.phone
  //   if the user previously verified by phone in the same session).
  //   That second identifier is the only signal we have that two User records
  //   belong to the same person; without it we cannot safely merge.
  //
  //   Four cases handled:
  //     1. Both a User-by-current and a User-by-other exist as separate rows
  //        → merge into the row with more activity, delete the duplicate.
  //     2. Only User-by-current exists, session also has the other identifier
  //        but no row for it yet → attach the other identifier to the existing row.
  //     3. Only User-by-other exists (current identifier is new to us)
  //        → attach the current identifier to the existing row.
  //     4. Neither exists → create a fresh row, attaching both identifiers
  //        if the session already has the other one.
  static async upsertOnVerify(
    identifier: string,
    identifierType: 'phone' | 'email',
    sessionId: string,
    sessionOtherIdentifier?: string | null,
  ): Promise<{ user: UserRecord; isReturning: boolean }> {
    const otherType: 'phone' | 'email' = identifierType === 'phone' ? 'email' : 'phone'

    const whereCurrent = identifierType === 'phone'
      ? { phone: identifier }
      : { email: identifier }

    const existing = await prisma.user.findUnique({ where: whereCurrent })

    // Only look up the other-identifier row when we have one to look up by.
    // Skipped on first-time OTP for a new session — session.phone/email will
    // be null and there is no cross-identifier collision to detect.
    const otherUser = sessionOtherIdentifier
      ? await prisma.user.findUnique({
          where: otherType === 'phone'
            ? { phone: sessionOtherIdentifier }
            : { email: sessionOtherIdentifier },
        })
      : null

    // Case 1 — two separate rows for the same person. Merge.
    if (existing && otherUser && existing.id !== otherUser.id) {
      const merged = await UserService.mergeUsers(existing, otherUser, sessionId)
      return { user: merged, isReturning: true }
    }

    // Case 2 — current row exists, maybe attach the session's other identifier
    // so future logins from the other side find this same row.
    if (existing) {
      const data: Record<string, unknown> = { lastSessionId: sessionId }
      if (sessionOtherIdentifier) {
        if (otherType === 'phone' && !existing.phone) data.phone = sessionOtherIdentifier
        else if (otherType === 'email' && !existing.email) data.email = sessionOtherIdentifier
      }
      const updated = await prisma.user.update({ where: { id: existing.id }, data })

      if (data.phone || data.email) {
        logger.info(
          {
            userId: existing.id,
            addedIdentifier: { type: otherType, value: sessionOtherIdentifier },
            phone: updated.phone,
            email: updated.email,
          },
          '[UserService] user identity merged: attached second identifier to existing user',
        )
      }
      return { user: updated as UserRecord, isReturning: true }
    }

    // Case 3 — current identifier is brand new to us, but the session's other
    // identifier already maps to a known user. Attach the current identifier
    // to that user instead of forking a new row.
    if (otherUser) {
      const data: Record<string, unknown> = { lastSessionId: sessionId }
      if (identifierType === 'phone') data.phone = identifier
      else data.email = identifier

      const updated = await prisma.user.update({ where: { id: otherUser.id }, data })
      logger.info(
        {
          userId: otherUser.id,
          addedIdentifier: { type: identifierType, value: identifier },
          phone: updated.phone,
          email: updated.email,
        },
        '[UserService] user identity merged: attached new identifier to existing user',
      )
      return { user: updated as UserRecord, isReturning: true }
    }

    // Case 4 — first time we see either identifier. Create a fresh row and,
    // if the session already carried the other identifier, set both at once.
    const createData: Record<string, unknown> = {
      creditsRemaining: FREE_CREDITS_ON_VERIFY,
      lastSessionId: sessionId,
      ...(identifierType === 'phone' ? { phone: identifier } : { email: identifier }),
    }
    if (sessionOtherIdentifier) {
      if (otherType === 'phone') createData.phone = sessionOtherIdentifier
      else createData.email = sessionOtherIdentifier
    }
    const created = await prisma.user.create({ data: createData })
    return { user: created as UserRecord, isReturning: false }
  }

  // Combines two separate User rows that turn out to belong to the same person
  // (phone-only row + email-only row, discovered when the user finally verifies
  // both within one session). The row with more lifetime activity wins so the
  // user's history and credit totals are preserved; the other row is deleted.
  //
  // The unique-value handoff requires deleting the loser FIRST inside the
  // transaction so the winner can claim the loser's phone/email without
  // tripping the @unique constraint.
  private static async mergeUsers(
    a: UserRecord,
    b: UserRecord,
    sessionId: string,
  ): Promise<UserRecord> {
    const score = (u: UserRecord): number =>
      u.totalCreditsPurchased + u.totalCreditsUsed + u.generationCount + u.purchaseCount
    const [winner, loser] = score(a) >= score(b) ? [a, b] : [b, a]

    const merged = await prisma.$transaction(async (tx: PrismaTx) => {
      await tx.user.delete({ where: { id: loser.id } })
      return tx.user.update({
        where: { id: winner.id },
        data: {
          phone: winner.phone ?? loser.phone,
          email: winner.email ?? loser.email,
          creditsRemaining: winner.creditsRemaining + loser.creditsRemaining,
          totalCreditsPurchased: winner.totalCreditsPurchased + loser.totalCreditsPurchased,
          totalCreditsUsed: winner.totalCreditsUsed + loser.totalCreditsUsed,
          generationCount: winner.generationCount + loser.generationCount,
          purchaseCount: winner.purchaseCount + loser.purchaseCount,
          brandName: winner.brandName ?? loser.brandName,
          favoriteSceneId: winner.favoriteSceneId ?? loser.favoriteSceneId,
          lastSessionId: sessionId,
        },
      })
    })

    logger.info(
      {
        winnerId: winner.id,
        loserId: loser.id,
        winnerIdentifiers: { phone: winner.phone, email: winner.email },
        loserIdentifiers: { phone: loser.phone, email: loser.email },
        mergedIdentifiers: { phone: merged.phone, email: merged.email },
        mergedCredits: merged.creditsRemaining,
      },
      '[UserService] user identity merged: two records combined into one',
    )

    return merged as UserRecord
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
    }).catch((err: unknown) => {
      // Non-fatal for the user request but must be alerted — silent drift here causes wrong credit restore on session re-verification
      logger.error({ err }, '[UserService] recordGeneration DB sync failed')
      Sentry.captureException(err)
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
