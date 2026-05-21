import { Worker, Job } from 'bullmq'
import { redis } from '../lib/redis'
import { prisma } from '../lib/prisma'
import { SessionService } from '../services/session.service'
import { runGeneration } from '../providers/model-router'
import { getNegativePrompt } from '../services/prompt.service'
import { QUEUE_NAMES, PreviewJobData } from '../lib/queues'

const PREVIEW_CONCURRENCY = 8

async function processPreviewJob(job: Job<PreviewJobData>): Promise<void> {
  const { jobId, sessionId, uploadS3Key, compiledPrompt, category, requiresIPAdapter, requestId } =
    job.data

  console.info({ requestId, jobId }, '[preview worker] job start')

  await prisma.generationJob.update({
    where: { id: jobId },
    data: { status: 'processing', bullJobId: String(job.id) },
  })

  const credited = await SessionService.deductCredit(sessionId)
  if (!credited) {
    await prisma.generationJob.update({
      where: { id: jobId },
      data: { status: 'failed', errorCode: 'insufficient_credits' },
    })
    return
  }

  try {
    const output = await runGeneration({
      sessionId,
      jobId,
      uploadS3Key,
      compiledPrompt,
      negativePrompt: getNegativePrompt(category),
      requiresIPAdapter,
      isHD: false,
    })

    if (output.s3Keys.length === 0) {
      throw new Error('quality_gate_failed')
    }

    await prisma.generationJob.update({
      where: { id: jobId },
      data: {
        status: 'done',
        previewS3Keys: output.s3Keys,
        provider: output.provider,
        durationMs: output.durationMs,
        qualityGatePassed: true,
      },
    })

    await SessionService.appendGenerationHistory(sessionId, jobId)

    console.info({ requestId, jobId, durationMs: output.durationMs }, '[preview worker] done')
  } catch (err) {
    console.error({ requestId, jobId, err }, '[preview worker] failed — refunding credit')

    await SessionService.refundCredit(sessionId)

    await prisma.generationJob.update({
      where: { id: jobId },
      data: {
        status: 'credit_refunded',
        errorCode: err instanceof Error ? err.message : 'unknown',
      },
    })
  }
}

export function startPreviewWorker() {
  const worker = new Worker<PreviewJobData>(QUEUE_NAMES.PREVIEW, processPreviewJob, {
    connection: redis,
    concurrency: PREVIEW_CONCURRENCY,
  })

  worker.on('failed', (job, err) => {
    console.error({ jobId: job?.id, err }, '[preview worker] bullmq job failed')
  })

  return worker
}
