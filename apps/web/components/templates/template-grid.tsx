'use client'

import { useState, useCallback, useMemo, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useTranslations } from 'next-intl'
import { CheckCircle } from 'lucide-react'
import { RefinementPanel } from './refinement-panel'
import type { ProductCategory, AspectRatio } from '@leve/types'

const TEMPLATES = [
  { id: 'luxury-cosmetics', nameKey: 'luxury_cosmetics', category: 'beauty', gradient: 'linear-gradient(135deg, #fdf0eb, #f0d4c4)' },
  { id: 'beauty-clinic', nameKey: 'beauty_clinic', category: 'beauty', gradient: 'linear-gradient(135deg, #f0f7ff, #dbeafe)' },
  { id: 'lifestyle-glow', nameKey: 'lifestyle_glow', category: 'beauty', gradient: 'linear-gradient(135deg, #fef9c3, #fde68a)' },
  { id: 'fashion-story', nameKey: 'fashion_story', category: 'retail', gradient: 'linear-gradient(135deg, #f1f0ef, #dddad6)' },
  { id: 'jewelry-luxury', nameKey: 'jewelry_luxury', category: 'retail', gradient: 'linear-gradient(135deg, #1c1c1e, #2d2d30)' },
  { id: 'perfume-studio', nameKey: 'perfume_studio', category: 'retail', gradient: 'linear-gradient(135deg, #e8e4f0, #d4cce8)' },
  { id: 'wildberries-standard', nameKey: 'wildberries_standard', category: 'marketplace', gradient: 'linear-gradient(135deg, #ffffff, #f5f5f5)' },
  { id: 'ozon-clean', nameKey: 'ozon_clean', category: 'marketplace', gradient: 'linear-gradient(135deg, #f0f4ff, #e0e8ff)' },
  { id: 'marketplace-hero', nameKey: 'marketplace_hero', category: 'marketplace', gradient: 'linear-gradient(135deg, #f8f8f8, #eeeeee)' },
  { id: 'sale-promo', nameKey: 'sale_promo', category: 'marketplace', gradient: 'linear-gradient(135deg, #fff0f0, #ffd6d6)' },
]

const CATEGORY_TO_TAB: Record<string, string> = {
  beauty_cosmetics: 'beauty',
  jewelry_accessories: 'retail',
  fashion_clothing: 'retail',
  food_cafe: 'beauty',
  marketplace_export: 'marketplace',
  custom: 'all',
}

const TAB_IDS = ['all', 'beauty', 'retail', 'marketplace'] as const
type TabId = typeof TAB_IDS[number]

function buildTabOrder(): TabId[] {
  return [...TAB_IDS] // always keep original order: all, beauty, retail, marketplace
}

