import Fastify from 'fastify'
import sharp from 'sharp'
import cors from '@fastify/cors'
import helmet from '@fastify/helmet'
import multipart from '@fastify/multipart'
import rateLimit from '@fastify/rate-limit'
import cookie from '@fastify/cookie'
import { validateEnv } from './config/env'
import { initSentry, Sentry } from './lib/sentry'
import { registerAuthMiddleware } from './middleware/auth'
import { redis } from './lib/redis'
import { prisma } from './lib/prisma'
import { registerSessionInit } from './routes/session/init'
import { registerSessionPreferences } from './routes/session/preferences'
import { registerUploadRoute } from './routes/upload/index'
import { registerOtpRoutes } from './routes/register/otp'
import { registerGenerateRoutes } from './routes/generate/index'
import { registerPaymentRoutes } from './routes/payments/index'
import { registerDownloadRoutes } from './routes/download/index'
import { startPreviewWorker } from './workers/preview.worker'
import { startStaleTransactionsWorker } from './workers/stale-transactions.worker'
import formbody from '@fastify/formbody'
import { nanoid } from 'nanoid'

const env = validateEnv()
initSentry(env.SENTRY_DSN)

let ready = false

const app = Fastify({
  logger: {
    level: env.LOG_LEVEL,
    transport:
      env.NODE_ENV === 'development'
        ? { target: 'pino-pretty', options: { colorize: true } }
        : undefined,
  },
  genReqId: () => `req_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`,
  keepAliveTimeout: 61000,
  connectionTimeout: 0,
  // Trust exactly ONE proxy hop (the Railway edge). request.ip then resolves
  // to the rightmost x-forwarded-for entry — the one Railway itself appended.
  // `true` would trust every hop, letting clients spoof request.ip (and bypass
  // all IP-keyed rate limits) by sending their own x-forwarded-for prefix.
  // If Railway ever adds a second proxy layer, bump this to 2 (symptom: all
  // request.ip values in logs collapse to one shared internal IP).
  trustProxy: 1,
})

// Log which image formats libvips compiled into sharp so we know HEIC/AVIF
// uploads will transcode at runtime. Warn loudly if HEIF is missing — iOS
// users would otherwise hit a silent invalid_file_type after upload.
function logSharpFormatSupport() {
  const formats = sharp.format
  const supported = (Object.keys(formats) as Array<keyof typeof formats>)
    .filter((name) => formats[name]?.input?.file)
    .sort()
  app.log.info({ sharpVersion: sharp.versions.vips, formats: supported }, '[sharp] format support')
  const missing = (['heif', 'avif', 'tiff'] as const).filter((f) => !formats[f]?.input?.file)
  if (missing.length > 0) {
    app.log.warn({ missing }, '[sharp] some image inputs unavailable — corresponding uploads will be rejected as invalid_file_type. Reinstall sharp with a libvips that includes libheif/libtiff.')
  }
}

