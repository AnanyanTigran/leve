import { FastifyInstance } from 'fastify'
import { z } from 'zod'
import { nanoid } from 'nanoid'
import { prisma } from '../../lib/prisma'
import { previewQueue, hdQueue, PRIORITIES } from '../../lib/queues'
import { compilePrompt } from '../../services/prompt.service'

const previewSchema = z.object({
  uploadKey: z.string().min(1),
  templateId: z.string().min(1),
  category: z.enum([
    'beauty_cosmetics',
    'jewelry_accessories',
    'fashion',
    'food',
    'marketplace',
    'custom',
  ]),
  intent: z.enum(['product_photo', 'lifestyle', 'marketplace']),
  refinementChips: z.array(z.string()).default([]),
  customText: z.string().max(200).optional(),
  requiresIPAdapter: z.boolean().default(false),
})

const hdSchema = z.object({
  jobId: z.string().min(1),
})

const IP_ADAPTER_CATEGORIES = new Set(['jewelry_accessories'])

export async function registerGenerateRoutes(app: FastifyInstance) {

  // POST /api/generate/preview
  app.post(
    '/api/generate/preview',
    { preHandler: [app.requireVerified] },
    async (request, reply) => {
      const requestId = nanoid(10)
      const session = request.session

      const parsed = previewSchema.safeParse(request.body)
      if (!parsed.success) {
        return reply.status(400).send({ success: false, error: 'invalid_input', requestId })
      }

      const { uploadKey, templateId, category, intent, refinementChips, customText, requiresIPAdapter } =
        parsed.data

      if (!uploadKey.startsWith(`uploads/${session.sessionId}/`)) {
        return reply.status(403).send({ success: false, error: 'invalid_upload_key', requestId })
      }

      if (session.creditsRemaining <= 0) {
        return reply.status(402).send({ success: false, error: 'insufficient_credits', requestId })
      }

      const compiledPrompt = compilePrompt({ templateId, category, refinementChips, customText })
      const shouldUseIPAdapter = requiresIPAdapter || IP_ADAPTER_CATEGORIES.has(category)

      const job = await prisma.generationJob.create({
        data: {
          sessionId: session.sessionId,
          templateId,
          intent,
          category,
          status: 'queued',
          uploadS3Key: uploadKey,
          compiledPrompt,
          creditsCost: 1,
          requestId,
        },
      })

      const priority = session.isPaid ? PRIORITIES.PAID : PRIORITIES.VERIFIED
      await previewQueue.add(
        'preview',
        {
          jobId: job.id,
          sessionId: session.sessionId,
          uploadS3Key: uploadKey,
          templateId,
          category,
          intent,
          compiledPrompt,
          requiresIPAdapter: shouldUseIPAdapter,
          requestId,
        },
        { priority },
      )

      app.log.info({ requestId, jobId: job.id }, 'preview job dispatched')

      return reply.status(202).send({
        success: true,
        data: { jobId: job.id },
        requestId,
      })
    },
  )

  // GET /api/generate/status/:jobId
  app.get(
    '/api/generate/status/:jobId',
    { preHandler: [app.requireVerified] },
    async (request, reply) => {
      const requestId = nanoid(10)
      const { jobId } = request.params as { jobId: string }
      const session = request.session

      const job = await prisma.generationJob.findUnique({ where: { id: jobId } })

      if (!job || job.sessionId !== session.sessionId) {
        return reply.status(404).send({ success: false, error: 'not_found', requestId })
      }

      return reply.send({
        success: true,
        data: {
          status: job.status,
          previewS3Keys: job.previewS3Keys,
          hdS3Key: job.hdS3Key,
          provider: job.provider,
          errorCode: job.errorCode ?? null,
        },
        requestId,
      })
    },
  )

  // POST /api/generate/hd
  app.post(
    '/api/generate/hd',
    { preHandler: [app.requireVerified] },
    async (request, reply) => {
      const requestId = nanoid(10)
      const session = request.session

      const parsed = hdSchema.safeParse(request.body)
      if (!parsed.success) {
        return reply.status(400).send({ success: false, error: 'invalid_input', requestId })
      }

      const { jobId } = parsed.data

      const grant = await prisma.downloadGrant.findFirst({
        where: { jobId, sessionId: session.sessionId },
        include: { job: true },
      })

      if (!grant) {
        return reply.status(403).send({ success: false, error: 'payment_required', requestId })
      }

      if (grant.job.hdS3Key) {
        return reply.send({
          success: true,
          data: { jobId, hdReady: true },
          requestId,
        })
      }

      const hdJob = await prisma.generationJob.create({
        data: {
          sessionId: session.sessionId,
          templateId: grant.job.templateId,
          intent: grant.job.intent,
          category: grant.job.category,
          status: 'queued',
          uploadS3Key: grant.job.uploadS3Key,
          compiledPrompt: grant.job.compiledPrompt,
          creditsCost: 0,
          requestId,
        },
      })

      await hdQueue.add(
        'hd',
        {
          jobId: hdJob.id,
          sessionId: session.sessionId,
          uploadS3Key: grant.job.uploadS3Key,
          templateId: grant.job.templateId,
          category: grant.job.category,
          compiledPrompt: grant.job.compiledPrompt ?? '',
          requiresIPAdapter: IP_ADAPTER_CATEGORIES.has(grant.job.category),
          requestId,
        },
        { priority: PRIORITIES.PAID },
      )

      await prisma.downloadGrant.update({
        where: { id: grant.id },
        data: { hdS3Key: hdJob.id },
      })

      return reply.status(202).send({
        success: true,
        data: { jobId: hdJob.id, hdReady: false },
        requestId,
      })
    },
  )

  // GET /api/session/history
  app.get(
    '/api/session/history',
    { preHandler: [app.requireVerified] },
    async (request, reply) => {
      const requestId = nanoid(10)
      const session = request.session

      const jobs = await prisma.generationJob.findMany({
        where: {
          sessionId: session.sessionId,
          status: { in: ['done', 'credit_refunded'] },
        },
        orderBy: { createdAt: 'desc' },
        take: 50,
        select: {
          id: true,
          templateId: true,
          category: true,
          status: true,
          previewS3Keys: true,
          hdS3Key: true,
          createdAt: true,
        },
      })

      return reply.send({
        success: true,
        data: { jobs },
        requestId,
      })
    },
  )
}
