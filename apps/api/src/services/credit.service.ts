import { prisma } from '../lib/prisma'
import { SessionService } from './session.service'
import { UserService } from './user.service'
import { logger } from '../lib/logger'
import { Sentry } from '../lib/sentry'

export interface GrantCreditsInput {
  sessionId: string
  transactionId: string
  jobId?: string | null
  hdS3Key?: string | null
  credits: number
}

// 7 days — matches the outer webhook idempotency TTL in payments/index.ts
const GRANT_IDEMPOTENCY_TTL = 60 * 60 * 24 * 7

// Called ONLY after webhook signature validation + idempotency check pass.
//
// Atomicity guarantee: credits are added to Redis and the per-transaction
// idempotency key is set in a single Lua script. If the process crashes after
// the Redis write but before the Postgres update, the webhook retry will find
// the idempotency key already set, skip the Redis grant, and repair Postgres.
// This prevents double-grant regardless of where in the sequence a failure occurs.
export async function grantCreditsAndCreateDownloadGrant(
  input: GrantCreditsInput,
): Promise<void> {
  const { sessionId, transactionId, jobId, credits } = input

  const idempotencyKey = `payment:granted:${transactionId}`
  const grantResult = await SessionService.addCreditsWithIdempotency(
    sessionId,
    credits,
    idempotencyKey,
    GRANT_IDEMPOTENCY_TTL,
  )

  if (grantResult === 0) {
    // Credits already in Redis from a prior attempt. Repair Postgres status in
    // case the previous attempt crashed before updating it.
    await prisma.transaction.update({
      where: { id: transactionId },
      data: { status: 'completed', completedAt: new Date() },
    }).catch((err: unknown) => {
      logger.warn({ err, transactionId }, '[creditService] idempotent re-grant: Postgres status repair failed — non-fatal')
    })
    return
  }

  if (grantResult === -1) {
    // Session expired before the webhook landed. Credits cannot be added to
    // Redis now; they will be restored from DB when the user re-verifies via OTP.
    // Mark the transaction completed so the re-verification path can find it.
    // Throw on Postgres failure so the provider retries and we can try again.
    await prisma.transaction.update({
      where: { id: transactionId },
      data: { status: 'completed', completedAt: new Date() },
    })
    logger.warn(
      { transactionId, sessionId },
      '[creditService] session expired before credit grant — DB recorded, credits will restore on OTP re-verification',
    )
    return
  }

  // grantResult === 1: credits granted to Redis and idempotency key set atomically.
  // Postgres update is best-effort — if it fails, credits are already in Redis and
  // the idempotency key prevents double-grant on retry. Alert for reconciliation.
  try {
    await prisma.transaction.update({
      where: { id: transactionId },
      data: { status: 'completed', completedAt: new Date() },
    })
  } catch (err) {
    logger.error(
      { err, transactionId },
      '[creditService] CRITICAL: Postgres transaction update failed after Redis credit grant — manual reconciliation needed',
    )
    Sentry.captureException(err)
    // Do not rethrow — credits are in Redis, idempotency key is set,
    // the stale-transactions worker will reconcile the pending record.
  }

  // Persist credits to DB so they survive session expiry on OTP re-verification.
  const session = await SessionService.get(sessionId)
  if (session) {
    const identifier = session.phone ?? session.email
    const identifierType = session.phone ? 'phone' : 'email'
    if (identifier) {
      await UserService.addCredits(identifier, identifierType, credits, 0).catch((err: unknown) => {
        logger.error({ err }, '[creditService] DB credits sync failed — Redis is source of truth')
        Sentry.captureException(err)
      })
    }
  }

  if (!jobId || !input.hdS3Key) {
    return
  }

  const existing = await prisma.downloadGrant.findUnique({
    where: { transactionId_jobId: { transactionId, jobId } },
  })

  if (!existing) {
    await prisma.downloadGrant.create({
      data: {
        sessionId,
        userId: session?.userId ?? null,
        jobId,
        transactionId,
        hdS3Key: input.hdS3Key,
      },
    }).catch((err: unknown) => {
      logger.error({ err }, '[creditService] DownloadGrant creation failed — credits already granted')
      Sentry.captureException(err)
    })
  }
}
