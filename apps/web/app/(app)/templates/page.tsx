'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { useTranslations } from 'next-intl'
import { ChevronDown, CheckCircle } from 'lucide-react'
import { AppHeader } from '@/components/shared/app-header'
import { SceneGrid } from '@/components/scenes/scene-grid'
import { RefinementPanel } from '@/components/templates/refinement-panel'
import { useGenerate } from '@/hooks/use-generate'
import { CATEGORY_ITEMS, CATEGORY_SCENE_MAP, getSceneById } from '@/lib/constants'
import { cn } from '@/lib/utils'
import type { Scene, ProductCategory, AspectRatio } from '@leve/types'

export default function SceneSelectionPage() {
  const router = useRouter()
  const t = useTranslations('scenes')
  const tLanding = useTranslations('landing')

  // Read values set by upload page
  const [uploadKey, setUploadKey] = useState<string | null>(null)
  const [uploadPreview, setUploadPreview] = useState<string | null>(null)
  const [category, setCategory] = useState<ProductCategory | null>(null)
  const [favoriteSceneId, setFavoriteSceneId] = useState<string | null>(null)
  const [isVerified, setIsVerified] = useState(false)

  // Selection state
  const [selectedScene, setSelectedScene] = useState<Scene | null>(null)
  const [selectedChips, setSelectedChips] = useState<string[]>([])
  const [customText, setCustomText] = useState('')
  const [aspectRatio, setAspectRatio] = useState<AspectRatio>('1:1')

  // UI state
  const [showOtpSheet, setShowOtpSheet] = useState(false)
  const [showCategoryPicker, setShowCategoryPicker] = useState(false)
  const [generationError, setGenerationError] = useState<string | null>(null)
  const [uploadQuality, setUploadQuality] = useState<string | null>(null)

  const { generate, isLoading, error, setError } = useGenerate()

  // Hydrate from sessionStorage
  useEffect(() => {
    const key = sessionStorage.getItem('leve_upload_key')
    const preview = sessionStorage.getItem('leve_upload_preview')
    const cat = sessionStorage.getItem('leve_category') as ProductCategory | null
    const favScene = sessionStorage.getItem('leve_favorite_scene')
    const uploadedAt = parseInt(sessionStorage.getItem('leve_upload_session_id') ?? '0', 10)

    if (!key || !preview) {
      // No upload — send back to upload
      router.replace('/upload')
      return
    }

    // Treat sessionStorage data older than 2h as stale — a new upload is required
    if (uploadedAt && Date.now() - uploadedAt > 2 * 60 * 60 * 1000) {
      sessionStorage.removeItem('leve_upload_key')
      sessionStorage.removeItem('leve_upload_preview')
      sessionStorage.removeItem('leve_category')
      sessionStorage.removeItem('leve_upload_session_id')
      router.replace('/upload')
      return
    }

    setUploadKey(key)
    setUploadPreview(preview)
    setCategory(cat)
    if (favScene) {
      setFavoriteSceneId(favScene)
    }

    // Surface the upload quality probe result (set by the upload route) as a
    // soft warning so the user knows results may be uneven before they spend
    // a generation. Shown once per upload session and never blocks.
    const quality = sessionStorage.getItem('leve_upload_quality')
    if (quality) {
      setUploadQuality(quality)
      sessionStorage.removeItem('leve_upload_quality')
    }

    // If no category set, open picker immediately so the user must choose
    if (!cat) {
      setShowCategoryPicker(true)
    }

    // Also try to get favorite scene from session API
    fetch('/api/session/me', { credentials: 'include' })
      .then((r) => r.json())
      .then((data) => {
        if (data?.data?.favoriteSceneId) {
          setFavoriteSceneId(data.data.favoriteSceneId)
          sessionStorage.setItem('leve_favorite_scene', data.data.favoriteSceneId)
        }
        if (data?.data?.isVerified) {
          setIsVerified(true)
        }
        // Default aspect ratio for marketplace users
        if (cat === 'marketplace_export') {
          setAspectRatio('3:4')
        } else if (cat === 'beauty_cosmetics' || cat === 'fashion_clothing') {
          setAspectRatio('4:5')
        }
      })
      .catch(() => {}) // non-fatal
  }, [router])

  // If scene was previously selected (user navigated back), restore it
  useEffect(() => {
    const savedRatio = sessionStorage.getItem('leve_aspect_ratio') as AspectRatio | null
    if (savedRatio) setAspectRatio(savedRatio)
  }, [])

  // Surface generation errors set by processing page on failure/timeout.
  // On failure we also restore the user's prior scene + chip + custom-text
  // selection so they can re-try with one tap instead of re-building the
  // entire request from scratch.
  useEffect(() => {
    const genError = sessionStorage.getItem('leve_generation_error')
    if (!genError) return
    sessionStorage.removeItem('leve_generation_error')
    setGenerationError(genError)

    const savedSceneId = sessionStorage.getItem('leve_scene_id')
    if (savedSceneId) {
      const scene = getSceneById(savedSceneId)
      if (scene) setSelectedScene(scene)
    }
    const savedChips = sessionStorage.getItem('leve_selected_chips')
    if (savedChips) {
      try {
        const parsed = JSON.parse(savedChips)
        if (Array.isArray(parsed)) setSelectedChips(parsed.filter((c): c is string => typeof c === 'string'))
      } catch {
        // ignore malformed sessionStorage entry
      }
    }
    const savedCustom = sessionStorage.getItem('leve_custom_text')
    if (savedCustom) setCustomText(savedCustom)
  }, [])

  // Handle OTP-required error
  useEffect(() => {
    if (error === 'otp_required') {
      setShowOtpSheet(true)
      setError(null)
    }
  }, [error, setError])

  const handleSceneSelect = useCallback((scene: Scene) => {
    setSelectedScene(scene)
    sessionStorage.setItem('leve_scene_id', scene.id)
  }, [])

  // When a category is set (and the user has not yet picked a scene this
  // session), pre-select the first recommended scene for that category so the
  // user can tap Generate immediately. Respects an existing favorite scene if
  // one is configured.
  useEffect(() => {
    if (!category || selectedScene) return
    const seedSceneId = favoriteSceneId ?? CATEGORY_SCENE_MAP[category]?.[0]
    if (!seedSceneId) return
    const seedScene = getSceneById(seedSceneId)
    if (seedScene) setSelectedScene(seedScene)
  }, [category, favoriteSceneId, selectedScene])

  const handleSetDefault = useCallback(async (sceneId: string) => {
    try {
      await fetch('/api/session/favorite-scene', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sceneId }),
      })
      setFavoriteSceneId(sceneId)
      sessionStorage.setItem('leve_favorite_scene', sceneId)
    } catch {
      // non-fatal
    }
  }, [])

  const handleGenerate = useCallback(async () => {
    if (!uploadKey || !selectedScene) return
    if (!category) {
      setShowCategoryPicker(true)
      return
    }

    const result = await generate({
      uploadKey,
      sceneId: selectedScene.id,
      category,
      intent: 'product_photo',
      selectedChips,
      customText,
      aspectRatio,
    })

    if (!result) return // error handled by useGenerate hook

    // Save scene to session for results/processing pages
    sessionStorage.setItem('leve_scene_id', selectedScene.id)
    sessionStorage.setItem('leve_scene_name', selectedScene.name)
    sessionStorage.setItem('leve_aspect_ratio', aspectRatio)
    // Persist chips + custom text so we can restore selection if generation
    // fails and the user bounces back to this page.
    sessionStorage.setItem('leve_selected_chips', JSON.stringify(selectedChips))
    sessionStorage.setItem('leve_custom_text', customText)

    if (result.softCapReached) {
      sessionStorage.setItem('leve_soft_cap_reached', '1')
    }

    router.push('/processing')
  }, [uploadKey, selectedScene, category, selectedChips, customText, aspectRatio, generate, router])

  const getCategoryLabel = () => {
    if (!category) return ''
    const map: Record<string, string> = {
      beauty_cosmetics: t('cat_beauty'),
      jewelry_accessories: t('cat_jewelry'),
      fashion_clothing: t('cat_fashion'),
      food_cafe: t('cat_food'),
      marketplace_export: t('cat_marketplace'),
      custom: t('cat_custom'),
    }
    return map[category] ?? category
  }

  if (!uploadKey) return null // redirecting

  return (
    <div className="flex flex-col h-[100dvh] overflow-hidden bg-bg-base">
      <AppHeader
        variant="app"
        showBack
        title={t('title')}
      />

      {generationError && (
        <div className="mx-4 mt-3 px-4 py-3 bg-[#FEF2F2] border border-[#FCA5A5] rounded-[10px]">
          <p className="text-[13px] text-[#DC2626] font-medium">
            {generationError === 'timeout' ? t('error_timeout') : t('error_failed')}
          </p>
        </div>
      )}

      {uploadQuality && !generationError && (
        <div className="mx-4 mt-3 px-4 py-3 bg-accent-subtle border border-accent-border rounded-[10px] flex items-start gap-3">
          <div className="flex-1">
            <p className="text-[13px] text-text-primary font-medium">
              {t(`quality_${uploadQuality}_title`)}
            </p>
            <p className="text-[12px] text-text-muted mt-0.5">
              {t(`quality_${uploadQuality}_sub`)}
            </p>
          </div>
          <button
            type="button"
            onClick={() => setUploadQuality(null)}
            className="text-[12px] text-text-secondary hover:text-text-primary shrink-0"
            aria-label="Dismiss"
          >
            ✕
          </button>
        </div>
      )}

      <main className="flex-1 overflow-y-auto">
        <div className="page-content py-4 flex flex-col gap-5 pb-32">

          {/* Upload preview + category badge */}
          <div className="flex items-center gap-3">
            {/* Tiny upload preview */}
            {uploadPreview && (
              <div className="w-14 h-14 rounded-[10px] overflow-hidden border border-border-default shrink-0">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={uploadPreview}
                  alt="Your product"
                  className="w-full h-full object-cover"
                />
              </div>
            )}
            <div className="flex-1 min-w-0">
              <p className="text-[13px] text-text-muted">{t('your_photo')}</p>
              <div className="flex items-center gap-2 mt-0.5">
                {/* Category badge — tappable to change */}
                <button
                  type="button"
                  onClick={() => setShowCategoryPicker(true)}
                  className="flex items-center gap-1 text-[12px] font-medium text-accent bg-accent-subtle px-2 py-0.5 rounded-full"
                >
                  {category ? getCategoryLabel() : t('category_badge_empty')}
                  <ChevronDown size={12} className="text-accent" />
                </button>
                <button
                  type="button"
                  onClick={() => router.push('/upload')}
                  className="text-[12px] text-text-muted hover:text-text-secondary transition-colors"
                >
                  {t('change_photo')}
                </button>
              </div>
            </div>
          </div>

          {/* Scene grid */}
          <div>
            <p className="text-[16px] font-semibold text-text-primary mb-1">
              {t('title')}
            </p>
            <p className="text-[13px] text-text-muted mb-3">
              {t('subtitle')}
            </p>

            <SceneGrid
              category={category}
              selectedSceneId={selectedScene?.id ?? null}
              favoriteSceneId={favoriteSceneId}
              isVerified={isVerified}
              onSceneSelect={handleSceneSelect}
              onSetDefault={handleSetDefault}
            />
          </div>

          {/* Refinement panel — only shown after a scene is selected */}
          {selectedScene && (
            <div className="border-t border-border-default pt-4">
              <RefinementPanel
                category={category ?? 'custom'}
                onChipsChange={setSelectedChips}
                onCustomTextChange={setCustomText}
                onAspectRatioChange={setAspectRatio}
                selectedAspectRatio={aspectRatio}
                initialChipIds={selectedChips}
                initialCustomText={customText}
              />
            </div>
          )}

        </div>
      </main>

      {/* Fixed bottom — Generate button */}
      <div className="fixed bottom-0 left-0 right-0 bg-bg-base border-t border-border-default px-4 py-4 safe-area-pb">
        <div className="page-content">
          {/* Insufficient credits warning */}
          {error === 'insufficient_credits' && (
            <p className="text-[13px] text-[#EF4444] text-center mb-3">
              {t('insufficient_credits')}
            </p>
          )}

          <button
            type="button"
            onClick={handleGenerate}
            disabled={!selectedScene || isLoading}
            className={cn(
              'btn-primary btn-full h-14 text-[16px] font-semibold transition-all',
              (!selectedScene || isLoading) && 'opacity-50 cursor-not-allowed',
            )}
          >
            {isLoading ? (
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 rounded-full border-2 border-white border-t-transparent animate-spin" />
                {t('generating')}
              </div>
            ) : (
              t('generate_btn')
            )}
          </button>

          {!selectedScene && (
            <p className="text-center text-[12px] text-text-muted mt-2">
              {t('scene_tip')}
            </p>
          )}
        </div>
      </div>

      {/* Category picker bottom sheet */}
      {showCategoryPicker && (
        <div
          className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm"
          onClick={() => {
            // Only allow closing if a category is already set
            if (category) setShowCategoryPicker(false)
          }}
        >
          <div
            className="absolute bottom-0 left-0 right-0 bg-bg-surface rounded-t-[20px] pb-8"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="w-10 h-1 bg-border-strong rounded-full mx-auto mt-3 mb-4" />
            <p className="text-[16px] font-semibold text-text-primary px-4 mb-3">
              {t('category_picker_title')}
            </p>
            {CATEGORY_ITEMS.map((item) => {
              const Icon = item.icon
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => {
                    setCategory(item.id)
                    sessionStorage.setItem('leve_category', item.id)
                    setShowCategoryPicker(false)
                  }}
                  className={cn(
                    'flex items-center gap-3 w-full px-4 py-3 text-left transition-colors min-h-[48px]',
                    item.id === category ? 'text-accent' : 'text-text-primary',
                  )}
                >
                  <Icon
                    size={18}
                    className={item.id === category ? 'text-accent' : 'text-text-secondary'}
                  />
                  <span className="text-[15px] font-medium">{tLanding(item.tKey)}</span>
                  {item.id === category && (
                    <CheckCircle size={16} className="text-accent ml-auto" />
                  )}
                </button>
              )
            })}
          </div>
        </div>
      )}

      {/* OTP required sheet — shown when anon limit reached */}
      {showOtpSheet && (
        <div
          className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-end"
          onClick={() => setShowOtpSheet(false)}
        >
          <div
            className="bg-bg-surface w-full rounded-t-[20px] p-6 pb-8"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="w-10 h-1 bg-border-strong rounded-full mx-auto mb-6" />
            <h3 className="text-[20px] font-semibold text-text-primary text-center">
              {t('otp_limit_title')}
            </h3>
            <p className="text-[14px] text-text-muted text-center mt-2 mb-6">
              {t('otp_limit_sub')}
            </p>
            <button
              className="btn-primary btn-full h-14 text-[16px]"
              onClick={() => {
                sessionStorage.setItem('leve_return_to', '/templates')
                router.push('/register')
              }}
            >
              {t('otp_limit_cta')}
            </button>
            <button
              className="btn-secondary w-full mt-3 h-12"
              onClick={() => setShowOtpSheet(false)}
            >
              {t('otp_limit_back')}
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
