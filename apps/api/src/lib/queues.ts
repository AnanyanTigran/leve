import { Queue } from 'bullmq'
import { redis } from './redis'

export const QUEUE_NAMES = {
  PREVIEW: 'generation-preview',
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
    backoff: { type: 'fixed', delay: 3000 },
    removeOnComplete: 100,
    removeOnFail: 200,
  },
})

export interface PreviewJobData {
  jobId: string          // GenerationJob.id (DB)
  sessionId: string
  uploadS3Key: string
  sceneId: string        // scene identifier (e.g. 'marble_luxury')
  category: string
  compiledPrompt: string
  isVerified: boolean
  aspectRatio: string    // '1:1' | '4:5' | '3:4' | '9:16' | '16:9'
  isEdit: boolean
  sourceImageS3Key?: string  // for iterative edits
  requestId: string
  seed?: number          // optional fixed seed for reproducible generation
}
