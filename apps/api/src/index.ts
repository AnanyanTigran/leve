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
import csrf from '@fastify/csrf-protection'

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
  // Let Fastify parse x-forwarded-for set by the load balancer so that
  // request.ip always reflects the real client IP. All IP-based rate limiting
  // and fraud logging reads request.ip exclusively — never the raw header.
  trustProxy: true,
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

  await app.register(rateLimit, {
    max: 100,
    timeWindow: '1 minute',
  })

  await app.register(cookie, { secret: env.SESSION_COOKIE_SECRET })
  await app.register(formbody)

  await app.register(csrf, {
    sessionPlugin: '@fastify/cookie',
    cookieOpts: {
      signed: true,
      path: '/',
      sameSite: 'none',
      secure: true,
      httpOnly: true,
    },
  })

  // Enforce CSRF on all state-mutating requests except:
  //   /api/webhooks/*  — server-to-server HMAC-signed callbacks from payment providers
  //   /api/register/otp/* — session bootstrap (no session cookie exists yet at this point)
  const CSRF_EXCLUDED = ['/api/webhooks/', '/api/register/otp/']
  app.addHook('preHandler', (request, reply, done) => {
    const method = request.method.toUpperCase()
    if (!['POST', 'PUT', 'PATCH', 'DELETE'].includes(method)) { done(); return }
    const [url = ''] = (request.url ?? '').split('?')
    if (CSRF_EXCLUDED.some(prefix => url.startsWith(prefix))) { done(); return }
    app.csrfProtection(request, reply, done)
  })

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

  // GET /api/csrf-token — issues a CSRF token tied to the caller's _csrf cookie.
  // The SPA calls this on mount and caches the token in memory; it is included
  // as an x-csrf-token header on all subsequent state-mutating requests.
  app.get('/api/csrf-token', async (_request, reply) => {
    const token = await reply.generateCsrf()
    return reply.send({ success: true, data: { token } })
  })

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
