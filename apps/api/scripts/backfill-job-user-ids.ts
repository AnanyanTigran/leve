import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  const jobs = await prisma.generationJob.findMany({
    where: { userId: null },
    select: { id: true, sessionId: true },
  })

  console.log(`Found ${jobs.length} jobs without userId`)

  let byOtp = 0
  let byLastSession = 0
  let skipped = 0

  // Cache OTP lookups per sessionId — many jobs can share a session.
  const sessionUserCache = new Map<string, string | null>()

  for (const job of jobs) {
    // ── Strategy 1: OtpRecord bridge (sessionId → identifier → User) ──────
    // OtpRecord stores the identifier that completed OTP in a given session.
    // This is the authoritative link between a session and a User, and works
    // for ALL sessions — not just the most recent one.
    if (!sessionUserCache.has(job.sessionId)) {
      const otp = await prisma.otpRecord.findFirst({
        where: { sessionId: job.sessionId, verified: true },
        select: { identifier: true, identifierType: true },
      })

      if (otp) {
        const user =
          otp.identifierType === 'phone'
            ? await prisma.user.findUnique({ where: { phone: otp.identifier }, select: { id: true } })
            : await prisma.user.findUnique({ where: { email: otp.identifier }, select: { id: true } })
        sessionUserCache.set(job.sessionId, user?.id ?? null)
      } else {
        sessionUserCache.set(job.sessionId, null)
      }
    }

    const cachedUserId = sessionUserCache.get(job.sessionId) ?? null

    if (cachedUserId) {
      await prisma.generationJob.update({
        where: { id: job.id },
        data: { userId: cachedUserId },
      })
      byOtp++
      continue
    }

    // ── Strategy 2: User.lastSessionId direct match ────────────────────────
    // lastSessionId is overwritten on every OTP verification, so this only
    // catches the user's most-recent session. Kept as last-resort fallback
    // for cases where OTP records have expired or were pruned.
    const userByLastSession = await prisma.user.findFirst({
      where: { lastSessionId: job.sessionId },
      select: { id: true },
    })

    if (userByLastSession) {
      await prisma.generationJob.update({
        where: { id: job.id },
        data: { userId: userByLastSession.id },
      })
      // Warm the cache so sibling jobs in the same session skip Strategy 1
      sessionUserCache.set(job.sessionId, userByLastSession.id)
      byLastSession++
      continue
    }

    // ── Strategy 3: log for manual review ─────────────────────────────────
    console.log(`  UNMATCHED job ${job.id} (sessionId: ${job.sessionId})`)
    skipped++
  }

  const matched = byOtp + byLastSession
  console.log(`\nBackfill complete: matched=${matched} (otp=${byOtp}, lastSession=${byLastSession}), skipped=${skipped}`)
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
