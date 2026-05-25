'use client'

import { useLocale } from 'next-intl'
import { cn } from '@/lib/utils'
import type { Scene } from '@leve/types'

interface SceneThumbnailProps {
  scene: Scene
  isSelected: boolean
  onSelect: (scene: Scene) => void
  size?: 'sm' | 'md'
}

export function SceneThumbnail({
  scene,
  isSelected,
  onSelect,
  size = 'md',
}: SceneThumbnailProps) {
  const locale = useLocale()

  const name =
    locale === 'hy' ? scene.nameHY
    : locale === 'ru' ? scene.nameRU
    : scene.name

  return (
    <button
      type="button"
      onClick={() => onSelect(scene)}
      className={cn(
        'relative rounded-[12px] overflow-hidden border-2 transition-all',
        'flex flex-col text-left w-full',
        isSelected
          ? 'border-accent ring-2 ring-accent ring-offset-2 ring-offset-bg-base'
          : 'border-border-default hover:border-border-strong',
        size === 'sm' ? 'min-w-[100px]' : '',
      )}
    >
      {/* Thumbnail — gradient placeholder, replace with real images later */}
      <div
        className={cn(
          'w-full',
          size === 'sm' ? 'h-[72px]' : 'aspect-square',
        )}
        style={{ background: scene.thumbnailGradient }}
      >
        {/* Selected checkmark */}
        {isSelected && (
          <div className="absolute top-2 right-2 w-6 h-6 rounded-full bg-accent flex items-center justify-center shadow-md">
            <svg
              viewBox="0 0 10 10"
              fill="none"
              stroke="white"
              strokeWidth="2.5"
              className="w-3 h-3"
            >
              <polyline points="1.5,5 4,7.5 8.5,2.5" />
            </svg>
          </div>
        )}
      </div>

      {/* Label */}
      <div className={cn(
        'px-2 py-1.5 bg-bg-surface',
        size === 'sm' ? 'px-1.5 py-1' : '',
      )}>
        <p className={cn(
          'font-medium text-text-primary leading-tight',
          size === 'sm' ? 'text-[11px]' : 'text-[12px]',
        )}>
          {name}
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
