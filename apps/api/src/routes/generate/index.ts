import { FastifyInstance } from 'fastify'
import { z } from 'zod'
import { nanoid } from 'nanoid'
import { prisma } from '../../lib/prisma'
import { previewQueue, PRIORITIES } from '../../lib/queues'
import { compilePrompt, sanitizeCustomText } from '../../services/prompt.service'

const previewSchema = z.object({
  uploadKey: z.string().min(1),
  sceneId: z.string().min(1),
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
  customText: z.string().max(200).transform(sanitizeCustomText).optional(),
  aspectRatio: z.enum(['1:1', '4:5', '3:4', '9:16', '16:9']).default('1:1'),
  isEdit: z.boolean().default(false),
  sourceJobId: z.string().optional(), // for iterative edits — the job whose output to edit
})

export async function registerGenerateRoutes(app: FastifyInstance) {

  // POST /api/generate/preview — anonymous and verified sessions allowed
  app.post(
    '/api/generate/preview',
    { preHandler: [app.requireSession] },
    async (request, reply) => {
      const requestId = nanoid(10)
      const session = request.session

      const parsed = previewSchema.safeParse(request.body)
      if (!parsed.success) {
        return reply.status(400).send({ success: false, error: 'invalid_input', requestId })
      }

      const { uploadKey, sceneId, category, intent, refinementChips, customText, aspectRatio, isEdit, sourceJobId } =
        parsed.data

      if (!uploadKey.startsWith(`uploads/${session.sessionId}/`)) {
        return reply.status(403).send({ success: false, error: 'invalid_upload_key', requestId })
      }

      // Verified users need credits for generation; anon users use a separate generation budget
      if (session.isVerified && session.creditsRemaining <= 0) {
        return reply.status(402).send({ success: false, error: 'insufficient_credits', requestId })
      }

      const compiledPrompt = compilePrompt({ sceneId, category, selectedChipIds: refinementChips, translatedSceneDescription: customText })

      const job = await prisma.generationJob.create({
        data: {
          sessionId: session.sessionId,
          templateId: sceneId,  // store sceneId as templateId
          intent,
          category,
          status: 'queued',
          uploadS3Key: uploadKey,
          compiledPrompt,
          creditsCost: session.isVerified ? 1 : 0,
          requestId,
        },
      })

      // Determine source image for iterative edits
      let sourceImageS3Key: string | undefined
      if (isEdit && sourceJobId) {
        const sourceJob = await prisma.generationJob.findUnique({
          where: { id: sourceJobId },
        })
        if (sourceJob?.sessionId === session.sessionId && sourceJob.previewS3Keys[0]) {
          sourceImageS3Key = sourceJob.previewS3Keys[0]
        }
      }

      const priority = session.isPaid ? PRIORITIES.PAID : session.isVerified ? PRIORITIES.VERIFIED : PRIORITIES.ANON

      await previewQueue.add(
        'preview',
        {
          jobId: job.id,
          sessionId: session.sessionId,
          uploadS3Key: uploadKey,
          sceneId,
          category,
          compiledPrompt,
          isVerified: session.isVerified,
          aspectRatio,
          isEdit,
          sourceImageS3Key,
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

  // GET /api/generate/status/:jobId — anonymous and verified sessions allowed
  app.get(
    '/api/generate/status/:jobId',
    { preHandler: [app.requireSession] },
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

  // GET /api/session/history — requires OTP verification
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
