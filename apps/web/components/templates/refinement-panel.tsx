'use client'

import { useState } from 'react'
import { useTranslations, useLocale } from 'next-intl'
import { ChevronDown, ChevronUp } from 'lucide-react'
import { cn } from '@/lib/utils'
import {
  LIGHTING_CHIPS,
  ANGLE_CHIPS,
  MOOD_CHIPS,
  CATEGORY_CHIPS,
  ASPECT_RATIO_OPTIONS,
} from '@/lib/constants'
import type { ProductCategory, RefinementChip, AspectRatio } from '@leve/types'

interface RefinementPanelProps {
  category: ProductCategory
  onChipsChange: (chipIds: string[]) => void
  onCustomTextChange: (text: string) => void
  onAspectRatioChange: (ratio: AspectRatio) => void
  selectedAspectRatio: AspectRatio
}

export function RefinementPanel({
  category,
  onChipsChange,
  onCustomTextChange,
  onAspectRatioChange,
  selectedAspectRatio,
}: RefinementPanelProps) {
  const locale = useLocale()
  const t = useTranslations('refinement')
  const [selectedChips, setSelectedChips] = useState<string[]>([])
  const [customText, setCustomText] = useState('')
  const [isExpanded, setIsExpanded] = useState(false)

  const categoryChips = CATEGORY_CHIPS[category] ?? []

  // Chips are grouped — only one per group can be selected at a time
  function toggleChip(chip: RefinementChip) {
    const sameGroup = selectedChips.filter((id) => {
      const all = [...LIGHTING_CHIPS, ...ANGLE_CHIPS, ...MOOD_CHIPS, ...categoryChips]
      const found = all.find((c) => c.id === id)
      return found?.group !== chip.group
    })

    const next = selectedChips.includes(chip.id)
      ? selectedChips.filter((id) => id !== chip.id)
      : [...sameGroup, chip.id]

    setSelectedChips(next)
    onChipsChange(next)
  }

  function getChipLabel(chip: RefinementChip): string {
    if (locale === 'hy') return chip.labelHY
    if (locale === 'ru') return chip.labelRU
    return chip.label
  }

  function getAspectRatioLabel(ratio: typeof ASPECT_RATIO_OPTIONS[0]): string {
    if (locale === 'hy') return ratio.labelHY
    if (locale === 'ru') return ratio.labelRU
    return ratio.label
  }

  const renderChipRow = (chips: RefinementChip[], groupLabel: string) => (
    <div key={groupLabel}>
      <p className="text-[12px] text-text-muted mb-2 font-medium uppercase tracking-wide">
        {groupLabel}
      </p>
      <div className="flex flex-wrap gap-2">
        {chips.map((chip) => {
          const isSelected = selectedChips.includes(chip.id)
          return (
            <button
              key={chip.id}
              type="button"
              onClick={() => toggleChip(chip)}
              className={cn(
                'rounded-full px-3 py-1.5 text-[13px] font-medium border transition-all',
                isSelected
                  ? 'bg-accent border-accent text-white'
                  : 'bg-transparent border-border-default text-text-secondary hover:border-border-strong',
              )}
            >
              {getChipLabel(chip)}
            </button>
          )
        })}
      </div>
    </div>
  )

  return (
    <div className="mt-2">
      {/* Collapsed trigger */}
      <button
        type="button"
        onClick={() => setIsExpanded(!isExpanded)}
        className="flex items-center gap-2 text-[14px] text-text-secondary hover:text-text-primary transition-colors w-full"
      >
        {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
        <span>{t('refine_optional')}</span>
        {selectedChips.length > 0 && (
          <span className="ml-auto text-[12px] text-accent font-medium">
            {selectedChips.length} {t('selected')}
          </span>
        )}
      </button>

      {isExpanded && (
        <div className="mt-4 flex flex-col gap-5">
          {/* Aspect Ratio */}
          <div>
            <p className="text-[12px] text-text-muted mb-2 font-medium uppercase tracking-wide">
              {t('format')}
            </p>
            <div className="flex gap-2 overflow-x-auto pb-1">
              {ASPECT_RATIO_OPTIONS.map((option) => {
                const isSelected = selectedAspectRatio === option.id
                return (
                  <button
                    key={option.id}
                    type="button"
                    onClick={() => onAspectRatioChange(option.id)}
                    className={cn(
                      'flex-shrink-0 rounded-[10px] px-3 py-2 border text-center transition-all min-w-[72px]',
                      isSelected
                        ? 'bg-accent-subtle border-accent'
                        : 'border-border-default hover:border-border-strong',
                    )}
                  >
                    <p className={cn('text-[13px] font-semibold', isSelected ? 'text-accent' : 'text-text-primary')}>
                      {getAspectRatioLabel(option)}
                    </p>
                    <p className="text-[10px] text-text-muted mt-0.5">{option.description}</p>
                  </button>
                )
              })}
            </div>
          </div>

          {/* Lighting */}
          {renderChipRow(LIGHTING_CHIPS, t('lighting'))}

          {/* Angle */}
          {renderChipRow(ANGLE_CHIPS, t('angle'))}

          {/* Mood */}
          {renderChipRow(MOOD_CHIPS, t('mood'))}

          {/* Category-specific */}
          {categoryChips.length > 0 && renderChipRow(categoryChips, t('style'))}

          {/* Custom text */}
          <div>
            <p className="text-[12px] text-text-muted mb-2 font-medium uppercase tracking-wide">
              {t('custom_prompt')}
            </p>
            <textarea
              value={customText}
              onChange={(e) => {
                setCustomText(e.target.value)
                onCustomTextChange(e.target.value)
              }}
              placeholder={t('custom_placeholder')}
              maxLength={300}
              rows={2}
              className="w-full bg-bg-surface border border-border-default rounded-[10px] px-3 py-2.5 text-[14px] text-text-primary placeholder:text-text-muted resize-none focus:outline-none focus:border-accent transition-colors"
            />
            <p className="text-[11px] text-text-muted mt-1">
              {t('custom_hint')}
            </p>
          </div>
        </div>
      )}
    </div>
  )
}
