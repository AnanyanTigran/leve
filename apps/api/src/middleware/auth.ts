import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify'
import { SessionService } from '../services/session.service'
import { LeveSession } from '../lib/session.types'
import { validateEnv } from '../config/env'

const env = validateEnv()

declare module 'fastify' {
  interface FastifyRequest {
    session: LeveSession
  }
}

export async function registerAuthMiddleware(app: FastifyInstance) {
  app.decorateRequest('session', null)

  // Decorator: requireSession — attaches session to request or 401
  app.decorate('requireSession', async (request: FastifyRequest, reply: FastifyReply) => {
    const sessionId = request.cookies?.[env.SESSION_COOKIE_NAME]
    if (!sessionId) {
      return reply.status(401).send({ success: false, error: 'no_session', requestId: '' })
    }
    const session = await SessionService.get(sessionId)
    if (!session) {
      return reply.status(401).send({ success: false, error: 'session_expired', requestId: '' })
    }
    request.session = session
  })

  // Decorator: requireVerified — session must have completed OTP
  app.decorate('requireVerified', async (request: FastifyRequest, reply: FastifyReply) => {
    const sessionId = request.cookies?.[env.SESSION_COOKIE_NAME]
    if (!sessionId) {
      return reply.status(401).send({ success: false, error: 'no_session', requestId: '' })
    }
    const session = await SessionService.get(sessionId)
    if (!session) {
      return reply.status(401).send({ success: false, error: 'session_expired', requestId: '' })
    }
    if (!session.isVerified) {
      return reply.status(403).send({ success: false, error: 'otp_required', requestId: '' })
    }
    request.session = session
  })

  // Decorator: requireSessionOrAnon — attaches existing session or auto-creates one.
  // Used on upload and generate so anonymous users can proceed without OTP.
  app.decorate('requireSessionOrAnon', async (request: FastifyRequest, reply: FastifyReply) => {
    let sessionId = request.cookies?.[env.SESSION_COOKIE_NAME]

    if (sessionId) {
      const session = await SessionService.get(sessionId)
      if (session) {
        request.session = session
        return
      }
    }

    // No session or expired — create one automatically
    const newSession = await SessionService.create()
    sessionId = newSession.sessionId

    reply.setCookie(env.SESSION_COOKIE_NAME, sessionId, {
      httpOnly: true,
      secure: env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: 60 * 60 * 48,
    })

    request.session = newSession
  })

  // Decorator: requireVerifiedOrAnon — attaches session but does NOT enforce isVerified.
  // Handler is responsible for branching on session.isVerified.
  app.decorate('requireVerifiedOrAnon', async (request: FastifyRequest, reply: FastifyReply) => {
    const sessionId = request.cookies?.[env.SESSION_COOKIE_NAME]

    if (!sessionId) {
      return reply.status(401).send({ success: false, error: 'no_session', requestId: '' })
    }

    const session = await SessionService.get(sessionId)
    if (!session) {
      return reply.status(401).send({ success: false, error: 'session_expired', requestId: '' })
    }

    request.session = session
  })
}

declare module 'fastify' {
  interface FastifyInstance {
    requireSession: (request: FastifyRequest, reply: FastifyReply) => Promise<void>
    requireVerified: (request: FastifyRequest, reply: FastifyReply) => Promise<void>
    requireSessionOrAnon: (request: FastifyRequest, reply: FastifyReply) => Promise<void>
    requireVerifiedOrAnon: (request: FastifyRequest, reply: FastifyReply) => Promise<void>
  }
}
