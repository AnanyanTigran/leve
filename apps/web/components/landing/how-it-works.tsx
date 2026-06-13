'use client'

import { useEffect, useRef, useState } from 'react'
import type { ComponentType } from 'react'
import {
  AnimatePresence,
  motion,
  useInView,
  useReducedMotion,
  useScroll,
  useSpring,
} from 'framer-motion'
import { useLocale, useTranslations } from 'next-intl'
import {
  Check,
  ChevronsLeftRight,
  Download,
  Layers,
  SlidersHorizontal,
  Sparkles,
  Upload,
} from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import type { Scene } from '@leve/types'
import { SCENES } from '@/lib/constants'
import { cn } from '@/lib/utils'

// Shared motion language — mirrors the showcase gallery and scene catalog
const EASE_SETTLE: [number, number, number, number] = [0.22, 1, 0.36, 1]

// Photographic grain — same treatment as the scene catalog cards
const GRAIN_TEXTURE =
  "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='160' height='160'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='2' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E\")"

// Real scene gradients from the library — the vignettes tell the story with actual product data
function sceneGradient(id: string, fallback: string): string {
  return SCENES.find((s) => s.id === id)?.thumbnailGradient ?? fallback
}

const APRICOT_SCENE = sceneGradient('apricot_warm', 'var(--accent-subtle)')
const BEFORE_SCENE = sceneGradient('gray_gradient', 'var(--bg-elevated)')

const PICKER_SCENES = ['marble_luxury', 'black_studio', 'spring_bloom', 'cafe_table', 'apricot_warm', 'velvet_dark']
  .map((id) => SCENES.find((s) => s.id === id))
  .filter((s): s is Scene => Boolean(s))

const VIGNETTE_FRAME =
  'relative aspect-[16/10] w-full overflow-hidden rounded-lg border border-border-default bg-bg-elevated'

type VignetteProps = {
  /** entry animation trigger — fires once */
  active: boolean
  /** ambient loop gate — true only while on screen and motion is allowed */
  playing: boolean
  /** prefers-reduced-motion */
  reduced: boolean
}

function Grain() {
  return (
    <div
      aria-hidden
      className="absolute inset-0 pointer-events-none opacity-[0.25] mix-blend-overlay"
      style={{ backgroundImage: GRAIN_TEXTURE, backgroundSize: '160px 160px' }}
    />
  )
}

// Abstract product silhouette — a cosmetics bottle, theme-independent over scene imagery
function ProductBottle({ scale = 1 }: { scale?: number }) {
  return (
    <div className="flex flex-col items-center" style={{ transform: `scale(${scale})` }}>
      <div className="w-2.5 h-2 rounded-[2px]" style={{ background: 'rgba(18, 14, 11, 0.85)' }} />
      <div
        className="w-7 h-12 rounded-[5px] -mt-px flex flex-col items-center justify-center gap-[3px]"
        style={{ background: 'rgba(18, 14, 11, 0.85)' }}
      >
        <div className="w-4 h-[3px] rounded-full" style={{ background: 'rgba(255, 255, 255, 0.45)' }} />
        <div className="w-3 h-[2px] rounded-full" style={{ background: 'rgba(255, 255, 255, 0.25)' }} />
      </div>
      <div className="w-9 h-1.5 rounded-full mt-1 blur-[2px]" style={{ background: 'rgba(0, 0, 0, 0.3)' }} />
    </div>
  )
}

