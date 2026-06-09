import { prisma } from './prisma'
import type { LeveSession } from './session.types'
import type { GenerationJob, DownloadGrant } from '@prisma/client'

type JobOwnershipResult = { owns: boolean; job: GenerationJob | null }
type GrantOwnershipResult = { hasGrant: boolean; grant: (DownloadGrant & { job: GenerationJob }) | null }

/**
 * Returns true if the session owns the given job.
 * Checks userId first (cross-device), falls back to sessionId (legacy/anon).
 */
export async function sessionOwnsJob(
  jobId: string,
  session: LeveSession,
): Promise<JobOwnershipResult> {
  const job = await prisma.generationJob.findUnique({ where: { id: jobId } })
  if (!job) return { owns: false, job: null }

  const byUser = session.userId != null && job.userId === session.userId
  const bySession = job.sessionId === session.sessionId

  return { owns: byUser || bySession, job }
}

/**
 * Returns true if the session has a DownloadGrant for the given job.
 * Checks userId first (cross-device), falls back to sessionId (legacy grants).
 */
export async function sessionHasGrant(
  jobId: string,
  session: LeveSession,
): Promise<GrantOwnershipResult> {
  if (session.userId) {
    const grant = await prisma.downloadGrant.findFirst({
      where: { jobId, userId: session.userId },
      include: { job: true },
    })
    if (grant) return { hasGrant: true, grant: grant as GrantOwnershipResult['grant'] }
  }

  const grant = await prisma.downloadGrant.findFirst({
    where: { jobId, sessionId: session.sessionId },
    include: { job: true },
  })
  return {
    hasGrant: Boolean(grant),
    grant: (grant as GrantOwnershipResult['grant']) ?? null,
  }
}
