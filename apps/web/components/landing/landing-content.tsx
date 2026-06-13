'use client'

import { useRef } from 'react'
import { motion, useInView, useReducedMotion } from 'framer-motion'
import { useTranslations, useLocale } from 'next-intl'
import { useRouter } from 'next/navigation'
import { Upload, Layers, Sparkles, SlidersHorizontal, Download, Camera, Smartphone, Share2, ShoppingBag, ShoppingCart, Send, Globe, ImageDown } from 'lucide-react'
import { TestimonialCards } from '@/components/landing/testimonial-cards'
import { ShowcaseGallery } from '@/components/landing/showcase-gallery'
import { CategoryCards } from '@/components/landing/category-cards'
import { SceneCatalog } from '@/components/landing/scene-catalog'
import { AppHeader } from '@/components/shared/app-header'
import { ThemeToggle } from '@/components/shared/theme-toggle'
import { useSession } from '@/hooks/use-session'
import { cn } from '@/lib/utils'
import { CREDIT_PACKAGES } from '@/lib/constants'

const PRICING_TIER_FEATURES: Record<string, string[]> = {
  free:    ['pricing_free_feature_1',    'pricing_free_feature_2',    'pricing_free_feature_3'],
  starter: ['pricing_starter_feature_1', 'pricing_starter_feature_2', 'pricing_starter_feature_3'],
  creator: ['pricing_creator_feature_1', 'pricing_creator_feature_2', 'pricing_creator_feature_3'],
}

const PRICING_TIERS = [
  { id: 'free', label: 'Free Preview', labelHY: '', labelRU: 'Бесплатный просмотр', priceAMD: 0, images: 2, perImageAMD: 0, featured: false },
  ...CREDIT_PACKAGES.filter((p) => !p.isMonthly).map((p) => ({
    id: p.id,
    label: p.label as string,
    labelHY: p.labelHY as string,
    labelRU: p.labelRU as string,
    priceAMD: p.priceAMD,
    images: p.images,
    perImageAMD: p.perImageAMD,
    featured: p.id === 'creator',
  })),
]

const PLATFORMS = [
  { id: 'instagram_feed',  label: 'Instagram Feed',  dims: '1080×1080', Icon: Camera,       highlight: false, pill: ''     },
  { id: 'instagram_story', label: 'Instagram Story', dims: '1080×1920', Icon: Smartphone,   highlight: false, pill: ''     },
  { id: 'facebook_post',   label: 'Facebook',        dims: '1200×630',  Icon: Share2,       highlight: false, pill: ''     },
  { id: 'wildberries',     label: 'Wildberries',     dims: '900×1200',  Icon: ShoppingBag,  highlight: true,  pill: 'WB'   },
  { id: 'ozon',            label: 'Ozon',            dims: '1000×1000', Icon: ShoppingCart, highlight: true,  pill: 'Ozon' },
  { id: 'telegram',        label: 'Telegram',        dims: '1080×1080', Icon: Send,         highlight: false, pill: ''     },
  { id: 'list_am',         label: 'list.am',         dims: '1200×900',  Icon: Globe,        highlight: false, pill: ''     },
  { id: 'original_hd',     label: 'Original HD',     labelKey: 'platform_original_hd', dims: 'Full res', Icon: ImageDown, highlight: false, pill: '' },
]

// Shared motion language — mirrors the showcase gallery
const EASE_SETTLE: [number, number, number, number] = [0.22, 1, 0.36, 1]
const SPRING_LIFT = { type: 'spring' as const, stiffness: 260, damping: 22 }