async function bootstrap() {
  logSharpFormatSupport()

  await app.register(cors, {
    origin: env.CORS_ORIGIN,
    credentials: true,
    // Without this, cross-origin JS cannot read rate-limit headers on 429s —
    // the browser hides non-safelisted response headers by default.
    exposedHeaders: ['retry-after', 'x-ratelimit-limit', 'x-ratelimit-remaining', 'x-ratelimit-reset'],
  })

  await app.register(helmet, {
    // CSP is managed at the CDN/Next.js layer; disable here to avoid conflicts
    contentSecurityPolicy: false,
    // Sensible defaults: X-Frame-Options DENY, X-Content-Type-Options nosniff,
    // Strict-Transport-Security, X-DNS-Prefetch-Control, etc.
  })

  await app.register(multipart, {
    limits: { fileSize: 20 * 1024 * 1024 },
  })

  // Cookie MUST register before rate-limit: both install onRequest hooks and
  // Fastify runs them in registration order. Route-level rate-limit
  // keyGenerators read request.cookies (e.g. OTP verify keyed by session) —
  // with the reverse order they always saw undefined and silently fell back
  // to the shared NAT/proxy IP key, reproducing the OTP 429 incident.
  await app.register(cookie, { secret: env.SESSION_COOKIE_SECRET })

  // 300/min per IP. Armenian carrier NAT puts many users behind one public IP
  // and the FE polls generate status at ~30-40 req/min per active user, so
  // 100/min throttled 2-3 concurrent legitimate users. This limiter is the
  // unauthenticated-flood backstop only — per-session limits live on routes.
  // Keyed by IP deliberately: a session key here would be bypassable by
  // rotating the client-controlled x-session-id header.
  // TODO(MEDIUM infra-audit 1.4): pass the shared ioredis connection via the
  // `redis` option — the default in-memory store resets on every deploy and
  // is per-instance if Railway scales horizontally.
  await app.register(rateLimit, {
    max: 300,
    timeWindow: '1 minute',
    errorResponseBuilder: (request, context) => ({
      success: false,
      error: 'rate_limit_exceeded',
      retryAfterSeconds: Math.ceil(context.ttl / 1000),
      requestId: request.id,
    }),
  })

  await app.register(formbody)

  // CSRF — Redis-backed token validation. Consistent with the session system:
  // token stored server-side in Redis, delivered in response body, validated
  // via x-csrf-token request header. No _csrf cookie dependency, so it works
  // on mobile Safari where ITP blocks all cross-site cookies regardless of
  // SameSite=None. When a custom domain is added this approach remains correct.
  //
  // Only webhooks are excluded: they are server-to-server, cannot fetch a
  // token, and are authenticated by HMAC signature instead. OTP routes are
  // deliberately NOT excluded — with @fastify/formbody registered globally, a
  // cross-site <form> POST (no CORS preflight, SameSite=None cookie attached)
  // to /api/register/otp/* would otherwise allow login-CSRF: verifying the
  // attacker's identifier onto a victim's session. The SPA sends x-csrf-token
  // on these calls via apiFetch, so they need no exclusion.
  const CSRF_EXCLUDED = ['/api/webhooks/']
  app.addHook('preHandler', async (request, reply) => {
    const method = request.method.toUpperCase()
    if (!['POST', 'PUT', 'PATCH', 'DELETE'].includes(method)) return
    const [url = ''] = (request.url ?? '').split('?')
    if (CSRF_EXCLUDED.some(prefix => url.startsWith(prefix))) return
    const token = request.headers['x-csrf-token'] as string | undefined
    if (!token) {
      return reply.status(403).send({ success: false, error: 'csrf_missing', requestId: request.id })
    }
    // TODO(MEDIUM infra-audit 3.4): bind tokens to sessions — store the
    // sessionId as the key's value and compare it against the resolved
    // session here. Today any minted token validates any request; the custom
    // header requirement (CORS preflight) is what actually blocks CSRF.
    const valid = await redis.exists(`csrf:${token}`)
    if (!valid) {
      return reply.status(403).send({ success: false, error: 'csrf_invalid', requestId: request.id })
    }
  })

  // Sanitized error responses. Without this, Fastify's default handler echoes
  // error.message to the client — Prisma/Redis/AWS messages leak hostnames,
  // table names, and request metadata. Full error is logged and 5xx captured
  // to Sentry; the client only ever sees a stable machine code + requestId.
  app.setErrorHandler((error, request, reply) => {
    const statusCode = error.statusCode && error.statusCode >= 400 ? error.statusCode : 500
    if (statusCode >= 500) {
      request.log.error({ err: error, url: request.url }, 'unhandled route error')
      Sentry.captureException(error)
    } else {
      request.log.warn({ err: error, url: request.url, statusCode }, 'request error')
    }
    const errorCode =
      error.validation ? 'invalid_input'
      : statusCode === 413 ? 'payload_too_large'
      : statusCode === 415 ? 'unsupported_media_type'
      : statusCode >= 500 ? 'internal_error'
      : 'bad_request'
    return reply.status(statusCode).send({ success: false, error: errorCode, requestId: request.id })
  })

  app.setNotFoundHandler((request, reply) =>
    reply.status(404).send({ success: false, error: 'not_found', requestId: request.id }),
  )

  // TODO(MEDIUM infra-audit 5.3): add process-level unhandledRejection /
  // uncaughtException handlers that log + Sentry.captureException before
  // exiting. Route rejections are covered by setErrorHandler, but a rejection
  // escaping a worker callback or library timer crashes with stderr only.

  await registerAuthMiddleware(app)

  // Health check
  app.get('/health', async (_request, reply) => {
    if (!ready) {
      return reply.status(200).send({ status: 'starting', ts: Date.now() })
    }

    const checks: Record<string, string> = {}

    try {
      await redis.ping()
      checks['redis'] = 'ok'
    } catch {
      checks['redis'] = 'error'
    }

    try {
      await prisma.$queryRaw`SELECT 1`
      checks['postgres'] = 'ok'
    } catch {
      checks['postgres'] = 'error'
    }

    // Queue uses the same Redis connection — if the ping above passed, queues are reachable.
    // Skipping getJobCounts() which issues 6-8 Redis commands per health probe.
    checks['queues'] = checks['redis'] === 'ok' ? 'ok' : 'error'

    const allOk = Object.values(checks).every((v) => v === 'ok')
    return reply.status(allOk ? 200 : 503).send({
      status: allOk ? 'ok' : 'degraded',
      checks,
      ts: Date.now(),
    })
  })

  // GET /api/csrf-token — generates a token, stores it in Redis for 24 hours,
  // and returns it in the response body. The SPA caches it in memory and sends
  // it as x-csrf-token on every state-mutating request; on csrf_invalid /
  // csrf_missing 403s the client refetches and retries once (api-client.ts).
  // Rate limited per IP: this endpoint is unauthenticated and each call writes
  // a Redis key — unmetered, it is a cheap Redis-fill DoS against the store
  // that also holds sessions and credit balances. 120/min is generous: a real
  // page load fetches exactly one token, even with many users per NAT IP.
  app.get(
    '/api/csrf-token',
    { config: { rateLimit: { max: 120, timeWindow: '1 minute' } } },
    async (_request, reply) => {
      const token = nanoid(32)
      await redis.set(`csrf:${token}`, '1', 'EX', 86400)
      return reply.send({ success: true, data: { token } })
    },
  )

  await registerSessionInit(app)
  await registerSessionPreferences(app)
  await registerUploadRoute(app)
  await registerOtpRoutes(app)
  await registerGenerateRoutes(app)
  await registerPaymentRoutes(app)
  await registerDownloadRoutes(app)

  await app.listen({ port: env.PORT, host: '0.0.0.0' })
  app.log.info(`API running on port ${env.PORT}`)

  const previewWorker = startPreviewWorker()
  previewWorker.on('error', (err) => {
    app.log.error({ err }, '[worker] preview startup error')
  })

  startStaleTransactionsWorker()

  ready = true
  app.log.info('API ready')
}

bootstrap().catch((err) => {
  Sentry.captureException(err)
  console.error(err)
  process.exit(1)
})
