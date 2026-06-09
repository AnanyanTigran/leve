import { FastifyInstance } from 'fastify'
import { nanoid } from 'nanoid'
import { redis } from '../../lib/redis'
import { SESSION_KEY } from '../../lib/session.types'
import { validateEnv } from '../../config/env'
import {
  ANON_FREE_GENERATIONS,
  FREE_DAILY_GENERATION_SOFT_CAP,
} from '../../lib/session.types'
import { UserService } from '../../services/user.service'
import { SessionService } from '../../services/session.service'

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

      // For verified sessions: always read creditsRemaining from Neon DB.
      // The Redis blob is only updated for the session that made the spend-credit
      // call — sibling sessions on other devices hold stale values indefinitely.
      // Neon is the authoritative source; this single indexed SELECT costs
      // sub-millisecond and /me is only called on page load and tab focus.
      if (s.isVerified && (s.phone || s.email)) {
        try {
          const identifier = s.phone ?? s.email!
          const identifierType: 'phone' | 'email' = s.phone ? 'phone' : 'email'
          const dbUser = await UserService.getByIdentifier(identifier, identifierType)
          if (dbUser !== null && dbUser.creditsRemaining !== s.creditsRemaining) {
            s.creditsRemaining = dbUser.creditsRemaining
            // Update the Redis blob so subsequent reads within this session
            // are consistent — fire-and-forget, non-fatal if it fails
            void SessionService.update(s).catch((err) =>
              app.log.warn({ err }, '[session/me] Redis sync after DB read failed — non-fatal')
            )
          }
        } catch (err) {
          // Non-fatal: serve the cached Redis value if the DB read fails.
          // This is a read path only — no mutations happen here.
          app.log.warn({ err }, '[session/me] creditsRemaining DB read failed — serving cached value')
        }
      }

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
