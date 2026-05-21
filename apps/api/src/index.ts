import Fastify from 'fastify'
import cors from '@fastify/cors'
import multipart from '@fastify/multipart'
import rateLimit from '@fastify/rate-limit'
import cookie from '@fastify/cookie'
import { validateEnv } from './config/env'
import { registerAuthMiddleware } from './middleware/auth'
import { registerSessionInit } from './routes/session/init'

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

  await registerAuthMiddleware(app)

  // Health check
  app.get('/health', async () => ({ status: 'ok', ts: Date.now() }))

  await registerSessionInit(app)

  // Routes will be registered here
  // await app.register(import('./routes/upload'), { prefix: '/api/upload' })
  // await app.register(import('./routes/generate'), { prefix: '/api/generate' })
  // await app.register(import('./routes/payments'), { prefix: '/api/payments' })

  await app.listen({ port: env.PORT, host: '0.0.0.0' })
  app.log.info(`API running on port ${env.PORT}`)
}

bootstrap().catch((err) => {
  console.error(err)
  process.exit(1)
})
