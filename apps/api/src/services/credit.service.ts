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

// Called ONLY after webhook signature validation + idempotency check pass.
export async function grantCreditsAndCreateDownloadGrant(
  input: GrantCreditsInput,
): Promise<void> {
  const { sessionId, transactionId, jobId, credits } = input

  await SessionService.addCredits(sessionId, credits)

  await prisma.transaction.update({
    where: { id: transactionId },
    data: { status: 'completed', completedAt: new Date() },
  })

  // Persist credits to DB so they survive session expiry on OTP re-verification
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
