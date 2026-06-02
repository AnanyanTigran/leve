import { redis } from './redis'

export type JobPhase = 'queued' | 'processing' | 'generating' | 'finalizing' | 'done'

const PHASE_TTL_SECONDS = 5 * 60

function phaseKey(jobId: string): string {
  return `job:phase:${jobId}`
}

export async function setJobPhase(jobId: string, phase: JobPhase): Promise<void> {
  await redis.set(phaseKey(jobId), phase, 'EX', PHASE_TTL_SECONDS)
}

export async function getJobPhase(jobId: string): Promise<JobPhase | null> {
  const v = await redis.get(phaseKey(jobId))
  return (v as JobPhase | null) ?? null
}

export async function clearJobPhase(jobId: string): Promise<void> {
  await redis.del(phaseKey(jobId))
}
