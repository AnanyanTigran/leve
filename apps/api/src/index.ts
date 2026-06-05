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
import { previewQueue } from './lib/queues'
import { registerSessionInit } from './routes/session/init'
import { registerSessionPreferences } from './routes/session/preferences'
import { registerUploadRoute } from './routes/upload/index'
import { registerOtpRoutes } from './routes/register/otp'
import { registerGenerateRoutes } from './routes/generate/index'
import { registerPaymentRoutes } from './routes/payments/index'
import { registerDownloadRoutes } from './routes/download/index'
import { startPreviewWorker } from './workers/preview.worker'
import { startStaleTransactionsWorker, scheduleStaleTransactionsCleanup } from './workers/stale-transactions.worker'
import formbody from '@fastify/formbody'

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

    try {
      await previewQueue.getJobCounts()
      checks['queues'] = 'ok'
    } catch {
      checks['queues'] = 'error'
    }

    const allOk = Object.values(checks).every((v) => v === 'ok')
    return reply.status(allOk ? 200 : 503).send({
      status: allOk ? 'ok' : 'degraded',
      checks,
      ts: Date.now(),
    })
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

  const staleWorker = startStaleTransactionsWorker()
  staleWorker.on('error', (err) => {
    app.log.error({ err }, '[worker] stale-transactions startup error')
  })
  await scheduleStaleTransactionsCleanup()

  ready = true
  app.log.info('API ready')
}

bootstrap().catch((err) => {
  Sentry.captureException(err)
  console.error(err)
  process.exit(1)
})
