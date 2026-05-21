import Fastify from 'fastify'
import cors from '@fastify/cors'
import multipart from '@fastify/multipart'
import rateLimit from '@fastify/rate-limit'
import cookie from '@fastify/cookie'
import { validateEnv } from './config/env'
import { registerAuthMiddleware } from './middleware/auth'
import { redis } from './lib/redis'
import { prisma } from './lib/prisma'
import { previewQueue, hdQueue } from './lib/queues'
import { registerSessionInit } from './routes/session/init'
import { registerUploadRoute } from './routes/upload/index'
import { registerOtpRoutes } from './routes/register/otp'
import { registerGenerateRoutes } from './routes/generate/index'
import { registerPaymentRoutes } from './routes/payments/index'
import { registerDownloadRoutes } from './routes/download/index'
import { startPreviewWorker } from './workers/preview.worker'
import { startHdWorker } from './workers/hd.worker'
import formbody from '@fastify/formbody'

const env = validateEnv()

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

async function bootstrap() {
  await app.register(cors, {
    origin: env.CORS_ORIGIN,
    credentials: true,
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
      await hdQueue.getJobCounts()
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
  await registerUploadRoute(app)
  await registerOtpRoutes(app)
  await registerGenerateRoutes(app)
  await registerPaymentRoutes(app)
  await registerDownloadRoutes(app)

  await app.listen({ port: env.PORT, host: '0.0.0.0' })
  app.log.info(`API running on port ${env.PORT}`)

  startPreviewWorker()
  startHdWorker()
}

bootstrap().catch((err) => {
  console.error(err)
  process.exit(1)
})
