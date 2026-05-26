'use client'

import { useState, useRef, useCallback } from 'react'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { useTranslations } from 'next-intl'

interface BeforeAfterSliderProps {
  beforeSrc?: string | null
  afterSrc?: string | null
  className?: string
}

export function BeforeAfterSlider({
  beforeSrc,
  afterSrc,
  className,
}: BeforeAfterSliderProps) {
  const t = useTranslations('results')
  const [sliderPosition, setSliderPosition] = useState(30)
  const [isDragging, setIsDragging] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)

  const updatePosition = useCallback((clientX: number) => {
    if (!containerRef.current) return
    const rect = containerRef.current.getBoundingClientRect()
    const pct = Math.max(5, Math.min(95, ((clientX - rect.left) / rect.width) * 100))
    setSliderPosition(pct)
  }, [])

  const onMouseDown = useCallback(() => setIsDragging(true), [])
  const onMouseMove = useCallback(
    (e: React.MouseEvent) => { if (isDragging) updatePosition(e.clientX) },
    [isDragging, updatePosition]
  )
  const onMouseUp = useCallback(() => setIsDragging(false), [])
  const onMouseLeave = useCallback(() => setIsDragging(false), [])
  const onTouchStart = useCallback(() => setIsDragging(true), [])
  const onTouchMove = useCallback(
    (e: React.TouchEvent) => {
      if (isDragging && e.touches[0]) updatePosition(e.touches[0].clientX)
    },    [isDragging, updatePosition]
  )
  const onTouchEnd = useCallback(() => setIsDragging(false), [])

  return (
    <div
      ref={containerRef}
      className={`relative w-full aspect-square max-h-[420px] lg:max-h-[480px] overflow-hidden rounded-[12px] border border-border-default select-none cursor-col-resize ${className ?? ''}`}
      onMouseDown={onMouseDown}
      onMouseMove={onMouseMove}
      onMouseUp={onMouseUp}
      onMouseLeave={onMouseLeave}
      onTouchStart={onTouchStart}
      onTouchMove={onTouchMove}
      onTouchEnd={onTouchEnd}
      style={{ cursor: isDragging ? 'grabbing' : 'col-resize' }}
    >
      {/* Before layer */}
      <div className="absolute inset-0 bg-bg-elevated">
        {beforeSrc && (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={beforeSrc} alt="" className="absolute inset-0 w-full h-full object-cover" />
        )}
        <span className="absolute top-3 left-3 text-[11px] text-text-secondary bg-white px-2 py-1 rounded-[6px] z-10 select-none">
          {t('before')}
        </span>
      </div>

      {/* After layer — clipped from the left to reveal the before side */}
      <div
        className="absolute inset-0 bg-bg-elevated"
        style={{ clipPath: `inset(0 0 0 ${sliderPosition}%)` }}
      >
        {afterSrc ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={afterSrc} alt="" className="absolute inset-0 w-full h-full object-cover" />
        ) : (
          <div className="absolute inset-0 animate-pulse bg-gradient-to-br from-bg-elevated to-bg-surface" />
        )}
        <span className="absolute top-3 right-3 text-[11px] text-white px-2 py-1 rounded-[6px] z-10 select-none" style={{ background: '#D64C1A' }}>
          {t('after')}
        </span>
      </div>

      {/* Divider line */}
      <div
        className="absolute top-0 bottom-0 w-[2px] bg-white z-10 pointer-events-none"
        style={{ left: `${sliderPosition}%`, filter: 'drop-shadow(0 0 4px rgba(0,0,0,0.3))' }}
      />

      {/* Drag handle */}
      <div
        className="absolute z-20 w-12 h-12 rounded-full flex items-center justify-center gap-0.5 pointer-events-none"
        style={{
          left: `${sliderPosition}%`,
          top: '50%',
          transform: 'translate(-50%, -50%)',
          background: '#D64C1A',
          boxShadow: '0 2px 8px rgba(0,0,0,0.2)',
        }}
      >
        <ChevronLeft className="w-3.5 h-3.5 text-white" />
        <ChevronRight className="w-3.5 h-3.5 text-white" />
      </div>
    </div>
  )
}
