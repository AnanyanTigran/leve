import { prisma } from '../lib/prisma'
import { SessionService } from './session.service'

export interface GrantCreditsInput {
  sessionId: string
  transactionId: string
  jobId: string
  hdS3Key: string
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
    })
  }
}