export function LandingContent() {
  const router = useRouter()
  const t = useTranslations('landing')
  const { session, status } = useSession()
  const showSignIn = status === 'ready' && !session?.isVerified
  const reducedMotion = useReducedMotion()

  // Hero entrance — same settle ease as the showcase crossfade
  const heroEntrance = (delay: number) =>
    reducedMotion
      ? {
          initial: { opacity: 0 },
          animate: { opacity: 1, y: 0 },
          transition: { duration: 0.3, delay: Math.min(delay, 0.2), y: { duration: 0 } },
        }
      : {
          initial: { opacity: 0, y: 28 },
          animate: { opacity: 1, y: 0 },
          transition: { duration: 0.7, ease: EASE_SETTLE, delay },
        }

  const showcaseRef = useRef<HTMLElement>(null)
  const stepsRef = useRef<HTMLElement>(null)
  const marketplaceRef = useRef<HTMLElement>(null)
  const pricingRef = useRef<HTMLElement>(null)
  const ctaRef = useRef<HTMLElement>(null)

  const showcaseInView = useInView(showcaseRef, { once: true, amount: 0.2 })
  // Separate from entry animation — tracks live visibility to pause ambient gallery
  const showcaseVisible = useInView(showcaseRef, { once: false, amount: 0.3 })
  const stepsInView = useInView(stepsRef, { once: true, amount: 0.2 })
  const marketplaceInView = useInView(marketplaceRef, { once: true, amount: 0.2 })
  const pricingInView = useInView(pricingRef, { once: true, amount: 0.2 })
  const ctaInView = useInView(ctaRef, { once: true, amount: 0.3 })

  const step1Ref = useRef<HTMLDivElement>(null)
  const step2Ref = useRef<HTMLDivElement>(null)
  const step3Ref = useRef<HTMLDivElement>(null)
  const step4Ref = useRef<HTMLDivElement>(null)
  const step5Ref = useRef<HTMLDivElement>(null)
  const step1InView = useInView(step1Ref, { once: true, amount: 0.5 })
  const step2InView = useInView(step2Ref, { once: true, amount: 0.5 })
  const step3InView = useInView(step3Ref, { once: true, amount: 0.5 })
  const step4InView = useInView(step4Ref, { once: true, amount: 0.5 })
  const step5InView = useInView(step5Ref, { once: true, amount: 0.5 })
  const stepRefs = [step1Ref, step2Ref, step3Ref, step4Ref, step5Ref]
  const stepInViews = [step1InView, step2InView, step3InView, step4InView, step5InView]

  const locale = useLocale()

  const howItWorks = [
    { num: 1, Icon: Upload,            title: t('how_step1_title'), desc: t('how_step1_desc') },
    { num: 2, Icon: Layers,            title: t('how_step2_title'), desc: t('how_step2_desc') },
    { num: 3, Icon: Sparkles,          title: t('how_step3_title'), desc: t('how_step3_desc') },
    { num: 4, Icon: SlidersHorizontal, title: t('how_step4_title'), desc: t('how_step4_desc') },
    { num: 5, Icon: Download,          title: t('how_step5_title'), desc: t('how_step5_desc') },
  ]

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
        <section className="relative overflow-hidden bg-[var(--bg-base)] px-4 pt-12 pb-8 lg:pt-16">
          {/* Ambient accent glow — same treatment as the showcase, with a slow breathe */}
          <div aria-hidden className="absolute inset-x-0 -top-24 flex justify-center pointer-events-none">
            <motion.div
              className="w-[640px] h-[420px] max-w-[150vw]"
              style={{
                background:
                  'radial-gradient(50% 50% at 50% 50%, color-mix(in srgb, var(--accent) 11%, transparent), transparent 72%)',
              }}
              animate={reducedMotion ? undefined : { opacity: [0.65, 1, 0.65], scale: [1, 1.08, 1] }}
              transition={{ duration: 8, repeat: Infinity, ease: 'easeInOut' }}
            />
          </div>

          <div className="relative mb-8 lg:mb-12 w-full max-w-[560px] lg:max-w-[680px] mx-auto">
            {/* Eyebrow — accent-dot chip, same language as the showcase category chips */}
            <motion.div {...heroEntrance(0)} className="flex justify-center mb-4">
              <p className="inline-flex items-center gap-1.5 bg-[var(--accent-subtle)] border border-[var(--accent-border)] rounded-full px-3.5 py-1.5">
                <span aria-hidden className="w-1.5 h-1.5 rounded-full bg-[var(--accent)]" />
                <span className="text-[12px] font-ui font-semibold text-accent uppercase tracking-[0.12em]">
                  {t('eyebrow')}
                </span>
              </p>
            </motion.div>
            <motion.h1
              {...heroEntrance(0.1)}
              className="font-display font-semibold text-[40px] leading-[1.05] text-text-primary lg:text-[48px] text-balance text-center lg:text-center"
            >
              {t('headline_1')}
            </motion.h1>
            <motion.p
              {...heroEntrance(0.2)}
              className="mt-4 text-base font-ui text-text-secondary leading-relaxed lg:mx-auto lg:text-lg text-center lg:text-center"
            >
              {t('subtext')}
            </motion.p>

            {/* Hero CTA */}
            <motion.div {...heroEntrance(0.32)} className="flex justify-center mt-6">
              <motion.button
                type="button"
                onClick={handleCTAClick}
                whileHover={reducedMotion ? undefined : { scale: 1.02, y: -2 }}
                whileTap={reducedMotion ? undefined : { scale: 0.97 }}
                transition={SPRING_LIFT}
                className="btn-primary inline-flex px-12 text-base"
                style={{ minWidth: '220px' }}
              >
                {t('cta_button')}
              </motion.button>
            </motion.div>
            <motion.p
              {...heroEntrance(0.42)}
              className="text-sm font-ui text-text-muted mt-2 text-center"
            >
              {t('hero_trust_line')}
            </motion.p>

            {/* Category cards */}
            <div className="mt-8">
              <CategoryCards />
            </div>
          </div>
        </section>

        {/* SECTION 2 — Result gallery showcase (bg-surface) */}
        <section ref={showcaseRef} className="bg-[var(--bg-surface)] px-4 py-16">
          <div className="max-w-[540px] mx-auto">
            <motion.h2
              initial={{ opacity: 0, y: 20 }}
              animate={showcaseInView ? { opacity: 1, y: 0 } : {}}
              transition={{ duration: 0.5, ease: 'easeOut' }}
              className="font-display font-semibold text-[28px] text-text-primary text-center mb-3"
            >
              {t('showcase_title')}
            </motion.h2>
            <motion.p
              initial={{ opacity: 0, y: 20 }}
              animate={showcaseInView ? { opacity: 1, y: 0 } : {}}
              transition={{ duration: 0.5, ease: 'easeOut', delay: 0.1 }}
              className="font-ui text-base text-text-secondary text-center mb-8"
            >
              {t('showcase_subtitle')}
            </motion.p>
          </div>

          <motion.div
            initial={{ opacity: 0, y: 32 }}
            animate={showcaseInView ? { opacity: 1, y: 0 } : {}}
            transition={{ duration: 0.6, ease: 'easeOut', delay: 0.1 }}
          >
            <ShowcaseGallery visible={showcaseVisible} />
          </motion.div>
        </section>

        {/* SECTION 2.5 — Scene Catalog (bg-surface) */}
        <section className="bg-[var(--bg-surface)] py-16 px-4">
          <SceneCatalog />
        </section>

        {/* SECTION 3 — How it works (bg-base) */}
        <section ref={stepsRef} className="bg-[var(--bg-base)] px-4 py-16">
          <div className="max-w-[560px] mx-auto">
            <motion.h2
              initial={{ opacity: 0, y: 24 }}
              animate={stepsInView ? { opacity: 1, y: 0 } : {}}
              transition={{ duration: 0.5, ease: 'easeOut' }}
              className="font-display font-semibold text-[28px] text-text-primary text-center mb-12"
            >
              {t('how_title')}
            </motion.h2>

            <div className="relative">
              {howItWorks.map((step, idx) => {
                const inView = stepInViews[idx]!
                const isLast = idx === howItWorks.length - 1
                const { Icon } = step
                return (
                  <motion.div
                    key={step.num}
                    ref={stepRefs[idx]!}
                    initial={{ opacity: 0, x: -16 }}
                    animate={inView ? { opacity: 1, x: 0 } : {}}
                    transition={{ duration: 0.5, ease: 'easeOut', delay: idx * 0.08 }}
                    className={cn(
                      'relative flex gap-3 md:gap-4 items-start',
                      isLast ? 'mb-0' : 'mb-8'
                    )}
                  >
                    {/* Number circle */}
                    <motion.div
                      animate={inView ? { scale: [1, 1.25, 1] } : {}}
                      transition={{ duration: 0.3, times: [0, 0.5, 1], delay: idx * 0.08 }}
                      className="w-8 h-8 md:w-10 md:h-10 flex-shrink-0 rounded-full bg-accent-subtle border border-accent-border flex items-center justify-center relative z-10"
                    >
                      <span className="font-semibold text-sm text-accent">{step.num}</span>
                    </motion.div>

                    {/* Connector line — absolute relative to step row */}
                    {!isLast && (
                      <motion.div
                        initial={{ scaleY: 0 }}
                        animate={inView ? { scaleY: 1 } : {}}
                        transition={{ duration: 0.4, ease: 'easeOut', delay: idx * 0.08 + 0.2 }}
                        className="absolute left-[15px] md:left-[19px] top-[32px] md:top-[40px] bottom-[-32px] w-px bg-border-default"
                        style={{ transformOrigin: 'top' }}
                      />
                    )}

                    {/* Content */}
                    <div className="flex-1 pt-1">
                      <div className="hidden md:inline-flex bg-bg-elevated border border-border-default rounded-xl p-2 mb-3">
                        <Icon className="w-5 h-5 text-accent" strokeWidth={1.75} />
                      </div>
                      <h3 className="font-ui font-semibold text-[16px] text-text-primary mb-1 leading-snug">
                        {step.title}
                      </h3>
                      <p className="font-ui text-sm text-text-secondary leading-relaxed">
                        {step.desc}
                      </p>
                    </div>
                  </motion.div>
                )
              })}
            </div>
          </div>
        </section>

        {/* SECTION 4 — Export / Platforms (bg-surface) */}
        <section ref={marketplaceRef} className="bg-[var(--bg-surface)] py-16 px-4">
          <div className="max-w-[640px] mx-auto">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={marketplaceInView ? { opacity: 1, y: 0 } : {}}
              transition={{ duration: 0.5, ease: 'easeOut' }}
            >
              <p className="text-xs font-semibold text-accent uppercase tracking-[0.15em] text-center mb-3">
                {t('export_eyebrow')}
              </p>
              <h2 className="font-display text-[28px] font-semibold text-text-primary text-center mb-2">
                {t('export_title')}
              </h2>
              <p className="text-sm font-ui text-text-secondary text-center mb-10">
                {t('export_subtitle')}
              </p>
            </motion.div>

            <motion.div
              variants={{ hidden: {}, show: { transition: { staggerChildren: 0.04 } } }}
              initial="hidden"
              animate={marketplaceInView ? 'show' : 'hidden'}
              className="grid grid-cols-2 sm:grid-cols-4 gap-3"
            >
              {PLATFORMS.map((platform) => {
                const { Icon } = platform
                return (
                  <motion.div
                    key={platform.id}
                    variants={{
                      hidden: { opacity: 0, scale: 0.88 },
                      show: { opacity: 1, scale: 1, transition: { duration: 0.35, ease: 'easeOut' as const } },
                    }}
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.97 }}
                    className={cn(
                      'bg-bg-elevated rounded-xl p-4 flex flex-col items-center gap-2 min-h-[88px] border',
                      platform.highlight
                        ? 'border-accent-border'
                        : 'border-border-default hover:border-accent-border transition-colors duration-150'
                    )}
                  >
                    {platform.pill && (
                      <span className="bg-accent-subtle text-accent text-[10px] font-semibold px-2 py-0.5 rounded-full leading-none">
                        {platform.pill}
                      </span>
                    )}
                    <Icon className="w-5 h-5 text-text-secondary" strokeWidth={1.75} />
                    <span className="text-[13px] font-ui font-medium text-text-primary text-center leading-tight">
                      {'labelKey' in platform && platform.labelKey ? t(platform.labelKey) : platform.label}
                    </span>
                    <span className="text-[11px] font-ui text-text-muted text-center">
                      {platform.dims}
                    </span>
                  </motion.div>
                )
              })}
            </motion.div>

            <p className="text-xs font-ui text-text-muted text-center mt-6">
              {t('export_overlays_note')}
            </p>
          </div>
        </section>

        {/* SECTION 4.5 — Pricing (bg-base) */}
        <section ref={pricingRef} className="bg-[var(--bg-base)] py-16 px-4">
          <div className="max-w-[720px] mx-auto">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={pricingInView ? { opacity: 1, y: 0 } : {}}
              transition={{ duration: 0.5, ease: 'easeOut' }}
            >
              <p className="text-xs font-semibold text-accent uppercase tracking-[0.15em] text-center mb-3">
                {t('pricing_eyebrow')}
              </p>
              <h2 className="font-display text-[28px] font-semibold text-text-primary text-center mb-2">
                {t('pricing_title')}
              </h2>
              <p className="text-sm font-ui text-text-secondary text-center mb-10">
                {t('pricing_comparison')}{' '}
                <span className="text-accent font-medium">{t('pricing_comparison_accent')}</span>
              </p>
            </motion.div>

            <motion.div
              variants={{ hidden: {}, show: { transition: { staggerChildren: 0.1 } } }}
              initial="hidden"
              animate={pricingInView ? 'show' : 'hidden'}
              className="grid grid-cols-1 sm:grid-cols-3 gap-4"
            >
              {PRICING_TIERS.map((tier) => (
                <motion.div
                  key={tier.id}
                  variants={{
                    hidden: { opacity: 0, y: 24 },
                    show: { opacity: 1, y: 0, transition: { duration: 0.5, ease: 'easeOut' as const } },
                  }}
                  className={cn(
                    'relative flex flex-col p-6 rounded-xl bg-[var(--bg-surface)]',
                    tier.featured
                      ? 'border border-[var(--accent)]'
                      : 'border border-[var(--border-default)]'
                  )}
                >
                  {tier.featured && (
                    <span className="absolute -top-3 left-1/2 -translate-x-1/2 bg-[var(--accent)] text-white text-[10px] font-semibold px-3 py-1 rounded-full uppercase tracking-wide whitespace-nowrap">
                      {t('pricing_best_value')}
                    </span>
                  )}

                  <p className={cn(
                    'text-xs font-semibold uppercase tracking-wide mb-4',
                    tier.featured ? 'text-accent' : 'text-text-muted'
                  )}>
                    {tier.id === 'free' ? t('pricing_free_label') : (locale === 'hy' ? tier.labelHY : locale === 'ru' ? tier.labelRU : tier.label)}
                  </p>

                  <div className="mb-1 flex items-end gap-1">
                    <span className="font-display text-[36px] font-semibold text-text-primary leading-none">
                      {tier.priceAMD === 0 ? '0' : tier.priceAMD.toLocaleString()}
                    </span>
                    <span className="text-base text-text-muted mb-1">֏</span>
                  </div>

                  {tier.perImageAMD > 0 && (
                    <p className="text-xs text-text-muted mb-1">
                      {t('pricing_per_image', { amount: tier.perImageAMD })}
                    </p>
                  )}

                  <p className="text-sm text-text-secondary mb-3 mt-1">
                    {tier.priceAMD === 0 ? t('pricing_free_desc') : t('pricing_images', { count: tier.images })}
                  </p>

                  {(PRICING_TIER_FEATURES[tier.id] ?? []).length > 0 && (
                    <ul className="mb-4 flex flex-col gap-1.5">
                      {(PRICING_TIER_FEATURES[tier.id] ?? []).map((key) => (
                        <li key={key} className="flex items-start gap-2 text-xs text-text-secondary">
                          <span className="text-accent mt-0.5 shrink-0">✓</span>
                          {t(key)}
                        </li>
                      ))}
                    </ul>
                  )}

                  <div className="flex-1" />

                  <button
                    type="button"
                    onClick={handleCTAClick}
                    className={cn(
                      'w-full py-3 rounded-xl text-sm font-medium transition-colors',
                      tier.featured
                        ? 'btn-primary'
                        : 'border border-[var(--border-default)] text-text-primary hover:border-[var(--border-hover)]'
                    )}
                  >
                    {tier.priceAMD === 0
                      ? t('pricing_free_cta')
                      : tier.featured
                        ? t('pricing_creator_cta')
                        : t('pricing_starter_cta')}
                  </button>
                </motion.div>
              ))}
            </motion.div>
          </div>
        </section>

        {/* SECTION 5 — Testimonials */}
        <TestimonialCards />

        {/* SECTION 6 — Final CTA (bg-base) */}
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
            className="font-ui text-base text-text-secondary mb-2"
          >
            {t('cta_subtitle')}
          </motion.p>
          <motion.p
            initial={{ opacity: 0, y: 24 }}
            animate={ctaInView ? { opacity: 1, y: 0 } : {}}
            transition={{ duration: 0.5, ease: 'easeOut', delay: 0.15 }}
            className="text-xs text-[var(--text-muted)] mb-8"
          >
            {t('cta_anchor')}
          </motion.p>
          <motion.div
            initial={{ opacity: 0, y: 24 }}
            animate={ctaInView ? { opacity: 1, y: 0 } : {}}
            transition={{ duration: 0.5, ease: 'easeOut', delay: 0.2 }}
          >
            <motion.button
              type="button"
              onClick={handleCTAClick}
              animate={{ scale: [1, 1.015, 1] }}
              transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
              className="btn-primary inline-flex px-12 text-base mx-auto"
              style={{ width: 'auto', minWidth: '220px' }}
            >
              {t('cta_button')}
            </motion.button>
          </motion.div>
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
