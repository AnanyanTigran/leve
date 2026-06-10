import { FastifyInstance } from 'fastify'
import { z } from 'zod'
import { nanoid } from 'nanoid'
import { prisma } from '../../lib/prisma'
import { previewQueue, PRIORITIES } from '../../lib/queues'
import { compilePrompt, sanitizeCustomText } from '../../services/prompt.service'
import { translateToEnglish } from '../../services/translate.service'
import { UserService } from '../../services/user.service'
import { SessionService } from '../../services/session.service'
import {
  ANON_FREE_GENERATIONS,
  FREE_DAILY_GENERATION_SOFT_CAP,
} from '../../lib/session.types'
import { checkAnonIpGenerationLimit } from '../../lib/rate-limit'
import { getJobPhase, setJobPhase } from '../../lib/job-phase'
import { sessionOwnsJob } from '../../lib/ownership'

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
    'electronics_gadgets',
    'home_decor',
    'toys_children',
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
      let anonUsedAfterGate = session.anonGenerationsUsed ?? 0
      if (!session.isVerified) {
        // IP check first — no state change, fast rejection before touching counters
        const ipAllowed = await checkAnonIpGenerationLimit(request.ip ?? 'unknown')
        if (!ipAllowed) {
          return reply.status(429).send({
            success: false,
            error: 'rate_limit_exceeded',
            errorCode: 'ip_generation_limit',
            requestId,
          })
        }

        // Atomic read-check-increment in a single Lua script. Prevents two
        // concurrent requests from both passing a stale in-memory counter check
        // before either job completes (the old increment was deferred to the worker).
        const anonResult = await SessionService.checkAndIncrementAnonGeneration(
          session.sessionId,
          ANON_FREE_GENERATIONS,
        )
        if (anonResult === 0) {
          return reply.status(403).send({
            success: false,
            error: 'otp_required',
            errorCode: 'anon_limit_reached',
            data: {
              anonGenerationsUsed: session.anonGenerationsUsed ?? 0,
              anonGenerationsLimit: ANON_FREE_GENERATIONS,
            },
            requestId,
          })
        }
        anonUsedAfterGate = anonResult > 0 ? anonResult : anonUsedAfterGate
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

      // Custom text is now treated purely as a scene-description hint to the
      // model. Text-on-image (price tag / SALE / etc.) lives on the results
      // page via POST /api/jobs/:jobId/overlay and is composited at HD
      // download time. See audit doc R1.
      const rawCustomText = customText ?? ''
      const translatedDescription = rawCustomText
        ? await translateToEnglish(rawCustomText)
        : ''

      const compiledPrompt = compilePrompt({
        sceneId,
        category,
        selectedChipIds: refinementChips,
        translatedSceneDescription: translatedDescription,
      })

      app.log.info({ requestId }, 'prompt compiled')

      const userId = session.userId ?? null

      const job = await prisma.generationJob.create({
        data: {
          sessionId: session.sessionId,
          userId,
          templateId: sceneId,
          intent,
          category,
          status: 'queued',
          uploadS3Key: uploadKey,
          compiledPrompt,
          creditsCost: 0,
          requestId,
        },
      })

      // Determine source image for iterative edits — use the clean hdS3Key,
      // not previewS3Keys[0] (now watermarked for all users). Kontext gets the
      // best signal from the un-watermarked image.
      let sourceImageS3Key: string | undefined
      if (isEdit && sourceJobId) {
        const sourceJob = await prisma.generationJob.findUnique({
          where: { id: sourceJobId },
        })
        if (sourceJob?.sessionId === session.sessionId && sourceJob.hdS3Key) {
          sourceImageS3Key = sourceJob.hdS3Key
        }
      }

      const priority = session.isPaid ? PRIORITIES.PAID : session.isVerified ? PRIORITIES.VERIFIED : PRIORITIES.ANON

      // Emit initial 'queued' phase so the FE progress bar starts moving
      // immediately, before the worker picks up the job.
      await setJobPhase(job.id, 'queued')

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
          anonGenerationsUsed: session.isVerified ? null : anonUsedAfterGate,
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

      const { owns, job } = await sessionOwnsJob(jobId, session)
      if (!owns || !job) {
        return reply.status(404).send({ success: false, error: 'not_found', requestId })
      }

      // Fine-grained worker phase (Redis, 5min TTL). Drives the FE progress
      // bar without a Postgres migration. Falls back to status if unset.
      const phase = await getJobPhase(jobId)

      return reply.send({
        success: true,
        data: {
          status: job.status,
          phase: phase ?? job.status,
          previewS3Keys: job.previewS3Keys,
          hdS3Key: job.hdS3Key,
          uploadS3Key: job.uploadS3Key,
          provider: job.provider,
          errorCode: job.errorCode ?? null,
        },
        requestId,
      })
    },
  )

  // POST /api/jobs/:jobId/overlay — persist the user's text overlay choice
  // from the results page. Applied at HD download time, not on the preview.
  // Anon and verified sessions both allowed (anon can preview overlays too,
  // but only verified sessions can actually trigger an HD download).
  const overlaySchema = z.object({
    text: z.string().max(80).transform(sanitizeCustomText).nullable(),
    position: z.enum(['top', 'center', 'bottom']).default('bottom'),
  })
  app.post(
    '/api/jobs/:jobId/overlay',
    { preHandler: [app.requireSessionOrAnon] },
    async (request, reply) => {
      const requestId = nanoid(10)
      const { jobId } = request.params as { jobId: string }
      const session = request.session

      const parsed = overlaySchema.safeParse(request.body)
      if (!parsed.success) {
        return reply.status(400).send({ success: false, error: 'invalid_input', requestId })
      }

      const { owns, job } = await sessionOwnsJob(jobId, session)
      if (!owns || !job) {
        return reply.status(404).send({ success: false, error: 'not_found', requestId })
      }

      const text = parsed.data.text?.trim()
      await prisma.generationJob.update({
        where: { id: jobId },
        data: {
          overlayText: text && text.length > 0 ? text : null,
          overlayPosition: text && text.length > 0 ? parsed.data.position : null,
        },
      })

      return reply.send({ success: true, data: { saved: true }, requestId })
    },
  )

  // GET /api/session/history — requires OTP verification
  app.get(
    '/api/session/history',
    { preHandler: [app.requireVerified] },
    async (request, reply) => {
      const requestId = nanoid(10)
      const session = request.session

      const SELECT = {
        id: true,
        templateId: true,
        category: true,
        status: true,
        previewS3Keys: true,
        hdS3Key: true,
        uploadS3Key: true,
        createdAt: true,
      } as const

      const WHERE_STATUS = { in: ['done', 'credit_refunded'] }

      const identifier = session.phone ?? session.email
      const identifierType: 'phone' | 'email' = session.phone ? 'phone' : 'email'

      const user = identifier
        ? await UserService.getByIdentifier(identifier, identifierType).catch(() => null)
        : null

      // Union userId + sessionId so pre-userId jobs are visible alongside newer
      // userId-linked ones. Without OR, the userId query returning results would
      // silently hide old jobs that only have a sessionId match.
      const whereClause = user
        ? {
            status: WHERE_STATUS,
            OR: [
              { userId: user.id },
              { sessionId: session.sessionId },
            ],
          }
        : {
            status: WHERE_STATUS,
            sessionId: session.sessionId,
          }

      const jobs = await prisma.generationJob.findMany({
        where: whereClause,
        orderBy: { createdAt: 'desc' },
        take: 50,
        select: SELECT,
      })

      return reply.send({
        success: true,
        data: { jobs },
        requestId,
      })
    },
  )
}
