'use client'

import { useRef } from 'react'
import { motion, useInView } from 'framer-motion'
import { useTranslations } from 'next-intl'
import { useRouter } from 'next/navigation'
import { ChevronRight, CheckCircle } from 'lucide-react'
import { AppHeader } from '@/components/shared/app-header'
import { ThemeToggle } from '@/components/shared/theme-toggle'
import { BeforeAfterSlider } from '@/components/results/before-after-slider'
import { useSession } from '@/hooks/use-session'
import { cn } from '@/lib/utils'
import type { ProductCategory } from '@leve/types'
import { CATEGORY_ITEMS } from '@/lib/constants'

const STEPS = [1, 2, 3] as const

const staggerChild = {
  hidden: { opacity: 0, y: 24 },
  show: { opacity: 1, y: 0, transition: { duration: 0.5, ease: 'easeOut' as const } },
}

export function LandingContent() {
  const router = useRouter()
  const t = useTranslations('landing')
  const { session, status } = useSession()
  const showSignIn = status === 'ready' && !session?.isVerified

  const categoriesRef = useRef<HTMLDivElement>(null)
  const showcaseRef = useRef<HTMLElement>(null)
  const stepsRef = useRef<HTMLElement>(null)
  const ctaRef = useRef<HTMLElement>(null)

  const categoriesInView = useInView(categoriesRef, { once: true, amount: 0.1 })
  const showcaseInView = useInView(showcaseRef, { once: true, amount: 0.2 })
  const stepsInView = useInView(stepsRef, { once: true, amount: 0.2 })
  const ctaInView = useInView(ctaRef, { once: true, amount: 0.3 })

  function handleCategorySelect(categoryId: ProductCategory) {
    sessionStorage.setItem('leve_category', categoryId)
    router.push('/upload')
  }

  function handleCTAClick() {
    router.push('/upload')
  }

  return (
    <div className="min-h-screen flex flex-col bg-[var(--bg-base)]">
      <AppHeader
        variant="landing"
        showLangSwitcher
        rightSlot={
          <div className="flex items-center gap-3">
            <ThemeToggle />
            {showSignIn && (
              <button
                type="button"
                onClick={() => router.push('/register')}
                className="text-[13px] font-medium text-text-secondary hover:text-text-primary transition-colors"
              >
                {t('signin')}
              </button>
            )}
          </div>
        }
      />

      <main className="flex-1">
        {/* SECTION 1 — Hero (bg-base) */}
        <section className="bg-[var(--bg-base)] px-4 pt-12 pb-8 lg:pt-16">
          <div className="mb-8 lg:mb-12 w-full max-w-[560px] lg:max-w-[680px] mx-auto">
            <motion.p
              initial={{ opacity: 0, y: 24 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, ease: 'easeOut', delay: 0 }}
              className="text-sm font-ui font-medium text-accent uppercase tracking-[0.15em] mb-3 text-center lg:text-center"
            >
              {t('eyebrow')}
            </motion.p>
            <motion.h1
              initial={{ opacity: 0, y: 24 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, ease: 'easeOut', delay: 0.1 }}
              className="font-display font-semibold text-[40px] leading-[1.05] text-text-primary lg:text-[48px] text-balance text-center lg:text-center"
            >
              {t('headline_1')}
              <br />
              {t('headline_2')}
            </motion.h1>
            <motion.p
              initial={{ opacity: 0, y: 24 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, ease: 'easeOut', delay: 0.2 }}
              className="mt-4 text-base font-ui text-text-secondary leading-relaxed lg:text-lg lg:mx-auto text-center lg:text-center"
            >
              {t('subtext')}
            </motion.p>

            {/* Category cards — stagger 0.08s per card, scroll-triggered */}
            <motion.div
              ref={categoriesRef}
              variants={{ hidden: {}, show: { transition: { staggerChildren: 0.08 } } }}
              initial="hidden"
              animate={categoriesInView ? 'show' : 'hidden'}
              className="grid grid-cols-2 gap-3 mt-8"
            >
              {CATEGORY_ITEMS.map((cat) => {
                const Icon = cat.icon
                return (
                  <motion.button
                    key={cat.id}
                    variants={staggerChild}
                    type="button"
                    onClick={() => handleCategorySelect(cat.id)}
                    className={cn(
                      'flex items-center w-full min-h-[72px] py-4 px-4 rounded-[12px] border transition-all duration-100',
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
                  </motion.button>
                )
              })}
            </motion.div>
          </div>
        </section>

        {/* SECTION 2 — Before/After showcase (bg-surface) */}
        <section ref={showcaseRef} className="bg-[var(--bg-surface)] px-4 py-16">
          <div className="max-w-[540px] mx-auto">
            <motion.h2
              initial={{ opacity: 0, y: 24 }}
              animate={showcaseInView ? { opacity: 1, y: 0 } : {}}
              transition={{ duration: 0.5, ease: 'easeOut' }}
              className="font-display font-semibold text-[28px] text-text-primary text-center mb-3"
            >
              {t('showcase_title')}
            </motion.h2>
            <motion.p
              initial={{ opacity: 0, y: 24 }}
              animate={showcaseInView ? { opacity: 1, y: 0 } : {}}
              transition={{ duration: 0.5, ease: 'easeOut', delay: 0.1 }}
              className="font-ui text-base text-text-secondary text-center mb-8"
            >
              {t('showcase_subtitle')}
            </motion.p>
            <motion.div
              initial={{ opacity: 0, y: 32 }}
              animate={showcaseInView ? { opacity: 1, y: 0 } : {}}
              transition={{ duration: 0.6, ease: 'easeOut', delay: 0.2 }}
            >
              <BeforeAfterSlider
                beforeSrc={null}
                afterSrc={null}
                aspectRatio="1:1"
              />
            </motion.div>
          </div>
        </section>

        {/* SECTION 3 — How it works (bg-base) */}
        <section ref={stepsRef} className="bg-[var(--bg-base)] px-4 py-16">
          <div className="max-w-[720px] mx-auto">
            <motion.h2
              initial={{ opacity: 0, y: 24 }}
              animate={stepsInView ? { opacity: 1, y: 0 } : {}}
              transition={{ duration: 0.5, ease: 'easeOut' }}
              className="font-display font-semibold text-[28px] text-text-primary text-center mb-12"
            >
              {t('steps_title')}
            </motion.h2>

            <motion.div
              variants={{ hidden: {}, show: { transition: { staggerChildren: 0.1 } } }}
              initial="hidden"
              animate={stepsInView ? 'show' : 'hidden'}
              className="relative grid grid-cols-1 md:grid-cols-3 gap-8 md:gap-4"
            >
              <div className="hidden md:block absolute top-4 left-[calc(16.67%+16px)] right-[calc(16.67%+16px)] h-px bg-border-default" />
              {STEPS.map((num) => (
                <motion.div
                  key={num}
                  variants={staggerChild}
                  className="flex flex-col items-center text-center"
                >
                  <div className="flex items-center justify-center w-8 h-8 rounded-full border border-border-strong bg-[var(--bg-base)] mb-4 relative z-10">
                    <span className="font-ui font-semibold text-[16px] text-text-primary">{num}</span>
                  </div>
                  <h3 className="font-ui font-semibold text-[16px] text-text-primary mb-2">
                    {t(`step${num}_title`)}
                  </h3>
                  <p className="font-ui text-sm text-text-secondary leading-relaxed">
                    {t(`step${num}_desc`)}
                  </p>
                </motion.div>
              ))}
            </motion.div>
          </div>
        </section>

        {/* SECTION 4 — Marketplace callout (bg-surface) */}
        <section className="bg-[var(--bg-surface)] py-12 px-4">
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

        {/* SECTION 5 — Final CTA (bg-base) */}
        <section ref={ctaRef} className="bg-[var(--bg-base)] py-16 px-4 text-center">
          <motion.h2
            initial={{ opacity: 0, y: 24 }}
            animate={ctaInView ? { opacity: 1, y: 0 } : {}}
            transition={{ duration: 0.5, ease: 'easeOut' }}
            className="font-display font-semibold text-[28px] text-text-primary mb-3"
          >
            {t('cta_title')}
          </motion.h2>
          <motion.p
            initial={{ opacity: 0, y: 24 }}
            animate={ctaInView ? { opacity: 1, y: 0 } : {}}
            transition={{ duration: 0.5, ease: 'easeOut', delay: 0.1 }}
            className="font-ui text-base text-text-secondary mb-8"
          >
            {t('cta_subtitle')}
          </motion.p>
          <motion.button
            initial={{ opacity: 0, y: 24 }}
            animate={ctaInView ? { opacity: 1, y: 0 } : {}}
            transition={{ duration: 0.5, ease: 'easeOut', delay: 0.2 }}
            type="button"
            onClick={handleCTAClick}
            className="btn-primary inline-flex px-12 text-base mx-auto"
            style={{ width: 'auto', minWidth: '220px' }}
          >
            {t('cta_button')}
          </motion.button>
        </section>
      </main>

      {/* FOOTER (bg-base) */}
      <footer className="bg-[var(--bg-base)] border-t border-border-default py-5 px-4">
        <div className="max-w-[960px] mx-auto flex flex-col items-center gap-4 md:flex-row md:justify-between">
          <span className="text-xs font-ui text-text-muted">{t('footer_copyright')}</span>
          <div className="flex items-center gap-2">
            <a href="/terms" className="text-xs font-ui text-text-muted transition-opacity hover:opacity-70 py-3 px-2">{t('footer_terms')}</a>
            <a href="/privacy" className="text-xs font-ui text-text-muted transition-opacity hover:opacity-70 py-3 px-2">{t('footer_privacy')}</a>
            <a href="mailto:hello@leve.am" className="text-xs font-ui text-text-muted transition-opacity hover:opacity-70 py-3 px-2">{t('footer_contact')}</a>
          </div>
        </div>
      </footer>
    </div>
  )
}
