import { FastifyInstance } from 'fastify'
import { nanoid } from 'nanoid'
import { redis } from '../../lib/redis'
import { SESSION_KEY } from '../../lib/session.types'
import { validateEnv } from '../../config/env'
import {
  ANON_FREE_GENERATIONS,
  FREE_DAILY_GENERATION_SOFT_CAP,
} from '../../lib/session.types'

const env = validateEnv()

export async function registerSessionInit(app: FastifyInstance) {
  // GET /api/session/me — returns current session state (used by FE on hydration).
  // Anonymous callers auto-receive a session cookie via requireSessionOrAnon,
  // so an explicit POST /api/session/init endpoint is no longer needed.
  app.get(
    '/api/session/me',
    { preHandler: [app.requireSessionOrAnon] },
    async (request, reply) => {
      const requestId = nanoid(10)
      const s = request.session
      const today = new Date().toISOString().split('T')[0]
      const dailyGenerationsUsed =
        s.dailyGenerationsDate === today ? (s.dailyGenerationsUsed ?? 0) : 0
      return reply.send({
        success: true,
        data: {
          sessionId: s.sessionId, // TODO: remove when custom domain is configured
          isVerified: s.isVerified,
          creditsRemaining: s.creditsRemaining,
          isPaid: s.isPaid,
          purchaseCount: s.purchaseCount,
          phone: s.phone,
          email: s.email,
          brandName: s.brandName,
          favoriteSceneId: s.favoriteSceneId,
          anonGenerationsUsed: s.anonGenerationsUsed ?? 0,
          anonGenerationsLimit: ANON_FREE_GENERATIONS,
          anonLimitReached: !s.isVerified && (s.anonGenerationsUsed ?? 0) >= ANON_FREE_GENERATIONS,
          dailyGenerationsUsed,
          softCapReached: s.isVerified && dailyGenerationsUsed >= FREE_DAILY_GENERATION_SOFT_CAP,
          showSubscriptionOffer: s.purchaseCount >= 3,
        },
        requestId,
      })
    },
  )

  // POST /api/session/logout — clears the session cookie + Redis state. The
  // persistent User record (credits, brand) stays, so re-verifying with the
  // same phone/email restores the account on the next OTP success.
  app.post(
    '/api/session/logout',
    { preHandler: [app.requireSessionOrAnon] },
    async (request, reply) => {
      const requestId = nanoid(10)
      const sessionId = request.session.sessionId
      await redis.del(SESSION_KEY(sessionId)).catch(() => {})
      reply.clearCookie(env.SESSION_COOKIE_NAME, { path: '/' })
      return reply.send({ success: true, requestId })
    },
  )
}
