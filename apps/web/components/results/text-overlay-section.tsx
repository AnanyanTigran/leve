'use client'

import { useState } from 'react'
import { useTranslations } from 'next-intl'
import { cn } from '@/lib/utils'

type OverlayId = 'price' | 'sale' | 'new-in' | 'custom'

const OVERLAY_PLACEHOLDERS: Record<OverlayId, string> = {
  'price': '15,000 ֏',
  'sale': 'SALE 30%',
  'new-in': 'NEW ARRIVAL',
  'custom': '...',
}

export function TextOverlaySection({ className }: { className?: string }) {
  const t = useTranslations('results')
  const [selectedOverlay, setSelectedOverlay] = useState<OverlayId | null>(null)
  const [overlayText, setOverlayText] = useState('')

  const OVERLAY_OPTIONS: { id: OverlayId; label: string }[] = [
    { id: 'price', label: t('overlay_price') },
    { id: 'sale', label: t('overlay_sale') },
    { id: 'new-in', label: t('overlay_new') },
    { id: 'custom', label: t('overlay_custom') },
  ]

  const currentPlaceholder = selectedOverlay ? OVERLAY_PLACEHOLDERS[selectedOverlay] : ''

  return (
    <div className={className}>
      <span className="text-[14px] font-semibold text-text-primary">{t('add_overlay')}</span>

      <div className="mt-2 flex flex-col gap-3">
        <div className="flex flex-wrap gap-2">
          {OVERLAY_OPTIONS.map((opt) => (
            <button
              key={opt.id}
              onClick={() => {
                setSelectedOverlay(selectedOverlay === opt.id ? null : opt.id)
                setOverlayText('')
              }}
              className={cn(
                'px-4 py-2 rounded-full text-[13px] font-medium transition-colors',
                selectedOverlay === opt.id
                  ? 'bg-[#D64C1A] text-white'
                  : 'bg-bg-elevated border border-border-default text-text-primary'
              )}
            >
              {opt.label}
            </button>
          ))}
        </div>

        {selectedOverlay && (
          <input
            type="text"
            value={overlayText}
            onChange={(e) => setOverlayText(e.target.value)}
            placeholder={currentPlaceholder}
            className="w-full h-11 px-3 bg-bg-elevated border border-border-default rounded-md text-[14px] text-text-primary placeholder:text-text-muted outline-none focus:border-accent transition-colors"
          />
        )}
      </div>
    </div>
  )
}
