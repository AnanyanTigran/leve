'use client'

import { useState } from 'react'
import { useTranslations } from 'next-intl'
import { ChevronDown, ChevronUp } from 'lucide-react'
import { SceneThumbnail } from './scene-thumbnail'
import { getScenesForCategory } from '@/lib/constants'
import type { Scene, ProductCategory } from '@leve/types'

interface SceneGridProps {
  category: ProductCategory | null
  selectedSceneId: string | null
  favoriteSceneId?: string | null
  onSceneSelect: (scene: Scene) => void
  onSetDefault?: (sceneId: string) => void
}

export function SceneGrid({
  category,
  selectedSceneId,
  favoriteSceneId,
  onSceneSelect,
  onSetDefault,
}: SceneGridProps) {
  const t = useTranslations('scenes')
  const [showAll, setShowAll] = useState(false)

  const defaultScenes = getScenesForCategory(category, false)
  const allScenes = getScenesForCategory(category, true)
  const displayedScenes = showAll ? allScenes : defaultScenes

  // If user has a saved favorite scene, promote it to first position
  // if it's not already in the default list
  const scenesToShow = (() => {
    if (!favoriteSceneId) return displayedScenes
    const favScene = allScenes.find((s) => s.id === favoriteSceneId)
    if (!favScene) return displayedScenes
    const alreadyShown = displayedScenes.some((s) => s.id === favoriteSceneId)
    if (alreadyShown) return displayedScenes
    return [favScene, ...displayedScenes]
  })()

  const hasMore = allScenes.length > defaultScenes.length

  return (
    <div className="flex flex-col gap-3">
      {/* Scene grid — 3 columns on mobile, 4 on tablet+ */}
      <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
        {scenesToShow.map((scene) => (
          <SceneThumbnail
            key={scene.id}
            scene={scene}
            isSelected={selectedSceneId === scene.id}
            onSelect={onSceneSelect}
            size="md"
          />
        ))}
      </div>

      {/* Show all / show less toggle */}
      {hasMore && (
        <button
          type="button"
          onClick={() => setShowAll(!showAll)}
          className="flex items-center justify-center gap-1.5 text-[13px] text-text-secondary hover:text-text-primary transition-colors py-2"
        >
          {showAll ? (
            <>
              <ChevronUp className="w-4 h-4" />
              {t('show_less')}
            </>
          ) : (
            <>
              <ChevronDown className="w-4 h-4" />
              {t('show_all')} ({allScenes.length})
            </>
          )}
        </button>
      )}

      {/* Set as default — shown when a scene is selected and it differs from current default */}
      {selectedSceneId && onSetDefault && selectedSceneId !== favoriteSceneId && (
        <button
          type="button"
          onClick={() => onSetDefault(selectedSceneId)}
          className="text-[12px] text-accent text-center hover:underline transition-colors"
        >
          ★ {t('set_as_default')}
        </button>
      )}
    </div>
  )
}
