'use client'

import { useEffect, useState } from 'react'
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion'
import { useTranslations } from 'next-intl'
import { ImageOff } from 'lucide-react'
import { cn } from '@/lib/utils'

const CDN = process.env.NEXT_PUBLIC_CDN_URL ?? ''

const SHOWCASE_CARDS = [
  { id: 'jewelry',   catKey: 'cat_jewelry', beforeImage: `${CDN}/showcase/jewelry-before.webp`,  afterImage: `${CDN}/showcase/jewelry-after.jpg` },
  { id: 'cosmetics', catKey: 'cat_beauty',  beforeImage: `${CDN}/showcase/beauty-before.webp`,   afterImage: `${CDN}/showcase/beauty-after.jpg` },
  { id: 'food',      catKey: 'cat_food',    beforeImage: `${CDN}/showcase/food-before.webp`,     afterImage: `${CDN}/showcase/food-after.jpg` },
  { id: 'fashion',   catKey: 'cat_fashion', beforeImage: `${CDN}/showcase/fashion-before.avif`,  afterImage: `${CDN}/showcase/fashion-after.jpg` },
]

const CYCLE_MS = 5000

/**
 * Landing-page result gallery. Auto-advancing spotlight of after-results
 * with a small "before" polaroid peek — replaces the interactive
 * before/after slider on the landing page only.
 */
