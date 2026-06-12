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

// Single source of truth for finding the caller's session ID. Cookie first;
// x-session-id header (set by api-client.ts from localStorage) as fallback.
// The header path is load-bearing, not best-effort: with no custom domain the
// API is cross-site, so Safari/Firefox never store the SameSite=None cookie —
// for those users the header is the ONLY way any session reaches the API.
// Every decorator must use this; a cookie-only decorator silently 401s all
// Safari users on its routes (the pre-audit OTP-verify and download breakage).
// TODO: remove the header path when custom domain is configured, revert to cookie-only.
function resolveSessionId(request: FastifyRequest): string | undefined {
  return (
    request.cookies?.[env.SESSION_COOKIE_NAME] ??
    (request.headers['x-session-id'] as string | undefined)
  )
}

export async function registerAuthMiddleware(app: FastifyInstance) {
  app.decorateRequest('session', null)

  // Decorator: requireSession — attaches session to request or 401
  app.decorate('requireSession', async (request: FastifyRequest, reply: FastifyReply) => {
    const sessionId = resolveSessionId(request)
    if (!sessionId) {
      return reply.status(401).send({ success: false, error: 'no_session', requestId: request.id })
    }
    const session = await SessionService.get(sessionId)
    if (!session) {
      return reply.status(401).send({ success: false, error: 'session_expired', requestId: request.id })
    }
    request.session = session
  })

  // Decorator: requireVerified — session must have completed OTP
  app.decorate('requireVerified', async (request: FastifyRequest, reply: FastifyReply) => {
    const sessionId = resolveSessionId(request)
    if (!sessionId) {
      return reply.status(401).send({ success: false, error: 'no_session', requestId: request.id })
    }
    const session = await SessionService.get(sessionId)
    if (!session) {
      return reply.status(401).send({ success: false, error: 'session_expired', requestId: request.id })
    }
    if (!session.isVerified) {
      return reply.status(403).send({ success: false, error: 'otp_required', requestId: request.id })
    }
    request.session = session
  })

  // Decorator: requireSessionOrAnon — attaches existing session or auto-creates one.
  // Used on upload and generate so anonymous users can proceed without OTP.
  app.decorate('requireSessionOrAnon', async (request: FastifyRequest, reply: FastifyReply) => {
    // Cookie session may be stale (cleared in Redis) while the header still
    // points at a live one, so try each candidate independently.
    const cookieSid = request.cookies?.[env.SESSION_COOKIE_NAME]
    if (cookieSid) {
      const session = await SessionService.get(cookieSid)
      if (session) {
        request.session = session
        return
      }
    }

    const headerSid = request.headers['x-session-id'] as string | undefined
    if (headerSid && headerSid !== cookieSid) {
      const session = await SessionService.get(headerSid)
      if (session) {
        request.session = session
        return
      }
    }

    // No valid session — create anonymous one
    const newSession = await SessionService.create()
    reply.setCookie(env.SESSION_COOKIE_NAME, newSession.sessionId, {
      httpOnly: true,
      secure: true,
      sameSite: 'none',
      path: '/',
      maxAge: 60 * 60 * 48,
    })
    request.session = newSession
  })

  // Decorator: requireVerifiedOrAnon — attaches session but does NOT enforce isVerified.
  // Handler is responsible for branching on session.isVerified.
  // TODO(MEDIUM infra-audit 2.2): dead code — no route uses this, and the name
  // is a foot-gun: despite "OrAnon" it does NOT auto-create an anonymous
  // session (it behaves exactly like requireSession). Delete it, or rename /
  // reimplement to match requireSessionOrAnon semantics before wiring it up.
  app.decorate('requireVerifiedOrAnon', async (request: FastifyRequest, reply: FastifyReply) => {
    const sessionId = resolveSessionId(request)

    if (!sessionId) {
      return reply.status(401).send({ success: false, error: 'no_session', requestId: request.id })
    }

    const session = await SessionService.get(sessionId)
    if (!session) {
      return reply.status(401).send({ success: false, error: 'session_expired', requestId: request.id })
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
