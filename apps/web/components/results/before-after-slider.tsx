'use client'

import { useState, useRef, useCallback, useEffect } from 'react'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { useTranslations } from 'next-intl'
import type { AspectRatio } from '@leve/types'

const POSITION_MIN = 5
const POSITION_MAX = 95
const POSITION_INITIAL = 30
const DEMO_EASING = '0.7s ease-in-out'

// As the divider nears POSITION_MIN the After image fills the frame and the
// Before image (with its badge) all but disappears — hide the Before badge a
// little before that extreme so it doesn't float over the After image.
const BEFORE_BADGE_HIDE_BELOW = POSITION_MIN + 5

interface BeforeAfterSliderProps {
  beforeSrc?: string | null
  afterSrc?: string | null
  aspectRatio?: AspectRatio
  className?: string
  externalPosition?: number | null
  onUserInteract?: () => void
}

/**
 * Performance architecture: the divider position lives in a CSS custom
 * property (--slider-pos), not React state. An invisible native range input
 * stretched over the container provides 1:1 pointer/keyboard tracking; its
 * input events write the CSS variable directly — no layout reads, no
 * re-renders per frame. The after-image reveal (clip-path) and the
 * divider/handle (transform) both resolve from that variable on the
 * compositor thread.
 */
export function BeforeAfterSlider({
  beforeSrc,
  afterSrc,
  aspectRatio = '1:1',
  className,
  externalPosition,
  onUserInteract,
}: BeforeAfterSliderProps) {
  const t = useTranslations('results')
  const containerRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const [isDragging, setIsDragging] = useState(false)
  // Toggled (not the raw position) so the component re-renders only when the
  // divider crosses the threshold, preserving the CSS-variable fast path.
  const [beforeBadgeHidden, setBeforeBadgeHidden] = useState(false)

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

  const setPosition = useCallback((value: number) => {
    containerRef.current?.style.setProperty('--slider-pos', `${value}%`)
  }, [])

  // Hide the Before badge once the divider nears POSITION_MIN (After fully
  // revealed). Functional update returns the same value when unchanged so React
  // bails out — no re-render while dragging within the same region.
  const updateBeforeBadge = useCallback((value: number) => {
    setBeforeBadgeHidden((prev) => {
      const next = value <= BEFORE_BADGE_HIDE_BELOW
      return next === prev ? prev : next
    })
  }, [])

  // Ambient demo mode (landing page) drives the position from outside;
  // sync the input's value so keyboard interaction resumes from there.
  useEffect(() => {
    if (externalPosition == null) return
    const clamped = Math.max(POSITION_MIN, Math.min(POSITION_MAX, externalPosition))
    setPosition(clamped)
    updateBeforeBadge(clamped)
    if (inputRef.current) inputRef.current.value = String(clamped)
  }, [externalPosition, setPosition, updateBeforeBadge])

  const [W, H] = aspectRatio.split(':').map(Number)
  const isDemoAnimating = !isDragging && externalPosition != null

  const handleInput = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const value = Number(e.currentTarget.value)
      setPosition(value)
      updateBeforeBadge(value)
    },
    [setPosition, updateBeforeBadge]
  )

  const handlePointerDown = useCallback(() => {
    setIsDragging(true)
    onUserInteract?.()
  }, [onUserInteract])

  const handlePointerEnd = useCallback(() => {
    setIsDragging(false)
  }, [])

  return (
    <div
      ref={containerRef}
      className={`group relative w-full mx-auto overflow-hidden rounded-[12px] border border-border-default select-none ${className ?? ''}`}
      style={{
        aspectRatio: `${W} / ${H}`,
        maxHeight: '70vh',
        maxWidth: `calc(70vh * ${W} / ${H})`,
        '--slider-pos': `${POSITION_INITIAL}%`,
      } as React.CSSProperties}
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
        <span className={`absolute top-3 left-3 z-10 text-[11px] text-text-secondary bg-white/85 backdrop-blur-md px-2 py-1 rounded-[6px] select-none pointer-events-none transition-opacity duration-300 group-active:opacity-0 ${beforeBadgeHidden ? 'opacity-0' : ''}`}>
          {t('before')}
        </span>
      </div>

      {/* After layer — clip-path resolves --slider-pos on the compositor */}
      <div
        className="absolute inset-0 bg-bg-elevated"
        style={{
          clipPath: 'inset(0 0 0 var(--slider-pos))',
          transition: isDemoAnimating ? `clip-path ${DEMO_EASING}` : 'none',
        }}
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
        <span className="absolute top-3 right-3 z-10 text-[11px] text-white bg-[var(--accent)] px-2 py-1 rounded-[6px] select-none pointer-events-none transition-opacity duration-300 group-active:opacity-0">
          {t('after')}
        </span>
      </div>

      {/* Divider + handle — a container-width layer translated by its own
          width percentage, so translateX(var(--slider-pos)) tracks the input
          exactly without triggering layout */}
      <div
        className="absolute inset-0 z-20 pointer-events-none"
        style={{
          transform: 'translateX(var(--slider-pos))',
          transition: isDemoAnimating ? `transform ${DEMO_EASING}` : 'none',
          willChange: 'transform',
        }}
      >
        <div
          className="absolute top-0 bottom-0 left-0 w-[2px] -translate-x-1/2 bg-white"
          style={{ filter: 'drop-shadow(0 0 4px rgba(0,0,0,0.3))' }}
        />
        <div
          className="absolute left-0 top-1/2 w-12 h-12 -translate-x-1/2 -translate-y-1/2 rounded-full flex items-center justify-center bg-white transition-transform duration-200 ease-[cubic-bezier(0.34,1.56,0.64,1)] group-hover:scale-110 group-active:scale-110 group-focus-within:ring-2 group-focus-within:ring-white/60"
          style={{ boxShadow: '0 2px 8px rgba(0,0,0,0.25), 0 0 0 1px rgba(0,0,0,0.06)' }}
        >
          <ChevronLeft className="w-3.5 h-3.5 text-bg-base" />
          <ChevronRight className="w-3.5 h-3.5 text-bg-base -ml-1" />
        </div>
      </div>

      {/* Invisible native slider engine — full-area, hardware-tracked */}
      <input
        ref={inputRef}
        type="range"
        min={POSITION_MIN}
        max={POSITION_MAX}
        step={1}
        defaultValue={POSITION_INITIAL}
        aria-label={`${t('before')} / ${t('after')}`}
        onChange={handleInput}
        onPointerDown={handlePointerDown}
        onPointerUp={handlePointerEnd}
        onPointerCancel={handlePointerEnd}
        className="absolute inset-0 z-30 w-full h-full opacity-0 cursor-grab active:cursor-grabbing appearance-none m-0"
        style={{ touchAction: 'none' }}
      />
    </div>
  )
}
