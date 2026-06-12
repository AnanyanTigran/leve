'use client'

import { useCallback, useMemo, useState } from 'react'
import Cropper from 'react-easy-crop'
import type { Area } from 'react-easy-crop'
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
  sourceAspectRatio: number  // passed by parent — not needed by react-easy-crop, accepted for API compat
  targetAspectRatio: number
  targetWidth: number
  targetHeight: number
  platformLabel: string
  isDownloading?: boolean
  onCancel: () => void
  onConfirm: (region: CropRegion) => void
}

const MIN_ZOOM = 1
const MAX_ZOOM = 4
// If server would need to upscale the cropped area beyond this factor, warn the user
const UPSCALE_WARN_THRESHOLD = 1.2

export function CropSelector({
  imageUrl,
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

  const [crop, setCrop] = useState({ x: 0, y: 0 })
  const [zoom, setZoom] = useState(1)
  // react-easy-crop gives percentages (0-100) and pixel coords on each change
  const [croppedAreaPct, setCroppedAreaPct] = useState<Area | null>(null)
  const [croppedAreaPx, setCroppedAreaPx] = useState<Area | null>(null)

  const onCropComplete = useCallback((_pct: Area, px: Area) => {
    setCroppedAreaPct(_pct)
    setCroppedAreaPx(px)
  }, [])

  // Quality warning: if the cropped pixel area is smaller than the target output,
  // sharp will have to upscale — warn when that factor exceeds the threshold
  const showQualityWarning = useMemo(() => {
    if (!croppedAreaPx) return false
    const scaleX = targetWidth / croppedAreaPx.width
    const scaleY = targetHeight / croppedAreaPx.height
    return Math.max(scaleX, scaleY) > UPSCALE_WARN_THRESHOLD
  }, [croppedAreaPx, targetWidth, targetHeight])

  function handleConfirm() {
    if (!croppedAreaPct) return
    // Convert react-easy-crop percentages (0–100) → fractional coords (0–1)
    // to match the CropRegion contract expected by triggerDownload / the server
    onConfirm({
      x: croppedAreaPct.x / 100,
      y: croppedAreaPct.y / 100,
      width: croppedAreaPct.width / 100,
      height: croppedAreaPct.height / 100,
    })
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

        {/* react-easy-crop fills position:absolute into its parent — parent needs explicit height */}
        <div className="relative w-full rounded-[12px] overflow-hidden" style={{ height: '300px' }}>
          <Cropper
            image={imageUrl}
            crop={crop}
            zoom={zoom}
            aspect={targetAspectRatio}
            minZoom={MIN_ZOOM}
            maxZoom={MAX_ZOOM}
            onCropChange={setCrop}
            onZoomChange={setZoom}
            onCropComplete={onCropComplete}
            showGrid
            zoomWithScroll
            style={{
              containerStyle: {
                background: 'var(--bg-surface)',
                borderRadius: '12px',
              },
              cropAreaStyle: {
                // accent-colored crop frame
                border: '2px solid var(--accent)',
                // color drives the box-shadow overlay that dims the area outside the crop rect
                color: 'rgba(0,0,0,0.55)',
              },
            }}
          />
        </div>

        {/* Zoom slider — fallback control for desktop and accessibility */}
        <div className="flex items-center gap-3">
          <span className="text-[11px] text-text-muted shrink-0">1×</span>
          <input
            type="range"
            min={MIN_ZOOM}
            max={MAX_ZOOM}
            step={0.01}
            value={zoom}
            onChange={(e) => setZoom(Number(e.target.value))}
            className="flex-1 h-12 cursor-pointer"
            style={{ accentColor: 'var(--accent)' }}
          />
          <span className="text-[11px] text-text-muted shrink-0">4×</span>
        </div>

        {showQualityWarning && (
          <div className="flex items-start gap-2 px-3 py-2 rounded-[10px] bg-warning-subtle border border-warning/40">
            <AlertTriangle className="w-4 h-4 text-warning shrink-0 mt-[1px]" />
            <p className="text-[12px] text-warning leading-snug">{t('crop_quality_warning')}</p>
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
            disabled={isDownloading || !croppedAreaPct}
            className={cn(
              'btn-primary flex-1 h-12 text-[15px]',
              (isDownloading || !croppedAreaPct) && 'opacity-50 cursor-not-allowed',
            )}
          >
            {isDownloading ? t('downloading') : t('download_btn')}
          </button>
        </div>
      </div>
    </div>
  )
}
