'use client'

import { useEffect, useRef } from 'react'
import { useTranslations } from 'next-intl'
import { BADGE_PRESET_ORDER, type BadgePresetId } from '@leve/types'
import { cn } from '@/lib/utils'
import { BadgeOverlay } from './badge-overlay'

export interface BadgeState {
  preset: BadgePresetId | null
  text: string
}

interface Props {
  value: BadgeState
  onChange: (next: BadgeState) => void
  /** Pre-fills the brand stamp so the seller doesn't retype their store name. */
  brandName?: string | null
  className?: string
}

/**
 * The download "finishing touch": a small set of pre-designed labels the seller
 * can stamp onto their image before downloading. They pick a look (each card is
 * a live sample of the real badge) and type the words — nothing else. Fully
 * optional; downloading without a badge stays the primary action one row below.
 */
export function BadgeFinisher({ value, onChange, brandName, className }: Props) {
  const t = useTranslations('download')
  const inputRef = useRef<HTMLInputElement>(null)

  const LABELS: Record<BadgePresetId, string> = {
    price: t('badge_label_price'),
    sale: t('badge_label_sale'),
    new: t('badge_label_new'),
    brand: t('badge_label_brand'),
  }
  const PLACEHOLDERS: Record<BadgePresetId, string> = {
    price: t('badge_ph_price'),
    sale: t('badge_ph_sale'),
    new: t('badge_ph_new'),
    brand: t('badge_ph_brand'),
  }
  const SAMPLES: Record<BadgePresetId, string> = {
    price: t('badge_sample_price'),
    sale: t('badge_sample_sale'),
    new: t('badge_sample_new'),
    brand: (brandName?.trim() || t('badge_sample_brand')),
  }

  // Focus the value field the moment a preset is chosen — the only thing left
  // for the seller to do is type.
  useEffect(() => {
    if (value.preset) inputRef.current?.focus()
  }, [value.preset])

  function selectPreset(id: BadgePresetId) {
    if (value.preset === id) {
      onChange({ preset: null, text: '' })
      return
    }
    const seed = id === 'brand' && brandName?.trim() ? brandName.trim() : ''
    onChange({ preset: id, text: seed })
  }

  return (
    <section className={cn('rounded-[16px] border border-border-default bg-bg-surface p-4', className)}>
      <div className="flex items-center justify-between">
        <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-accent">
          {t('badge_eyebrow')}
        </p>
        <span className="text-[11px] font-medium text-text-muted">{t('badge_optional')}</span>
      </div>
      <p className="mt-1.5 text-[14px] text-text-secondary">{t('badge_hint')}</p>

      <div className="mt-4 grid grid-cols-2 gap-2.5 sm:grid-cols-4">
        {BADGE_PRESET_ORDER.map((id) => {
          const selected = value.preset === id
          return (
            <button
              key={id}
              type="button"
              onClick={() => selectPreset(id)}
              aria-pressed={selected}
              className={cn(
                'group flex flex-col gap-2 rounded-[12px] p-2 text-left transition-colors',
                selected
                  ? 'bg-accent-subtle ring-2 ring-accent'
                  : 'bg-bg-elevated ring-1 ring-border-default hover:ring-border-hover',
              )}
            >
              {/* Live sample of the real badge on a neutral tile — communicates
                  the pre-decided look + placement without an editor. */}
              <span
                className="relative block w-full overflow-hidden rounded-[8px]"
                style={{ aspectRatio: '4 / 3', containerType: 'inline-size', backgroundColor: '#5A5A5A' }}
              >
                <BadgeOverlay preset={id} text={SAMPLES[id]} />
              </span>
              <span
                className={cn(
                  'text-center text-[12px] font-semibold',
                  selected ? 'text-accent' : 'text-text-primary',
                )}
              >
                {LABELS[id]}
              </span>
            </button>
          )
        })}
      </div>

      {value.preset && (
        <div className="mt-4 flex flex-col gap-2">
          <input
            ref={inputRef}
            type="text"
            value={value.text}
            onChange={(e) => onChange({ preset: value.preset, text: e.target.value })}
            placeholder={PLACEHOLDERS[value.preset]}
            maxLength={40}
            inputMode={value.preset === 'price' ? 'numeric' : 'text'}
            className="h-12 w-full rounded-[10px] border border-border-default bg-bg-elevated px-3.5 text-[16px] text-text-primary outline-none transition-colors placeholder:text-text-muted focus:border-accent"
          />
          <button
            type="button"
            onClick={() => onChange({ preset: null, text: '' })}
            className="self-start text-[13px] font-semibold text-text-muted hover:text-text-secondary"
          >
            {t('badge_remove')}
          </button>
        </div>
      )}
    </section>
  )
}
