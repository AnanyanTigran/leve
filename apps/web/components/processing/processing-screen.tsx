'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useTranslations } from 'next-intl'
import { Check } from 'lucide-react'
import { apiFetch } from '@/lib/api-client'

type WorkerPhase = 'queued' | 'processing' | 'generating' | 'finalizing' | 'done'

// Real worker phases mapped to the top of their progress range. The bar
// advances when the worker reports a new phase via /api/generate/status; it
// never runs ahead of actual work.
const PHASE_PROGRESS: Record<WorkerPhase, number> = {
  queued: 0.15,
  processing: 0.40,
  generating: 0.85,
  finalizing: 0.95,
  done: 1.0,
}

const POLL_FAILURE_OFFLINE_THRESHOLD = 3
const DONE_ANIMATION_MS = 50

function isWorkerPhase(v: string | undefined): v is WorkerPhase {
  return v === 'queued' || v === 'processing' || v === 'generating' || v === 'finalizing' || v === 'done'
}

export function ProcessingScreen() {
  const router = useRouter()
  const t = useTranslations('processing')
  const tResults = useTranslations('results')

  const [phase, setPhase] = useState<WorkerPhase>('queued')
  const [progressFraction, setProgressFraction] = useState(0.05)
  const [uploadPreview, setUploadPreview] = useState<string | null>(null)
  const [isReconnecting, setIsReconnecting] = useState(false)
  const [isDone, setIsDone] = useState(false)

  useEffect(() => {
    const jobId = sessionStorage.getItem('leve_job_id')
    const dispatchedAt = parseInt(sessionStorage.getItem('leve_job_dispatched_at') ?? '0', 10)
    const isStale = Date.now() - dispatchedAt > 5 * 60 * 1000

    if (!jobId || isStale) {
      router.replace('/templates')
      return
    }

    const uploadPreviewData = sessionStorage.getItem('leve_upload_preview')
    if (uploadPreviewData) setUploadPreview(uploadPreviewData)

    let attempts = 0
    let pollFailures = 0
    const MAX_ATTEMPTS = 60 // 2 minutes at 2s interval

    const poll = async () => {
      try {
        const res = await apiFetch(`/api/generate/status/${jobId}`)
        if (res.status === 404) {
          clearInterval(interval)
          sessionStorage.removeItem('leve_job_id')
          sessionStorage.removeItem('leve_job_dispatched_at')
          router.replace('/templates')
          return
        }
        if (res.status === 401 || res.status === 403) {
          clearInterval(interval)
          router.replace('/register')
          return
        }
        const data = await res.json()
        const status = data?.data?.status as string | undefined
        const workerPhase = data?.data?.phase as string | undefined

        // Successful poll — clear reconnecting state
        pollFailures = 0
        setIsReconnecting((prev) => (prev ? false : prev))

        // Advance the bar based on real worker phase (falls back to status)
        const key = workerPhase ?? status
        if (isWorkerPhase(key)) {
          const target = PHASE_PROGRESS[key]
          setProgressFraction((prev) => Math.max(prev, target))
          setPhase((prev) => (prev === key ? prev : key))
          if (key === 'generating') router.prefetch('/results')
        }

        if (status === 'done') {
          clearInterval(interval)
          setPhase('done')
          setProgressFraction(1)
          setIsDone(true)
          sessionStorage.removeItem('leve_job_dispatched_at')
          sessionStorage.setItem('leve_job_done', '1')
          setTimeout(() => router.push('/results'), DONE_ANIMATION_MS)
          return
        }

        if (status === 'failed' || status === 'credit_refunded') {
          clearInterval(interval)
          sessionStorage.setItem('leve_generation_error', data?.data?.errorCode ?? 'generation_failed')
          router.push('/templates')
          return
        }

        attempts++
        if (attempts >= MAX_ATTEMPTS) {
          clearInterval(interval)
          sessionStorage.setItem('leve_generation_error', 'timeout')
          router.push('/templates')
        }
      } catch {
        // network error — keep polling, but surface "Reconnecting…" if it persists
        pollFailures += 1
        if (pollFailures >= POLL_FAILURE_OFFLINE_THRESHOLD) {
          setIsReconnecting((prev) => (prev ? prev : true))
        }
      }
    }

    const interval = setInterval(poll, 2000)
    poll() // immediate first check

    return () => {
      clearInterval(interval)
    }
  }, [router])

  return (
    <div className="flex flex-col h-[100dvh] bg-bg-base items-center justify-center px-6">
      <div className="w-full max-w-[420px] flex flex-col items-center gap-6">
        {/* Photo preview — the hero. Height pinned at ~40vh; width adapts
            to the source image AR. Subtle accent glow + drop shadow. The
            shimmer sweep only runs while we're still generating. */}
        <div
          className={`relative rounded-[20px] overflow-hidden bg-bg-elevated processing-card-shadow ${isDone ? 'processing-done-scale' : ''}`}
        >
          {uploadPreview ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={uploadPreview}
              alt=""
              draggable={false}
              className="block"
              style={{ height: '40vh', width: 'auto', maxWidth: '100%' }}
            />
          ) : (
            <div style={{ height: '40vh', aspectRatio: '4 / 5' }} />
          )}

          {!isDone && <div className="absolute inset-0 processing-shimmer" aria-hidden />}

          {isDone && (
            <div className="absolute inset-0 flex items-center justify-center bg-black/30 processing-fade-in">
              <div className="w-14 h-14 rounded-full bg-white flex items-center justify-center shadow-lg">
                <Check className="w-7 h-7 text-bg-base" strokeWidth={3} />
              </div>
            </div>
          )}
        </div>

        {/* Thin progress bar — width is driven by the real worker phase
            reported by /api/generate/status, with a 600ms ease so jumps
            look smooth rather than snapping. */}
        <div className="w-full h-[3px] rounded-full bg-bg-elevated overflow-hidden">
          <div
            className="h-full bg-accent rounded-full"
            style={{
              width: `${Math.round(progressFraction * 100)}%`,
              transition: 'width 600ms ease-out',
            }}
          />
        </div>

        <div className="flex flex-col items-center gap-1.5">
          <p className="text-[14px] text-text-secondary text-center">
            {t(`phase_${phase}`)}
          </p>
          <p className="text-[12px] text-text-muted text-center">
            {t('time_estimate')}
          </p>
          {isReconnecting && (
            <span
              className="mt-2 inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-medium"
              style={{
                background: 'rgba(245, 158, 11, 0.12)',
                border: '1px solid rgba(245, 158, 11, 0.35)',
                color: '#F59E0B',
              }}
            >
              <span
                className="w-1.5 h-1.5 rounded-full animate-pulse"
                style={{ background: '#F59E0B' }}
              />
              {tResults('reconnecting')}
            </span>
          )}
        </div>
      </div>
    </div>
  )
}
