'use client'

import { useState } from 'react'
import { cn } from '@/lib/utils'

const OVERLAY_OPTIONS = [
  { id: 'price', label: 'Price', placeholder: '15,000 ֏' },
  { id: 'sale', label: 'Sale', placeholder: 'SALE 30%' },
  { id: 'new-in', label: 'New in', placeholder: 'NEW ARRIVAL' },
  { id: 'custom', label: 'Custom', placeholder: 'Enter text...' },
] as const

type OverlayId = typeof OVERLAY_OPTIONS[number]['id']

const LANGUAGES = [
  { id: 'hy', label: 'ՀԱՅ' },
  { id: 'ru', label: 'РУС' },
  { id: 'en', label: 'ENG' },
] as const

type LangId = typeof LANGUAGES[number]['id']

export function TextOverlaySection({ className }: { className?: string }) {
  const [selectedOverlay, setSelectedOverlay] = useState<OverlayId | null>(null)
  const [overlayText, setOverlayText] = useState('')
  const [language, setLanguage] = useState<LangId>('hy')

  const currentPlaceholder = OVERLAY_OPTIONS.find((o) => o.id === selectedOverlay)?.placeholder ?? ''

  return (
    <div className={className}>
      <span className="text-[14px] font-semibold text-text-primary">Add text overlay</span>

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

        <div className="flex items-center gap-3">
          <span className="text-[12px] text-text-muted">Language:</span>
          <div className="flex gap-2">
            {LANGUAGES.map(({ id, label }) => (
              <button
                key={id}
                onClick={() => setLanguage(id)}
                className={cn(
                  'px-3 py-1.5 rounded-full text-[13px] font-medium transition-colors',
                  language === id
                    ? 'bg-[#D64C1A] text-white'
                    : 'bg-bg-elevated border border-border-default text-text-primary'
                )}
              >
                {label}
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
