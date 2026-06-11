'use client'

import { useRef, useState, useEffect } from 'react'
import { motion, AnimatePresence, useInView } from 'framer-motion'
import { useTranslations, useLocale } from 'next-intl'
import { useRouter } from 'next/navigation'
import { ImageOff, Upload, Layers, Sparkles, SlidersHorizontal, Download, Camera, Smartphone, Share2, ShoppingBag, ShoppingCart, Send, Globe, ImageDown } from 'lucide-react'
import { TestimonialCards } from '@/components/landing/testimonial-cards'
import { AppHeader } from '@/components/shared/app-header'
import { ThemeToggle } from '@/components/shared/theme-toggle'
import { BeforeAfterSlider } from '@/components/results/before-after-slider'
import { useSession } from '@/hooks/use-session'
import { cn } from '@/lib/utils'
import type { ProductCategory } from '@leve/types'
import { CATEGORY_ITEMS, SCENES, CREDIT_PACKAGES } from '@/lib/constants'

const CDN = process.env.NEXT_PUBLIC_CDN_URL ?? ''

const SHOWCASE_CARDS = [
  { id: 'jewelry',   catKey: 'cat_jewelry', beforeImage: `${CDN}/showcase/jewelry-before.webp`,  afterImage: `${CDN}/showcase/jewelry-after.jpg` },
  { id: 'cosmetics', catKey: 'cat_beauty',  beforeImage: `${CDN}/showcase/beauty-before.webp`,   afterImage: `${CDN}/showcase/beauty-after.jpg` },
  { id: 'food',      catKey: 'cat_food',    beforeImage: `${CDN}/showcase/food-before.webp`,      afterImage: `${CDN}/showcase/food-after.jpg` },
  { id: 'fashion',   catKey: 'cat_fashion', beforeImage: `${CDN}/showcase/fashion-before.avif`,  afterImage: `${CDN}/showcase/fashion-after.jpg` },
]

const SCENE_VARIETY_IDS = [
  'marble_luxury', 'black_studio', 'cafe_table', 'outdoor_garden',
  'velvet_dark', 'light_wood', 'apricot_warm', 'neon_glow',
]

const SCENE_VARIETY = SCENE_VARIETY_IDS.map((id) => SCENES.find((s) => s.id === id)!)

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

const staggerChild = {
  hidden: { opacity: 0, y: 24 },
  show: { opacity: 1, y: 0, transition: { duration: 0.5, ease: 'easeOut' as const } },
}

