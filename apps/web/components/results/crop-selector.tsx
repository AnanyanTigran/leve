'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useTranslations } from 'next-intl'
import { AlertTriangle } from 'lucide-react'
import { cn } from '@/lib/utils'

export interface CropRegion {
  x: number
  y: number
  width: number
  height: number
}

interface CropSelectorProps {
  imageUrl: string
  sourceAspectRatio: number  // w / h of the generated image
  targetAspectRatio: number  // w / h required by the target platform
  targetWidth: number
  targetHeight: number
  platformLabel: string
  isDownloading?: boolean
  onCancel: () => void
  onConfirm: (region: CropRegion) => void
}

// Maximum zoom level — prevents cropping a tiny sliver that would massively upscale
const MAX_ZOOM = 4
// If the required upscale factor exceeds this, show the quality warning
const UPSCALE_WARN_THRESHOLD = 1.2

export function CropSelector({
  imageUrl,
  sourceAspectRatio,
  targetAspectRatio,
  targetWidth,
  targetHeight,
  platformLabel,
  isDownloading,
  onCancel,
  onConfirm,
}: CropSelectorProps) {
  const t = useTranslations('download')
  const tCommon = useTranslations('common')

  // Natural pixel dimensions of the source image — used for upscale detection
  const [naturalSize, setNaturalSize] = useState<{ w: number; h: number } | null>(null)

  // Compute the fractional crop dimensions at zoom=1 (largest rect at target AR)
  const { cropW, cropH } = useMemo(() => {
    if (targetAspectRatio >= sourceAspectRatio) {
      // target is wider than source — fill width, shrink height
      return { cropW: 1, cropH: sourceAspectRatio / targetAspectRatio }
    }
    // target is narrower than source — fill height, shrink width
    return { cropW: targetAspectRatio / sourceAspectRatio, cropH: 1 }
  }, [sourceAspectRatio, targetAspectRatio])

  // Zoom state: 1 = full coverage (min zoom), MAX_ZOOM = tightest crop (max zoom)
  const [zoom, setZoom] = useState(1)

  // Effective crop dimensions shrink as zoom increases
  const effectiveCropW = cropW / zoom
  const effectiveCropH = cropH / zoom

  const [pos, setPos] = useState(() => ({
    x: (1 - cropW) / 2,
    y: (1 - cropH) / 2,
  }))

  // Clamp pos whenever effectiveCrop shrinks after a zoom change
  useEffect(() => {
    setPos((p) => ({
      x: Math.max(0, Math.min(1 - effectiveCropW, p.x)),
      y: Math.max(0, Math.min(1 - effectiveCropH, p.y)),
    }))
  }, [effectiveCropW, effectiveCropH])

  // Detect whether this crop would need upscaling beyond the threshold
  const showQualityWarning = useMemo(() => {
    if (!naturalSize) return false
    const croppedPxW = effectiveCropW * naturalSize.w
    const croppedPxH = effectiveCropH * naturalSize.h
    const scaleX = targetWidth / croppedPxW
    const scaleY = targetHeight / croppedPxH
    return Math.max(scaleX, scaleY) > UPSCALE_WARN_THRESHOLD
  }, [naturalSize, effectiveCropW, effectiveCropH, targetWidth, targetHeight])

  const containerRef = useRef<HTMLDivElement>(null)

  // ── Pointer tracking ────────────────────────────────────────────────────────
  // We track all active pointers in a Map so we can handle both single-finger
  // drag and two-finger pinch with the same pointer event handlers.
  const pointersRef = useRef<Map<number, { x: number; y: number }>>(new Map())
  // Anchor state saved when a drag begins — used to compute relative movement
  const dragAnchorRef = useRef<{ startX: number; startY: number; posX: number; posY: number } | null>(null)
  // Previous pinch distance — used to compute zoom delta
  const prevPinchDistRef = useRef<number | null>(null)

  function getContainerRect(): DOMRect | null {
    return containerRef.current?.getBoundingClientRect() ?? null
  }

  function getPinchDistance(): number | null {
    const pts = Array.from(pointersRef.current.values())
    if (pts.length < 2) return null
    const a = pts[0]!
    const b = pts[1]!
    return Math.hypot(b.x - a.x, b.y - a.y)
  }

  const onPointerDown = useCallback(
    (e: React.PointerEvent<HTMLDivElement>) => {
      e.preventDefault()
      e.stopPropagation()
      ;(e.target as HTMLElement).setPointerCapture(e.pointerId)
      pointersRef.current.set(e.pointerId, { x: e.clientX, y: e.clientY })

      const rect = getContainerRect()
      if (!rect) return

      if (pointersRef.current.size === 1) {
        // Single pointer — start drag
        dragAnchorRef.current = {
          startX: e.clientX,
          startY: e.clientY,
          posX: pos.x,
          posY: pos.y,
        }
        prevPinchDistRef.current = null
      } else {
        // Second pointer arrived — switch to pinch, cancel drag
        dragAnchorRef.current = null
        prevPinchDistRef.current = getPinchDistance()
      }
    },
    [pos],
  )

  const onPointerMove = useCallback(
    (e: React.PointerEvent<HTMLDivElement>) => {
      if (!pointersRef.current.has(e.pointerId)) return
      e.preventDefault()
      e.stopPropagation()
      pointersRef.current.set(e.pointerId, { x: e.clientX, y: e.clientY })

      const rect = getContainerRect()
      if (!rect) return

      if (pointersRef.current.size === 2) {
        // ── Pinch-to-zoom ──
        const dist = getPinchDistance()
        if (dist === null) return
        const prev = prevPinchDistRef.current
        if (prev !== null && prev > 0) {
          const ratio = dist / prev
          setZoom((z) => {
            const next = Math.max(1, Math.min(MAX_ZOOM, z * ratio))
            return next
          })
        }
        prevPinchDistRef.current = dist
      } else if (pointersRef.current.size === 1 && dragAnchorRef.current) {
        // ── Single-finger drag ──
        const anchor = dragAnchorRef.current
        const dxFrac = (e.clientX - anchor.startX) / rect.width
        const dyFrac = (e.clientY - anchor.startY) / rect.height
        const wFrac = effectiveCropW
        const hFrac = effectiveCropH
        setPos({
          x: Math.max(0, Math.min(1 - wFrac, anchor.posX + dxFrac)),
          y: Math.max(0, Math.min(1 - hFrac, anchor.posY + dyFrac)),
        })
      }
    },
    [effectiveCropW, effectiveCropH],
  )

  const onPointerUp = useCallback(
    (e: React.PointerEvent<HTMLDivElement>) => {
      e.preventDefault()
      e.stopPropagation()
      const target = e.target as HTMLElement
      if (target.hasPointerCapture(e.pointerId)) target.releasePointerCapture(e.pointerId)
      pointersRef.current.delete(e.pointerId)

      if (pointersRef.current.size < 2) {
        prevPinchDistRef.current = null
      }
      if (pointersRef.current.size === 0) {
        dragAnchorRef.current = null
      }
    },
    [],
  )

  function handleConfirm() {
    onConfirm({ x: pos.x, y: pos.y, width: effectiveCropW, height: effectiveCropH })
  }

  return (
    <div className="fixed inset-0 z-[60] bg-black/70 flex items-center justify-center px-4">
      <div className="w-full max-w-[480px] bg-bg-base rounded-2xl border border-border-default p-4 flex flex-col gap-4">
        <div className="flex flex-col gap-1">
          <p className="text-[15px] font-semibold text-text-primary">{t('crop_title')}</p>
          <p className="text-[12px] text-text-muted">
            {platformLabel} · {targetWidth}×{targetHeight}
          </p>
        </div>

        <div
          ref={containerRef}
          className="relative w-full mx-auto overflow-hidden rounded-[12px] bg-bg-elevated select-none"
          style={{
            aspectRatio: `${sourceAspectRatio}`,
            maxHeight: '60vh',
            userSelect: 'none',
            WebkitUserSelect: 'none',
            WebkitTouchCallout: 'none',
          }}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={imageUrl}
            alt=""
            draggable={false}
            onLoad={(e) => {
              const img = e.currentTarget
              setNaturalSize({ w: img.naturalWidth, h: img.naturalHeight })
            }}
            className="absolute inset-0 w-full h-full object-cover pointer-events-none select-none"
          />

          {/* Crop window — box-shadow paints the surrounding dim. The
              container's overflow: hidden clips the shadow to the image. */}
          <div
            onPointerDown={onPointerDown}
            onPointerMove={onPointerMove}
            onPointerUp={onPointerUp}
            onPointerCancel={onPointerUp}
            role="presentation"
            className="absolute border-2 border-white cursor-grab active:cursor-grabbing"
            style={{
              left: `${pos.x * 100}%`,
              top: `${pos.y * 100}%`,
              width: `${effectiveCropW * 100}%`,
              height: `${effectiveCropH * 100}%`,
              boxShadow: '0 0 0 9999px rgba(0,0,0,0.55)',
              touchAction: 'none',
            }}
          >
            {/* Rule-of-thirds helper grid for composition */}
            <div className="absolute inset-0 grid grid-cols-3 grid-rows-3 pointer-events-none">
              {Array.from({ length: 9 }).map((_, i) => (
                <div key={i} className="border border-white/25" />
              ))}
            </div>
          </div>
        </div>

        {showQualityWarning && (
          <div className="flex items-start gap-2 px-3 py-2 rounded-[10px] bg-[#451A03] border border-[#92400E]">
            <AlertTriangle className="w-4 h-4 text-[#F59E0B] shrink-0 mt-[1px]" />
            <p className="text-[12px] text-[#FCD34D] leading-snug">{t('crop_quality_warning')}</p>
          </div>
        )}

        <div className="flex gap-2">
          <button
            type="button"
            onClick={onCancel}
            disabled={isDownloading}
            className={cn('btn-secondary flex-1 h-12 text-[15px]', isDownloading && 'opacity-50 cursor-not-allowed')}
          >
            {tCommon('cancel')}
          </button>
          <button
            type="button"
            onClick={handleConfirm}
            disabled={isDownloading}
            className={cn('btn-primary flex-1 h-12 text-[15px]', isDownloading && 'opacity-50 cursor-not-allowed')}
          >
            {isDownloading ? t('downloading') : t('download_btn')}
          </button>
        </div>
      </div>
    </div>
  )
}
