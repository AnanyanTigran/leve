import { FastifyInstance } from 'fastify'
import { z } from 'zod'
import { nanoid } from 'nanoid'
import { prisma } from '../../lib/prisma'
import { buildCloudfrontSignedUrl } from '../../lib/cloudfront'
import { exportForPlatform } from '../../services/export.service'

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

export async function registerDownloadRoutes(app: FastifyInstance) {

  // GET /api/download/url
  // Requires DownloadGrant — proof that payment was completed.
  app.get(
    '/api/download/url',
    { preHandler: [app.requireVerified] },
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

      const signedUrl = buildCloudfrontSignedUrl(grant.job.hdS3Key)

      // Track download count async — do not block response
      prisma.downloadGrant
        .update({
          where: { id: grant.id },
          data: {
            downloadCount: { increment: 1 },
            signedUrlIssuedAt: new Date(),
          },
        })
        .then((updated) => {
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
        .catch((err) => app.log.error({ err }, 'download count update failed'))

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
    { preHandler: [app.requireVerified] },
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

      const signedUrl = buildCloudfrontSignedUrl(exportKey)

      app.log.info({ requestId, jobId, platform }, 'platform export issued')

      return reply.send({
        success: true,
        data: { url: signedUrl, platform, expiresInSeconds: 86400 },
        requestId,
      })
    },
  )

  // GET /api/download/preview-url
  // Returns signed URLs for watermarked previews. No payment required.
  app.get(
    '/api/download/preview-url',
    { preHandler: [app.requireVerified] },
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
      const signedUrls = job.previewS3Keys.map((key) =>
        buildCloudfrontSignedUrl(key, 60 * 60 * 48),
      )

      return reply.send({
        success: true,
        data: { previewUrls: signedUrls },
        requestId,
      })
    },
  )
}
