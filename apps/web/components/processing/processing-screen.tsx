'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useTranslations } from 'next-intl'
import { AppHeader } from '@/components/shared/app-header'
import { ROUTES } from '@/lib/constants'

const PHASES = [
  'Setting up the studio...',
  'Adjusting the lighting...',
  'Applying the style...',
  'Final touches...',
]

export function ProcessingScreen() {
  const router = useRouter()
  const t = useTranslations('processing')
  const [phaseIndex, setPhaseIndex] = useState(0)
  const [phaseVisible, setPhaseVisible] = useState(true)
  const [progressWidth, setProgressWidth] = useState(0)
  const [uploadPreview, setUploadPreview] = useState<string | null>(null)

  useEffect(() => {
    const templateId = sessionStorage.getItem('leve_template_id')
    if (!templateId) { router.replace('/templates'); return }
    setUploadPreview(sessionStorage.getItem('leve_upload_preview'))
  }, [router])

  useEffect(() => {
    const raf = requestAnimationFrame(() => setProgressWidth(85))

    const interval = setInterval(() => {
      setPhaseVisible(false)
      setTimeout(() => {
        setPhaseIndex((i) => (i + 1) % PHASES.length)
        setPhaseVisible(true)
      }, 400)
    }, 2500)

    const timeout = setTimeout(() => {
      router.push(ROUTES.RESULTS)
    }, 20000)

    return () => {
      cancelAnimationFrame(raf)
      clearInterval(interval)
      clearTimeout(timeout)
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
