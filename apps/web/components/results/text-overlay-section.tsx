'use client'

import { useTranslations } from 'next-intl'
import { cn } from '@/lib/utils'

export type OverlayTemplateId = 'price' | 'sale' | 'new-in' | 'custom'
export type OverlayPosition = 'top' | 'center' | 'bottom'

export interface OverlayState {
  template: OverlayTemplateId | null
  text: string
  position: OverlayPosition
}

const OVERLAY_PLACEHOLDERS: Record<OverlayTemplateId, string> = {
  'price': '15,000 ֏',
  'sale': 'SALE 30%',
  'new-in': 'NEW ARRIVAL',
  'custom': '...',
}

interface Props {
  state: OverlayState
  onChange: (next: OverlayState) => void
  className?: string
}

export function TextOverlaySection({ state, onChange, className }: Props) {
  const t = useTranslations('results')

  const OVERLAY_OPTIONS: { id: OverlayTemplateId; label: string }[] = [
    { id: 'price', label: t('overlay_price') },
    { id: 'sale', label: t('overlay_sale') },
    { id: 'new-in', label: t('overlay_new') },
    { id: 'custom', label: t('overlay_custom') },
  ]

  const POSITION_OPTIONS: { id: OverlayPosition; label: string }[] = [
    { id: 'top', label: t('overlay_position_top') },
    { id: 'center', label: t('overlay_position_center') },
    { id: 'bottom', label: t('overlay_position_bottom') },
  ]

  function handleTemplateClick(id: OverlayTemplateId) {
    if (state.template === id) {
      // Toggle off — clear the overlay
      onChange({ template: null, text: '', position: state.position })
      return
    }
    onChange({ template: id, text: '', position: state.position })
  }

  function handleTextChange(text: string) {
    onChange({ ...state, text })
  }

  function handlePositionChange(position: OverlayPosition) {
    onChange({ ...state, position })
  }

  return (
    <div className={className}>
      <span className="text-[14px] font-semibold text-text-primary">{t('add_overlay')}</span>

      <div className="mt-2 flex flex-col gap-3">
        <div className="flex flex-wrap gap-2">
          {OVERLAY_OPTIONS.map((opt) => (
            <button
              key={opt.id}
              type="button"
              onClick={() => handleTemplateClick(opt.id)}
              className={cn(
                'px-4 py-2 rounded-full text-[13px] font-medium transition-colors',
                state.template === opt.id
                  ? 'bg-[#D64C1A] text-white'
                  : 'bg-bg-elevated border border-border-default text-text-primary'
              )}
            >
              {opt.label}
            </button>
          ))}
        </div>

        {state.template && (
          <>
            <input
              type="text"
              value={state.text}
              onChange={(e) => handleTextChange(e.target.value)}
              placeholder={OVERLAY_PLACEHOLDERS[state.template]}
              maxLength={80}
              className="w-full h-11 px-3 bg-bg-elevated border border-border-default rounded-md text-[16px] text-text-primary placeholder:text-text-muted outline-none focus:border-accent transition-colors"
            />
            <div className="flex gap-2">
              {POSITION_OPTIONS.map((opt) => (
                <button
                  key={opt.id}
                  type="button"
                  onClick={() => handlePositionChange(opt.id)}
                  className={cn(
                    'flex-1 px-3 py-2 rounded-[10px] text-[12px] font-medium border transition-colors',
                    state.position === opt.id
                      ? 'border-accent text-accent bg-accent-subtle'
                      : 'border-border-default text-text-secondary'
                  )}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  )
}
