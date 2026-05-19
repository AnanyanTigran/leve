'use client'

import { useState } from 'react'
import { useTranslations } from 'next-intl'
import { ChevronDown, ChevronUp, Globe2 } from 'lucide-react'
import { cn } from '@/lib/utils'
import { CATEGORY_CONFIG } from '@/lib/constants'
import type { ProductCategory } from '@leve/types'

interface RefinementChip {
  id: string
  label: string
  prompt: string
}

interface RefinementPanelProps {
  category: ProductCategory
  onChipsChange: (chipIds: string[]) => void
  onCustomTextChange: (text: string) => void
}

export function RefinementPanel({ category, onChipsChange, onCustomTextChange }: RefinementPanelProps) {
  const t = useTranslations('templates')
  const [selectedChips, setSelectedChips] = useState<string[]>([])
  const [customExpanded, setCustomExpanded] = useState(false)
  const [customText, setCustomText] = useState('')

  const config = CATEGORY_CONFIG[category] ?? CATEGORY_CONFIG.custom
  const chips: RefinementChip[] = [...config.refinementChips]

  function toggleChip(id: string) {
    const next = selectedChips.includes(id)
      ? selectedChips.filter((c) => c !== id)
      : [...selectedChips, id]
    setSelectedChips(next)
    onChipsChange(next)
  }

  function handleCustomText(value: string) {
    setCustomText(value)
    onCustomTextChange(value)
  }

  return (
    <div className="mt-4 flex flex-col gap-4">
      <div>
        <p className="text-[14px] font-semibold text-text-primary mb-3">{t('customize')}</p>
        <div className="flex flex-wrap gap-2">
          {chips.map((chip) => {
            const isSelected = selectedChips.includes(chip.id)
            return (
              <button
                key={chip.id}
                type="button"
                onClick={() => toggleChip(chip.id)}
                className={cn(
                  'rounded-full px-4 py-2 text-[13px] font-medium border transition-colors',
                  isSelected
                    ? 'bg-accent text-white border-accent'
                    : 'bg-bg-elevated border-border-default text-text-primary hover:border-border-strong'
                )}
              >
                {chip.label}
              </button>
            )
          })}
        </div>
      </div>

      <div className="border border-border-default rounded-[10px] overflow-hidden">
        <button
          type="button"
          onClick={() => setCustomExpanded((v) => !v)}
          className="w-full flex items-center px-4 py-3 bg-bg-surface hover:bg-bg-elevated transition-colors"
        >
          <span className="text-[14px] font-semibold text-text-primary">{t('custom_details')}</span>
          <span className="ml-2 bg-bg-elevated text-text-muted text-[11px] px-2 py-0.5 rounded-full">
            {t('optional')}
          </span>
          <span className="ml-auto text-text-muted">
            {customExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </span>
        </button>

        {customExpanded && (
          <div className="px-4 pb-4 pt-3 bg-bg-surface">
            <textarea
              value={customText}
              onChange={(e) => handleCustomText(e.target.value)}
              maxLength={200}
              placeholder={t('custom_placeholder')}
              className="w-full bg-bg-elevated border border-border-default rounded-[10px] p-3 text-[13px] text-text-primary placeholder:text-text-muted resize-none h-20 outline-none focus:border-accent transition-colors"
            />
            <div className="flex items-center justify-between mt-1">
              <span className="flex items-center gap-1 text-[11px] text-text-muted">
                <Globe2 className="w-3 h-3" />
                {t('translate_note')}
              </span>
              <span className="text-[11px] text-text-muted">{customText.length}/200</span>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
