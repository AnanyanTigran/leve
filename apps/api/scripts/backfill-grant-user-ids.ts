import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  const grants = await prisma.downloadGrant.findMany({
    where: { userId: null },
    select: { id: true, sessionId: true, jobId: true },
  })

  console.log(`Found ${grants.length} grants without userId`)
  let matched = 0
  let skipped = 0

  for (const grant of grants) {
    // Strategy 1: get userId from the linked job
    const job = await prisma.generationJob.findUnique({
      where: { id: grant.jobId },
      select: { userId: true },
    })

    if (job?.userId) {
      await prisma.downloadGrant.update({
        where: { id: grant.id },
        data: { userId: job.userId },
      })
      matched++
      continue
    }

    // Strategy 2: find user whose lastSessionId matches the grant's sessionId
    const user = await prisma.user.findFirst({
      where: { lastSessionId: grant.sessionId },
      select: { id: true },
    })

    if (user) {
      await prisma.downloadGrant.update({
        where: { id: grant.id },
        data: { userId: user.id },
      })
      matched++
      continue
    }

    skipped++
  }

  console.log(`Backfill complete: matched=${matched}, skipped=${skipped}`)
  if (skipped > 0) {
    console.log(`${skipped} grants could not be linked to a user — they remain sessionId-only.`)
    console.log(`These will still work via sessionId fallback in the ownership helper.`)
  }
}

main()
  .catch((err) => {
    console.error('Backfill failed:', err)
    process.exit(1)
  })
  .finally(() => prisma.$disconnect())
