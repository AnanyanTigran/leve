import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  const jobs = await prisma.generationJob.findMany({
    where: { userId: null },
    select: { id: true, sessionId: true },
  })

  console.log(`Found ${jobs.length} jobs without userId`)

  let matched = 0
  let skipped = 0

  for (const job of jobs) {
    // Best-effort match: find a user whose lastSessionId equals this job's sessionId.
    // Jobs from older sessions (where the user has since re-verified) won't match
    // and are left as null — they fall back to the sessionId query in history.
    const user = await prisma.user.findFirst({
      where: { lastSessionId: job.sessionId },
      select: { id: true },
    })

    if (user) {
      await prisma.generationJob.update({
        where: { id: job.id },
        data: { userId: user.id },
      })
      matched++
    } else {
      skipped++
    }
  }

  console.log(`Backfill complete: matched=${matched}, skipped=${skipped}`)
}

main()
  .catch((err) => {
    console.error('Backfill failed:', err)
    process.exit(1)
  })
  .finally(() => prisma.$disconnect())
