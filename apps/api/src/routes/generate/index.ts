import { FastifyInstance } from 'fastify'
import { z } from 'zod'
import { nanoid } from 'nanoid'
import { prisma } from '../../lib/prisma'
import { previewQueue, PRIORITIES } from '../../lib/queues'
import { parseCustomText, compilePrompt, sanitizeCustomText } from '../../services/prompt.service'
import { translateToEnglish } from '../../services/translate.service'
import {
  ANON_FREE_GENERATIONS,
  FREE_DAILY_GENERATION_SOFT_CAP,
} from '../../lib/session.types'
import { checkAnonIpGenerationLimit } from '../../lib/rate-limit'

const UPLOAD_KEY_PATTERN =
  /^uploads\/[a-zA-Z0-9_-]{10,50}\/[0-9]{10,16}-original\.(jpeg|jpg|png|webp)$/

const previewSchema = z.object({
  uploadKey: z.string().min(1),
  sceneId: z.string().min(1),
  category: z.enum([
    'beauty_cosmetics',
    'jewelry_accessories',
    'fashion_clothing',
    'food_cafe',
    'marketplace_export',
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
    { preHandler: [app.requireSessionOrAnon] },
    async (request, reply) => {
      const requestId = nanoid(10)
      const session = request.session

      const parsed = previewSchema.safeParse(request.body)
      if (!parsed.success) {
        return reply.status(400).send({ success: false, error: 'invalid_input', requestId })
      }

      const { uploadKey, sceneId, category, intent, refinementChips, customText, aspectRatio, isEdit, sourceJobId } =
        parsed.data

      if (!UPLOAD_KEY_PATTERN.test(uploadKey)) {
        return reply.status(400).send({ success: false, error: 'invalid_upload_key', requestId })
      }

      if (!uploadKey.startsWith(`uploads/${session.sessionId}/`)) {
        return reply.status(403).send({ success: false, error: 'invalid_upload_key', requestId })
      }

      // ── Gate 1: Anonymous generation limit ───────────────────────────────────
      if (!session.isVerified) {
        const anonUsed = session.anonGenerationsUsed ?? 0
        if (anonUsed >= ANON_FREE_GENERATIONS) {
          return reply.status(403).send({
            success: false,
            error: 'otp_required',
            errorCode: 'anon_limit_reached',
            data: {
              anonGenerationsUsed: anonUsed,
              anonGenerationsLimit: ANON_FREE_GENERATIONS,
            },
            requestId,
          })
        }

        // Secondary IP check — deterrent against cookie-clearing abuse
        const clientIp =
          (request.headers['x-forwarded-for'] as string)?.split(',')[0]?.trim() ??
          request.ip ??
          'unknown'

        const ipAllowed = await checkAnonIpGenerationLimit(clientIp)
        if (!ipAllowed) {
          return reply.status(429).send({
            success: false,
            error: 'rate_limit_exceeded',
            errorCode: 'ip_generation_limit',
            requestId,
          })
        }
      }

      // ── Gate 2: Verified user daily soft cap (nudge only, not a hard block) ──
      if (session.isVerified) {
        const today = new Date().toISOString().split('T')[0]
        const dailyUsed =
          session.dailyGenerationsDate === today ? (session.dailyGenerationsUsed ?? 0) : 0

        if (dailyUsed >= FREE_DAILY_GENERATION_SOFT_CAP) {
          app.log.info(
            { sessionId: session.sessionId, dailyUsed },
            'daily soft cap reached — nudge sent but generation allowed',
          )
        }
      }

      // ── Gate 3: Verified user credit check ───────────────────────────────────
      if (session.isVerified && session.creditsRemaining <= 0) {
        return reply.status(402).send({ success: false, error: 'insufficient_credits', requestId })
      }

      const rawCustomText = customText ?? ''

      // Step 1: Detect text-on-image intent and split custom text
      const { sceneDescription, overlayText, hasTextIntent } = parseCustomText(rawCustomText)

      // Step 2: Translate scene description to English (skipped if already ASCII/English)
      const translatedDescription = sceneDescription
        ? await translateToEnglish(sceneDescription)
        : ''

      // Step 3: Compile the final AI prompt — overlay text is never included here
      const compiledPrompt = compilePrompt({
        sceneId,
        category,
        selectedChipIds: refinementChips,
        translatedSceneDescription: translatedDescription,
      })

      app.log.info(
        { requestId, hasTextIntent, overlayText: overlayText ?? null },
        'prompt compiled',
      )

      const job = await prisma.generationJob.create({
        data: {
          sessionId: session.sessionId,
          templateId: sceneId,
          intent,
          category,
          status: 'queued',
          uploadS3Key: uploadKey,
          compiledPrompt,
          overlayText: overlayText ?? null,
          overlayPosition: 'bottom',
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
        {
          priority,
          attempts: 3,
          backoff: { type: 'exponential', delay: 2000 },
          removeOnComplete: { count: 100 },
          removeOnFail: { count: 50 },
        },
      )

      app.log.info({ requestId, jobId: job.id }, 'preview job dispatched')

      const today = new Date().toISOString().split('T')[0]
      const dailyUsed =
        session.isVerified && session.dailyGenerationsDate === today
          ? (session.dailyGenerationsUsed ?? 0)
          : 0
      const softCapReached = session.isVerified && dailyUsed >= FREE_DAILY_GENERATION_SOFT_CAP

      return reply.status(202).send({
        success: true,
        data: {
          jobId: job.id,
          softCapReached,
          anonGenerationsUsed: session.isVerified
            ? null
            : (session.anonGenerationsUsed ?? 0),
          anonGenerationsLimit: session.isVerified ? null : ANON_FREE_GENERATIONS,
        },
        requestId,
      })
    },
  )

  // GET /api/generate/status/:jobId — anonymous and verified sessions allowed
  app.get(
    '/api/generate/status/:jobId',
    { preHandler: [app.requireSessionOrAnon] },
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
