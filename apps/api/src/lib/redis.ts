import IORedis from 'ioredis'
import { validateEnv } from '../config/env'

const env = validateEnv()

const isTLS = env.REDIS_URL.startsWith('rediss://')

export const redis = new IORedis(env.REDIS_URL, {
  maxRetriesPerRequest: null, // required by BullMQ
  enableReadyCheck: false,
  tls: isTLS ? { rejectUnauthorized: false } : undefined,
})

redis.on('error', (err) => {
  console.error('[Redis] connection error', err)
})
