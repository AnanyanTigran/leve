'use client'

import { useState, useRef, useCallback, useEffect } from 'react'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { useTranslations } from 'next-intl'
import type { AspectRatio } from '@leve/types'

interface BeforeAfterSliderProps {
  beforeSrc?: string | null
  afterSrc?: string | null
  aspectRatio?: AspectRatio
  className?: string
  externalPosition?: number | null
  onUserInteract?: () => void
}

export function BeforeAfterSlider({
  beforeSrc,
  afterSrc,
  aspectRatio = '1:1',
  className,
  externalPosition,
  onUserInteract,
}: BeforeAfterSliderProps) {
  const t = useTranslations('results')
  const [sliderPosition, setSliderPosition] = useState(30)
  const [isDragging, setIsDragging] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)

  // Crossfade state: currentAfterSrc is visible, incomingAfterSrc loads silently
  const [currentAfterSrc, setCurrentAfterSrc] = useState<string | null>(afterSrc ?? null)
  const [incomingAfterSrc, setIncomingAfterSrc] = useState<string | null>(null)
  const [isCrossfading, setIsCrossfading] = useState(false)
  const currentAfterSrcRef = useRef<string | null>(afterSrc ?? null)
  const crossfadeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    if (!afterSrc) return
    if (afterSrc === currentAfterSrcRef.current) return
    if (!currentAfterSrcRef.current) {
      currentAfterSrcRef.current = afterSrc
      setCurrentAfterSrc(afterSrc)
      return
    }
    setIncomingAfterSrc(afterSrc)
  }, [afterSrc])

  useEffect(() => {
    return () => { if (crossfadeTimerRef.current) clearTimeout(crossfadeTimerRef.current) }
  }, [])

  useEffect(() => {
    if (externalPosition == null) return
    setSliderPosition(externalPosition)
  }, [externalPosition])

  const [W, H] = aspectRatio.split(':').map(Number)
  const demoTransition = !isDragging && externalPosition != null ? '0.7s ease-in-out' : undefined

  const updatePosition = useCallback((clientX: number) => {
    if (!containerRef.current) return
    const rect = containerRef.current.getBoundingClientRect()
    const pct = Math.max(5, Math.min(95, ((clientX - rect.left) / rect.width) * 100))
    setSliderPosition(pct)
  }, [])

  const onPointerDown = useCallback(
    (e: React.PointerEvent<HTMLDivElement>) => {
      e.preventDefault()
      e.stopPropagation()
      ;(e.target as HTMLElement).setPointerCapture(e.pointerId)
      setIsDragging(true)
      onUserInteract?.()
      updatePosition(e.clientX)
    },
    [updatePosition, onUserInteract]
  )

  const onPointerMove = useCallback(
    (e: React.PointerEvent<HTMLDivElement>) => {
      if (!isDragging) return
      e.preventDefault()
      e.stopPropagation()
      updatePosition(e.clientX)
    },
    [isDragging, updatePosition]
  )

  const onPointerUp = useCallback(
    (e: React.PointerEvent<HTMLDivElement>) => {
      e.preventDefault()
      e.stopPropagation()
      const target = e.target as HTMLElement
      if (target.hasPointerCapture(e.pointerId)) {
        target.releasePointerCapture(e.pointerId)
      }
      setIsDragging(false)
    },
    []
  )

  function onKeyDown(e: React.KeyboardEvent) {
    if (e.key === 'ArrowLeft') {
      e.preventDefault()
      setSliderPosition((p) => Math.max(5, p - 5))
    } else if (e.key === 'ArrowRight') {
      e.preventDefault()
      setSliderPosition((p) => Math.min(95, p + 5))
    }
  }

  return (
    <div
      ref={containerRef}
      role="slider"
      tabIndex={0}
      aria-label={`${t('before')} / ${t('after')}`}
      aria-valuenow={Math.round(sliderPosition)}
      aria-valuemin={5}
      aria-valuemax={95}
      className={`relative w-full mx-auto overflow-hidden rounded-[12px] border border-border-default ${className ?? ''}`}
      onKeyDown={onKeyDown}
      style={{
        aspectRatio: `${W} / ${H}`,
        maxHeight: '70vh',
        maxWidth: `calc(70vh * ${W} / ${H})`,
        userSelect: 'none',
        WebkitUserSelect: 'none',
        WebkitTouchCallout: 'none',
      }}
    >
      {/* Before layer */}
      {/* TODO: [UX] before/after images carry empty alt text — the generated
          result is the page's primary content; describe it for screen readers. */}
      <div className="absolute inset-0 bg-bg-elevated">
        {beforeSrc && (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={beforeSrc}
            alt=""
            draggable={false}
            className="absolute inset-0 w-full h-full object-cover pointer-events-none select-none"
          />
        )}
        <span className="absolute top-3 left-3 text-[11px] text-text-secondary bg-white px-2 py-1 rounded-[6px] z-10 select-none pointer-events-none">
          {t('before')}
        </span>
      </div>

      {/* After layer — clipped from the left to reveal the before side */}
      <div
        className="absolute inset-0 bg-bg-elevated"
        style={{ clipPath: `inset(0 0 0 ${sliderPosition}%)`, transition: demoTransition ? `clip-path ${demoTransition}` : undefined }}
      >
        {currentAfterSrc ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={currentAfterSrc}
            alt=""
            draggable={false}
            className="absolute inset-0 w-full h-full object-cover object-center pointer-events-none select-none"
            style={{ opacity: isCrossfading ? 0 : 1, transition: 'opacity 450ms ease-in-out' }}
          />
        ) : (
          <div className="absolute inset-0 bg-bg-elevated animate-pulse" />
        )}
        {incomingAfterSrc && (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={incomingAfterSrc}
            alt=""
            draggable={false}
            onLoad={() => {
              setIsCrossfading(true)
              const incoming = incomingAfterSrc
              crossfadeTimerRef.current = setTimeout(() => {
                currentAfterSrcRef.current = incoming
                setCurrentAfterSrc(incoming)
                setIncomingAfterSrc(null)
                setIsCrossfading(false)
                crossfadeTimerRef.current = null
              }, 450)
            }}
            className="absolute inset-0 w-full h-full object-cover object-center pointer-events-none select-none"
            style={{ opacity: isCrossfading ? 1 : 0, transition: 'opacity 450ms ease-in-out' }}
          />
        )}
        <span
          className="absolute top-3 right-3 text-[11px] text-white px-2 py-1 rounded-[6px] z-10 select-none pointer-events-none bg-[var(--accent)]"
        >
          {t('after')}
        </span>
      </div>

      {/* Divider line */}
      <div
        className="absolute top-0 bottom-0 w-[2px] bg-white z-10 pointer-events-none"
        style={{ left: `${sliderPosition}%`, filter: 'drop-shadow(0 0 4px rgba(0,0,0,0.3))', transition: demoTransition ? `left ${demoTransition}` : undefined }}
      />

      {/* Drag handle — interactive */}
      <div
        role="presentation"
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerUp}
        className="absolute z-20 w-12 h-12 rounded-full flex items-center justify-center bg-white"
        style={{
          left: `${sliderPosition}%`,
          top: '50%',
          transform: 'translate(-50%, -50%)',
          touchAction: 'none',
          boxShadow: '0 2px 8px rgba(0,0,0,0.25), 0 0 0 1px rgba(0,0,0,0.06)',
          cursor: isDragging ? 'grabbing' : 'grab',
          transition: demoTransition ? `left ${demoTransition}` : undefined,
        }}
      >
        <ChevronLeft className="w-3.5 h-3.5 text-bg-base pointer-events-none" />
        <ChevronRight className="w-3.5 h-3.5 text-bg-base pointer-events-none -ml-1" />
      </div>
    </div>
  )
}