/* Step 1 — a phone photo drops into the viewfinder */
function UploadVignette({ active, playing, reduced }: VignetteProps) {
  return (
    <div className={VIGNETTE_FRAME}>
      <Grain />
      {/* viewfinder corner brackets */}
      {(
        [
          'top-3 left-3 border-t border-l rounded-tl-[3px]',
          'top-3 right-3 border-t border-r rounded-tr-[3px]',
          'bottom-3 left-3 border-b border-l rounded-bl-[3px]',
          'bottom-3 right-3 border-b border-r rounded-br-[3px]',
        ] as const
      ).map((pos) => (
        <span
          key={pos}
          aria-hidden
          className={cn('absolute w-4 h-4', pos)}
          style={{ borderColor: 'color-mix(in srgb, var(--text-primary) 22%, transparent)' }}
        />
      ))}
      {/* dashed drop zone */}
      <div
        aria-hidden
        className="absolute inset-7 rounded-md border border-dashed"
        style={{ borderColor: 'color-mix(in srgb, var(--text-primary) 16%, transparent)' }}
      />
      {/* the photo arriving */}
      <div className="absolute inset-0 flex items-center justify-center">
        <motion.div
          initial={reduced ? { opacity: 0 } : { opacity: 0, y: 72, rotate: 6, scale: 0.85 }}
          animate={active ? { opacity: 1, y: 0, rotate: -3, scale: 1 } : {}}
          transition={
            reduced
              ? { duration: 0.3 }
              : { type: 'spring', stiffness: 150, damping: 17, delay: 0.25 }
          }
        >
          <motion.div
            animate={playing ? { y: [0, -5, 0] } : { y: 0 }}
            transition={{ duration: 4.5, repeat: Infinity, ease: 'easeInOut', delay: 1 }}
            className="relative"
          >
            <div
              className="w-[124px] h-[90px] rounded-md overflow-hidden flex items-end justify-center pb-2"
              style={{ background: APRICOT_SCENE, boxShadow: '0 16px 32px -12px rgba(0, 0, 0, 0.45)' }}
            >
              <ProductBottle scale={0.8} />
            </div>
            <motion.div
              initial={{ opacity: 0, scale: 0.4 }}
              animate={active ? { opacity: 1, scale: 1 } : {}}
              transition={{ type: 'spring', stiffness: 300, damping: 18, delay: reduced ? 0.2 : 0.8 }}
              className="absolute -right-3 -bottom-3 w-9 h-9 rounded-full bg-accent flex items-center justify-center"
              style={{ boxShadow: '0 8px 16px -6px rgba(0, 0, 0, 0.4)' }}
            >
              <Upload className="w-4 h-4 text-white" strokeWidth={2} />
            </motion.div>
          </motion.div>
        </motion.div>
      </div>
    </div>
  )
}

