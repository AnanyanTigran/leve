'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useTranslations } from 'next-intl'
import { AppHeader } from '@/components/shared/app-header'

const PHASE_KEYS = ['phase_1', 'phase_2', 'phase_3', 'phase_4'] as const
// Real worker phases mapped to a target progress fraction. The bar advances
// when the worker reports a new phase via /api/generate/status; it never
// runs ahead of actual work.
const PHASE_PROGRESS: Record<string, number> = {
  queued: 0.1,
  processing: 0.3,
  generating: 0.55,
  finalizing: 0.85,
  done: 1,
}
// Map a real worker phase to one of the four user-facing phase strings.
const WORKER_PHASE_TO_INDEX: Record<string, number> = {
  queued: 0,
  processing: 1,
  generating: 2,
  finalizing: 3,
}
const POLL_FAILURE_OFFLINE_THRESHOLD = 3

export function ProcessingScreen() {
  const router = useRouter()
  const t = useTranslations('processing')
  const tResults = useTranslations('results')
  const PHASES = PHASE_KEYS.map((k) => t(k))
  const [phaseIndex, setPhaseIndex] = useState(0)
  const [phaseVisible, setPhaseVisible] = useState(true)
  const [progressFraction, setProgressFraction] = useState(0.05)
  const [uploadPreview, setUploadPreview] = useState<string | null>(null)
  const [isReconnecting, setIsReconnecting] = useState(false)

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
        const res = await fetch(`/api/generate/status/${jobId}`, {
          credentials: 'include',
        })
        const data = await res.json()
        const status = data?.data?.status
        const phase = data?.data?.phase as string | undefined

        // Successful poll — clear reconnecting state
        pollFailures = 0
        setIsReconnecting((prev) => (prev ? false : prev))

        // Advance the bar based on real worker phase (falls back to status)
        const key = phase ?? status
        const target = typeof key === 'string' ? PHASE_PROGRESS[key] : undefined
        if (target !== undefined) {
          setProgressFraction((prev) => Math.max(prev, target))
        }
        // Sync the user-facing phase label with the real worker phase
        if (phase && WORKER_PHASE_TO_INDEX[phase] !== undefined) {
          const target = WORKER_PHASE_TO_INDEX[phase]
          setPhaseIndex((prev) => (prev === target ? prev : target))
        }

        if (status === 'done') {
          clearInterval(interval)
          setProgressFraction(1)
          sessionStorage.removeItem('leve_job_dispatched_at')
          router.push('/results')
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

    // Fallback phase label cycle — only used when the worker hasn't yet
    // reported a phase. Once a real phase arrives the worker drives the index.
    const phaseInterval = setInterval(() => {
      setPhaseVisible(false)
      setTimeout(() => {
        setPhaseIndex((i) => (i + 1) % PHASE_KEYS.length)
        setPhaseVisible(true)
      }, 400)
    }, 2500)

    return () => {
      clearInterval(interval)
      clearInterval(phaseInterval)
    }
  }, [router])

  return (
    <div className="flex flex-col h-[100dvh] overflow-hidden bg-bg-base">
      <AppHeader
        variant="app"
        showBack={false}
        title=""
      />

      <main className="page-funnel flex-1 overflow-y-auto flex flex-col items-center justify-center py-12 gap-8">
        {/* Photo preview with pulsing glow */}
        <div className="w-[240px] h-[240px] rounded-[16px] bg-bg-elevated overflow-hidden processing-glow relative">
          {uploadPreview && (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={uploadPreview} alt="" className="absolute inset-0 w-full h-full object-cover" />
          )}
        </div>

        {/* Phase text with fade transition */}
        <p
          className="text-[18px] font-ui text-text-secondary text-center transition-opacity duration-[400ms]"
          style={{ opacity: phaseVisible ? 1 : 0 }}
        >
          {PHASES[phaseIndex]}
        </p>

        {/* Progress bar + time estimate — full width of page-funnel.
            Width is driven by the real worker phase reported by /api/generate/status,
            with a 400ms ease so jumps look smooth rather than snapping. */}
        <div className="w-full flex flex-col gap-3">
          <div className="w-full h-[3px] rounded-[2px] bg-bg-elevated overflow-hidden">
            <div
              className="h-full bg-[#D64C1A] rounded-[2px]"
              style={{
                width: `${Math.round(progressFraction * 100)}%`,
                transition: 'width 400ms ease-out',
              }}
            />
          </div>
          <p className="text-[13px] text-text-muted text-center">
            {t('time_estimate')}
          </p>
          <p className="text-[12px] text-text-muted text-center mt-1">
            {t('dont_close')}
          </p>
          {isReconnecting && (
            <div className="flex items-center justify-center gap-2 mt-1">
              <div className="w-3 h-3 rounded-full border-2 border-text-muted border-t-transparent animate-spin" />
              <span className="text-[12px] text-text-secondary">
                {tResults('reconnecting')}
              </span>
            </div>
          )}
        </div>
      </main>
    </div>
  )
}
