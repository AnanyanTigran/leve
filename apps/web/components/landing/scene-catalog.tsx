'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { AnimatePresence, motion, useInView, useReducedMotion } from 'framer-motion'
import { useLocale, useTranslations } from 'next-intl'
import { useRouter } from 'next/navigation'
import type { Scene, SceneGroup } from '@leve/types'
import { SCENES } from '@/lib/constants'
import { cn } from '@/lib/utils'

// Curated strip for the "All" view — alternating light/dark backdrops for rhythm
const FEATURED_SCENE_IDS = [
  'marble_luxury', 'black_studio', 'apricot_warm', 'velvet_dark',
  'water_ripple', 'cafe_table', 'spring_bloom', 'editorial_dark',
  'light_wood', 'pomegranate_luxe', 'silk_pearls', 'neon_glow',
]

const FEATURED_SCENES = FEATURED_SCENE_IDS
  .map((id) => SCENES.find((s) => s.id === id))
  .filter((s): s is Scene => Boolean(s))

const GROUP_FILTERS: { id: SceneGroup | 'all'; tKey: string }[] = [
  { id: 'all',                tKey: 'scene_group_all' },
  { id: 'studio',             tKey: 'scene_group_studio' },
  { id: 'lifestyle_surfaces', tKey: 'scene_group_surfaces' },
  { id: 'environment',        tKey: 'scene_group_environment' },
  { id: 'seasonal',           tKey: 'scene_group_seasonal' },
  { id: 'creative',           tKey: 'scene_group_creative' },
]

const GROUP_LABEL_KEY: Record<SceneGroup, string> = {
  studio:             'scene_group_studio',
  lifestyle_surfaces: 'scene_group_surfaces',
  environment:        'scene_group_environment',
  seasonal:           'scene_group_seasonal',
  creative:           'scene_group_creative',
}

const EASE_SETTLE: [number, number, number, number] = [0.22, 1, 0.36, 1]
const SPRING_LIFT = { type: 'spring' as const, stiffness: 280, damping: 22 }

// Photographic grain — SVG turbulence as a data URI, blended over the gradient
const GRAIN_TEXTURE =
  "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='160' height='160'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='2' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E\")"

function SceneCard({
  scene,
  index,
  sweepActive,
  reducedMotion,
  onSelect,
}: {
  scene: Scene
  index: number
  sweepActive: boolean
  reducedMotion: boolean | null
  onSelect: () => void
}) {
  const t = useTranslations('landing')
  const locale = useLocale()
  const name = locale === 'hy' ? scene.nameHY : locale === 'ru' ? scene.nameRU : scene.name

  return (
    <motion.div
      variants={
        reducedMotion
          ? { hidden: { opacity: 0 }, show: { opacity: 1, transition: { duration: 0.3 } } }
          : {
              hidden: { opacity: 0, y: 32, scale: 0.94 },
              show: { opacity: 1, y: 0, scale: 1, transition: { duration: 0.55, ease: EASE_SETTLE } },
            }
      }
      className={cn('snap-start flex-shrink-0', index % 2 === 1 && 'mt-5')}
    >
      <motion.button
        type="button"
        onClick={onSelect}
        aria-label={name}
        initial="rest"
        animate="rest"
        whileHover={reducedMotion ? undefined : 'hover'}
        whileTap={reducedMotion ? undefined : { scale: 0.97 }}
        variants={{
          rest:  { y: 0, boxShadow: '0 8px 24px -16px rgba(0,0,0,0.5)' },
          hover: { y: -6, boxShadow: '0 20px 40px -16px rgba(0,0,0,0.55)', transition: SPRING_LIFT },
        }}
        className="relative block w-[150px] h-[200px] md:w-[170px] md:h-[226px] rounded-2xl overflow-hidden text-left"
      >
        {/* Backdrop — the scene gradient, zooms gently on hover */}
        <motion.div
          aria-hidden
          variants={{ rest: { scale: 1 }, hover: { scale: 1.09, transition: SPRING_LIFT } }}
          className="absolute inset-0"
          style={{ background: scene.thumbnailGradient }}
        />

        {/* Overhead studio spotlight */}
        <motion.div
          aria-hidden
          variants={{ rest: { opacity: 0.7 }, hover: { opacity: 1 } }}
          className="absolute inset-0"
          style={{
            background:
              'radial-gradient(85% 60% at 50% -12%, rgba(255,255,255,0.34), transparent 70%)',
          }}
        />

        {/* Floor scrim — grounds the set and keeps the caption readable on light backdrops */}
        <div
          aria-hidden
          className="absolute inset-0"
          style={{
            background:
              'linear-gradient(to top, rgba(8,8,8,0.66), rgba(8,8,8,0.22) 36%, transparent 58%)',
          }}
        />

        {/* Film grain */}
        <div
          aria-hidden
          className="absolute inset-0 mix-blend-overlay opacity-40"
          style={{ backgroundImage: GRAIN_TEXTURE }}
        />

        {/* Panning light sweep — studio lights moving across the set */}
        {sweepActive && !reducedMotion && (
          <motion.div
            aria-hidden
            className="absolute inset-y-0 w-[55%]"
            style={{
              background:
                'linear-gradient(105deg, transparent, rgba(255,255,255,0.16) 50%, transparent)',
              skewX: -12,
            }}
            initial={{ x: '-160%' }}
            animate={{ x: '320%' }}
            transition={{
              duration: 1.8,
              ease: 'easeInOut',
              repeat: Infinity,
              repeatDelay: 6.5,
              delay: index * 0.55,
            }}
          />
        )}

        {/* Inner edge highlight — gives the card a physical, printed feel */}
        <div
          aria-hidden
          className="absolute inset-0 rounded-2xl"
          style={{ boxShadow: 'inset 0 0 0 1px rgba(255,255,255,0.09)' }}
        />

        {/* Catalog index */}
        <span className="absolute top-2.5 left-2.5 rounded-full bg-[rgba(8,8,8,0.4)] backdrop-blur-sm px-2 py-0.5 text-[10px] font-ui font-semibold tracking-[0.14em] text-white/80">
          {String(index + 1).padStart(2, '0')}
        </span>

        {/* Caption */}
        <div className="absolute inset-x-0 bottom-0 p-3">
          <p className="text-[9px] font-ui font-semibold uppercase tracking-[0.16em] text-white/55 mb-0.5">
            {t(GROUP_LABEL_KEY[scene.group])}
          </p>
          <p className="text-[13px] font-ui font-semibold text-white leading-tight">
            {name}
          </p>
        </div>
      </motion.button>
    </motion.div>
  )
}

