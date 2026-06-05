'use client'

import { useCallback, useMemo, useRef, useState } from 'react'
import { useTranslations } from 'next-intl'
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

  // Compute the largest target-AR rect that fits inside the source image,
  // expressed in fractions of source width/height.
  const { cropW, cropH } = useMemo(() => {
    if (targetAspectRatio >= sourceAspectRatio) {
      // target is wider than source — fill width, shrink height
      return { cropW: 1, cropH: sourceAspectRatio / targetAspectRatio }
    }
    // target is narrower than source — fill height, shrink width
    return { cropW: targetAspectRatio / sourceAspectRatio, cropH: 1 }
  }, [sourceAspectRatio, targetAspectRatio])

  const [pos, setPos] = useState(() => ({
    x: (1 - cropW) / 2,
    y: (1 - cropH) / 2,
  }))

  const containerRef = useRef<HTMLDivElement>(null)
  const dragRef = useRef<{ pointerId: number; offsetX: number; offsetY: number } | null>(null)

  const onPointerDown = useCallback(
    (e: React.PointerEvent<HTMLDivElement>) => {
      e.preventDefault()
      e.stopPropagation()
      if (!containerRef.current) return
      const rect = containerRef.current.getBoundingClientRect()
      const offsetX = e.clientX - rect.left - pos.x * rect.width
      const offsetY = e.clientY - rect.top - pos.y * rect.height
      dragRef.current = { pointerId: e.pointerId, offsetX, offsetY }
      ;(e.target as HTMLElement).setPointerCapture(e.pointerId)
    },
    [pos],
  )

  const onPointerMove = useCallback(
    (e: React.PointerEvent<HTMLDivElement>) => {
      const drag = dragRef.current
      if (!drag || drag.pointerId !== e.pointerId) return
      e.preventDefault()
      e.stopPropagation()
      if (!containerRef.current) return
      const rect = containerRef.current.getBoundingClientRect()
      const rawX = (e.clientX - rect.left - drag.offsetX) / rect.width
      const rawY = (e.clientY - rect.top - drag.offsetY) / rect.height
      setPos({
        x: Math.max(0, Math.min(1 - cropW, rawX)),
        y: Math.max(0, Math.min(1 - cropH, rawY)),
      })
    },
    [cropW, cropH],
  )

  const onPointerUp = useCallback(
    (e: React.PointerEvent<HTMLDivElement>) => {
      const drag = dragRef.current
      if (!drag || drag.pointerId !== e.pointerId) return
      e.preventDefault()
      e.stopPropagation()
      const target = e.target as HTMLElement
      if (target.hasPointerCapture(e.pointerId)) target.releasePointerCapture(e.pointerId)
      dragRef.current = null
    },
    [],
  )

  function handleConfirm() {
    onConfirm({ x: pos.x, y: pos.y, width: cropW, height: cropH })
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
              width: `${cropW * 100}%`,
              height: `${cropH * 100}%`,
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
