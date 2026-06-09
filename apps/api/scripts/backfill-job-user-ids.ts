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
    // Strategy 1: find a user whose lastSessionId equals this job's sessionId.
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
      continue
    }

    // Strategy 2: look up verified OTP records for the session to find the
    // identifier that completed OTP during that session, then find the user.
    // This catches jobs from older sessions that are no longer lastSessionId.
    const otp = await prisma.otpRecord.findFirst({
      where: { sessionId: job.sessionId, verified: true },
      select: { identifier: true, identifierType: true },
    })

    if (otp) {
      const userByIdentifier =
        otp.identifierType === 'phone'
          ? await prisma.user.findUnique({ where: { phone: otp.identifier }, select: { id: true } })
          : await prisma.user.findUnique({ where: { email: otp.identifier }, select: { id: true } })

      if (userByIdentifier) {
        await prisma.generationJob.update({
          where: { id: job.id },
          data: { userId: userByIdentifier.id },
        })
        matched++
        continue
      }
    }

    console.log(`  skipped job ${job.id} (sessionId: ${job.sessionId}) — no matching user found`)
    skipped++
  }

  console.log(`Backfill complete: matched=${matched}, skipped=${skipped}`)
  if (skipped > 0) {
    console.log(`${skipped} jobs could not be linked to a user — they remain userId-null.`)
    console.log(`These will still work via sessionId fallback in the ownership helper.`)
  }
}

main()
  .catch((err) => {
    console.error('Backfill failed:', err)
    process.exit(1)
  })
  .finally(() => prisma.$disconnect())
