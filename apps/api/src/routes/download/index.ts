import { FastifyInstance } from 'fastify'
import { z } from 'zod'
import { nanoid } from 'nanoid'
import { prisma } from '../../lib/prisma'
import { buildCloudfrontSignedUrl, downloadFromS3 } from '../../lib/cloudfront'
import { exportForPlatform } from '../../services/export.service'
import { applyTextOverlayToS3Image } from '../../lib/text-overlay'
import { SessionService } from '../../services/session.service'
import { UserService } from '../../services/user.service'
import { Sentry } from '../../lib/sentry'
import { sessionOwnsJob, sessionHasGrant } from '../../lib/ownership'

// Resolve the actual S3 key to serve for a job's HD download. If the user
// configured a text overlay on /results, composite it onto the HD output
// here so the downloaded image matches the live preview they saw.
async function resolveHdKeyWithOverlay(
  hdKey: string,
  job: { id: string; sessionId: string; overlayText: string | null; overlayPosition: string | null },
): Promise<string> {
  if (!job.overlayText) return hdKey
  return applyTextOverlayToS3Image({
    sourceS3Key: hdKey,
    sessionId: job.sessionId,
    jobId: job.id,
    text: job.overlayText,
    position: (job.overlayPosition as 'top' | 'center' | 'bottom') ?? 'bottom',
  })
}

const MAX_DOWNLOAD_COUNT_ALERT = 10

const exportSchema = z.object({
  jobId: z.string().min(1),
  platform: z.enum([
    'instagram_feed',
    'instagram_story',
    'facebook_post',
    'wildberries',
    'ozon',
    'telegram',
    'list_am',
    'original_hd',
  ]),
})

// Optional crop region as query params (fractions of source 0–1). All four
// must be present together; otherwise the export falls back to the default
// center-crop / contain behavior.
const cropQuerySchema = z.object({
  cropX: z.coerce.number().min(0).max(1),
  cropY: z.coerce.number().min(0).max(1),
  cropW: z.coerce.number().min(0).max(1),
  cropH: z.coerce.number().min(0).max(1),
})