export function TemplateGrid() {
  const router = useRouter()
  const t = useTranslations('templates')
  const tCommon = useTranslations('common')
  const [selectedCategory, setSelectedCategory] = useState<ProductCategory | null>(null)
  const [activeTab, setActiveTab] = useState<TabId>('all')
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [selectedChips, setSelectedChips] = useState<string[]>([])
  const [customText, setCustomText] = useState('')
  const [selectedAspectRatio, setSelectedAspectRatio] = useState<AspectRatio>('1:1')

  useEffect(() => {
    const cat = sessionStorage.getItem('leve_category') as ProductCategory | null
    if (cat) {
      setSelectedCategory(cat)
      const tab = (CATEGORY_TO_TAB[cat] ?? 'all') as TabId
      setActiveTab(tab)
    }
  }, [router])

  const tabOrder = useMemo(() => buildTabOrder(), [])

  const TAB_LABELS: Record<TabId, string> = {
    all: t('tab_all'),
    beauty: t('tab_beauty'),
    retail: t('tab_retail'),
    marketplace: t('tab_marketplace'),
  }

  const filteredTemplates = useMemo(() => {
    if (activeTab === 'all') return TEMPLATES
    return TEMPLATES.filter((tmpl) => tmpl.category === activeTab)
  }, [activeTab])

  const handleContinue = useCallback(() => {
    if (!selectedId) return
    sessionStorage.setItem('leve_template_id', selectedId)
    sessionStorage.setItem('leve_chips', JSON.stringify(selectedChips))
    if (customText) sessionStorage.setItem('leve_custom_text', customText)
    router.push('/processing')
  }, [selectedId, selectedChips, customText, router])

  return (
    <div className="flex flex-col flex-1 min-h-0">
      {/* Tab bar */}
      <div className="sticky top-[52px] z-10 bg-bg-base border-b border-border-default px-4">
        <div className="page-content flex gap-6">
          {tabOrder.map((tabId) => (
            <button
              key={tabId}
              type="button"
              onClick={() => setActiveTab(tabId)}
              className={`
                relative pb-3 pt-2 text-[14px] font-medium transition-colors
                ${activeTab === tabId ? 'text-text-primary' : 'text-text-muted hover:text-text-secondary'}
              `}
            >
              {TAB_LABELS[tabId]}
              <span
                className={`
                  absolute bottom-0 left-0 right-0 h-0.5 bg-accent rounded-full
                  transition-transform duration-150 origin-bottom
                  ${activeTab === tabId ? 'scale-y-100' : 'scale-y-0'}
                `}
              />
            </button>
          ))}
        </div>
      </div>

      {/* Template grid */}
      <main className="page-content flex-1 overflow-y-auto flex flex-col pt-4 pb-32">
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 w-full">
          {filteredTemplates.map((template) => {
            const isSelected = selectedId === template.id
            return (
              <button
                key={template.id}
                type="button"
                onClick={() => setSelectedId(template.id)}
                className={`
                  relative aspect-square rounded-[10px] overflow-hidden border cursor-pointer
                  transition-all duration-150 ease-out
                  ${isSelected
                    ? 'ring-2 ring-accent ring-inset border-transparent'
                    : 'border-border-default hover:scale-[1.02] hover:shadow-sm'
                  }
                `}
                style={{ background: template.gradient }}
              >
                {isSelected && (
                  <div className="absolute top-2 right-2 w-5 h-5 rounded-full bg-accent flex items-center justify-center">
                    <CheckCircle className="w-4 h-4 text-white" />
                  </div>
                )}
                <div className="absolute bottom-0 left-0 right-0 p-3 bg-gradient-to-t from-black/70 to-transparent min-h-[72px] flex flex-col justify-end">
                  <span className="text-[10px] text-white/70 uppercase tracking-wide leading-none mb-1">
                    {template.category}
                  </span>
                  <span className="text-[13px] text-white font-semibold leading-tight">
                    {t(`names.${template.nameKey}`)}
                  </span>
                </div>
              </button>
            )
          })}
        </div>

        {selectedId && selectedCategory && (
          <RefinementPanel
            category={selectedCategory}
            onChipsChange={setSelectedChips}
            onCustomTextChange={setCustomText}
            onAspectRatioChange={setSelectedAspectRatio}
            selectedAspectRatio={selectedAspectRatio}
          />
        )}
        {selectedId && !selectedCategory && (
          <RefinementPanel
            category="custom"
            onChipsChange={setSelectedChips}
            onCustomTextChange={setCustomText}
            onAspectRatioChange={setSelectedAspectRatio}
            selectedAspectRatio={selectedAspectRatio}
          />
        )}
      </main>

      {/* Sticky bottom CTA */}
      <div className="sticky bottom-0 bg-bg-base border-t border-border-default py-3">
        <div className="page-content">
          <button
            type="button"
            onClick={handleContinue}
            disabled={!selectedId}
            className="btn-primary btn-full"
          >
            {tCommon('continue')}
          </button>
        </div>
      </div>
    </div>
  )
}
