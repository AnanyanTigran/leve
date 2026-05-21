import IORedis from 'ioredis'
import { validateEnv } from '../config/env'

const env = validateEnv()

export const redis = new IORedis(env.REDIS_URL, {
  maxRetriesPerRequest: null, // required by BullMQ
  enableReadyCheck: false,
})

redis.on('error', (err) => {
  console.error('[Redis] connection error', err)
})
