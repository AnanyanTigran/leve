import { Queue } from 'bullmq'
import { redis } from './redis'

export const QUEUE_NAMES = {
  PREVIEW: 'generation:preview',
  HD: 'generation:hd',
} as const

export const PRIORITIES = {
  PAID: 1,
  VERIFIED: 5,
  ANON: 10,
} as const

export const previewQueue = new Queue(QUEUE_NAMES.PREVIEW, {
  connection: redis,
  defaultJobOptions: {
    attempts: 2,
    backoff: { type: 'fixed', delay: 2000 },
    removeOnComplete: 100,
    removeOnFail: 200,
  },
})

export const hdQueue = new Queue(QUEUE_NAMES.HD, {
  connection: redis,
  defaultJobOptions: {
    attempts: 2,
    backoff: { type: 'fixed', delay: 5000 },
    removeOnComplete: 100,
    removeOnFail: 200,
  },
})

export interface PreviewJobData {
  jobId: string
  sessionId: string
  uploadS3Key: string
  templateId: string
  category: string
  intent: string
  compiledPrompt: string
  requiresIPAdapter: boolean
  requestId: string
}

export interface HdJobData {
  jobId: string
  sessionId: string
  uploadS3Key: string
  templateId: string
  category: string
  compiledPrompt: string
  requiresIPAdapter: boolean
  requestId: string
}
