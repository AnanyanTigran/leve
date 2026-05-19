'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useTranslations } from 'next-intl'
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
  const tCommon = useTranslations('common')
  const [phone, setPhone] = useState('')
  const [selectedPlatform, setSelectedPlatform] = useState<ExportPlatform>('original_hd')

  useEffect(() => {
    if (!isVerified()) router.replace('/register')
  }, [router])

  const spec = PLATFORM_SPECS[selectedPlatform]
  const downloadLabel = `${t('download_btn').replace('HD image', spec.label)}`

  const handleDownload = () => {
    const preview = sessionStorage.getItem('leve_upload_preview')
    if (!preview) return
    const a = document.createElement('a')
    a.href = preview
    a.download = `leve-${selectedPlatform}.jpg`
    a.click()
  }

  return (
    <div className="min-h-screen bg-bg-base">
      <main className="page-funnel py-8">
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
        <button onClick={handleDownload} className="btn-primary btn-full h-14 text-[16px] mt-6 gap-2">
          <Download className="w-[18px] h-[18px]" />
          {t('download_btn')}
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

          <button onClick={handleDownload} className="btn-primary btn-full mt-4 gap-2">
            <Download className="w-[18px] h-[18px]" />
            {downloadLabel}
          </button>
        </div>

        <div className="flex items-center gap-3 mt-8 mb-6">
          <hr className="flex-1 border-border-default" />
          <span className="text-[12px] text-text-muted">Optional</span>
          <hr className="flex-1 border-border-default" />
        </div>

        {/* Phone capture card */}
        <div className="bg-bg-surface border border-border-default rounded-[12px] p-5">
          <p className="text-[16px] font-semibold text-text-primary">{t('save_work')}</p>
          <p className="text-[14px] text-text-secondary mt-1">{t('save_subtitle')}</p>

          <div className="mt-4 flex items-center h-12 bg-bg-elevated border border-border-default rounded-[10px] overflow-hidden">
            <span className="px-3 text-[14px] text-text-muted border-r border-border-default h-full flex items-center shrink-0">
              +374
            </span>
            <input
              type="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="77 123 456"
              className="flex-1 px-3 text-[14px] text-text-primary bg-transparent outline-none placeholder:text-text-muted"
            />
          </div>

          <button className="btn-secondary mt-3">{t('send_code')}</button>
          <p className="text-[11px] text-text-muted text-center mt-2">{t('phone_disclaimer')}</p>
        </div>

        <button className="block w-full text-center text-[14px] text-text-muted hover:text-text-secondary mt-4 cursor-pointer transition-colors">
          {tCommon('skip')}
        </button>
        <button
          onClick={() => router.push('/')}
          className="block w-full text-center text-[14px] text-accent font-semibold mt-3 cursor-pointer"
        >
          {t('generate_another')}
        </button>
      </main>
    </div>
  )
}