export function SceneCatalog() {
  const router = useRouter()
  const t = useTranslations('landing')
  const reducedMotion = useReducedMotion()

  const sectionRef = useRef<HTMLDivElement>(null)
  const stripRef = useRef<HTMLDivElement>(null)
  const inView = useInView(sectionRef, { once: true, amount: 0.15 })
  // Live visibility — pauses the ambient light sweeps when scrolled away
  const visible = useInView(sectionRef, { once: false, amount: 0.2 })

  const [activeGroup, setActiveGroup] = useState<SceneGroup | 'all'>('all')

  const groupCounts = useMemo(() => {
    const counts = { all: SCENES.length } as Record<SceneGroup | 'all', number>
    for (const scene of SCENES) {
      counts[scene.group] = (counts[scene.group] ?? 0) + 1
    }
    return counts
  }, [])

  const shownScenes = useMemo(
    () => (activeGroup === 'all' ? FEATURED_SCENES : SCENES.filter((s) => s.group === activeGroup)),
    [activeGroup]
  )

  // Rewind the strip when switching collections
  useEffect(() => {
    stripRef.current?.scrollTo({ left: 0, behavior: reducedMotion ? 'auto' : 'smooth' })
  }, [activeGroup, reducedMotion])

  function goToUpload() {
    router.push('/upload')
  }

  return (
    <div ref={sectionRef}>
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={inView ? { opacity: 1, y: 0 } : {}}
        transition={{ duration: 0.5, ease: 'easeOut' }}
        className="max-w-[560px] mx-auto"
      >
        <div className="flex justify-center mb-4">
          <p className="inline-flex items-center gap-1.5 bg-[var(--accent-subtle)] border border-[var(--accent-border)] rounded-full px-3.5 py-1.5">
            <span aria-hidden className="w-1.5 h-1.5 rounded-full bg-[var(--accent)]" />
            <span className="text-[12px] font-ui font-semibold text-accent uppercase tracking-[0.12em]">
              {t('scenes_eyebrow')}
            </span>
          </p>
        </div>
        <h2 className="font-display text-[28px] font-semibold text-text-primary text-center mb-2">
          {t('scenes_title')}
        </h2>
        <p className="text-sm font-ui text-text-secondary text-center mb-7">
          {t('scenes_subtitle')}
        </p>
      </motion.div>

      {/* Collection filter chips */}
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={inView ? { opacity: 1, y: 0 } : {}}
        transition={{ duration: 0.5, ease: 'easeOut', delay: 0.1 }}
        className="-mx-4 overflow-x-auto no-scrollbar mb-6"
      >
        <div className="flex gap-2 px-4 w-max mx-auto" role="group" aria-label={t('scenes_eyebrow')}>
          {GROUP_FILTERS.map((filter) => {
            const active = activeGroup === filter.id
            return (
              <button
                key={filter.id}
                type="button"
                aria-pressed={active}
                onClick={() => setActiveGroup(filter.id)}
                className={cn(
                  'inline-flex items-center gap-1.5 min-h-[48px] px-4 rounded-full border text-sm font-ui font-medium whitespace-nowrap transition-colors duration-150',
                  active
                    ? 'bg-[var(--accent-subtle)] border-[var(--accent-border)] text-accent'
                    : 'bg-transparent border-[var(--border)] text-text-secondary hover:border-[var(--border-hover)] hover:text-text-primary'
                )}
              >
                {t(filter.tKey)}
                <span
                  className={cn(
                    'text-[11px] font-semibold tabular-nums',
                    active ? 'text-accent' : 'text-text-muted'
                  )}
                >
                  {groupCounts[filter.id] ?? 0}
                </span>
              </button>
            )
          })}
        </div>
      </motion.div>

      {/* Backdrop strip */}
      <div className="relative -mx-4">
        {/* Edge fades — the catalog continues past the frame */}
        <div
          aria-hidden
          className="pointer-events-none absolute inset-y-0 left-0 w-8 z-10"
          style={{ background: 'linear-gradient(to right, var(--bg-surface), transparent)' }}
        />
        <div
          aria-hidden
          className="pointer-events-none absolute inset-y-0 right-0 w-8 z-10"
          style={{ background: 'linear-gradient(to left, var(--bg-surface), transparent)' }}
        />

        <div ref={stripRef} className="overflow-x-auto no-scrollbar snap-x snap-mandatory">
          <AnimatePresence mode="wait" initial={false}>
            <motion.div
              key={activeGroup}
              variants={{ hidden: {}, show: { transition: { staggerChildren: 0.05 } } }}
              initial="hidden"
              animate={inView ? 'show' : 'hidden'}
              exit={{ opacity: 0, transition: { duration: 0.15 } }}
              className="flex gap-3.5 px-4 pt-1 pb-8 w-max mx-auto"
            >
              {shownScenes.map((scene, index) => (
                <SceneCard
                  key={scene.id}
                  scene={scene}
                  index={index}
                  sweepActive={visible}
                  reducedMotion={reducedMotion}
                  onSelect={goToUpload}
                />
              ))}

              {/* Terminal CTA card — the catalog goes deeper */}
              <motion.div
                variants={
                  reducedMotion
                    ? { hidden: { opacity: 0 }, show: { opacity: 1, transition: { duration: 0.3 } } }
                    : {
                        hidden: { opacity: 0, y: 32, scale: 0.94 },
                        show: { opacity: 1, y: 0, scale: 1, transition: { duration: 0.55, ease: EASE_SETTLE } },
                      }
                }
                className={cn('snap-start flex-shrink-0', shownScenes.length % 2 === 1 && 'mt-5')}
              >
                <motion.button
                  type="button"
                  onClick={goToUpload}
                  whileHover={reducedMotion ? undefined : { y: -6, transition: SPRING_LIFT }}
                  whileTap={reducedMotion ? undefined : { scale: 0.97 }}
                  className="relative flex flex-col items-center justify-center gap-1 w-[150px] h-[200px] md:w-[170px] md:h-[226px] rounded-2xl border border-[var(--accent-border)] bg-[var(--accent-subtle)] px-4 text-center"
                >
                  <span className="font-display text-[40px] font-semibold leading-none text-accent tabular-nums">
                    {SCENES.length}
                  </span>
                  <span className="text-[11px] font-ui font-semibold uppercase tracking-[0.14em] text-accent/80">
                    {t('scenes_count_label', { count: SCENES.length })}
                  </span>
                  <span className="mt-2 text-[13px] font-ui font-medium text-text-primary leading-snug">
                    {t('scenes_cta_title')}
                  </span>
                </motion.button>
              </motion.div>
            </motion.div>
          </AnimatePresence>
        </div>
      </div>

      {/* Section CTA */}
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={inView ? { opacity: 1, y: 0 } : {}}
        transition={{ duration: 0.5, ease: 'easeOut', delay: 0.25 }}
        className="flex justify-center mt-2"
      >
        <motion.button
          type="button"
          onClick={goToUpload}
          whileHover={reducedMotion ? undefined : { scale: 1.03, y: -2, transition: SPRING_LIFT }}
          whileTap={reducedMotion ? undefined : { scale: 0.97 }}
          className="inline-flex items-center justify-center min-h-[48px] px-8 rounded-full border border-[var(--accent-border)] bg-transparent text-sm font-ui font-semibold text-accent hover:bg-[var(--accent-subtle)] transition-colors duration-150"
        >
          {t('scenes_see_all', { count: SCENES.length })}
        </motion.button>
      </motion.div>
    </div>
  )
}
