'use client'

import { RefreshCw } from 'lucide-react'
import { useTranslations } from 'next-intl'

interface GeneratedImageDisplayProps {
  imageUrl: string | null
  onRegenerate?: () => void
  className?: string
}

export function GeneratedImageDisplay({ imageUrl, onRegenerate, className }: GeneratedImageDisplayProps) {
  const t = useTranslations('results')
  return (
    <div className={className}>
      <div className="flex items-center justify-between mb-2">
        <span className="text-[14px] font-semibold text-text-primary">{t('your_result')}</span>
        <button
          onClick={onRegenerate}
          className="flex items-center gap-1.5 text-text-muted hover:text-text-primary transition-colors"
        >
          <RefreshCw className="w-3.5 h-3.5" />
          <span className="text-[13px]">{t('regenerate')}</span>
        </button>
      </div>
      <div className="relative w-full aspect-square rounded-[12px] overflow-hidden bg-bg-surface">
        {imageUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={imageUrl} alt="" className="absolute inset-0 w-full h-full object-cover" />
        ) : (
          <div className="absolute inset-0 animate-pulse bg-bg-elevated" />
        )}
      </div>
    </div>
  )
}
