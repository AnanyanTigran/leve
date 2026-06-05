import { Worker, Job } from 'bullmq'
import sharp from 'sharp'
import { redis } from '../lib/redis'
import { prisma } from '../lib/prisma'
import { logger } from '../lib/logger'
import { SessionService } from '../services/session.service'
import { runGeneration } from '../providers/model-router'
import { QUEUE_NAMES, PreviewJobData } from '../lib/queues'
import { applyWatermark } from '../lib/watermark'
import { uploadToS3 } from '../lib/s3'
import { setJobPhase, clearJobPhase } from '../lib/job-phase'

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

  logger.info({ requestId, jobId, isEdit }, '[preview worker] job start')

  // Mark processing in DB + emit phase for the FE progress bar
  await prisma.generationJob.update({
    where: { id: jobId },
    data: { status: 'processing', bullJobId: String(job.id) },
  })
  await setJobPhase(jobId, 'processing')

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
    await setJobPhase(jobId, 'generating')
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
    await setJobPhase(jobId, 'finalizing')

    // Quality gate: only reject genuinely failed or tiny outputs (e.g. a
    // 200×200 corrupted return), not valid portrait/landscape outputs whose
    // short side is naturally below the verified 1024 / anon 512 threshold
    // (e.g. 9:16 verified → 1152×2048; the short side 1152 is fine, but at
    // 4:5 → 1638×2048 the short side 1638 is also fine). Use the longest
    // side, which is the actual quality signal Kontext targets.
    const outputMeta = await sharp(output.outputBuffer).metadata()
    const { width = 0, height = 0 } = outputMeta
    const minExpected = isVerified ? 1024 : 512
    const longerSide = Math.max(width, height)
    const qualityGatePassed = longerSide >= minExpected

    if (!qualityGatePassed) {
      logger.error({ requestId, jobId, width, height, longerSide, minExpected }, '[preview worker] quality gate failed — refunding credit')
      if (isVerified) {
        await SessionService.refundCredit(sessionId)
      }
      await prisma.generationJob.update({
        where: { id: jobId },
        data: { status: isVerified ? 'credit_refunded' : 'failed', errorCode: 'quality_gate_failed', qualityGatePassed: false },
      })
      await clearJobPhase(jobId)
      return
    }

    // Every preview is watermarked — verified and anonymous alike. The clean
    // original (output.s3Key) is preserved as hdS3Key and only served after
    // purchase via the HD download endpoint.
    let workingKey = output.s3Key

    try {
      const watermarkedBuffer = await applyWatermark(output.outputBuffer)
      const watermarkedKey = output.s3Key.replace('-output.jpg', '-wm.jpg')
      await uploadToS3(watermarkedKey, watermarkedBuffer, 'image/jpeg')
      workingKey = watermarkedKey
    } catch (err) {
      logger.error({ requestId, jobId, err }, '[preview worker] watermark failed — serving without watermark')
    }

    // Text overlay is now applied at HD download time (see audit R1), not on
    // the preview. The user picks/edits the overlay live on /results, so the
    // preview stays clean and the overlay is composited deterministically
    // when they actually download.
    await prisma.generationJob.update({
      where: { id: jobId },
      data: {
        status: 'done',
        previewS3Keys: [workingKey],
        hdS3Key: output.s3Key,
        provider: output.provider,
        durationMs: output.durationMs,
        qualityGatePassed,
      },
    })

    await SessionService.appendGenerationHistory(sessionId, jobId)

    if (!isVerified) {
      await SessionService.incrementAnonGeneration(sessionId)
    } else {
      await SessionService.incrementDailyGeneration(sessionId)
    }

    await setJobPhase(jobId, 'done')
    logger.info({ requestId, jobId, durationMs: output.durationMs }, '[preview worker] done')
  } catch (err) {
    const errorCode = err instanceof Error ? err.message : 'unknown'
    const isFinalAttempt = job.attemptsMade >= (job.opts.attempts ?? 1)

    logger.error({ requestId, jobId, errorCode, isFinalAttempt, attemptsMade: job.attemptsMade }, '[preview worker] failed')

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

    if (!isFinalAttempt) {
      await setJobPhase(jobId, 'queued')
    }

    if (isFinalAttempt) {
      await clearJobPhase(jobId)
    }
  }
}

export function startPreviewWorker() {
  const worker = new Worker<PreviewJobData>(
    QUEUE_NAMES.PREVIEW,
    processJob,
    {
      connection: redis,
      concurrency: PREVIEW_CONCURRENCY,
      // drainDelay (ms) becomes the BLMOVE blocking timeout in seconds inside BullMQ 5
      // (Math.max(Math.trunc(drainDelay/1000), 1)). Default 5 ms → 1s timeout → 60 polls/min.
      // 30 000 ms → 30s timeout → 2 polls/min. Jobs still picked up instantly via push notification.
      drainDelay: 30_000,
      // Stalled-job checks are only useful when jobs are actively running.
      // Raising from 30s to 5 min saves ~10 Redis commands/min at idle.
      stalledInterval: 300_000,
    },
  )

  worker.on('failed', (job, err) => {
    logger.error({ jobId: job?.id, err }, '[preview worker] bullmq job failed')
  })

  return worker
}
