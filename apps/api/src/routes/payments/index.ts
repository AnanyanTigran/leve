import { FastifyInstance, FastifyRequest } from 'fastify'
import { z } from 'zod'
import { nanoid } from 'nanoid'
import { prisma } from '../../lib/prisma'
import { redis } from '../../lib/redis'
import { SessionService } from '../../services/session.service'
import { grantCreditsAndCreateDownloadGrant } from '../../services/credit.service'
import { getPackage } from '../../config/credit-packages'
import { buildIdramRedirectUrl, validateIdramWebhookSignature } from '../../lib/idram'
import {
  buildTelcellRedirectUrl,
  validateTelcellWebhookSignature,
} from '../../lib/telcell'
import { validateEnv } from '../../config/env'

const env = validateEnv()

const intentSchema = z.object({
  packId: z.enum(['starter', 'creator', 'pro_monthly']),
  jobId: z.string().min(1),
  provider: z.enum(['idram', 'telcell']).default('idram'),
  clientKey: z.string().max(64).optional(),
})

const IDRAM_IDEMPOTENCY_TTL = 60 * 60 * 24 * 7
const TELCELL_IDEMPOTENCY_TTL = 60 * 60 * 24 * 7

export async function registerPaymentRoutes(app: FastifyInstance) {

  // POST /api/payments/intent
  app.post(
    '/api/payments/intent',
    { preHandler: [app.requireSessionOrAnon] },
    async (request, reply) => {
      const requestId = nanoid(10)
      const session = request.session

      const parsed = intentSchema.safeParse(request.body)
      if (!parsed.success) {
        return reply.status(400).send({ success: false, error: 'invalid_input', requestId })
      }

      const { packId, jobId, provider, clientKey } = parsed.data

      // Idempotency: return existing transaction for the same client key (network retry safety)
      if (clientKey) {
        const idempotencyKey = `payment:intent:${session.sessionId}:${clientKey}`
        const existingId = await redis.get(idempotencyKey)
        if (existingId) {
          const existing = await prisma.transaction.findUnique({ where: { id: existingId } })
          if (existing) {
            app.log.info({ requestId, clientKey }, 'payment intent: returning existing transaction')
            const description = `LEVE ${existing.pack} pack`
            const callbackUrl = `${env.CORS_ORIGIN}/payment/callback`
            return reply.send({
              success: true,
              data: {
                orderId: existing.orderId,
                transactionId: existing.id,
                idramUrl: buildIdramRedirectUrl(existing.orderId, existing.amountAMD, description, callbackUrl),
                telcellUrl: buildTelcellRedirectUrl(existing.orderId, existing.amountAMD, description),
                amountAMD: existing.amountAMD,
                credits: existing.credits,
              },
              requestId,
            })
          }
        }
      }

      const generationJob = await prisma.generationJob.findUnique({ where: { id: jobId } })
      if (!generationJob || generationJob.sessionId !== session.sessionId) {
        return reply.status(403).send({ success: false, error: 'invalid_job', requestId })
      }

      // Server-side pack lookup — never trust client amounts
      const pack = getPackage(packId)
      if (!pack) {
        return reply.status(400).send({ success: false, error: 'invalid_pack', requestId })
      }

      const orderId = nanoid(16)

      const transaction = await prisma.transaction.create({
        data: {
          sessionId: session.sessionId,
          provider,
          orderId,
          pack: packId,
          amountAMD: pack.amountAMD,
          credits: pack.credits,
          status: 'pending',
          ipAddress: request.ip ?? 'unknown',
          userAgent: request.headers['user-agent'] ?? '',
        },
      })

      await SessionService.extendSessionTtl(session.sessionId)

      if (clientKey) {
        const idempotencyKey = `payment:intent:${session.sessionId}:${clientKey}`
        await redis.set(idempotencyKey, transaction.id, 'EX', 600) // 10 min
      }

      const description = `LEVE ${pack.id} pack`
      const callbackUrl = `${env.CORS_ORIGIN}/payment/callback`

      const idramUrl = buildIdramRedirectUrl(orderId, pack.amountAMD, description, callbackUrl)
      const telcellUrl = buildTelcellRedirectUrl(orderId, pack.amountAMD, description)

      app.log.info(
        { requestId, orderId, packId, amountAMD: pack.amountAMD },
        'payment intent created',
      )

      return reply.send({
        success: true,
        data: {
          orderId,
          transactionId: transaction.id,
          idramUrl,
          telcellUrl,
          amountAMD: pack.amountAMD,
          credits: pack.credits,
        },
        requestId,
      })
    },
  )

  // GET /api/payments/status/:orderId
  app.get(
    '/api/payments/status/:orderId',
    { preHandler: [app.requireSessionOrAnon] },
    async (request, reply) => {
      const requestId = nanoid(10)
      const orderIdParsed = z.string().min(1).max(32).regex(/^[a-zA-Z0-9_-]+$/).safeParse(
        (request.params as { orderId: string }).orderId,
      )
      if (!orderIdParsed.success) {
        return reply.status(400).send({ success: false, error: 'invalid_order_id', requestId })
      }
      const orderId = orderIdParsed.data
      const session = request.session

      const transaction = await prisma.transaction.findUnique({
        where: { orderId },
        select: { status: true, sessionId: true, credits: true },
      })

      if (!transaction || transaction.sessionId !== session.sessionId) {
        return reply.status(404).send({ success: false, error: 'not_found', requestId })
      }

      return reply.send({
        success: true,
        data: { status: transaction.status, credits: transaction.credits },
        requestId,
      })
    },
  )

  const webhookKeyGenerator = (request: FastifyRequest): string =>
    request.ip ?? 'unknown'

  // Webhook routes live in a scoped plugin so the raw buffer parser overrides
  // the global @fastify/formbody parser for these routes only. Fastify 4 child
  // scopes inherit the parent's parsers, so replaceContentTypeParser must be
  // used instead of addContentTypeParser — addContentTypeParser throws
  // "already present" when the inherited parser exists.
  await app.register(async (webhookScope) => {
    // Remove the parser inherited from @fastify/formbody (registered globally),
    // then re-add it as a raw Buffer parser. addContentTypeParser throws
    // "already present" on inherited parsers; removeContentTypeParser clears
    // the slot in this scope so addContentTypeParser can take over.
    webhookScope.removeContentTypeParser('application/x-www-form-urlencoded')
    webhookScope.addContentTypeParser(
      'application/x-www-form-urlencoded',
      { parseAs: 'buffer' },
      (_req, body, done) => { done(null, body) },
    )

    // POST /api/webhooks/idram
    webhookScope.post('/api/webhooks/idram', {
      config: {
        rateLimit: {
          max: 30,
          timeWindow: '1 minute',
          keyGenerator: webhookKeyGenerator,
        },
      },
    }, async (request, reply) => {
      const requestId = nanoid(10)
      const rawBody = request.body as Buffer

      // 1. Signature validation FIRST — parses body and verifies in one atomic step
      const validation = validateIdramWebhookSignature(rawBody)
      if (!validation.valid) {
        app.log.warn({ requestId }, 'idram webhook: invalid signature')
        return reply.status(400).send('INVALID SIGNATURE')
      }

      const payload = validation.payload
      app.log.info({ requestId, billNo: payload.EDP_BILL_NO }, 'idram webhook received')

      const billNo = payload.EDP_BILL_NO
      const incomingAmount = parseInt(payload.EDP_AMOUNT, 10)

      // 2. Idempotency check
      const idempotencyKey = `idram:processed:${billNo}`
      const alreadyProcessed = await redis.get(idempotencyKey)
      if (alreadyProcessed) {
        app.log.info({ requestId, billNo }, 'idram webhook: duplicate, skipping')
        return reply.send('OK')
      }

      // 3. Find pending transaction
      const transaction = await prisma.transaction.findUnique({ where: { orderId: billNo } })

      if (!transaction) {
        app.log.error({ requestId, billNo }, 'idram webhook: transaction not found')
        return reply.status(400).send('TRANSACTION NOT FOUND')
      }

      if (transaction.status !== 'pending') {
        app.log.warn({ requestId, billNo, status: transaction.status }, 'idram webhook: not pending')
        return reply.send('OK')
      }

      // 4. Amount mismatch — CRITICAL fraud prevention
      if (incomingAmount !== transaction.amountAMD) {
        app.log.error(
          { requestId, billNo, incomingAmount, expectedAmount: transaction.amountAMD },
          'idram webhook: AMOUNT MISMATCH — possible fraud attempt',
        )
        return reply.status(400).send('AMOUNT MISMATCH')
      }

      // 5. Store provider transaction ID
      await prisma.transaction.update({
        where: { id: transaction.id },
        data: {
          providerId: payload.EDP_TRANS_ID || billNo,
          providerMeta: payload as object,
        },
      })

      // 6. Find most recent completed generation job for this session
      const recentJob = await prisma.generationJob.findFirst({
        where: { sessionId: transaction.sessionId, status: 'done' },
        orderBy: { createdAt: 'desc' },
      })

      if (!recentJob) {
        app.log.error({ requestId }, 'idram webhook: no completed generation job found for session')
      }

      // 7. Grant credits + optionally create DownloadGrant
      // Idempotency key is set AFTER success so a failed grant can be retried by the provider.
      try {
        await grantCreditsAndCreateDownloadGrant({
          sessionId: transaction.sessionId,
          transactionId: transaction.id,
          jobId: recentJob?.id,
          hdS3Key: recentJob?.previewS3Keys?.[0],
          credits: transaction.credits,
        })
      } catch (err) {
        app.log.error(
          { requestId, transactionId: transaction.id, err },
          'CRITICAL: idram webhook credit grant failed — provider may retry',
        )
        return reply.status(500).send('INTERNAL ERROR')
      }

      // 8. Set idempotency key only after successful grant
      await redis.set(idempotencyKey, '1', 'EX', IDRAM_IDEMPOTENCY_TTL)

      app.log.info(
        { requestId, billNo, credits: transaction.credits, sessionId: transaction.sessionId },
        'idram webhook: credits granted successfully',
      )

      return reply.send('OK')
    })

    // POST /api/webhooks/telcell
    webhookScope.post('/api/webhooks/telcell', {
      config: {
        rateLimit: {
          max: 30,
          timeWindow: '1 minute',
          keyGenerator: webhookKeyGenerator,
        },
      },
    }, async (request, reply) => {
      const requestId = nanoid(10)
      const rawBody = request.body as Buffer

      // 1. Signature validation FIRST — parses body and verifies in one atomic step
      const validation = validateTelcellWebhookSignature(rawBody)
      if (!validation.valid) {
        app.log.warn({ requestId }, 'telcell webhook: invalid signature')
        return reply.status(400).send('INVALID SIGNATURE')
      }

      const payload = validation.payload
      app.log.info({ requestId, orderId: payload.orderId }, 'telcell webhook received')

      const orderId = payload.orderId
      const incomingAmount = parseInt(payload.amount, 10)

      // 2. Idempotency check
      const idempotencyKey = `telcell:processed:${orderId}`
      const alreadyProcessed = await redis.get(idempotencyKey)
      if (alreadyProcessed) {
        app.log.info({ requestId, orderId }, 'telcell webhook: duplicate, skipping')
        return reply.status(200).send('OK')
      }

      // 3. Find pending transaction
      const transaction = await prisma.transaction.findUnique({ where: { orderId } })

      if (!transaction || transaction.status !== 'pending') {
        app.log.error({ requestId, orderId }, 'telcell webhook: transaction not found or not pending')
        return reply.status(400).send('TRANSACTION NOT FOUND')
      }

      // 4. Amount mismatch check
      if (incomingAmount !== transaction.amountAMD) {
        app.log.error(
          { requestId, orderId, incomingAmount, expectedAmount: transaction.amountAMD },
          'telcell webhook: AMOUNT MISMATCH — possible fraud attempt',
        )
        return reply.status(400).send('AMOUNT MISMATCH')
      }

      // 5. Store provider meta
      await prisma.transaction.update({
        where: { id: transaction.id },
        data: {
          providerId: payload.transactionId || orderId,
          providerMeta: payload as object,
        },
      })

      // 6. Find recent job
      const recentJob = await prisma.generationJob.findFirst({
        where: { sessionId: transaction.sessionId, status: 'done' },
        orderBy: { createdAt: 'desc' },
      })

      // 7. Grant credits + optionally create DownloadGrant
      // Idempotency key is set AFTER success so a failed grant can be retried by the provider.
      try {
        await grantCreditsAndCreateDownloadGrant({
          sessionId: transaction.sessionId,
          transactionId: transaction.id,
          jobId: recentJob?.id,
          hdS3Key: recentJob?.previewS3Keys?.[0],
          credits: transaction.credits,
        })
      } catch (err) {
        app.log.error(
          { requestId, transactionId: transaction.id, err },
          'CRITICAL: telcell webhook credit grant failed — provider may retry',
        )
        return reply.status(500).send('INTERNAL ERROR')
      }

      // 8. Set idempotency key only after successful grant
      await redis.set(idempotencyKey, '1', 'EX', TELCELL_IDEMPOTENCY_TTL)

      app.log.info(
        { requestId, orderId, credits: transaction.credits },
        'telcell webhook: credits granted successfully',
      )

      return reply.status(200).send('OK')
    })
  })
}