export function ShowcaseGallery({ visible }: { visible: boolean }) {
  const t = useTranslations('landing')
  const tScenes = useTranslations('scenes')
  const reducedMotion = useReducedMotion()
  const [active, setActive] = useState(0)
  const [hovered, setHovered] = useState(false)

  const autoplay = Boolean(CDN) && visible && !hovered && !reducedMotion

  useEffect(() => {
    if (!autoplay) return
    const id = setTimeout(() => setActive((i) => (i + 1) % SHOWCASE_CARDS.length), CYCLE_MS)
    return () => clearTimeout(id)
  }, [active, autoplay])

  // Warm the cache so crossfades never reveal a half-loaded image
  useEffect(() => {
    if (!CDN || !visible) return
    SHOWCASE_CARDS.forEach((card) => {
      new window.Image().src = card.afterImage
      new window.Image().src = card.beforeImage
    })
  }, [visible])

  if (!CDN) {
    return (
      <div className="max-w-[380px] mx-auto aspect-square bg-bg-elevated rounded-2xl flex flex-col items-center justify-center gap-3">
        <ImageOff className="w-8 h-8 text-text-muted" />
        <p className="text-sm font-ui text-text-muted text-center px-6">
          Add showcase images to S3 showcase/
        </p>
      </div>
    )
  }

  const card = SHOWCASE_CARDS[active]!

  return (
    <div
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      {/* ---------- Mobile / tablet: spotlight stage ---------- */}
      <div className="lg:hidden relative max-w-[400px] mx-auto">
        {/* Ambient accent glow behind the stage */}
        <div
          aria-hidden
          className="absolute -inset-10 pointer-events-none"
          style={{
            background:
              'radial-gradient(55% 55% at 50% 42%, color-mix(in srgb, var(--accent) 13%, transparent), transparent 72%)',
          }}
        />

        <div className="relative">
          <div className="relative aspect-square rounded-[20px] overflow-hidden border border-[var(--border-default)] bg-[var(--bg-elevated)]">
            <AnimatePresence mode="sync" initial={false}>
              <motion.img
                key={card.id}
                src={card.afterImage}
                alt={tScenes(card.catKey)}
                initial={{ opacity: 0, scale: reducedMotion ? 1 : 1.07 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0 }}
                transition={
                  reducedMotion
                    ? { duration: 0.2 }
                    : {
                        opacity: { duration: 0.7, ease: 'easeOut' },
                        scale: { duration: CYCLE_MS / 1000 + 0.6, ease: [0.22, 1, 0.36, 1] },
                      }
                }
                className="absolute inset-0 w-full h-full object-cover"
              />
            </AnimatePresence>

            {/* Category chip — glass pill over the image */}
            <motion.div
              key={`chip-${card.id}`}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: reducedMotion ? 0.2 : 0.45, ease: 'easeOut', delay: reducedMotion ? 0 : 0.25 }}
              className="absolute top-3 left-3 flex items-center gap-1.5 bg-black/45 backdrop-blur-md rounded-full px-3 py-1.5"
            >
              <span aria-hidden className="w-1.5 h-1.5 rounded-full bg-[var(--accent)]" />
              <span className="text-[11px] font-ui font-semibold text-white uppercase tracking-[0.08em]">
                {tScenes(card.catKey)}
              </span>
            </motion.div>
          </div>

          {/* "Before" polaroid peek — breaks the frame bottom-left */}
          <motion.div
            key={`peek-${card.id}`}
            initial={reducedMotion ? { opacity: 0 } : { opacity: 0, y: 14, rotate: -10 }}
            animate={reducedMotion ? { opacity: 1 } : { opacity: 1, y: 0, rotate: -5 }}
            transition={
              reducedMotion
                ? { duration: 0.2 }
                : { type: 'spring', stiffness: 260, damping: 22, delay: 0.4 }
            }
            className="absolute -bottom-5 left-3 w-[92px] rounded-xl bg-[var(--bg-elevated)] border border-[var(--border-default)] p-1 pb-0"
            style={{ boxShadow: '0 10px 28px rgba(0,0,0,0.35)' }}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={card.beforeImage}
              alt={t('before')}
              className="w-full aspect-square object-cover rounded-lg"
            />
            <p className="text-[10px] font-ui font-medium text-text-muted text-center py-1 leading-none">
              {t('before')}
            </p>
          </motion.div>
        </div>

        {/* Thumbnail rail */}
        <div className="flex justify-center gap-2 mt-9" role="tablist" aria-label={t('showcase_title')}>
          {SHOWCASE_CARDS.map((thumb, idx) => {
            const isActive = idx === active
            return (
              <button
                key={thumb.id}
                type="button"
                role="tab"
                aria-selected={isActive}
                aria-label={tScenes(thumb.catKey)}
                onClick={() => setActive(idx)}
                className={cn(
                  'relative w-[52px] h-[52px] rounded-[10px] overflow-hidden border-2 transition-all duration-300',
                  isActive
                    ? 'border-[var(--accent)] opacity-100'
                    : 'border-transparent opacity-50 saturate-50 hover:opacity-80'
                )}
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={thumb.afterImage}
                  alt=""
                  className="absolute inset-0 w-full h-full object-cover"
                />
                {isActive && autoplay && (
                  <motion.span
                    key={`progress-${active}`}
                    initial={{ width: '0%' }}
                    animate={{ width: '100%' }}
                    transition={{ duration: CYCLE_MS / 1000, ease: 'linear' }}
                    className="absolute bottom-0 left-0 h-[3px] bg-[var(--accent)]"
                  />
                )}
              </button>
            )
          })}
        </div>
      </div>

      {/* ---------- Desktop: expanding accordion ---------- */}
      <div className="hidden lg:flex relative gap-3 h-[440px] max-w-[920px] mx-auto">
        {/* Ambient accent glow behind the panels */}
        <div
          aria-hidden
          className="absolute -inset-12 pointer-events-none"
          style={{
            background:
              'radial-gradient(50% 60% at 50% 45%, color-mix(in srgb, var(--accent) 10%, transparent), transparent 72%)',
          }}
        />

        {SHOWCASE_CARDS.map((panel, idx) => {
          const isActive = idx === active
          return (
            <motion.button
              key={panel.id}
              type="button"
              onClick={() => setActive(idx)}
              aria-label={tScenes(panel.catKey)}
              aria-current={isActive}
              animate={{ flexGrow: isActive ? 3.2 : 1 }}
              transition={
                reducedMotion
                  ? { duration: 0 }
                  : { duration: 0.8, ease: [0.32, 0.72, 0, 1] }
              }
              className={cn(
                'relative basis-0 min-w-0 overflow-hidden rounded-[20px] border text-left',
                isActive
                  ? 'border-[var(--accent-border)]'
                  : 'border-[var(--border-default)] hover:border-[var(--border-hover)]'
              )}
              style={{ flexGrow: isActive ? 3.2 : 1 }}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={panel.afterImage}
                alt=""
                className={cn(
                  'absolute inset-0 w-full h-full object-cover transition-[filter,opacity] duration-700',
                  isActive ? 'opacity-100 saturate-100' : 'opacity-70 saturate-[0.6]'
                )}
              />

              {/* Legibility scrim over the photo */}
              <div
                aria-hidden
                className="absolute inset-x-0 bottom-0 h-[40%]"
                style={{ background: 'linear-gradient(to top, rgba(0,0,0,0.55), transparent)' }}
              />

              {/* Category label */}
              <div className="absolute bottom-4 left-4 right-4 flex items-end justify-between gap-3">
                <span className="flex items-center gap-1.5 min-w-0">
                  <span
                    aria-hidden
                    className={cn(
                      'w-1.5 h-1.5 rounded-full shrink-0 transition-colors duration-500',
                      isActive ? 'bg-[var(--accent)]' : 'bg-white/40'
                    )}
                  />
                  <span className="text-[12px] font-ui font-semibold text-white uppercase tracking-[0.08em] truncate">
                    {tScenes(panel.catKey)}
                  </span>
                </span>

                {/* "Before" peek — only inside the expanded panel */}
                <AnimatePresence>
                  {isActive && (
                    <motion.span
                      initial={reducedMotion ? { opacity: 0 } : { opacity: 0, y: 14, rotate: -8 }}
                      animate={reducedMotion ? { opacity: 1 } : { opacity: 1, y: 0, rotate: -4 }}
                      exit={{ opacity: 0, transition: { duration: 0.2 } }}
                      transition={
                        reducedMotion
                          ? { duration: 0.2 }
                          : { type: 'spring', stiffness: 260, damping: 22, delay: 0.35 }
                      }
                      className="block w-[88px] shrink-0 rounded-xl bg-[var(--bg-elevated)] border border-[var(--border-default)] p-1 pb-0"
                      style={{ boxShadow: '0 10px 28px rgba(0,0,0,0.4)' }}
                    >
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={panel.beforeImage}
                        alt={t('before')}
                        className="w-full aspect-square object-cover rounded-lg"
                      />
                      <span className="block text-[10px] font-ui font-medium text-text-muted text-center py-1 leading-none">
                        {t('before')}
                      </span>
                    </motion.span>
                  )}
                </AnimatePresence>
              </div>

              {/* Autoplay progress along the bottom of the active panel */}
              {isActive && autoplay && (
                <motion.span
                  key={`progress-${active}`}
                  initial={{ width: '0%' }}
                  animate={{ width: '100%' }}
                  transition={{ duration: CYCLE_MS / 1000, ease: 'linear' }}
                  className="absolute bottom-0 left-0 h-[3px] bg-[var(--accent)]"
                />
              )}
            </motion.button>
          )
        })}
      </div>
    </div>
  )
}
