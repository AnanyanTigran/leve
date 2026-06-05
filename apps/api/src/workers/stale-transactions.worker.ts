import { prisma } from '../lib/prisma'
import { logger } from '../lib/logger'

const STALE_THRESHOLD_MS = 2 * 60 * 60 * 1000 // 2 hours
const CLEANUP_INTERVAL_MS = 60 * 60 * 1000     // every hour

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

export function startStaleTransactionsWorker(): { stop: () => void } {
  // Run once shortly after startup, then every hour — no Redis needed
  const initialTimer = setTimeout(
    () => runCleanup().catch((err) => logger.error({ err }, '[staleTransactions] initial cleanup failed')),
    5 * 60 * 1000,
  )

  const interval = setInterval(
    () => runCleanup().catch((err) => logger.error({ err }, '[staleTransactions] cleanup failed')),
    CLEANUP_INTERVAL_MS,
  )

  logger.info('[staleTransactions] hourly cleanup scheduled via setInterval (zero-Redis)')

  return {
    stop: () => {
      clearTimeout(initialTimer)
      clearInterval(interval)
    },
  }
}
