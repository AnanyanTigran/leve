'use client'

import { useState } from 'react'
import { useLocale, useTranslations } from 'next-intl'
import { cn } from '@/lib/utils'
import type { Scene } from '@leve/types'

interface SceneThumbnailProps {
  scene: Scene
  isSelected: boolean
  isFavorite?: boolean
  isVerified?: boolean
  onSelect: (scene: Scene) => void
  onSetFavorite?: (sceneId: string) => void
  size?: 'sm' | 'md'
}

export function SceneThumbnail({
  scene,
  isSelected,
  isFavorite,
  onSelect,
  onSetFavorite,
  size = 'md',
}: SceneThumbnailProps) {
  const locale = useLocale()
  const t = useTranslations('scenes')
  const [justSaved, setJustSaved] = useState(false)

  const name =
    locale === 'hy' ? scene.nameHY
    : locale === 'ru' ? scene.nameRU
    : scene.name

  function handleBookmark(e: React.MouseEvent) {
    e.stopPropagation()
    if (!onSetFavorite) return
    onSetFavorite(scene.id)
    setJustSaved(true)
    setTimeout(() => setJustSaved(false), 1500)
  }

  return (
    <button
      type="button"
      onClick={() => onSelect(scene)}
      className={cn(
        'relative rounded-[12px] overflow-hidden border-2 transition-all duration-150 w-full',
        'flex flex-col text-left group',
        isSelected
          ? 'border-accent shadow-[0_0_0_3px_rgba(232,98,26,0.2)]'
          : 'border-border-default hover:border-border-strong',
      )}
    >
      {/* Thumbnail */}
      <div
        className={cn('w-full', size === 'sm' ? 'h-[72px]' : 'aspect-square')}
        style={{ background: scene.thumbnailGradient }}
      >
        {/* Selected checkmark — top LEFT */}
        {isSelected && (
          <div className="absolute top-2 left-2 w-5 h-5 rounded-full bg-accent flex items-center justify-center shadow-sm">
            <svg viewBox="0 0 10 10" fill="none" stroke="white" strokeWidth="2.5" className="w-2.5 h-2.5">
              <polyline points="1.5,5 4,7.5 8.5,2.5" />
            </svg>
          </div>
        )}

        {/* Favorite bookmark — top RIGHT — verified users only */}
        {onSetFavorite && size === 'md' && (
          <button
            type="button"
            onClick={handleBookmark}
            aria-label={isFavorite ? t('remove_favorite') : t('saved_favorite')}
            className={cn(
              'absolute top-2 right-2 w-7 h-7 rounded-full flex items-center justify-center transition-all duration-150',
              'opacity-40 group-hover:opacity-100 focus-visible:opacity-100 active:opacity-100',
              isFavorite && 'opacity-100',
              isFavorite
                ? 'bg-accent shadow-md'
                : 'bg-black/40 backdrop-blur-[2px] hover:bg-black/60',
            )}
          >
            {justSaved ? (
              <svg viewBox="0 0 10 10" fill="none" stroke="white" strokeWidth="2.5" className="w-3 h-3">
                <polyline points="1.5,5 4,7.5 8.5,2.5" />
              </svg>
            ) : (
              <svg
                viewBox="0 0 24 24"
                className="w-3.5 h-3.5"
                fill={isFavorite ? 'white' : 'none'}
                stroke="white"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z" />
              </svg>
            )}
          </button>
        )}

        {/* Favorite scene bottom edge indicator */}
        {isFavorite && !isSelected && (
          <div className="absolute bottom-0 left-0 right-0 h-[2px] bg-accent" />
        )}
      </div>

      {/* Label */}
      <div className={cn('px-2 py-1.5 bg-bg-surface w-full', size === 'sm' && 'px-1.5 py-1')}>
        <p className={cn(
          'font-medium text-text-primary leading-tight truncate',
          size === 'sm' ? 'text-[11px]' : 'text-[12px]',
        )}>
          {name}
          {isFavorite && (
            <span className="ml-1 text-accent text-[10px] font-semibold">★</span>
          )}
        </p>
        {size === 'md' && (
          <p className="text-[10px] text-text-muted mt-0.5 leading-tight line-clamp-1">
            {scene.bestFor}
          </p>
        )}
      </div>
    </button>
  )
}