export async function registerDownloadRoutes(app: FastifyInstance) {

  // GET /api/download/url
  // Requires DownloadGrant — proof that payment was completed.
  app.get(
    '/api/download/url',
    { preHandler: [app.requireVerified], config: { rateLimit: { max: 30, timeWindow: '1 minute' } } },
    async (request, reply) => {
      const requestId = nanoid(10)
      const session = request.session
      const { jobId } = request.query as { jobId?: string }

      if (!jobId) {
        return reply.status(400).send({ success: false, error: 'missing_job_id', requestId })
      }

      const { hasGrant, grant } = await sessionHasGrant(jobId, session)
      if (!hasGrant || !grant) {
        return reply.status(403).send({ success: false, error: 'access_denied', requestId })
      }

      if (!grant.job.hdS3Key) {
        return reply.status(202).send({
          success: false,
          error: 'hd_not_ready',
          data: { retryAfterSeconds: 5 },
          requestId,
        })
      }

      let hdKey: string
      try {
        hdKey = await resolveHdKeyWithOverlay(grant.job.hdS3Key, grant.job)
      } catch (err) {
        app.log.error({ requestId, jobId, err }, 'overlay composite failed — falling back to clean HD')
        hdKey = grant.job.hdS3Key
      }

      let signedUrl: string
      try {
        signedUrl = buildCloudfrontSignedUrl(hdKey)
      } catch (err) {
        app.log.error({ requestId, err }, 'cloudfront signing failed')
        return reply.status(500).send({ success: false, error: 'signing_failed', requestId })
      }

      // Track download count async — do not block response
      prisma.downloadGrant
        .update({
          where: { id: grant.id },
          data: {
            downloadCount: { increment: 1 },
            signedUrlIssuedAt: new Date(),
          },
        })
        .then((updated: { downloadCount: number }) => {
          if (updated.downloadCount > MAX_DOWNLOAD_COUNT_ALERT) {
            app.log.warn(
              {
                grantId: grant.id,
                downloadCount: updated.downloadCount,
                sessionId: session.sessionId,
              },
              'download grant high usage — review for abuse',
            )
          }
        })
        .catch((err: unknown) => app.log.error({ err }, 'download count update failed'))

      app.log.info({ requestId, jobId, sessionId: session.sessionId }, 'signed url issued')

      return reply.send({
        success: true,
        data: { url: signedUrl, expiresInSeconds: 86400 },
        requestId,
      })
    },
  )

  // POST /api/download/export
  // Resizes HD output for a specific platform. Requires DownloadGrant.
  app.post(
    '/api/download/export',
    { preHandler: [app.requireVerified], config: { rateLimit: { max: 30, timeWindow: '1 minute' } } },
    async (request, reply) => {
      const requestId = nanoid(10)
      const session = request.session

      const parsed = exportSchema.safeParse(request.body)
      if (!parsed.success) {
        return reply.status(400).send({ success: false, error: 'invalid_input', requestId })
      }

      const { jobId, platform } = parsed.data

      const { hasGrant, grant } = await sessionHasGrant(jobId, session)
      if (!hasGrant || !grant) {
        return reply.status(403).send({ success: false, error: 'access_denied', requestId })
      }

      if (!grant.job.hdS3Key) {
        return reply.status(202).send({
          success: false,
          error: 'hd_not_ready',
          data: { retryAfterSeconds: 5 },
          requestId,
        })
      }

      let exportKey: string
      try {
        exportKey = await exportForPlatform(
          grant.job.hdS3Key,
          platform,
          session.sessionId,
          jobId,
        )
      } catch (err) {
        app.log.error({ requestId, jobId, platform, err }, 'export failed')
        return reply.status(500).send({ success: false, error: 'export_failed', requestId })
      }

      // Apply text overlay AFTER platform resize so the font scales correctly
      // to the target dimensions. Falls back to the clean export on failure.
      if (grant.job.overlayText) {
        try {
          exportKey = await applyTextOverlayToS3Image({
            sourceS3Key: exportKey,
            sessionId: session.sessionId,
            jobId,
            text: grant.job.overlayText,
            position: (grant.job.overlayPosition as 'top' | 'center' | 'bottom') ?? 'bottom',
          })
        } catch (err) {
          app.log.error({ requestId, jobId, platform, err }, 'overlay composite on export failed — serving clean export')
        }
      }

      let signedUrl: string
      try {
        signedUrl = buildCloudfrontSignedUrl(exportKey)
      } catch (err) {
        app.log.error({ requestId, err }, 'cloudfront signing failed')
        return reply.status(500).send({ success: false, error: 'signing_failed', requestId })
      }

      app.log.info({ requestId, jobId, platform }, 'platform export issued')

      return reply.send({
        success: true,
        data: { url: signedUrl, platform, expiresInSeconds: 86400 },
        requestId,
      })
    },
  )

  // GET /api/download/file
  // Streams the HD file directly so the browser triggers a download instead
  // of opening the image in a tab. Same grant gate as /api/download/url.
  app.get(
    '/api/download/file',
    { preHandler: [app.requireVerified], config: { rateLimit: { max: 30, timeWindow: '1 minute' } } },
    async (request, reply) => {
      const requestId = nanoid(10)
      const session = request.session
      const { jobId } = request.query as { jobId?: string }

      if (!jobId) {
        return reply.status(400).send({ success: false, error: 'missing_job_id', requestId })
      }

      const { hasGrant, grant } = await sessionHasGrant(jobId, session)
      if (!hasGrant || !grant) {
        return reply.status(403).send({ success: false, error: 'access_denied', requestId })
      }

      if (!grant.job.hdS3Key) {
        return reply.status(202).send({
          success: false,
          error: 'hd_not_ready',
          data: { retryAfterSeconds: 5 },
          requestId,
        })
      }

      let hdKey: string
      try {
        hdKey = await resolveHdKeyWithOverlay(grant.job.hdS3Key, grant.job)
      } catch (err) {
        app.log.error({ requestId, jobId, err }, 'overlay composite failed — falling back to clean HD')
        hdKey = grant.job.hdS3Key
      }

      let buffer: Buffer
      try {
        buffer = await downloadFromS3(hdKey)
      } catch (err) {
        app.log.error({ requestId, jobId, err }, 's3 fetch failed')
        return reply.status(500).send({ success: false, error: 's3_fetch_failed', requestId })
      }

      prisma.downloadGrant
        .update({
          where: { id: grant.id },
          data: {
            downloadCount: { increment: 1 },
            signedUrlIssuedAt: new Date(),
          },
        })
        .then((updated: { downloadCount: number }) => {
          if (updated.downloadCount > MAX_DOWNLOAD_COUNT_ALERT) {
            app.log.warn(
              {
                grantId: grant.id,
                downloadCount: updated.downloadCount,
                sessionId: session.sessionId,
              },
              'download grant high usage — review for abuse',
            )
          }
        })
        .catch((err: unknown) => app.log.error({ err }, 'download count update failed'))

      app.log.info({ requestId, jobId, sessionId: session.sessionId }, 'hd file streamed')

      return reply
        .header('Content-Type', 'image/jpeg')
        .header('Content-Disposition', `attachment; filename="leve-${jobId}.jpg"`)
        .header('Cache-Control', 'private, no-cache')
        .send(buffer)
    },
  )

  // GET /api/download/export-file
  // Same as POST /api/download/export but streams the resized file back so
  // the browser triggers an actual download.
  app.get(
    '/api/download/export-file',
    { preHandler: [app.requireVerified], config: { rateLimit: { max: 30, timeWindow: '1 minute' } } },
    async (request, reply) => {
      const requestId = nanoid(10)
      const session = request.session

      const parsed = exportSchema.safeParse(request.query)
      if (!parsed.success) {
        return reply.status(400).send({ success: false, error: 'invalid_input', requestId })
      }

      const { jobId, platform } = parsed.data

      // Optional crop region. All four fields must parse; partial sets are
      // silently ignored so a malformed link still produces a clean export.
      const cropParsed = cropQuerySchema.safeParse(request.query)
      const cropRegion = cropParsed.success
        ? {
            x: cropParsed.data.cropX,
            y: cropParsed.data.cropY,
            width: cropParsed.data.cropW,
            height: cropParsed.data.cropH,
          }
        : undefined

      const { hasGrant, grant } = await sessionHasGrant(jobId, session)
      if (!hasGrant || !grant) {
        return reply.status(403).send({ success: false, error: 'access_denied', requestId })
      }

      if (!grant.job.hdS3Key) {
        return reply.status(202).send({
          success: false,
          error: 'hd_not_ready',
          data: { retryAfterSeconds: 5 },
          requestId,
        })
      }

      let exportKey: string
      try {
        exportKey = await exportForPlatform(
          grant.job.hdS3Key,
          platform,
          session.sessionId,
          jobId,
          cropRegion,
        )
      } catch (err) {
        app.log.error({ requestId, jobId, platform, err }, 'export failed')
        return reply.status(500).send({ success: false, error: 'export_failed', requestId })
      }

      if (grant.job.overlayText) {
        try {
          exportKey = await applyTextOverlayToS3Image({
            sourceS3Key: exportKey,
            sessionId: session.sessionId,
            jobId,
            text: grant.job.overlayText,
            position: (grant.job.overlayPosition as 'top' | 'center' | 'bottom') ?? 'bottom',
          })
        } catch (err) {
          app.log.error({ requestId, jobId, platform, err }, 'overlay composite on export failed — serving clean export')
        }
      }

      let buffer: Buffer
      try {
        buffer = await downloadFromS3(exportKey)
      } catch (err) {
        app.log.error({ requestId, jobId, platform, err }, 's3 fetch failed')
        return reply.status(500).send({ success: false, error: 's3_fetch_failed', requestId })
      }

      app.log.info({ requestId, jobId, platform }, 'platform export streamed')

      return reply
        .header('Content-Type', 'image/jpeg')
        .header('Content-Disposition', `attachment; filename="leve-${jobId}-${platform}.jpg"`)
        .header('Cache-Control', 'private, no-cache')
        .send(buffer)
    },
  )

  // POST /api/download/spend-credit
  // Verified users with free credits (granted on OTP verification) can spend
  // one to unlock HD download without going through the paywall. Deducts
  // atomically from Redis, mirrors the deduction to the User DB row, and
  // creates a Transaction + DownloadGrant so the regular /url and /file
  // endpoints work unchanged.
  app.post(
    '/api/download/spend-credit',
    { preHandler: [app.requireVerified], config: { rateLimit: { max: 10, timeWindow: '1 minute' } } },
    async (request, reply) => {
      const requestId = nanoid(10)
      const session = request.session

      const parsed = z.object({ jobId: z.string().min(1) }).safeParse(request.body)
      if (!parsed.success) {
        return reply.status(400).send({ success: false, error: 'invalid_input', requestId })
      }
      const { jobId } = parsed.data

      const { owns, job } = await sessionOwnsJob(jobId, session)
      if (!owns || !job) {
        return reply.status(404).send({ success: false, error: 'not_found', requestId })
      }

      if (!job.hdS3Key) {
        return reply.status(202).send({
          success: false,
          error: 'hd_not_ready',
          data: { retryAfterSeconds: 5 },
          requestId,
        })
      }

      // Short-circuit when a grant already exists for this job — avoids
      // double-spending if the FE retries after a slow response.
      const existingGrantResult = await sessionHasGrant(jobId, session)
      if (existingGrantResult.hasGrant) {
        return reply.send({ success: true, data: { hasGrant: true }, requestId })
      }

      // Resolve user identity once — used for DB pre-check, DB sync, and Redis sync below
      const identifier = session.phone ?? session.email
      const identifierType: 'phone' | 'email' = session.phone ? 'phone' : 'email'

      // DB pre-check: prevents stale Redis from over-spending when the same user
      // has multiple active sessions. Each session holds its own Redis key seeded
      // from the same DB value — spending from both simultaneously would
      // decrement the DB twice. Checking the authoritative DB value first stops
      // the second spend before it reaches Redis.
      if (identifier) {
        const dbUser = await UserService.getByIdentifier(identifier, identifierType)
        if (!dbUser || dbUser.creditsRemaining <= 0) {
          return reply.status(402).send({ success: false, error: 'insufficient_credits', requestId })
        }
      }

      const deducted = await SessionService.deductCredit(session.sessionId)
      if (!deducted) {
        return reply.status(402).send({ success: false, error: 'insufficient_credits', requestId })
      }

      // Mirror to DB and sync this session's Redis key so the UI reflects the
      // updated balance without waiting for re-verification.
      //
      // recordGeneration returns:
      //   true  — DB decremented; sync Redis to fresh DB balance
      //   false — DB was already 0 (race: another session won between pre-check
      //           and this call); refund Redis and reject so no grant is created
      //   null  — DB error; non-fatal, proceed with Redis as authoritative
      if (identifier) {
        const decremented = await UserService.recordGeneration(identifier, identifierType)

        if (decremented === false) {
          // Race condition: another concurrent session consumed the last credit
          // between our DB pre-check and this DB decrement. Refund the Redis
          // deduction so the session credit count stays consistent, then reject.
          await SessionService.refundCredit(session.sessionId).catch(() => {})
          return reply.status(402).send({ success: false, error: 'insufficient_credits', requestId })
        }

        if (decremented === true) {
          // DB was decremented. Sync this session's Redis key to the new DB
          // balance. Other sessions self-correct on next promoteToVerified.
          const updatedUser = await UserService.getByIdentifier(identifier, identifierType).catch(() => null)
          if (updatedUser) {
            session.creditsRemaining = updatedUser.creditsRemaining
            await SessionService.update(session).catch(() => {})
          }
        }
        // decremented === null: DB error logged inside recordGeneration.
        // Redis deduction stands; proceed to create the grant.
      }

      let transaction
      try {
        transaction = await prisma.transaction.create({
          data: {
            sessionId: session.sessionId,
            provider: 'credit',
            orderId: nanoid(16),
            pack: 'free_credit',
            amountAMD: 0,
            credits: 1,
            status: 'completed',
            completedAt: new Date(),
          },
        })

        await prisma.downloadGrant.create({
          data: {
            sessionId: session.sessionId,
            userId: session.userId ?? null,
            jobId,
            transactionId: transaction.id,
            hdS3Key: job.hdS3Key,
          },
        })
      } catch (err) {
        // Refund the credit so the user is not charged for a half-finished
        // grant. The next click will retry cleanly.
        await SessionService.refundCredit(session.sessionId).catch(() => {})
        app.log.error({ err, requestId, jobId }, 'spend-credit grant creation failed — credit refunded')
        Sentry.captureException(err)
        return reply.status(500).send({ success: false, error: 'grant_creation_failed', requestId })
      }

      app.log.info({ requestId, jobId, sessionId: session.sessionId }, 'credit spent for HD download')

      return reply.send({ success: true, data: { hasGrant: true }, requestId })
    },
  )

  // GET /api/download/proxy
  // Fetches the HD image from S3 server-side and streams it to the client.
  // Scoped to jobs belonging to the requesting session via DownloadGrant.
  // Enables navigator.share file sharing without browser CORS restriction.
  app.get(
    '/api/download/proxy',
    { preHandler: [app.requireVerified], config: { rateLimit: { max: 30, timeWindow: '1 minute' } } },
    async (request, reply) => {
      const requestId = nanoid(10)
      const session = request.session
      const { jobId } = request.query as { jobId?: string }

      if (!jobId) {
        return reply.status(400).send({ success: false, error: 'missing_job_id', requestId })
      }

      const { hasGrant, grant } = await sessionHasGrant(jobId, session)
      if (!hasGrant || !grant) {
        return reply.status(403).send({ success: false, error: 'access_denied', requestId })
      }

      if (!grant.job.hdS3Key) {
        return reply.status(404).send({ success: false, error: 'hd_not_ready', requestId })
      }

      let hdKey: string
      try {
        hdKey = await resolveHdKeyWithOverlay(grant.job.hdS3Key, grant.job)
      } catch (err) {
        app.log.error({ requestId, jobId, err }, 'overlay composite failed — falling back to clean HD')
        hdKey = grant.job.hdS3Key
      }

      let buffer: Buffer
      try {
        buffer = await downloadFromS3(hdKey)
      } catch (err) {
        app.log.error({ requestId, jobId, err }, 's3 fetch failed')
        return reply.status(500).send({ success: false, error: 's3_fetch_failed', requestId })
      }

      app.log.info({ requestId, jobId, sessionId: session.sessionId }, 'proxy image served for share')

      return reply
        .header('Content-Type', 'image/jpeg')
        .header('Content-Disposition', 'attachment; filename="leve-studio.jpg"')
        .header('Cache-Control', 'private, max-age=300')
        .send(buffer)
    },
  )

  // GET /api/download/check
  // Cheap existence check for a DownloadGrant. Lets the FE render the
  // correct CTA on results (download vs unlock) without a 403 round-trip.
  app.get(
    '/api/download/check',
    { preHandler: [app.requireSessionOrAnon] },
    async (request, reply) => {
      const requestId = nanoid(10)
      const { jobId } = request.query as { jobId?: string }
      if (!jobId) {
        return reply.status(400).send({ success: false, error: 'missing_job_id', requestId })
      }
      const session = request.session
      const { hasGrant } = await sessionHasGrant(jobId, session)
      return reply.send({
        success: true,
        data: { hasGrant },
        requestId,
      })
    },
  )

  // GET /api/download/preview-url
  // Returns signed URLs for watermarked previews. No payment required.
  app.get(
    '/api/download/preview-url',
    { preHandler: [app.requireSessionOrAnon] },
    async (request, reply) => {
      const requestId = nanoid(10)
      const session = request.session
      const { jobId } = request.query as { jobId?: string }

      if (!jobId) {
        return reply.status(400).send({ success: false, error: 'missing_job_id', requestId })
      }

      const { owns, job } = await sessionOwnsJob(jobId, session)
      if (!owns || !job) {
        return reply.status(404).send({ success: false, error: 'not_found', requestId })
      }

      if (job.status !== 'done' || job.previewS3Keys.length === 0) {
        return reply.status(202).send({
          success: false,
          error: 'previews_not_ready',
          requestId,
        })
      }

      // Previews get 48h expiry — shorter than HD downloads
      let signedUrls: string[]
      try {
        signedUrls = job.previewS3Keys.map((key: string) =>
          buildCloudfrontSignedUrl(key, 60 * 60 * 48),
        )
      } catch (err) {
        app.log.error({ requestId, err }, 'cloudfront signing failed')
        return reply.status(500).send({ success: false, error: 'signing_failed', requestId })
      }

      return reply.send({
        success: true,
        data: { previewUrls: signedUrls },
        requestId,
      })
    },
  )
}
