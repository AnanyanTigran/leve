'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
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
  const [phaseIndex, setPhaseIndex] = useState(0)
  const [phaseVisible, setPhaseVisible] = useState(true)
  const [progressWidth, setProgressWidth] = useState(0)

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
    <div className="flex flex-col min-h-screen bg-bg-base">
      <AppHeader
        variant="app"
        showBack={false}
        title=""
        rightSlot={
          <button
            onClick={() => router.push('/')}
            className="text-[13px] text-text-muted font-ui"
          >
            Cancel
          </button>
        }
      />

      <div className="flex-1 flex flex-col items-center justify-center px-6 gap-8 max-w-[640px] mx-auto w-full">
        {/* Photo preview with pulsing accent ring */}
        <div className="relative">
          <div className="absolute -inset-[3px] rounded-[19px]" style={{ opacity: 0.35 }}>
            <div className="w-full h-full rounded-[19px] bg-[#D64C1A] animate-pulse" />
          </div>
          <div className="relative w-[240px] h-[240px] rounded-[16px] bg-bg-elevated overflow-hidden" />
        </div>

        {/* Phase text with fade transition */}
        <p
          className="text-[18px] font-ui text-text-secondary text-center transition-opacity duration-[400ms]"
          style={{ opacity: phaseVisible ? 1 : 0 }}
        >
          {PHASES[phaseIndex]}
        </p>

        {/* Progress bar + time estimate */}
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
            This takes about 15–20 seconds
          </p>
        </div>
      </div>
    </div>
  )
}
