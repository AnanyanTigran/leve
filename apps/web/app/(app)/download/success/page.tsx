'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useTranslations } from 'next-intl'
import { Download, Square, Smartphone, Monitor, ShoppingBag, Package, Send, Globe } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useVerifiedGuard } from '@/hooks/use-verified-guard'
import { PLATFORM_SPECS } from '@leve/types'
import type { ExportPlatform } from '@leve/types'
import type { LucideIcon } from 'lucide-react'

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

export default function DownloadSuccessPage() {
  const router = useRouter()
  const t = useTranslations('download')
  const [selectedPlatform, setSelectedPlatform] = useState<ExportPlatform>('original_hd')
  const [isDownloading, setIsDownloading] = useState(false)
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)
  const [previewTimedOut, setPreviewTimedOut] = useState(false)
  const [downloadError, setDownloadError] = useState<string | null>(null)
  const { checked, isVerified } = useVerifiedGuard()

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

    fetch(`/api/download/preview-url?jobId=${jobId}`, { credentials: 'include' })
      .then((r) => r.json())
      .then((data) => {
        if (data?.data?.previewUrls?.[0]) {
          setPreviewUrl(data.data.previewUrls[0])
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

  const primaryButtonLabel = selectedPlatform === 'original_hd'
    ? t('download_btn')
    : `${t('download_for')} ${PLATFORM_SPECS[selectedPlatform].label}`

  async function handleDownload() {
    const jobId = sessionStorage.getItem('leve_job_id')
    if (!jobId) return

    setIsDownloading(true)
    setDownloadError(null)

    let blobUrl: string | null = null
    try {
      const endpoint = selectedPlatform === 'original_hd'
        ? `/api/download/file?jobId=${encodeURIComponent(jobId)}`
        : `/api/download/export-file?jobId=${encodeURIComponent(jobId)}&platform=${encodeURIComponent(selectedPlatform)}`

      const res = await fetch(endpoint, { credentials: 'include' })

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
    } catch {
      setDownloadError(t('download_failed'))
    } finally {
      if (blobUrl) URL.revokeObjectURL(blobUrl)
      setIsDownloading(false)
    }
  }

  if (!checked) {
    return (
      <div className="flex items-center justify-center h-[100dvh] bg-bg-base">
        <div className="w-8 h-8 rounded-full border-2 border-accent border-t-transparent animate-spin" />
      </div>
    )
  }

  return (
    <div className="flex flex-col h-[100dvh] overflow-hidden bg-bg-base">
      <main className="page-funnel flex-1 overflow-y-auto py-8">
        {/* Generated image */}
        <div
          className="w-full rounded-[16px] overflow-hidden border border-border-default relative bg-bg-elevated"
          style={{ minHeight: '240px', maxHeight: '50vh' }}
        >
          {previewUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={previewUrl}
              alt="Your generated image"
              className="w-full h-full object-contain"
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
    </div>
  )
}
