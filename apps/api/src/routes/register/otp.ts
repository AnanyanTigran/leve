import { FastifyInstance } from 'fastify'
import { z } from 'zod'
import { nanoid } from 'nanoid'
import { validateIdentifier, sendOtp, verifyOtp } from '../../services/otp.service'
import { SessionService } from '../../services/session.service'
import { sessionOrIpKey } from '../../lib/rate-limit'
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

// Both OTP routes are throttled per session, not per IP. Session-scoped
// limits are immune to proxy IP confusion (Railway, shared mobile hotspots,
// carrier NAT) and accurately isolate one user's attempts from another's.
// sessionOrIpKey reads cookie first, then the x-session-id header (mobile
// Safari has no cross-site cookies), then falls back to IP. Brute-force
// safety does not depend on these keys: sends are capped per identifier
// (3/hr) in otp.service and each OTP record allows 5 verify attempts.
const otpSendKeyGenerator = sessionOrIpKey('ratelimit:otp:send')
const otpVerifyKeyGenerator = sessionOrIpKey('ratelimit:otp:verify')

export async function registerOtpRoutes(app: FastifyInstance) {
  // POST /api/register/otp/send
  app.post(
    '/api/register/otp/send',
    {
      preHandler: [app.requireSessionOrAnon],
      config: {
        rateLimit: {
          max: 5,
          timeWindow: '1 minute',
          keyGenerator: otpSendKeyGenerator,
        },
      },
    },
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

      const ipAddress = request.ip ?? 'unknown'

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
    {
      preHandler: [app.requireSession],
      config: {
        rateLimit: {
          max: 10,
          timeWindow: '15 minutes',
          keyGenerator: otpVerifyKeyGenerator,
        },
      },
    },
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
        secure: true,
        sameSite: 'none',
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