export function LandingContent() {
  const router = useRouter()
  const t = useTranslations('landing')
  const tScenes = useTranslations('scenes')
  const { session, status } = useSession()
  const showSignIn = status === 'ready' && !session?.isVerified

  const categoriesRef = useRef<HTMLDivElement>(null)
  const showcaseRef = useRef<HTMLElement>(null)
  const scenesRef = useRef<HTMLElement>(null)
  const stepsRef = useRef<HTMLElement>(null)
  const marketplaceRef = useRef<HTMLElement>(null)
  const pricingRef = useRef<HTMLElement>(null)
  const ctaRef = useRef<HTMLElement>(null)

  const categoriesInView = useInView(categoriesRef, { once: true, amount: 0.1 })
  const showcaseInView = useInView(showcaseRef, { once: true, amount: 0.2 })
  // Separate from entry animation — tracks live visibility to pause ambient gallery
  const showcaseVisible = useInView(showcaseRef, { once: false, amount: 0.3 })
  const scenesInView = useInView(scenesRef, { once: true, amount: 0.2 })
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

  const [activeCardIndex, setActiveCardIndex] = useState(0)
  const [demoPosition, setDemoPosition] = useState<number | null>(null)
  const [isPaused, setIsPaused] = useState(false)
  const pauseResumeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  // Ambient gallery: wipe 70→30→50 over the card's 4s window, then advance
  useEffect(() => {
    if (!showcaseVisible || isPaused) {
      setDemoPosition(null)
      return
    }
    const w1 = setTimeout(() => setDemoPosition(70), 300)
    const w2 = setTimeout(() => setDemoPosition(30), 1800)
    const w3 = setTimeout(() => setDemoPosition(50), 3000)
    const cycle = setTimeout(
      () => setActiveCardIndex((i) => (i + 1) % SHOWCASE_CARDS.length),
      4000,
    )
    return () => {
      clearTimeout(w1)
      clearTimeout(w2)
      clearTimeout(w3)
      clearTimeout(cycle)
    }
  }, [activeCardIndex, isPaused, showcaseVisible])

  // Clean up pause-resume timer on unmount
  useEffect(() => {
    return () => { if (pauseResumeTimerRef.current) clearTimeout(pauseResumeTimerRef.current) }
  }, [])

  function handleShowcaseInteract() {
    setIsPaused(true)
    setDemoPosition(null)
    if (pauseResumeTimerRef.current) clearTimeout(pauseResumeTimerRef.current)
    pauseResumeTimerRef.current = setTimeout(() => {
      setIsPaused(false)
      pauseResumeTimerRef.current = null
    }, 3000)
  }

  function handleDotClick(idx: number) {
    setActiveCardIndex(idx)
    handleShowcaseInteract()
  }

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
            </motion.h1>
            <motion.p
              initial={{ opacity: 0, y: 24 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, ease: 'easeOut', delay: 0.2 }}
              className="mt-4 text-base font-ui text-text-secondary leading-relaxed lg:text-lg lg:mx-auto text-center lg:text-center"
            >
              {t('subtext')}
            </motion.p>

            {/* Hero CTA */}
            <motion.div
              initial={{ opacity: 0, y: 24 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, ease: 'easeOut', delay: 0.35 }}
              className="flex justify-center mt-6"
            >
              <motion.button
                type="button"
                onClick={handleCTAClick}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.97 }}
                transition={{ type: 'spring', stiffness: 300, damping: 20 }}
                className="btn-primary inline-flex px-12 text-base"
                style={{ minWidth: '220px' }}
              >
                {t('cta_button')}
              </motion.button>
            </motion.div>
            <motion.p
              initial={{ opacity: 0, y: 24 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, ease: 'easeOut', delay: 0.4 }}
              className="text-sm font-ui text-text-muted mt-2 text-center"
            >
              {t('hero_trust_line')}
            </motion.p>

            {/* Category cards — stagger 0.06s per card, scroll-triggered */}
            <motion.div
              ref={categoriesRef}
              variants={{ hidden: {}, show: { transition: { staggerChildren: 0.06 } } }}
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
                      'flex flex-col items-center justify-center w-full min-h-[100px] py-4 px-3 rounded-[12px] border transition-all duration-100',
                      'bg-bg-surface border-border-default',
                      'active:scale-[0.98]',
                      'hover:border-accent hover:bg-accent-subtle'
                    )}
                  >
                    <Icon className="w-6 h-6 text-accent mb-2" strokeWidth={1.75} />
                    <span className="font-ui font-semibold text-[13px] text-text-primary leading-tight text-center">
                      {t(cat.tKey)}
                    </span>
                    <span className="font-ui text-[11px] text-text-muted leading-tight mt-0.5 text-center px-1">
                      {t(`${cat.tKey}_sub`)}
                    </span>
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
              className="font-ui text-base text-text-secondary text-center mb-6"
            >
              {t('showcase_subtitle')}
            </motion.p>

            {/* Slider + dot indicators */}
            <motion.div
              initial={{ opacity: 0, y: 32 }}
              animate={showcaseInView ? { opacity: 1, y: 0 } : {}}
              transition={{ duration: 0.6, ease: 'easeOut', delay: 0.1 }}
              className="max-w-[380px] mx-auto"
            >
              {!CDN ? (
                <div className="aspect-square bg-bg-elevated rounded-2xl flex flex-col items-center justify-center gap-3">
                  <ImageOff className="w-8 h-8 text-text-muted" />
                  <p className="text-sm font-ui text-text-muted text-center px-6">
                    Add showcase images to S3 showcase/
                  </p>
                </div>
              ) : (
                <AnimatePresence mode="wait">
                  <motion.div
                    key={activeCardIndex}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.4, ease: 'easeOut' }}
                  >
                    <BeforeAfterSlider
                      beforeSrc={SHOWCASE_CARDS[activeCardIndex]!.beforeImage}
                      afterSrc={SHOWCASE_CARDS[activeCardIndex]!.afterImage}
                      aspectRatio="1:1"
                      externalPosition={demoPosition}
                      onUserInteract={handleShowcaseInteract}
                    />
                  </motion.div>
                </AnimatePresence>
              )}

              {/* Dot indicators — tap to jump; active dot widens into a pill */}
              <div className="flex justify-center gap-0.5 mt-4">
                {SHOWCASE_CARDS.map((card, idx) => (
                  <button
                    key={card.id}
                    type="button"
                    aria-label={tScenes(card.catKey)}
                    onClick={() => handleDotClick(idx)}
                    className="flex items-center justify-center"
                    style={{ minWidth: 32, minHeight: 44, padding: '0 6px' }}
                  >
                    <span
                      className={cn(
                        'block h-2 rounded-full',
                        idx === activeCardIndex ? 'bg-accent' : 'bg-border-strong',
                      )}
                      style={{
                        width: idx === activeCardIndex ? 20 : 8,
                        transition: 'width 0.25s ease-out, background-color 0.25s ease-out',
                      }}
                    />
                  </button>
                ))}
              </div>
            </motion.div>
          </div>
        </section>

        {/* SECTION 2.5 — Scene Variety (bg-surface) */}
        <section ref={scenesRef} className="bg-[var(--bg-surface)] py-16 px-4">
          <div className="max-w-[560px] mx-auto">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={scenesInView ? { opacity: 1, y: 0 } : {}}
              transition={{ duration: 0.5, ease: 'easeOut' }}
            >
              <p className="text-xs font-semibold text-accent uppercase tracking-[0.15em] text-center mb-3">
                {t('scenes_eyebrow')}
              </p>
              <h2 className="font-display text-[28px] font-semibold text-text-primary text-center mb-2">
                {t('scenes_title')}
              </h2>
              <p className="text-sm font-ui text-text-secondary text-center mb-8">
                {t('scenes_subtitle')}
              </p>
            </motion.div>
          </div>

          <div className="overflow-x-auto no-scrollbar snap-x snap-mandatory -mx-4">
            <motion.div
              variants={{ hidden: {}, show: { transition: { staggerChildren: 0.05 } } }}
              initial="hidden"
              animate={scenesInView ? 'show' : 'hidden'}
              className="flex gap-3 px-4 pb-2 w-max"
            >
              {SCENE_VARIETY.map((scene) => (
                <motion.div
                  key={scene.id}
                  variants={{
                    hidden: { opacity: 0, scale: 0.92 },
                    show: { opacity: 1, scale: 1, transition: { duration: 0.35 } },
                  }}
                  whileHover={{ scale: 1.06, y: -4, transition: { type: 'spring', stiffness: 300, damping: 20 } }}
                  whileTap={{ scale: 0.97 }}
                  className="w-[120px] flex-shrink-0 snap-start"
                >
                  <div
                    className="w-[120px] h-[150px] rounded-xl overflow-hidden mb-2"
                    style={{ background: scene.thumbnailGradient }}
                  />
                  <p className="text-xs font-ui text-text-secondary text-center truncate w-full">
                    {locale === 'hy' ? scene.nameHY : locale === 'ru' ? scene.nameRU : scene.name}
                  </p>
                </motion.div>
              ))}
            </motion.div>
          </div>

          <div className="max-w-[560px] mx-auto">
            <motion.button
              type="button"
              onClick={() => router.push('/upload')}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.97 }}
              className="text-sm font-ui text-accent text-center mt-6 block mx-auto"
            >
              {t('scenes_see_all')}
            </motion.button>
          </div>
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
