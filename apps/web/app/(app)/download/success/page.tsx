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
import { FullscreenImage } from '@/components/shared/fullscreen-image'

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
  // 'idle' = not downloading; 'preparing' = first moments of the HD upscale;
  // 'almost' = upscale taking a beat or the server reported hd_not_ready.
  const [downloadPhase, setDownloadPhase] = useState<'idle' | 'preparing' | 'almost'>('idle')
  const isDownloading = downloadPhase !== 'idle'
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
      if ('share' in navigator) {
        const testFile = new File([''], 'test.jpg', { type: 'image/jpeg' })
        if ('canShare' in navigator && navigator.canShare) {
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

    setDownloadPhase('preparing')
    setDownloadError(null)

    // If the ESRGAN upscale is slow (cold cache), reassure the user after a
    // few seconds. A Redis-cached hit returns well before this fires.
    const almostTimer = setTimeout(() => {
      setDownloadPhase((p) => (p === 'preparing' ? 'almost' : p))
    }, 6000)

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

    let blobUrl: string | null = null
    try {
      // The server upscales synchronously and streams the file back. If the HD
      // source isn't ready yet it returns 202 hd_not_ready with retryAfterSeconds —
      // keep showing the preparing state and poll politely, with a hard cap so we
      // never spin forever.
      const MAX_ATTEMPTS = 12
      let res: Response | null = null
      for (let attempt = 0; attempt < MAX_ATTEMPTS; attempt++) {
        res = await apiFetch(endpointPath)
        if (res.status !== 202) break

        setDownloadPhase('almost')
        const body = (await res.json().catch(() => null)) as
          | { data?: { retryAfterSeconds?: number } }
          | null
        const retryAfter = body?.data?.retryAfterSeconds ?? 5
        await new Promise((resolve) => setTimeout(resolve, retryAfter * 1000))
      }

      if (!res || !res.ok) {
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
      clearTimeout(almostTimer)
      if (blobUrl) URL.revokeObjectURL(blobUrl)
      setDownloadPhase('idle')
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
    // TODO: [UX] this copies the /download/success page URL, which is gated
    // behind the recipient's own session — copy a shareable image URL instead.
    try {
      await navigator.clipboard.writeText(window.location.href)
      setCopyState('success')
      setTimeout(() => setCopyState('idle'), 2000)
    } catch {
      // Silently fail — clipboard permission denied
    }
  }

  function needsCropPicker(): boolean {
    // Original HD downloads the file untouched — no ratio, no crop.
    if (selectedPlatform === 'original_hd') return false
    const spec = PLATFORM_SPECS[selectedPlatform]
    if (!spec.width || !spec.height) return false
    // Any platform whose target ratio differs from the image's native ratio
    // would be center-cropped by the server. Let the user place that crop
    // themselves instead — marketplace platforms (Wildberries/Ozon) included,
    // since they now crop-to-fill like the rest rather than padding.
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
        {/* Whole-image trigger (no drag gestures here); expand icon sits
            top-left so it clears the HD badge in the top-right. */}
        <FullscreenImage
          src={previewUrl}
          expandTrigger="area"
          iconPosition="top-left"
          className="mx-auto rounded-[16px] overflow-hidden border border-border-default bg-bg-elevated"
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
          <span className="absolute top-3 right-3 z-30 bg-accent text-white text-[11px] font-semibold px-2 py-1 rounded-md">
            HD
          </span>
        </FullscreenImage>

        <div className="mt-6">
          <h1 className="text-[24px] font-display font-semibold text-text-primary">{t('ready')}</h1>
          <p className="text-[14px] text-text-muted mt-1">{t('subtitle')}</p>
        </div>

        {/* Primary download button */}
        <div className="md:max-w-[320px] md:mx-auto mt-6">
          <button
            onClick={handleDownload}
            disabled={isDownloading}
            className={cn(
              'btn-primary btn-full h-14 text-[16px] gap-2',
              isDownloading && 'opacity-70 cursor-not-allowed',
            )}
          >
            {isDownloading ? (
              <span className="w-[18px] h-[18px] rounded-full border-2 border-white border-t-transparent animate-spin motion-reduce:animate-none" />
            ) : (
              <Download className="w-[18px] h-[18px]" />
            )}
            {isDownloading ? t('preparing_hd') : primaryButtonLabel}
          </button>
        </div>

        {/* Indeterminate "Preparing HD" state — shown while the upscale runs. */}
        {isDownloading && (
          <div className="md:max-w-[320px] md:mx-auto mt-3" role="status" aria-live="polite">
            <p className="text-[13px] text-text-secondary text-center mb-2">
              {downloadPhase === 'almost' ? t('preparing_almost') : t('preparing_hd_message')}
            </p>
            <div className="h-1 w-full overflow-hidden rounded-full bg-bg-elevated">
              <div className="hd-prep-bar h-full w-1/3 rounded-full bg-accent" />
            </div>
          </div>
        )}

        {downloadError && !isDownloading && (
          <div className="md:max-w-[320px] md:mx-auto mt-2 text-center">
            <p className="text-[13px] text-error">{downloadError}</p>
            <button
              onClick={handleDownload}
              className="text-[13px] text-accent font-semibold mt-1"
            >
              {t('retry')}
            </button>
          </div>
        )}

        {/* Share (mobile/tablet) or Copy link (desktop) — only when image is ready */}
        {previewUrl && supportsShare && (
          <div className="md:max-w-[320px] md:mx-auto mt-2">
            <button
              onClick={() => void handleShare()}
              disabled={shareState === 'loading'}
              className={cn(
                'btn-secondary btn-full h-12 text-[15px] gap-2',
                shareState === 'loading' && 'opacity-50 cursor-not-allowed',
              )}
            >
              <Share2 className="w-[18px] h-[18px]" />
              {shareState === 'idle' && t('share_btn')}
              {shareState === 'loading' && t('share_loading')}
              {shareState === 'success' && t('share_success')}
              {shareState === 'error' && t('share_error')}
            </button>
          </div>
        )}
        {previewUrl && !supportsShare && supportsClipboard && (
          <div className="md:max-w-[320px] md:mx-auto mt-2">
            <button
              onClick={() => void handleCopyLink()}
              className="btn-secondary btn-full h-12 text-[15px] gap-2"
            >
              <Copy className="w-[18px] h-[18px]" />
              {copyState === 'idle' ? t('copy_link') : t('copied')}
            </button>
          </div>
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

        <div className="md:max-w-[320px] md:mx-auto mt-6">
          <button
            onClick={() => router.push('/templates')}
            className="btn-secondary btn-full"
          >
            {t('generate_another')}
          </button>
        </div>
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
