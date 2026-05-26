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

      const { packId, jobId, provider } = parsed.data

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
          ipAddress:
            (request.headers['x-forwarded-for'] as string)?.split(',')[0]?.trim() ??
            request.ip,
          userAgent: request.headers['user-agent'] ?? '',
        },
      })

      await SessionService.extendSessionTtl(session.sessionId)

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
      const { orderId } = request.params as { orderId: string }
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
    (request.headers['x-forwarded-for'] as string)?.split(',')[0]?.trim() ??
    request.ip ??
    'unknown'

  // POST /api/webhooks/idram
  // Body is form-encoded — @fastify/formbody must be registered before this route.
  app.post('/api/webhooks/idram', {
    config: {
      rateLimit: {
        max: 30,
        timeWindow: '1 minute',
        keyGenerator: webhookKeyGenerator,
      },
    },
  }, async (request, reply) => {
    const requestId = nanoid(10)
    const payload = request.body as Record<string, string>

    app.log.info({ requestId, billNo: payload['EDP_BILL_NO'] }, 'idram webhook received')

    // 1. Signature validation FIRST
    const signatureValid = validateIdramWebhookSignature(payload as Parameters<typeof validateIdramWebhookSignature>[0])
    if (!signatureValid) {
      app.log.warn({ requestId }, 'idram webhook: invalid signature')
      return reply.status(400).send('INVALID SIGNATURE')
    }

    const billNo = payload['EDP_BILL_NO'] ?? ''
    const incomingAmount = parseInt(payload['EDP_AMOUNT'] ?? '0', 10)

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
        providerId: payload['EDP_TRANS_ID'] ?? billNo,
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

    // 7. Set idempotency key BEFORE granting credits
    await redis.set(idempotencyKey, '1', 'EX', IDRAM_IDEMPOTENCY_TTL)

    // 8. Grant credits + optionally create DownloadGrant
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
        'CRITICAL: idram webhook credit grant failed after idempotency key set',
      )
      return reply.send('OK')
    }

    app.log.info(
      { requestId, billNo, credits: transaction.credits, sessionId: transaction.sessionId },
      'idram webhook: credits granted successfully',
    )

    return reply.send('OK')
  })

  // POST /api/webhooks/telcell
  app.post('/api/webhooks/telcell', {
    config: {
      rateLimit: {
        max: 30,
        timeWindow: '1 minute',
        keyGenerator: webhookKeyGenerator,
      },
    },
  }, async (request, reply) => {
    const requestId = nanoid(10)
    const payload = request.body as Record<string, string>

    app.log.info({ requestId, orderId: payload['orderId'] }, 'telcell webhook received')

    // 1. Signature validation FIRST
    const signatureValid = validateTelcellWebhookSignature(payload as Parameters<typeof validateTelcellWebhookSignature>[0])
    if (!signatureValid) {
      app.log.warn({ requestId }, 'telcell webhook: invalid signature')
      return reply.status(400).send('INVALID SIGNATURE')
    }

    const orderId = payload['orderId'] ?? ''
    const incomingAmount = parseInt(payload['amount'] ?? '0', 10)

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
        providerId: payload['transactionId'] ?? orderId,
        providerMeta: payload as object,
      },
    })

    // 6. Find recent job
    const recentJob = await prisma.generationJob.findFirst({
      where: { sessionId: transaction.sessionId, status: 'done' },
      orderBy: { createdAt: 'desc' },
    })

    // 7. Set idempotency key BEFORE granting
    await redis.set(idempotencyKey, '1', 'EX', TELCELL_IDEMPOTENCY_TTL)

    // 8. Grant credits + optionally create DownloadGrant
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
        'CRITICAL: telcell webhook credit grant failed after idempotency key set',
      )
      return reply.status(200).send('OK')
    }

    app.log.info(
      { requestId, orderId, credits: transaction.credits },
      'telcell webhook: credits granted successfully',
    )

    return reply.status(200).send('OK')
  })
}
