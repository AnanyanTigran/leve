'use client'

import { useTranslations } from 'next-intl'
import { useRouter } from 'next/navigation'
import { Sparkles, Gem, Shirt, Coffee, Package, Wand2, ChevronRight, CheckCircle } from 'lucide-react'
import { AppHeader } from '@/components/shared/app-header'
import { ThemeToggle } from '@/components/shared/theme-toggle'
import { cn } from '@/lib/utils'
import type { ProductCategory } from '@leve/types'
import type { LucideIcon } from 'lucide-react'

const CATEGORY_ITEMS: { id: ProductCategory; icon: LucideIcon; tKey: string }[] = [
  { id: 'beauty_cosmetics', icon: Sparkles, tKey: 'category_beauty' },
  { id: 'jewelry_accessories', icon: Gem, tKey: 'category_jewelry' },
  { id: 'fashion_clothing', icon: Shirt, tKey: 'category_fashion' },
  { id: 'food_cafe', icon: Coffee, tKey: 'category_food' },
  { id: 'marketplace_export', icon: Package, tKey: 'category_marketplace' },
  { id: 'custom', icon: Wand2, tKey: 'category_custom' },
]

const SHOWCASE_CARDS = [
  { category: 'Jewelry', template: 'Jewelry Luxury', leftBg: '#E8E8E8', rightBg: 'linear-gradient(135deg, #f0ebe4, #e2d5c8)' },
  { category: 'Beauty', template: 'Luxury Cosmetics', leftBg: '#E8E8E8', rightBg: 'linear-gradient(135deg, #fef0eb, #fad5c4)' },
  { category: 'Marketplace', template: 'Wildberries Standard', leftBg: '#E8E8E8', rightBg: '#FAFAFA' },
] as const

const STEPS = [1, 2, 3] as const

