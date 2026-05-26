import { Worker, Job } from 'bullmq'
import { redis } from '../lib/redis'
import { prisma } from '../lib/prisma'
import { SessionService } from '../services/session.service'
import { runGeneration } from '../providers/model-router'
import { QUEUE_NAMES, PreviewJobData } from '../lib/queues'
import { applyTextOverlayToS3Image } from '../lib/text-overlay'

const PREVIEW_CONCURRENCY = 8

async function processJob(job: Job<PreviewJobData>): Promise<void> {
  const {
    jobId,
    sessionId,
    uploadS3Key,
    compiledPrompt,
    isVerified,
    aspectRatio,
    isEdit,
    sourceImageS3Key,
    requestId,
  } = job.data

  console.info({ requestId, jobId, isEdit }, '[preview worker] job start')

  // Mark processing in DB
  await prisma.generationJob.update({
    where: { id: jobId },
    data: { status: 'processing', bullJobId: String(job.id) },
  })

  // Deduct 1 credit BEFORE calling provider
  // Anonymous users (isVerified=false) have anon generation budget tracked separately
  if (isVerified) {
    const credited = await SessionService.deductCredit(sessionId)
    if (!credited) {
      await prisma.generationJob.update({
        where: { id: jobId },
        data: { status: 'failed', errorCode: 'insufficient_credits' },
      })
      return
    }
  }
  // Note: anonymous generation deducts from anon_generations_used counter (not credits)
  // That counter is tracked in the session object, not here

  try {
    const output = await runGeneration({
      sessionId,
      jobId,
      uploadS3Key,
      compiledPrompt,
      isVerified,
      aspectRatio: aspectRatio ?? '1:1',
      isEdit: isEdit ?? false,
      sourceImageS3Key,
    })

    // Apply text overlay if the route stored one on the job record
    const jobRecord = await prisma.generationJob.findUnique({
      where: { id: jobId },
      select: { overlayText: true, overlayPosition: true },
    })

    let finalS3Key = output.s3Key

    if (jobRecord?.overlayText) {
      try {
        finalS3Key = await applyTextOverlayToS3Image({
          sourceS3Key: output.s3Key,
          sessionId,
          jobId,
          text: jobRecord.overlayText,
          position: (jobRecord.overlayPosition as 'top' | 'center' | 'bottom') ?? 'bottom',
        })
      } catch (err) {
        // Non-fatal — serve image without overlay rather than failing the job
        console.error({ requestId, jobId, err }, '[preview worker] text overlay failed — serving without overlay')
      }
    }

    await prisma.generationJob.update({
      where: { id: jobId },
      data: {
        status: 'done',
        previewS3Keys: [finalS3Key],
        provider: output.provider,
        durationMs: output.durationMs,
        qualityGatePassed: true,
      },
    })

    await SessionService.appendGenerationHistory(sessionId, jobId)

    if (!isVerified) {
      await SessionService.incrementAnonGeneration(sessionId)
    } else {
      await SessionService.incrementDailyGeneration(sessionId)
    }

    console.info({ requestId, jobId, durationMs: output.durationMs }, '[preview worker] done')
  } catch (err) {
    const errorCode = err instanceof Error ? err.message : 'unknown'
    const isFinalAttempt = job.attemptsMade >= (job.opts.attempts ?? 1)

    console.error({ requestId, jobId, errorCode, isFinalAttempt, attemptsMade: job.attemptsMade }, '[preview worker] failed')

    if (isVerified && isFinalAttempt) {
      await SessionService.refundCredit(sessionId)
    }

    await prisma.generationJob.update({
      where: { id: jobId },
      data: {
        status: isFinalAttempt ? (isVerified ? 'credit_refunded' : 'failed') : 'queued',
        errorCode: isFinalAttempt ? errorCode : null,
      },
    })
  }
}

export function startPreviewWorker() {
  const worker = new Worker<PreviewJobData>(
    QUEUE_NAMES.PREVIEW,
    processJob,
    { connection: redis, concurrency: PREVIEW_CONCURRENCY },
  )

  worker.on('failed', (job, err) => {
    console.error({ jobId: job?.id, err }, '[preview worker] bullmq job failed')
  })

  return worker
}
