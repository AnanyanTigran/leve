'use client'

import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { useTranslations } from 'next-intl'
import { Download, Square, Smartphone, Monitor, ShoppingBag, Package, Send, Globe, Share2, Copy } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useVerifiedGuard } from '@/hooks/use-verified-guard'
import { apiFetch } from '@/lib/api-client'
import { PLATFORM_SPECS } from '@leve/types'
import type { AspectRatio, ExportPlatform } from '@leve/types'
import type { LucideIcon } from 'lucide-react'
import { CropSelector, type CropRegion } from '@/components/results/crop-selector'

const PLATFORM_ICONS: Record<ExportPlatform, LucideIcon> = {
  instagram_feed: Square,
  instagram_story: Smartphone,
  facebook_post: Monitor,
  wildberries: ShoppingBag,
  ozon: Package,
  telegram: Send,
  list_am: Globe,
  original_hd: Download,
}

const PLATFORM_SHORT_LABEL: Partial<Record<ExportPlatform, string>> = {
  wildberries: 'WB',
  ozon: 'Ozon',
  list_am: 'list.am',
}

const PLATFORM_ORDER: ExportPlatform[] = [
  'original_hd',
  'instagram_feed',
  'instagram_story',
  'wildberries',
  'ozon',
  'facebook_post',
  'telegram',
  'list_am',
]

type ShareState = 'idle' | 'loading' | 'success' | 'error'
type CopyState = 'idle' | 'success'

const ASPECT_RATIO_VALUES: Record<AspectRatio, number> = {
  '1:1': 1,
  '4:5': 4 / 5,
  '3:4': 3 / 4,
  '9:16': 9 / 16,
  '16:9': 16 / 9,
}

// Within this fractional difference the FE considers the two ratios "close
// enough" to skip the crop selector and let the server fit/cover as usual.
const RATIO_TOLERANCE = 0.05

