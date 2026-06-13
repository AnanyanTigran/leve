'use client'

import { useEffect, useRef } from 'react'
import { useTranslations } from 'next-intl'
import { X } from 'lucide-react'
import { BADGE_PRESET_ORDER, type BadgePresetId } from '@leve/types'
import { cn } from '@/lib/utils'
import { BadgeOverlay } from './badge-overlay'

/** Active badges keyed by preset — presence means selected; value is its text. */
export type BadgeSelection = Partial<Record<BadgePresetId, string>>

interface Props {
  value: BadgeSelection
  onChange: (next: BadgeSelection) => void
  /** Pre-fills the brand stamp so the seller doesn't retype their store name. */
  brandName?: string | null
  className?: string
}

/**
 * The download "finishing touch": a small set of pre-designed labels the seller
 * can stamp onto their image before downloading. They pick the looks (each card
 * is a live sample of the real badge) and type the words — nothing else. Several
 * can be added at once (e.g. price + sale); each preset owns a fixed corner so
 * they never collide. Fully optional; downloading without a badge stays the
 * primary action one row below.
 */
export function BadgeFinisher({ value, onChange, brandName, className }: Props) {
  const t = useTranslations('download')
  // Which preset's input to focus next (the one just toggled on).
  const focusRef = useRef<BadgePresetId | null>(null)
  const inputRefs = useRef<Partial<Record<BadgePresetId, HTMLInputElement | null>>>({})

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
    brand: brandName?.trim() || t('badge_sample_brand'),
  }

  // Focus the value field of a preset the moment it's turned on — the only thing
  // left for the seller to do is type.
  useEffect(() => {
    if (focusRef.current) {
      inputRefs.current[focusRef.current]?.focus()
      focusRef.current = null
    }
  })

  function togglePreset(id: BadgePresetId) {
    const next = { ...value }
    if (id in next) {
      delete next[id]
    } else {
      next[id] = id === 'brand' && brandName?.trim() ? brandName.trim() : ''
      focusRef.current = id
    }
    onChange(next)
  }

  function setText(id: BadgePresetId, text: string) {
    onChange({ ...value, [id]: text })
  }

  function removePreset(id: BadgePresetId) {
    const next = { ...value }
    delete next[id]
    onChange(next)
  }

  const activePresets = BADGE_PRESET_ORDER.filter((id) => id in value)

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
          const selected = id in value
          return (
            <button
              key={id}
              type="button"
              onClick={() => togglePreset(id)}
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

      {activePresets.length > 0 && (
        <div className="mt-4 flex flex-col gap-3">
          {activePresets.map((id) => (
            <div key={id} className="flex flex-col gap-1.5">
              <span className="text-[12px] font-semibold text-text-secondary">{LABELS[id]}</span>
              <div className="flex items-center gap-2">
                <input
                  ref={(el) => { inputRefs.current[id] = el }}
                  type="text"
                  value={value[id] ?? ''}
                  onChange={(e) => setText(id, e.target.value)}
                  placeholder={PLACEHOLDERS[id]}
                  maxLength={40}
                  inputMode={id === 'price' ? 'numeric' : 'text'}
                  className="h-12 flex-1 rounded-[10px] border border-border-default bg-bg-elevated px-3.5 text-[16px] text-text-primary outline-none transition-colors placeholder:text-text-muted focus:border-accent"
                />
                <button
                  type="button"
                  onClick={() => removePreset(id)}
                  aria-label={`${t('badge_remove')} — ${LABELS[id]}`}
                  className="flex h-12 w-12 shrink-0 items-center justify-center rounded-[10px] border border-border-default text-text-muted transition-colors hover:border-border-hover hover:text-text-secondary"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </section>
  )
}