export function LandingContent() {
  const router = useRouter()
  const t = useTranslations('landing')

  function handleCategorySelect(categoryId: ProductCategory) {
    sessionStorage.setItem('leve_category', categoryId)
    const isVerified = sessionStorage.getItem('leve_verified') === 'true'
    if (isVerified) {
      router.push('/upload')
    } else {
      router.push('/register')
    }
  }

  function handleCTAClick() {
    const isVerified = sessionStorage.getItem('leve_verified') === 'true'
    if (isVerified) {
      router.push('/upload')
    } else {
      router.push('/register')
    }
  }

  return (
    <div className="min-h-screen flex flex-col bg-bg-base">
      <AppHeader variant="landing" showLangSwitcher rightSlot={<ThemeToggle />} />

      <main className="flex-1">
        {/* SECTION 1 — Hero */}
        <section className="px-4 pt-12 pb-8 lg:pt-16">
          <div className="mb-8 lg:mb-12 lg:text-center w-full max-w-[560px] mx-auto">
            <p className="text-xs font-ui font-medium text-accent uppercase tracking-[0.15em] mb-3">
              {t('eyebrow')}
            </p>
            <h1 className="font-display font-semibold text-[40px] leading-[1.05] text-text-primary lg:text-[56px] text-balance">
              {t('headline_1')}
              <br />
              {t('headline_2')}
            </h1>
            <p className="mt-4 text-base font-ui text-text-secondary leading-relaxed lg:text-lg lg:mx-auto">
              {t('subtext')}
            </p>

            {/* Category cards — 1 col mobile, 2 col desktop */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-3 mt-8">
              {CATEGORY_ITEMS.map((cat) => {
                const Icon = cat.icon
                return (
                  <button
                    key={cat.id}
                    type="button"
                    onClick={() => handleCategorySelect(cat.id)}
                    className={cn(
                      'flex items-center w-full h-[72px] px-4 rounded-[12px] border transition-all duration-100',
                      'bg-bg-surface border-border-default',
                      'active:scale-[0.98]',
                      'hover:border-accent hover:bg-accent-subtle'
                    )}
                  >
                    <div className="flex items-center justify-center w-10 h-10 rounded-[8px] bg-accent-subtle shrink-0">
                      <Icon className="w-5 h-5 text-accent" strokeWidth={1.75} />
                    </div>
                    <div className="flex flex-col items-start ml-3 min-w-0">
                      <span className="font-ui font-semibold text-base text-text-primary leading-tight">
                        {t(cat.tKey)}
                      </span>
                      <span className="font-ui text-[13px] text-text-muted leading-tight mt-0.5">
                        {t(`${cat.tKey}_sub`)}
                      </span>
                    </div>
                    <ChevronRight className="w-5 h-5 text-text-muted ml-auto shrink-0" />
                  </button>
                )
              })}
            </div>

            <p className="text-center text-[12px] text-text-muted mt-4 font-ui">
              {t('trusted_by')}
            </p>
          </div>
        </section>

        {/* SECTION 3 — Before/After showcase */}
        <section className="px-4 py-16">
          <div className="max-w-[960px] mx-auto">
            <h2 className="font-display font-semibold text-[28px] text-text-primary text-center mb-3">
              {t('showcase_title')}
            </h2>
            <p className="font-ui text-base text-text-secondary text-center mb-8">
              {t('showcase_subtitle')}
            </p>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {SHOWCASE_CARDS.map((card) => (
                <div
                  key={card.template}
                  className="bg-bg-surface border border-border-default rounded-md overflow-hidden"
                >
                  <div className="relative flex h-[180px]">
                    <div className="relative flex-1" style={{ backgroundColor: card.leftBg }}>
                      <span className="absolute top-2 left-2 bg-white text-text-muted text-[11px] font-ui px-2 py-1 rounded-[10px]">
                        {t('before')}
                      </span>
                    </div>
                    <div className="w-px bg-white" />
                    <div
                      className={`relative flex-1${card.category === 'Marketplace' ? ' border border-border-default' : ''}`}
                      style={{ background: card.rightBg }}
                    >
                      <span className="absolute top-2 right-2 bg-accent text-white text-[11px] font-ui px-2 py-1 rounded-[10px]">
                        {t('after')}
                      </span>
                    </div>
                  </div>
                  <div className="p-3">
                    <p className="text-xs font-ui text-text-muted">{card.category}</p>
                    <p className="text-sm font-ui font-semibold text-text-primary mt-0.5">{card.template}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* SECTION 4 — How it works */}
        <section className="bg-bg-base px-4 py-16">
          <div className="max-w-[720px] mx-auto">
            <h2 className="font-display font-semibold text-[28px] text-text-primary text-center mb-12">
              {t('steps_title')}
            </h2>

            <div className="relative grid grid-cols-1 md:grid-cols-3 gap-8 md:gap-4">
              <div className="hidden md:block absolute top-4 left-[calc(16.67%+16px)] right-[calc(16.67%+16px)] h-px bg-border-default" />
              {STEPS.map((num) => (
                <div key={num} className="flex flex-col items-center text-center">
                  <div className="flex items-center justify-center w-8 h-8 rounded-full border border-border-strong bg-bg-base mb-4 relative z-10">
                    <span className="font-ui font-semibold text-[16px] text-text-primary">{num}</span>
                  </div>
                  <h3 className="font-ui font-semibold text-[16px] text-text-primary mb-2">
                    {t(`step${num}_title`)}
                  </h3>
                  <p className="font-ui text-sm text-text-secondary leading-relaxed">
                    {t(`step${num}_desc`)}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* SECTION 5 — Marketplace callout */}
        <section className="bg-bg-surface border-y border-border-default py-12 px-4">
          <div className="max-w-[640px] mx-auto text-center md:text-left">
            <p className="text-xs font-ui font-medium text-accent uppercase tracking-[0.15em]">
              {t('marketplace_eyebrow')}
            </p>
            <h2 className="font-display font-semibold text-[24px] text-text-primary mt-2 mb-3 text-balance">
              {t('marketplace_title')}
            </h2>
            <p className="font-ui text-base text-text-secondary leading-relaxed mb-6">
              {t('marketplace_desc')}
            </p>

            <div className="flex flex-wrap justify-center md:justify-start gap-3">
              <span className="inline-flex items-center gap-2 bg-bg-elevated border border-border-default rounded-full px-4 py-2 text-[13px] font-ui font-medium text-text-primary">
                <CheckCircle className="w-4 h-4 text-accent" />
                {t('marketplace_wb')}
              </span>
              <span className="inline-flex items-center gap-2 bg-bg-elevated border border-border-default rounded-full px-4 py-2 text-[13px] font-ui font-medium text-text-primary">
                <CheckCircle className="w-4 h-4 text-accent" />
                {t('marketplace_ozon')}
              </span>
            </div>
          </div>
        </section>

        {/* SECTION 6 — Final CTA */}
        <section className="py-16 px-4 text-center">
          <h2 className="font-display font-semibold text-[28px] text-text-primary mb-3">
            {t('cta_title')}
          </h2>
          <p className="font-ui text-base text-text-secondary mb-8">
            {t('cta_subtitle')}
          </p>
          <button
            type="button"
            onClick={handleCTAClick}
            className="btn-primary inline-flex px-12 text-base mx-auto"
            style={{ width: 'auto', minWidth: '220px' }}
          >
            {t('cta_button')}
          </button>
        </section>
      </main>

      {/* MINIMAL FOOTER */}
      <footer className="bg-bg-surface border-t border-border-default py-5 px-4">
        <div className="max-w-[960px] mx-auto flex flex-col items-center gap-4 md:flex-row md:justify-between">
          <span className="text-xs font-ui text-text-muted">{t('footer_copyright')}</span>
          <div className="flex items-center gap-6">
            <a href="#" className="text-xs font-ui text-text-muted transition-opacity hover:opacity-70">{t('footer_terms')}</a>
            <a href="#" className="text-xs font-ui text-text-muted transition-opacity hover:opacity-70">{t('footer_privacy')}</a>
            <a href="#" className="text-xs font-ui text-text-muted transition-opacity hover:opacity-70">{t('footer_contact')}</a>
          </div>
        </div>
      </footer>
    </div>
  )
}