export default function DownloadSuccessPage() {
  const router = useRouter()
  const t = useTranslations('download')
  const [selectedPlatform, setSelectedPlatform] = useState<ExportPlatform>('original_hd')
  const [isDownloading, setIsDownloading] = useState(false)
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)
  const [previewTimedOut, setPreviewTimedOut] = useState(false)
  const [downloadError, setDownloadError] = useState<string | null>(null)
  const [cropOpen, setCropOpen] = useState(false)
  const [shareState, setShareState] = useState<ShareState>('idle')
  const [copyState, setCopyState] = useState<CopyState>('idle')
  const [supportsShare, setSupportsShare] = useState(false)
  const [supportsClipboard, setSupportsClipboard] = useState(false)
  const blobRef = useRef<Blob | null>(null)
  const { checked, isVerified } = useVerifiedGuard()

  const sourceAspectRatio = (() => {
    if (typeof window === 'undefined') return 1
    const raw = sessionStorage.getItem('leve_aspect_ratio') as AspectRatio | null
    return raw && ASPECT_RATIO_VALUES[raw] ? ASPECT_RATIO_VALUES[raw] : 1
  })()

  // Redirect to /history if job context is missing after auth confirmed
  useEffect(() => {
    if (!checked || !isVerified) return
    const jobId = sessionStorage.getItem('leve_job_id')
    if (!jobId) {
      router.replace('/history')
    }
  }, [checked, isVerified, router])

  useEffect(() => {
    const jobId = sessionStorage.getItem('leve_job_id')
    if (!jobId) return

    apiFetch(`/api/download/url?jobId=${jobId}`)
      .then((r) => r.json())
      .then((data) => {
        if (data?.data?.url) {
          setPreviewUrl(data.data.url)
        }
      })
      .catch(() => {})
  }, [])

  // Show error if preview hasn't resolved after 10s
  useEffect(() => {
    const timer = setTimeout(() => {
      if (!previewUrl) setPreviewTimedOut(true)
    }, 10000)
    return () => clearTimeout(timer)
  }, [previewUrl])

  // Detect share/clipboard capabilities after hydration to avoid SSR mismatch
  useEffect(() => {
    try {
      if (navigator.share) {
        const testFile = new File([''], 'test.jpg', { type: 'image/jpeg' })
        if (navigator.canShare) {
          setSupportsShare(navigator.canShare({ files: [testFile] }))
        } else {
          // Browser has navigator.share but no canShare — assume file sharing works
          setSupportsShare(true)
        }
      }
    } catch {
      setSupportsShare(false)
    }
    setSupportsClipboard(!!navigator.clipboard)
  }, [])

  // Preload the image blob via proxy so the share call stays within the user-gesture window.
  // Uses the server-side proxy endpoint instead of the CloudFront URL directly to avoid CORS.
  useEffect(() => {
    if (!supportsShare) return
    const jobId = sessionStorage.getItem('leve_job_id')
    if (!jobId) return
    fetch(`/api/download/proxy?jobId=${encodeURIComponent(jobId)}`)
      .then((r) => r.blob())
      .then((blob) => { blobRef.current = blob })
      .catch(() => {})
  }, [supportsShare])

  const primaryButtonLabel = selectedPlatform === 'original_hd'
    ? t('download_btn')
    : `${t('download_for')} ${PLATFORM_SPECS[selectedPlatform].label}`

  async function triggerDownload(crop?: CropRegion) {
    const jobId = sessionStorage.getItem('leve_job_id')
    if (!jobId) return

    setIsDownloading(true)
    setDownloadError(null)

    let blobUrl: string | null = null
    try {
      let endpointPath: string
      if (selectedPlatform === 'original_hd') {
        endpointPath = `/api/download/file?jobId=${encodeURIComponent(jobId)}`
      } else {
        const params = new URLSearchParams({
          jobId,
          platform: selectedPlatform,
        })
        if (crop) {
          params.set('cropX', crop.x.toFixed(4))
          params.set('cropY', crop.y.toFixed(4))
          params.set('cropW', crop.width.toFixed(4))
          params.set('cropH', crop.height.toFixed(4))
        }
        endpointPath = `/api/download/export-file?${params.toString()}`
      }

      const res = await apiFetch(endpointPath)

      if (!res.ok) {
        setDownloadError(t('download_failed'))
        return
      }

      const blob = await res.blob()
      blobUrl = URL.createObjectURL(blob)

      const a = document.createElement('a')
      a.href = blobUrl
      a.download = `leve-studio-${selectedPlatform}-${Date.now()}.jpg`
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      setCropOpen(false)
    } catch {
      setDownloadError(t('download_failed'))
    } finally {
      if (blobUrl) URL.revokeObjectURL(blobUrl)
      setIsDownloading(false)
    }
  }

  async function handleShare() {
    if (shareState !== 'idle') return
    setShareState('loading')
    try {
      const jobId = sessionStorage.getItem('leve_job_id')
      if (!jobId) throw new Error('no job id')
      const blob: Blob = blobRef.current ?? await fetch(`/api/download/proxy?jobId=${encodeURIComponent(jobId)}`).then((r) => r.blob())
      blobRef.current = blob
      const file = new File([blob], 'leve-studio.jpg', { type: 'image/jpeg' })
      // Empty string title prevents iOS from sharing text instead of the image
      await navigator.share({ files: [file], title: '' })
      setShareState('success')
      setTimeout(() => setShareState('idle'), 2000)
    } catch (err) {
      if (err instanceof Error && err.name === 'AbortError') {
        setShareState('idle')
        return
      }
      setShareState('error')
      setTimeout(() => setShareState('idle'), 2000)
    }
  }

  async function handleCopyLink() {
    try {
      await navigator.clipboard.writeText(window.location.href)
      setCopyState('success')
      setTimeout(() => setCopyState('idle'), 2000)
    } catch {
      // Silently fail — clipboard permission denied
    }
  }

  function needsCropPicker(): boolean {
    if (selectedPlatform === 'original_hd') return false
    const spec = PLATFORM_SPECS[selectedPlatform]
    // Marketplace exports (Wildberries, Ozon) use contain+pad on the server,
    // so a manual crop wouldn't change the visible composition.
    if (spec.forceWhiteBg) return false
    if (!spec.width || !spec.height) return false
    const targetRatio = spec.width / spec.height
    return Math.abs(targetRatio - sourceAspectRatio) / targetRatio > RATIO_TOLERANCE
  }

  function handleDownload() {
    if (needsCropPicker()) {
      setCropOpen(true)
      return
    }
    void triggerDownload()
  }

  if (!checked) {
    return (
      <div className="flex items-center justify-center h-[100dvh] bg-bg-base">
        <div className="w-8 h-8 rounded-full border-2 border-accent border-t-transparent animate-spin" />
      </div>
    )
  }

  return (
    <div className="bg-bg-base min-h-[100dvh]">
      <main className="page-funnel py-8 pb-12">
        {/* Generated image — sized to the generated image's natural aspect ratio.
            maxWidth pairs with maxHeight so the container doesn't go wider than
            the height budget allows, matching the approach used in the slider. */}
        <div
          className="mx-auto rounded-[16px] overflow-hidden border border-border-default relative bg-bg-elevated"
          style={{
            width: '100%',
            aspectRatio: String(sourceAspectRatio),
            maxHeight: '50vh',
            maxWidth: `calc(50vh * ${sourceAspectRatio})`,
          }}
        >
          {previewUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={previewUrl}
              alt="Your generated image"
              className="absolute inset-0 w-full h-full object-contain"
            />
          ) : previewTimedOut ? (
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 p-4">
              <p className="text-[13px] text-text-muted text-center">
                {t('image_not_loaded')}
              </p>
              <button
                onClick={() => router.push('/history')}
                className="text-[13px] text-accent font-semibold"
              >
                {t('go_to_history')}
              </button>
            </div>
          ) : (
            <div className="absolute inset-0 animate-pulse bg-bg-elevated" />
          )}
          <span className="absolute top-3 right-3 bg-accent text-white text-[11px] font-semibold px-2 py-1 rounded-md">
            HD
          </span>
        </div>

        <div className="mt-6">
          <h1 className="text-[24px] font-display font-semibold text-text-primary">{t('ready')}</h1>
          <p className="text-[14px] text-text-muted mt-1">{t('subtitle')}</p>
        </div>

        {/* Primary download button */}
        <button
          onClick={handleDownload}
          disabled={isDownloading}
          className={cn(
            'btn-primary btn-full h-14 text-[16px] mt-6 gap-2',
            isDownloading && 'opacity-50 cursor-not-allowed',
          )}
        >
          <Download className="w-[18px] h-[18px]" />
          {isDownloading
            ? t('downloading')
            : primaryButtonLabel}
        </button>
        {downloadError && (
          <p className="text-[13px] text-[#DC2626] text-center mt-2">{downloadError}</p>
        )}

        {/* Share (mobile/tablet) or Copy link (desktop) — only when image is ready */}
        {previewUrl && supportsShare && (
          <button
            onClick={() => void handleShare()}
            disabled={shareState === 'loading'}
            className={cn(
              'btn-secondary btn-full h-12 text-[15px] mt-2 gap-2',
              shareState === 'loading' && 'opacity-50 cursor-not-allowed',
            )}
          >
            <Share2 className="w-[18px] h-[18px]" />
            {shareState === 'idle' && t('share_btn')}
            {shareState === 'loading' && t('share_loading')}
            {shareState === 'success' && t('share_success')}
            {shareState === 'error' && t('share_error')}
          </button>
        )}
        {previewUrl && !supportsShare && supportsClipboard && (
          <button
            onClick={() => void handleCopyLink()}
            className="btn-secondary btn-full h-12 text-[15px] mt-2 gap-2"
          >
            <Copy className="w-[18px] h-[18px]" />
            {copyState === 'idle' ? t('copy_link') : t('copied')}
          </button>
        )}

        {/* Platform picker */}
        <div className="mt-8">
          <p className="text-[16px] font-semibold text-text-primary mb-4">{t('choose_platform')}</p>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-2">
            {PLATFORM_ORDER.map((platformId) => {
              const platformSpec = PLATFORM_SPECS[platformId]
              const Icon = PLATFORM_ICONS[platformId]
              const isSelected = selectedPlatform === platformId
              const shortLabel = PLATFORM_SHORT_LABEL[platformId]
              const sizeLabel = platformSpec.width > 0
                ? `${platformSpec.width}×${platformSpec.height}`
                : 'Full res'

              return (
                <button
                  key={platformId}
                  type="button"
                  onClick={() => setSelectedPlatform(platformId)}
                  className={cn(
                    'bg-bg-surface border rounded-[10px] p-3 cursor-pointer',
                    'flex flex-col items-center text-center gap-1 transition-all',
                    isSelected
                      ? 'border-accent bg-accent-subtle'
                      : 'border-border-default hover:border-border-strong'
                  )}
                >
                  <Icon
                    className={cn('w-6 h-6', isSelected ? 'text-accent' : 'text-text-secondary')}
                    strokeWidth={1.5}
                  />
                  <span className="text-[12px] font-semibold text-text-primary leading-tight">
                    {shortLabel ?? platformSpec.label}
                  </span>
                  <span className="text-[10px] text-text-muted leading-tight">{sizeLabel}</span>
                </button>
              )
            })}
          </div>

        </div>

        <button
          onClick={() => router.push('/templates')}
          className="btn-secondary btn-full mt-6"
        >
          {t('generate_another')}
        </button>
        <button
          onClick={() => router.push('/')}
          className="block mx-auto text-[13px] text-text-muted hover:text-text-secondary font-semibold py-3 mt-1"
        >
          {t('upload_new_photo')}
        </button>
      </main>

      {cropOpen && previewUrl && selectedPlatform !== 'original_hd' && (
        <CropSelector
          imageUrl={previewUrl}
          sourceAspectRatio={sourceAspectRatio}
          targetAspectRatio={
            PLATFORM_SPECS[selectedPlatform].width /
            PLATFORM_SPECS[selectedPlatform].height
          }
          targetWidth={PLATFORM_SPECS[selectedPlatform].width}
          targetHeight={PLATFORM_SPECS[selectedPlatform].height}
          platformLabel={PLATFORM_SPECS[selectedPlatform].label}
          isDownloading={isDownloading}
          onCancel={() => setCropOpen(false)}
          onConfirm={(region) => void triggerDownload(region)}
        />
      )}
    </div>
  )
}