/* Step 2 — the scene library, selection ring gliding between real scenes */
function ScenesVignette({ active, playing, reduced }: VignetteProps) {
  const locale = useLocale()
  const [sel, setSel] = useState(4) // start on the apricot scene

  useEffect(() => {
    if (!playing) return
    const id = setInterval(() => setSel((s) => (s + 1) % PICKER_SCENES.length), 2400)
    return () => clearInterval(id)
  }, [playing])

  const selected = PICKER_SCENES[sel]
  const selectedName = selected
    ? locale === 'hy'
      ? selected.nameHY
      : locale === 'ru'
        ? selected.nameRU
        : selected.name
    : ''

  return (
    <div className={VIGNETTE_FRAME}>
      <Grain />
      <motion.div
        variants={{ hidden: {}, show: { transition: { staggerChildren: 0.07, delayChildren: 0.15 } } }}
        initial="hidden"
        animate={active ? 'show' : 'hidden'}
        className="absolute inset-5 bottom-12 grid grid-cols-3 grid-rows-2 gap-2"
      >
        {PICKER_SCENES.map((scene, i) => (
          <motion.div
            key={scene.id}
            variants={
              reduced
                ? { hidden: { opacity: 0 }, show: { opacity: 1, transition: { duration: 0.3 } } }
                : {
                    hidden: { opacity: 0, y: 18, scale: 0.9 },
                    show: { opacity: 1, y: 0, scale: 1, transition: { duration: 0.45, ease: EASE_SETTLE } },
                  }
            }
            className="relative rounded-[8px]"
            style={{ background: scene.thumbnailGradient, border: '1px solid rgba(255, 255, 255, 0.08)' }}
          >
            {sel === i && (
              <motion.div
                layoutId="how-scene-ring"
                transition={{ type: 'spring', stiffness: 350, damping: 30 }}
                className="absolute inset-0 rounded-[8px] border-2 border-accent"
              >
                <span className="absolute top-1 right-1 w-4 h-4 rounded-full bg-accent flex items-center justify-center">
                  <Check className="w-2.5 h-2.5 text-white" strokeWidth={3} />
                </span>
              </motion.div>
            )}
          </motion.div>
        ))}
      </motion.div>
      {/* scene name readout */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={active ? { opacity: 1 } : {}}
        transition={{ duration: 0.4, delay: 0.6 }}
        className="absolute bottom-3 inset-x-0 flex justify-center"
      >
        <AnimatePresence mode="wait" initial={false}>
          <motion.span
            key={selected?.id ?? 'none'}
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            transition={{ duration: 0.25 }}
            className="text-[11px] font-ui font-medium text-text-secondary bg-bg-base border border-border-default rounded-full px-2.5 py-1 leading-none"
          >
            {selectedName}
          </motion.span>
        </AnimatePresence>
      </motion.div>
    </div>
  )
}

/* Step 3 — the image develops: blur veil lifts, shimmer sweeps, progress fills */
const SPARKS = [
  { pos: 'top-8 left-10', size: 18, delay: 0 },
  { pos: 'top-12 right-12', size: 13, delay: 0.8 },
  { pos: 'bottom-14 left-1/3', size: 11, delay: 1.5 },
] as const

function TransformVignette({ active, playing, reduced }: VignetteProps) {
  return (
    <div className={VIGNETTE_FRAME}>
      <Grain />
      <div className="absolute inset-5 bottom-10 rounded-md overflow-hidden" style={{ background: APRICOT_SCENE }}>
        <div className="absolute inset-0 flex items-end justify-center pb-3">
          <ProductBottle />
        </div>
        {/* developing veil — the image resolves into focus */}
        <motion.div
          initial={{ opacity: 1 }}
          animate={active ? { opacity: 0 } : {}}
          transition={{ duration: reduced ? 0.4 : 1.8, delay: reduced ? 0.1 : 0.5, ease: 'easeOut' }}
          className="absolute inset-0"
          style={{
            backdropFilter: 'blur(16px)',
            WebkitBackdropFilter: 'blur(16px)',
            background: 'color-mix(in srgb, var(--bg-elevated) 55%, transparent)',
          }}
        />
        {playing && <div className="absolute inset-0 processing-shimmer" />}
      </div>
      {/* studio sparks */}
      {SPARKS.map((spark) => (
        <motion.span
          key={spark.pos}
          aria-hidden
          className={cn('absolute text-accent', spark.pos)}
          animate={playing ? { opacity: [0, 1, 0], scale: [0.5, 1, 0.5] } : { opacity: 0 }}
          transition={{ duration: 2.2, repeat: Infinity, delay: spark.delay, ease: 'easeInOut' }}
        >
          <Sparkles style={{ width: spark.size, height: spark.size }} strokeWidth={1.75} />
        </motion.span>
      ))}
      {/* generation progress */}
      <div
        className="absolute left-5 right-5 bottom-5 h-[3px] rounded-full overflow-hidden"
        style={{ background: 'color-mix(in srgb, var(--text-primary) 10%, transparent)' }}
      >
        <motion.div
          initial={{ scaleX: 0 }}
          animate={active ? { scaleX: 1 } : {}}
          transition={{ duration: reduced ? 0.4 : 2.2, delay: 0.4, ease: 'easeOut' }}
          className="h-full w-full origin-left rounded-full bg-accent"
        />
      </div>
    </div>
  )
}

/* Step 4 — before/after slider sweeping on its own */
function CompareVignette({ playing }: VignetteProps) {
  const t = useTranslations('landing')
  // clip and handle share one keyframe spec so they stay in lockstep
  const clipFrames = ['inset(0 0 0 62%)', 'inset(0 0 0 30%)', 'inset(0 0 0 62%)']
  const leftFrames = ['62%', '30%', '62%']
  const sweep = { duration: 7, repeat: Infinity, ease: 'easeInOut' as const, delay: 0.6 }
  const rest = { duration: 0.6, ease: EASE_SETTLE }

  return (
    <div className={VIGNETTE_FRAME}>
      {/* before — the camera-roll photo */}
      <div className="absolute inset-0" style={{ background: BEFORE_SCENE }}>
        <div className="absolute inset-0 flex items-end justify-center pb-6">
          <ProductBottle />
        </div>
        <span
          className="absolute top-3 left-3 rounded-full px-2.5 py-1 text-[10px] font-ui font-semibold uppercase tracking-wide leading-none"
          style={{ background: 'rgba(0, 0, 0, 0.45)', color: 'rgba(255, 255, 255, 0.85)' }}
        >
          {t('before')}
        </span>
      </div>
      {/* after — the studio shot, revealed by the clip */}
      <motion.div
        initial={{ clipPath: 'inset(0 0 0 62%)' }}
        animate={playing ? { clipPath: clipFrames } : { clipPath: 'inset(0 0 0 55%)' }}
        transition={playing ? sweep : rest}
        className="absolute inset-0"
        style={{ background: APRICOT_SCENE }}
      >
        <div className="absolute inset-0 flex items-end justify-center pb-6">
          <ProductBottle />
        </div>
        <span className="absolute top-3 right-3 rounded-full px-2.5 py-1 text-[10px] font-ui font-semibold uppercase tracking-wide leading-none bg-accent text-white">
          {t('after')}
        </span>
      </motion.div>
      <Grain />
      {/* drag handle */}
      <motion.div
        initial={{ left: '62%' }}
        animate={playing ? { left: leftFrames } : { left: '55%' }}
        transition={playing ? sweep : rest}
        className="absolute top-0 bottom-0 z-10"
      >
        <div
          className="absolute inset-y-0 w-[2px] -translate-x-1/2"
          style={{ background: 'rgba(255, 255, 255, 0.9)', boxShadow: '0 0 8px rgba(0, 0, 0, 0.35)' }}
        />
        <div
          className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 w-7 h-7 rounded-full flex items-center justify-center"
          style={{ background: 'rgba(255, 255, 255, 0.95)', boxShadow: '0 4px 12px rgba(0, 0, 0, 0.35)' }}
        >
          <ChevronsLeftRight className="w-3.5 h-3.5" style={{ color: 'rgba(0, 0, 0, 0.65)' }} strokeWidth={2.5} />
        </div>
      </motion.div>
    </div>
  )
}

/* Step 5 — HD download hub with platforms gathering around it */
const EXPORT_CHIPS = [
  { label: 'Wildberries', pos: 'top-4 left-4', delay: 0.45, float: 3.8 },
  { label: 'Instagram', pos: 'top-4 right-4', delay: 0.6, float: 4.4 },
  { label: 'Ozon', pos: 'bottom-4 left-6', delay: 0.75, float: 4.0 },
  { label: 'list.am', pos: 'bottom-4 right-6', delay: 0.9, float: 4.8 },
] as const

function ExportVignette({ active, playing, reduced }: VignetteProps) {
  return (
    <div className={VIGNETTE_FRAME}>
      <Grain />
      <div aria-hidden className="absolute inset-0 flex items-center justify-center">
        <div
          className="w-44 h-44 rounded-full"
          style={{
            background:
              'radial-gradient(50% 50% at 50% 50%, color-mix(in srgb, var(--accent) 18%, transparent), transparent 70%)',
          }}
        />
      </div>
      <div className="absolute inset-0 flex items-center justify-center">
        <motion.div
          initial={reduced ? { opacity: 0 } : { opacity: 0, scale: 0.5 }}
          animate={active ? { opacity: 1, scale: 1 } : {}}
          transition={{ type: 'spring', stiffness: 240, damping: 17, delay: 0.15 }}
          className="relative w-16 h-16 rounded-lg bg-accent flex items-center justify-center"
          style={{ boxShadow: '0 16px 32px -10px rgba(0, 0, 0, 0.45)' }}
        >
          <Download className="w-6 h-6 text-white" strokeWidth={2} />
          <span
            className="absolute -top-2 -right-2 rounded-full px-1.5 py-0.5 text-[9px] font-ui font-semibold leading-none"
            style={{ background: 'rgba(255, 255, 255, 0.95)', color: 'var(--accent)' }}
          >
            HD
          </span>
        </motion.div>
      </div>
      {playing && (
        <motion.div
          aria-hidden
          className="absolute left-1/2 top-1/2 w-16 h-16 -ml-8 -mt-8 rounded-lg border border-accent"
          animate={{ scale: [1, 1.6], opacity: [0.5, 0] }}
          transition={{ duration: 2.4, repeat: Infinity, ease: 'easeOut', delay: 0.8 }}
        />
      )}
      {EXPORT_CHIPS.map((chip) => (
        <motion.span
          key={chip.label}
          className={cn('absolute', chip.pos)}
          initial={reduced ? { opacity: 0 } : { opacity: 0, scale: 0.6 }}
          animate={active ? { opacity: 1, scale: 1 } : {}}
          transition={{ type: 'spring', stiffness: 260, damping: 20, delay: chip.delay }}
        >
          <motion.span
            animate={playing ? { y: [0, -4, 0] } : { y: 0 }}
            transition={{ duration: chip.float, repeat: Infinity, ease: 'easeInOut' }}
            className="inline-flex items-center gap-1 rounded-full border border-border-default bg-bg-base px-2.5 py-1 text-[11px] font-ui font-medium text-text-secondary leading-none"
            style={{ boxShadow: '0 6px 16px -8px rgba(0, 0, 0, 0.4)' }}
          >
            <Check className="w-3 h-3 text-accent" strokeWidth={2.5} />
            {chip.label}
          </motion.span>
        </motion.span>
      ))}
    </div>
  )
}

type StepDef = {
  num: string
  Icon: LucideIcon
  title: string
  desc: string
  Vignette: ComponentType<VignetteProps>
}

function StepRow({ step, index, isLast }: { step: StepDef; index: number; isLast: boolean }) {
  const ref = useRef<HTMLDivElement>(null)
  const entered = useInView(ref, { once: true, amount: 0.35 })
  const onScreen = useInView(ref, { amount: 0.35 })
  const reduced = Boolean(useReducedMotion())
  const playing = onScreen && !reduced
  const flip = index % 2 === 1
  const { Icon, Vignette } = step

  const enter = (delay: number) => ({
    initial: reduced ? { opacity: 0 } : { opacity: 0, y: 32 },
    animate: entered ? { opacity: 1, y: 0 } : {},
    transition: reduced ? { duration: 0.3 } : { duration: 0.65, ease: EASE_SETTLE, delay },
  })

  return (
    <div ref={ref} className={cn('relative pl-16 lg:pl-0', isLast ? 'pb-0' : 'pb-14 lg:pb-24')}>
      {/* beam node — lights up as the step enters */}
      <div className="absolute left-0 top-1 lg:left-1/2 lg:top-1/2 lg:-translate-x-1/2 lg:-translate-y-1/2 z-10">
        <div className="relative w-10 h-10 rounded-full border border-border-default bg-bg-elevated flex items-center justify-center">
          <Icon className="w-[18px] h-[18px] text-text-muted" strokeWidth={1.75} />
          <motion.div
            initial={{ opacity: 0, scale: 0.6 }}
            animate={entered ? { opacity: 1, scale: 1 } : {}}
            transition={{ duration: 0.4, ease: EASE_SETTLE, delay: 0.1 }}
            className="absolute inset-0 rounded-full bg-accent flex items-center justify-center"
          >
            <Icon className="w-[18px] h-[18px] text-white" strokeWidth={1.75} />
          </motion.div>
          {entered && !reduced && (
            <motion.span
              aria-hidden
              className="absolute inset-0 rounded-full border border-accent"
              initial={{ opacity: 0.7, scale: 1 }}
              animate={{ opacity: 0, scale: 1.9 }}
              transition={{ duration: 0.9, ease: 'easeOut', delay: 0.15 }}
            />
          )}
        </div>
      </div>

      <div className="lg:grid lg:grid-cols-2 lg:gap-x-24 lg:items-center">
        {/* vignette */}
        <motion.div {...enter(0)} className={cn('relative', flip && 'lg:order-2')}>
          <div
            aria-hidden
            className="absolute -inset-6 pointer-events-none"
            style={{
              background:
                'radial-gradient(60% 60% at 50% 50%, color-mix(in srgb, var(--accent) 6%, transparent), transparent 75%)',
            }}
          />
          <Vignette active={entered} playing={playing} reduced={reduced} />
        </motion.div>

        {/* copy */}
        <motion.div {...enter(0.12)} className={cn('relative mt-6 lg:mt-0', flip && 'lg:order-1 lg:text-right')}>
          <span
            aria-hidden
            className={cn(
              'pointer-events-none select-none absolute -top-12 lg:-top-16 left-0 font-display font-semibold text-[88px] lg:text-[120px] leading-none',
              flip && 'lg:left-auto lg:right-0'
            )}
            style={{ color: 'color-mix(in srgb, var(--text-primary) 5%, transparent)' }}
          >
            {step.num}
          </span>
          <div className={cn('relative flex items-center gap-3 mb-3', flip && 'lg:flex-row-reverse lg:justify-start')}>
            <span className="text-[12px] font-ui font-semibold tracking-[0.2em] text-accent">{step.num}</span>
            <span aria-hidden className="h-px w-8 bg-accent-border" />
          </div>
          <h3 className="relative font-display font-semibold text-[20px] lg:text-[22px] leading-snug text-text-primary mb-2">
            {step.title}
          </h3>
          <p className="relative font-ui text-sm lg:text-[15px] leading-relaxed text-text-secondary">
            {step.desc}
          </p>
        </motion.div>
      </div>
    </div>
  )
}

export function HowItWorks() {
  const t = useTranslations('landing')
  const reduced = Boolean(useReducedMotion())

  const headerRef = useRef<HTMLDivElement>(null)
  const headerInView = useInView(headerRef, { once: true, amount: 0.5 })
  const trackRef = useRef<HTMLDivElement>(null)

  // The beam fills as the story scrolls past — spring-smoothed for momentum
  const { scrollYProgress } = useScroll({ target: trackRef, offset: ['start 0.8', 'end 0.6'] })
  const beamProgress = useSpring(scrollYProgress, { stiffness: 60, damping: 20, restDelta: 0.001 })

  const headerEnter = (delay: number) => ({
    initial: reduced ? { opacity: 0 } : { opacity: 0, y: 24 },
    animate: headerInView ? { opacity: 1, y: 0 } : {},
    transition: reduced ? { duration: 0.3 } : { duration: 0.6, ease: EASE_SETTLE, delay },
  })

  const steps: StepDef[] = [
    { num: '01', Icon: Upload, title: t('how_step1_title'), desc: t('how_step1_desc'), Vignette: UploadVignette },
    { num: '02', Icon: Layers, title: t('how_step2_title'), desc: t('how_step2_desc'), Vignette: ScenesVignette },
    { num: '03', Icon: Sparkles, title: t('how_step3_title'), desc: t('how_step3_desc'), Vignette: TransformVignette },
    { num: '04', Icon: SlidersHorizontal, title: t('how_step4_title'), desc: t('how_step4_desc'), Vignette: CompareVignette },
    { num: '05', Icon: Download, title: t('how_step5_title'), desc: t('how_step5_desc'), Vignette: ExportVignette },
  ]

  return (
    <section className="relative overflow-hidden bg-[var(--bg-base)] px-4 py-20 lg:py-28">
      <div ref={headerRef} className="relative max-w-[560px] mx-auto text-center mb-14 lg:mb-20">
        <motion.div {...headerEnter(0)} className="flex justify-center mb-4">
          <p className="inline-flex items-center gap-1.5 bg-[var(--accent-subtle)] border border-[var(--accent-border)] rounded-full px-3.5 py-1.5">
            <span aria-hidden className="w-1.5 h-1.5 rounded-full bg-[var(--accent)]" />
            <span className="text-[12px] font-ui font-semibold text-accent uppercase tracking-[0.12em]">
              {t('how_eyebrow')}
            </span>
          </p>
        </motion.div>
        <motion.h2
          {...headerEnter(0.08)}
          className="font-display font-semibold text-[28px] lg:text-[34px] text-text-primary text-balance mb-3"
        >
          {t('how_title')}
        </motion.h2>
        <motion.p {...headerEnter(0.16)} className="font-ui text-base text-text-secondary leading-relaxed">
          {t('how_subtitle')}
        </motion.p>
      </div>

      <div ref={trackRef} className="relative mx-auto max-w-[520px] lg:max-w-[1024px]">
        {/* beam track */}
        <div
          aria-hidden
          className="absolute top-1 bottom-1 left-5 lg:left-1/2 w-px -translate-x-1/2 bg-border-default"
        />
        {/* scroll-linked fill */}
        <motion.div
          aria-hidden
          style={{
            scaleY: reduced ? 1 : beamProgress,
            background: 'linear-gradient(to bottom, var(--accent-hover), var(--accent))',
            boxShadow: '0 0 14px color-mix(in srgb, var(--accent) 45%, transparent)',
          }}
          className="absolute top-1 bottom-1 left-5 lg:left-1/2 w-px -translate-x-1/2 origin-top"
        />
        {steps.map((step, i) => (
          <StepRow key={step.num} step={step} index={i} isLast={i === steps.length - 1} />
        ))}
      </div>
    </section>
  )
}
