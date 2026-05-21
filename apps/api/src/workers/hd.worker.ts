import { Worker, Job } from 'bullmq'
import { redis } from '../lib/redis'
import { prisma } from '../lib/prisma'
import { runGeneration } from '../providers/model-router'
import { getNegativePrompt } from '../services/prompt.service'
import { QUEUE_NAMES, HdJobData } from '../lib/queues'

const HD_CONCURRENCY = 3

async function processHdJob(job: Job<HdJobData>): Promise<void> {
  const { jobId, sessionId, uploadS3Key, compiledPrompt, category, requiresIPAdapter, requestId } =
    job.data

  console.info({ requestId, jobId }, '[hd worker] job start')

  try {
    const output = await runGeneration({
      sessionId,
      jobId,
      uploadS3Key,
      compiledPrompt,
      negativePrompt: getNegativePrompt(category),
      requiresIPAdapter,
      isHD: true,
    })

    if (output.s3Keys.length === 0) {
      throw new Error('quality_gate_failed')
    }

    await prisma.generationJob.update({
      where: { id: jobId },
      data: {
        status: 'done',
        hdS3Key: output.s3Keys[0],
        provider: output.provider,
        durationMs: output.durationMs,
        qualityGatePassed: true,
      },
    })

    console.info({ requestId, jobId }, '[hd worker] done')
  } catch (err) {
    console.error({ requestId, jobId, err }, '[hd worker] failed')
    await prisma.generationJob.update({
      where: { id: jobId },
      data: {
        status: 'failed',
        errorCode: err instanceof Error ? err.message : 'unknown',
      },
    })
    throw err // re-throw so BullMQ retries
  }
}

export function startHdWorker() {
  const worker = new Worker<HdJobData>(QUEUE_NAMES.HD, processHdJob, {
    connection: redis,
    concurrency: HD_CONCURRENCY,
  })

  worker.on('failed', (job, err) => {
    console.error({ jobId: job?.id, err }, '[hd worker] bullmq job failed')
  })

  return worker
}
