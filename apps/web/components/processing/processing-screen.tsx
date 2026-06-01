'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useTranslations } from 'next-intl'
import { AppHeader } from '@/components/shared/app-header'

const PHASE_KEYS = ['phase_1', 'phase_2', 'phase_3', 'phase_4'] as const

export function ProcessingScreen() {
  const router = useRouter()
  const t = useTranslations('processing')
  const PHASES = PHASE_KEYS.map((k) => t(k))
  const [phaseIndex, setPhaseIndex] = useState(0)
  const [phaseVisible, setPhaseVisible] = useState(true)
  const [progressWidth, setProgressWidth] = useState(0)
  const [uploadPreview, setUploadPreview] = useState<string | null>(null)

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

    const raf = requestAnimationFrame(() => setProgressWidth(85))

    let attempts = 0
    const MAX_ATTEMPTS = 60 // 2 minutes at 2s interval

    const poll = async () => {
      try {
        const res = await fetch(`/api/generate/status/${jobId}`, {
          credentials: 'include',
        })
        const data = await res.json()
        const status = data?.data?.status

        if (status === 'done') {
          clearInterval(interval)
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
        // network error — keep polling
      }
    }

    const interval = setInterval(poll, 2000)
    poll() // immediate first check

    const phaseInterval = setInterval(() => {
      setPhaseVisible(false)
      setTimeout(() => {
        setPhaseIndex((i) => (i + 1) % PHASE_KEYS.length)
        setPhaseVisible(true)
      }, 400)
    }, 2500)

    return () => {
      cancelAnimationFrame(raf)
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

        {/* Progress bar + time estimate — full width of page-funnel */}
        <div className="w-full flex flex-col gap-3">
          <div className="w-full h-[3px] rounded-[2px] bg-bg-elevated overflow-hidden">
            <div
              className="h-full bg-[#D64C1A] rounded-[2px]"
              style={{
                width: `${progressWidth}%`,
                transition: 'width 20000ms linear',
              }}
            />
          </div>
          <p className="text-[13px] text-text-muted text-center">
            {t('time_estimate')}
          </p>
          <p className="text-[12px] text-text-muted text-center mt-1">
            {t('dont_close')}
          </p>
        </div>
      </main>
    </div>
  )
}
