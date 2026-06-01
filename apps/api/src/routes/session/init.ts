import { FastifyInstance } from 'fastify'
import { nanoid } from 'nanoid'
import { SessionService } from '../../services/session.service'
import { validateEnv } from '../../config/env'
import {
  ANON_FREE_GENERATIONS,
  FREE_DAILY_GENERATION_SOFT_CAP,
} from '../../lib/session.types'

const env = validateEnv()

export async function registerSessionInit(app: FastifyInstance) {
  // Called by FE on first load if no cookie present
  app.post('/api/session/init', { config: { rateLimit: { max: 20, timeWindow: '1 minute' } } }, async (request, reply) => {
    const requestId = nanoid(10)
    try {
      const existing = request.cookies?.[env.SESSION_COOKIE_NAME]
      if (existing) {
        const session = await SessionService.get(existing)
        if (session) {
          return reply.send({
            success: true,
            data: {
              isVerified: session.isVerified,
              creditsRemaining: session.creditsRemaining,
              isPaid: session.isPaid,
            },
            requestId,
          })
        }
      }

      const session = await SessionService.create()

      reply.setCookie(env.SESSION_COOKIE_NAME, session.sessionId, {
        httpOnly: true,
        secure: env.NODE_ENV === 'production',
        sameSite: 'lax',
        path: '/',
        maxAge: 60 * 60 * 48, // 48h default, extended on verify
      })

      return reply.send({
        success: true,
        data: {
          isVerified: false,
          creditsRemaining: 0,
          isPaid: false,
        },
        requestId,
      })
    } catch (err) {
      app.log.error({ requestId, err }, 'session init error')
      return reply.status(500).send({ success: false, error: 'internal_error', requestId })
    }
  })

  // GET /api/session/me — returns current session state (used by FE on hydration)
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
}
