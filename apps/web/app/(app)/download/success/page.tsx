'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useTranslations, useLocale } from 'next-intl'
import { Download, Square, Smartphone, Monitor, ShoppingBag, Package, Send, Globe } from 'lucide-react'
import { cn } from '@/lib/utils'
import { isVerified } from '@/lib/session'
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
  const locale = useLocale()
  const [selectedPlatform, setSelectedPlatform] = useState<ExportPlatform>('original_hd')
  const [isDownloading, setIsDownloading] = useState(false)

  useEffect(() => {
    if (!isVerified()) router.replace('/register')
  }, [router])

  const primaryButtonLabel = selectedPlatform === 'original_hd'
    ? t('download_btn')
    : `${t('download_for')} ${PLATFORM_SPECS[selectedPlatform].label}`

  async function handleDownload() {
    const jobId = sessionStorage.getItem('leve_job_id')
    if (!jobId) return

    setIsDownloading(true)

    try {
      let downloadUrl: string

      if (selectedPlatform === 'original_hd') {
        const res = await fetch(
          `/api/download/url?jobId=${jobId}`,
          { credentials: 'include' },
        )
        const data = await res.json()

        if (!res.ok || !data?.data?.url) {
          console.error('download URL fetch failed', data)
          return
        }
        downloadUrl = data.data.url
      } else {
        const res = await fetch('/api/download/export', {
          method: 'POST',
          credentials: 'include',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ jobId, platform: selectedPlatform }),
        })
        const data = await res.json()

        if (!res.ok || !data?.data?.url) {
          console.error('export URL fetch failed', data)
          return
        }
        downloadUrl = data.data.url
      }

      const a = document.createElement('a')
      a.href = downloadUrl
      a.download = `leve-${selectedPlatform}.jpg`
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
    } catch (err) {
      console.error('download failed', err)
    } finally {
      setIsDownloading(false)
    }
  }

  return (
    <div className="flex flex-col h-[100dvh] overflow-hidden bg-bg-base">
      <main className="page-funnel flex-1 overflow-y-auto py-8">
        {/* Generated image placeholder */}
        <div
          className="w-full rounded-[16px] overflow-hidden border border-border-default relative max-h-[50vh] lg:max-h-[480px]"
          style={{ background: 'linear-gradient(135deg, #fdf0eb, #f5d5c5)', minHeight: '240px' }}
        >
          <span className="absolute top-3 right-3 bg-[#D64C1A] text-white text-[11px] font-semibold px-2 py-1 rounded-md">
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
            ? (locale === 'hy' ? 'Ներբեռնվում է...' : locale === 'ru' ? 'Загружается...' : 'Downloading...')
            : primaryButtonLabel}
        </button>

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
          onClick={() => router.push('/')}
          className="btn-secondary btn-full mt-6"
        >
          {t('generate_another')}
        </button>
      </main>
    </div>
  )
}
