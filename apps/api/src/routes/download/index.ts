import { FastifyInstance } from 'fastify'
import { z } from 'zod'
import { nanoid } from 'nanoid'
import { prisma } from '../../lib/prisma'
import { buildCloudfrontSignedUrl, downloadFromS3 } from '../../lib/cloudfront'
import { exportForPlatform } from '../../services/export.service'
import { applyTextOverlayToS3Image } from '../../lib/text-overlay'

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

      const grant = await prisma.downloadGrant.findFirst({
        where: { jobId, sessionId: session.sessionId },
        include: { job: true },
      })

      if (!grant) {
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

      const grant = await prisma.downloadGrant.findFirst({
        where: { jobId, sessionId: session.sessionId },
        include: { job: true },
      })

      if (!grant) {
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

      const grant = await prisma.downloadGrant.findFirst({
        where: { jobId, sessionId: session.sessionId },
        include: { job: true },
      })

      if (!grant) {
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

      const grant = await prisma.downloadGrant.findFirst({
        where: { jobId, sessionId: session.sessionId },
        include: { job: true },
      })

      if (!grant) {
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
      const grant = await prisma.downloadGrant.findFirst({
        where: { jobId, sessionId: request.session.sessionId },
        select: { id: true },
      })
      return reply.send({
        success: true,
        data: { hasGrant: Boolean(grant) },
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

      const job = await prisma.generationJob.findUnique({ where: { id: jobId } })

      if (!job || job.sessionId !== session.sessionId) {
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
