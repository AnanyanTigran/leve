'use client'

import { useState, useCallback, useMemo, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { CheckCircle } from 'lucide-react'
import { RefinementPanel } from './refinement-panel'
import { isVerified } from '@/lib/session'
import type { ProductCategory } from '@leve/types'

const TEMPLATES = [
  { id: 'luxury-cosmetics', name: 'Luxury Cosmetics', category: 'beauty', gradient: 'linear-gradient(135deg, #fdf0eb, #f0d4c4)' },
  { id: 'beauty-clinic', name: 'Beauty Clinic', category: 'beauty', gradient: 'linear-gradient(135deg, #f0f7ff, #dbeafe)' },
  { id: 'lifestyle-glow', name: 'Lifestyle Glow', category: 'beauty', gradient: 'linear-gradient(135deg, #fef9c3, #fde68a)' },
  { id: 'fashion-story', name: 'Fashion Story', category: 'retail', gradient: 'linear-gradient(135deg, #f1f0ef, #dddad6)' },
  { id: 'jewelry-luxury', name: 'Jewelry Luxury', category: 'retail', gradient: 'linear-gradient(135deg, #1c1c1e, #2d2d30)' },
  { id: 'perfume-studio', name: 'Perfume Studio', category: 'retail', gradient: 'linear-gradient(135deg, #e8e4f0, #d4cce8)' },
  { id: 'wildberries-standard', name: 'Wildberries Standard', category: 'marketplace', gradient: 'linear-gradient(135deg, #ffffff, #f5f5f5)' },
  { id: 'ozon-clean', name: 'Ozon Clean', category: 'marketplace', gradient: 'linear-gradient(135deg, #f0f4ff, #e0e8ff)' },
  { id: 'marketplace-hero', name: 'Marketplace Hero', category: 'marketplace', gradient: 'linear-gradient(135deg, #f8f8f8, #eeeeee)' },
  { id: 'sale-promo', name: 'Sale / Promo', category: 'marketplace', gradient: 'linear-gradient(135deg, #fff0f0, #ffd6d6)' },
]

const CATEGORY_TO_TAB: Record<string, string> = {
  beauty_cosmetics: 'beauty',
  jewelry_accessories: 'retail',
  fashion_clothing: 'retail',
  food_cafe: 'beauty',
  marketplace_export: 'marketplace',
  custom: 'all',
}

function buildTabs(selectedCategory: ProductCategory | null) {
  const all = [
    { id: 'all', label: 'All' },
    { id: 'beauty', label: 'Beauty' },
    { id: 'retail', label: 'Retail' },
    { id: 'marketplace', label: 'Marketplace' },
  ]

  if (!selectedCategory) return all

  const preferredTab = CATEGORY_TO_TAB[selectedCategory] ?? 'all'
  if (preferredTab === 'all') return all

  // Move the preferred tab first
  return [
    all.find((t) => t.id === preferredTab)!,
    ...all.filter((t) => t.id !== preferredTab),
  ]
}

export function TemplateGrid() {
  const router = useRouter()
  const [selectedCategory, setSelectedCategory] = useState<ProductCategory | null>(null)
  const [activeTab, setActiveTab] = useState('all')
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [selectedChips, setSelectedChips] = useState<string[]>([])
  const [customText, setCustomText] = useState('')

  useEffect(() => {
    if (!isVerified()) { router.replace('/register'); return }
    const cat = sessionStorage.getItem('leve_category') as ProductCategory | null
    if (cat) {
      setSelectedCategory(cat)
      const tab = CATEGORY_TO_TAB[cat] ?? 'all'
      setActiveTab(tab)
    }
  }, [router])

  const tabs = useMemo(() => buildTabs(selectedCategory), [selectedCategory])

  const filteredTemplates = useMemo(() => {
    if (activeTab === 'all') return TEMPLATES
    return TEMPLATES.filter((t) => t.category === activeTab)
  }, [activeTab])

  const handleContinue = useCallback(() => {
    if (!selectedId) return
    sessionStorage.setItem('leve_template_id', selectedId)
    sessionStorage.setItem('leve_chips', JSON.stringify(selectedChips))
    if (customText) sessionStorage.setItem('leve_custom_text', customText)
    router.push('/processing')
  }, [selectedId, selectedChips, customText, router])

  return (
    <div className="flex flex-col flex-1">
      {/* Tab bar */}
      <div className="sticky top-[52px] z-10 bg-bg-base border-b border-border-default px-4">
        <div className="page-content flex gap-6">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveTab(tab.id)}
              className={`
                relative pb-3 pt-2 text-[14px] font-medium transition-colors
                ${activeTab === tab.id ? 'text-text-primary' : 'text-text-muted hover:text-text-secondary'}
              `}
            >
              {tab.label}
              <span
                className={`
                  absolute bottom-0 left-0 right-0 h-0.5 bg-accent rounded-full
                  transition-transform duration-150 origin-bottom
                  ${activeTab === tab.id ? 'scale-y-100' : 'scale-y-0'}
                `}
              />
            </button>
          ))}
        </div>
      </div>

      {/* Template grid */}
      <main className="page-content flex-1 flex flex-col pt-4 pb-32">
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
                    {template.name}
                  </span>
                </div>
              </button>
            )
          })}
        </div>

        {/* Refinement panel — slides in when template selected */}
        {selectedId && selectedCategory && (
          <RefinementPanel
            category={selectedCategory}
            onChipsChange={setSelectedChips}
            onCustomTextChange={setCustomText}
          />
        )}
        {selectedId && !selectedCategory && (
          <RefinementPanel
            category="custom"
            onChipsChange={setSelectedChips}
            onCustomTextChange={setCustomText}
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
            Continue
          </button>
        </div>
      </div>
    </div>
  )
}
