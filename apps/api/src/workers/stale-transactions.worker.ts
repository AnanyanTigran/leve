import { Worker, Queue } from 'bullmq'
import { redis } from '../lib/redis'
import { prisma } from '../lib/prisma'
import { logger } from '../lib/logger'

const QUEUE_NAME = 'stale-transactions-cleanup'
const STALE_THRESHOLD_MS = 2 * 60 * 60 * 1000 // 2 hours

const cleanupQueue = new Queue(QUEUE_NAME, { connection: redis })

async function runCleanup(): Promise<void> {
  const cutoff = new Date(Date.now() - STALE_THRESHOLD_MS)

  const result = await prisma.transaction.updateMany({
    where: {
      status: 'pending',
      createdAt: { lt: cutoff },
    },
    data: {
      status: 'failed',
      failedAt: new Date(),
    },
  })

  if (result.count > 0) {
    logger.info({ count: result.count }, '[staleTransactions] marked stale pending transactions as failed')
  }
}

export function startStaleTransactionsWorker() {
  const worker = new Worker(
    QUEUE_NAME,
    async () => {
      await runCleanup()
    },
    { connection: redis, concurrency: 1 },
  )

  worker.on('failed', (job, err) => {
    logger.error({ jobId: job?.id, err }, '[staleTransactions] cleanup job failed')
  })

  return worker
}

export async function scheduleStaleTransactionsCleanup() {
  // Remove any previously scheduled repeatable job to avoid duplicates on restart
  await cleanupQueue.removeRepeatable('cleanup', { pattern: '0 * * * *' })

  await cleanupQueue.add(
    'cleanup',
    {},
    {
      repeat: { pattern: '0 * * * *' }, // every hour at :00
      jobId: 'stale-transactions-cleanup',
    },
  )

  logger.info('[staleTransactions] hourly cleanup job scheduled')
}
