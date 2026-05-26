import { FastifyInstance } from 'fastify'
import { z } from 'zod'
import { nanoid } from 'nanoid'
import { validateIdentifier, sendOtp, verifyOtp } from '../../services/otp.service'
import { SessionService } from '../../services/session.service'
import { validateEnv } from '../../config/env'

const env = validateEnv()

const sendSchema = z.object({
  identifier: z.string().min(1).max(200),
  identifierType: z.enum(['phone', 'email']),
})

const verifySchema = z.object({
  identifier: z.string().min(1).max(200),
  identifierType: z.enum(['phone', 'email']),
  code: z.string().length(6).regex(/^\d{6}$/),
})

export async function registerOtpRoutes(app: FastifyInstance) {
  // POST /api/register/otp/send
  app.post(
    '/api/register/otp/send',
    { preHandler: [app.requireSessionOrAnon] },
    async (request, reply) => {
      const requestId = nanoid(10)

      const parsed = sendSchema.safeParse(request.body)
      if (!parsed.success) {
        return reply.status(400).send({ success: false, error: 'invalid_input', requestId })
      }

      const { identifier, identifierType } = parsed.data

      // Validate + normalize identifier format
      const validation = validateIdentifier(identifier, identifierType)
      if (!validation.valid || !validation.normalized) {
        return reply.status(400).send({ success: false, error: 'invalid_identifier', requestId })
      }

      const ipAddress =
        (request.headers['x-forwarded-for'] as string)?.split(',')[0]?.trim() ??
        request.ip ??
        'unknown'

      const result = await sendOtp(
        validation.normalized,
        identifierType,
        request.session.sessionId,
        ipAddress,
      )

      if (!result.sent) {
        // Rate limited — but return 200 to prevent enumeration
        app.log.warn({ requestId, error: result.error }, 'otp send blocked')
      }

      // Always return same response — do not leak whether identifier exists
      return reply.send({
        success: true,
        data: { expiresInSeconds: 600 },
        requestId,
      })
    },
  )

  // POST /api/register/otp/verify
  app.post(
    '/api/register/otp/verify',
    { preHandler: [app.requireSession] },
    async (request, reply) => {
      const requestId = nanoid(10)

      const parsed = verifySchema.safeParse(request.body)
      if (!parsed.success) {
        return reply.status(400).send({ success: false, error: 'invalid_input', requestId })
      }

      const { identifier, identifierType, code } = parsed.data

      const validation = validateIdentifier(identifier, identifierType)
      if (!validation.valid || !validation.normalized) {
        return reply.status(400).send({ success: false, error: 'invalid_identifier', requestId })
      }

      const result = await verifyOtp(
        validation.normalized,
        request.session.sessionId,
        code,
      )

      if (!result.verified) {
        app.log.warn({ requestId, error: result.error }, 'otp verify failed')
        // Return 400 for all failures — do not distinguish expired vs wrong code
        return reply.status(400).send({ success: false, error: 'verification_failed', requestId })
      }

      // Promote session — attach identifier, restore/grant credits, extend TTL
      const updatedSession = await SessionService.promoteToVerified(
        request.session.sessionId,
        validation.normalized,
        identifierType,
      )

      // Extend cookie TTL to 30 days
      reply.setCookie(env.SESSION_COOKIE_NAME, request.session.sessionId, {
        httpOnly: true,
        secure: env.NODE_ENV === 'production',
        sameSite: 'lax',
        path: '/',
        maxAge: 60 * 60 * 24 * 30,
      })

      app.log.info(
        { requestId, sessionId: request.session.sessionId },
        updatedSession.isPaid ? 'otp verified — returning user restored' : 'otp verified — new user',
      )

      return reply.send({
        success: true,
        data: {
          isVerified: true,
          isReturning: updatedSession.isPaid || updatedSession.purchaseCount > 0,
          creditsRemaining: updatedSession.creditsRemaining,
          purchaseCount: updatedSession.purchaseCount,
          brandName: updatedSession.brandName,
          favoriteSceneId: updatedSession.favoriteSceneId,
        },
        requestId,
      })
    },
  )
}
