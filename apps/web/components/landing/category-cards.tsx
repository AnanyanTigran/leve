'use client'

import { useRef, useState } from 'react'
import { motion, useInView, useReducedMotion } from 'framer-motion'
import { useTranslations } from 'next-intl'
import { useRouter } from 'next/navigation'
import { ArrowRight, Sparkles, Gem, Shirt, UtensilsCrossed, Wand2, Monitor, Home, Star } from 'lucide-react'
import Image from 'next/image'
import type { LucideIcon } from 'lucide-react'
import type { ProductCategory } from '@leve/types'

const CDN = process.env.NEXT_PUBLIC_CDN_URL ?? ''

const CATEGORY_IMAGES: Record<string, string> = {
  beauty_cosmetics:    `${CDN}/showcase/category-beauty.jpg`,
  jewelry_accessories: `${CDN}/showcase/category-jewelry.jpg`,
  fashion_clothing:    `${CDN}/showcase/category-fashion.jpg`,
  food_cafe:           `${CDN}/showcase/category-food.jpg`,
  electronics_gadgets: `${CDN}/showcase/category-electronics.jpg`,
  home_decor:          `${CDN}/showcase/category-home-decor.jpg`,
  toys_children:       `${CDN}/showcase/category-toys.jpg`,
  custom:              `${CDN}/showcase/category-custom.jpg`,
}

const CATEGORY_ICONS: Record<string, LucideIcon> = {
  beauty_cosmetics:    Sparkles,
  jewelry_accessories: Gem,
  fashion_clothing:    Shirt,
  food_cafe:           UtensilsCrossed,
  electronics_gadgets: Monitor,
  home_decor:          Home,
  toys_children:       Star,
  custom:              Wand2,
}

interface CategoryItem {
  id: ProductCategory
  tKey: string
  subtitleKey: string
}

const CATEGORY_ITEMS: CategoryItem[] = [
  { id: 'beauty_cosmetics',    tKey: 'category_beauty',      subtitleKey: 'category_subtitle_beauty' },
  { id: 'jewelry_accessories', tKey: 'category_jewelry',     subtitleKey: 'category_subtitle_jewelry' },
  { id: 'fashion_clothing',    tKey: 'category_fashion',     subtitleKey: 'category_subtitle_fashion' },
  { id: 'food_cafe',           tKey: 'category_food',        subtitleKey: 'category_subtitle_food' },
  { id: 'electronics_gadgets', tKey: 'category_electronics', subtitleKey: 'category_subtitle_electronics' },
  { id: 'home_decor',          tKey: 'category_home_decor',  subtitleKey: 'category_subtitle_home_decor' },
  { id: 'toys_children',       tKey: 'category_toys',        subtitleKey: 'category_subtitle_toys' },
  { id: 'custom',              tKey: 'category_custom',      subtitleKey: 'category_subtitle_custom' },
]

const SPRING_CARD = { type: 'spring' as const, stiffness: 300, damping: 20 }
const EASE_SETTLE: [number, number, number, number] = [0.22, 1, 0.36, 1]

function CategoryCard({
  item,
  index,
  onSelect,
  reducedMotion,
}: {
  item: CategoryItem
  index: number
  onSelect: (id: ProductCategory) => void
  reducedMotion: boolean | null
}) {
  const t = useTranslations('landing')
  const [imgError, setImgError] = useState(false)
  const imgSrc = CATEGORY_IMAGES[item.id]
  const FallbackIcon = CATEGORY_ICONS[item.id] ?? Sparkles
  const showImage = !!imgSrc && !imgError

  return (
    <motion.button
      type="button"
      onClick={() => onSelect(item.id)}
      variants={
        reducedMotion
          ? { hidden: { opacity: 0 }, show: { opacity: 1, transition: { duration: 0.3 } } }
          : {
              hidden: { opacity: 0, y: 24 },
              show: { opacity: 1, y: 0, transition: { duration: 0.55, ease: EASE_SETTLE } },
            }
      }
      whileHover={reducedMotion ? undefined : { y: -6, scale: 1.02, transition: SPRING_CARD }}
      whileTap={reducedMotion ? undefined : { scale: 0.97 }}
      className="relative overflow-hidden rounded-2xl min-h-[160px] md:min-h-[180px] text-left"
      style={{ border: '0.5px solid rgba(214,76,26,0.15)' }}
    >
      {/* Background image with parallax scale */}
      {showImage && (
        <motion.div
          className="absolute inset-0"
          whileHover={reducedMotion ? undefined : { scale: 1.06, transition: SPRING_CARD }}
        >
          <Image
            src={imgSrc}
            alt={t(item.tKey)}
            fill
            className="object-cover object-right"
            priority={index < 2}
            onError={() => setImgError(true)}
          />
        </motion.div>
      )}

      {/* Fallback background */}
      {!showImage && (
        <div className="absolute inset-0 bg-[var(--bg-elevated)] flex items-center justify-center">
          <FallbackIcon className="w-8 h-8 text-[var(--accent)]" strokeWidth={1.5} />
        </div>
      )}

      {/* Left-to-right gradient overlay — strong left coverage prevents text/image overlap */}
      {showImage && (
        <div
          className="absolute inset-0"
          style={{
            background:
              'linear-gradient(to right, rgba(10,10,10,0.95) 0%, rgba(10,10,10,0.90) 35%, rgba(10,10,10,0.50) 55%, rgba(10,10,10,0.10) 75%, transparent 100%)',
          }}
        />
      )}

      {/* Fallback overlay for consistent text readability */}
      {!showImage && (
        <div
          className="absolute inset-0"
          style={{ background: 'rgba(10,10,10,0.5)' }}
        />
      )}

      {/* Content */}
      <div className="relative z-10 flex flex-col h-full min-h-[160px] md:min-h-[180px] p-5 md:p-6" style={{ maxWidth: '60%', wordWrap: 'break-word', overflowWrap: 'break-word' }}>
        <h3 className="font-display font-bold text-[20px] md:text-[18px] text-white leading-tight">
          {t(item.tKey)}
        </h3>
        <p className="text-sm text-white/60 mt-1">
          {t(item.subtitleKey)}
        </p>
      </div>
    </motion.button>
  )
}

export function CategoryCards() {
  const router = useRouter()
  const reducedMotion = useReducedMotion()
  const ref = useRef<HTMLDivElement>(null)
  const inView = useInView(ref, { once: true, amount: 0.1 })

  function handleSelect(categoryId: ProductCategory) {
    sessionStorage.setItem('leve_category', categoryId)
    router.push('/upload')
  }

  return (
    <motion.div
      ref={ref}
      variants={{ hidden: {}, show: { transition: { staggerChildren: 0.06 } } }}
      initial="hidden"
      animate={inView ? 'show' : 'hidden'}
      className="grid grid-cols-1 sm:grid-cols-2 gap-3 md:gap-4 max-w-[860px] mx-auto"
    >
      {CATEGORY_ITEMS.map((item, index) => (
        <CategoryCard
          key={item.id}
          item={item}
          index={index}
          onSelect={handleSelect}
          reducedMotion={reducedMotion}
        />
      ))}
    </motion.div>
  )
}
