'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { useTranslations, useLocale } from 'next-intl'
import { AppHeader } from '@/components/shared/app-header'
import { SceneGrid } from '@/components/scenes/scene-grid'
import { RefinementPanel } from '@/components/templates/refinement-panel'
import { useGenerate } from '@/hooks/use-generate'
import type { Scene, ProductCategory, AspectRatio } from '@leve/types'
import { cn } from '@/lib/utils'

export default function SceneSelectionPage() {
  const router = useRouter()
  const t = useTranslations('scenes')
  const locale = useLocale()

  // Read values set by upload page
  const [uploadKey, setUploadKey] = useState<string | null>(null)
  const [uploadPreview, setUploadPreview] = useState<string | null>(null)
  const [category, setCategory] = useState<ProductCategory | null>(null)
  const [favoriteSceneId, setFavoriteSceneId] = useState<string | null>(null)

  // Selection state
  const [selectedScene, setSelectedScene] = useState<Scene | null>(null)
  const [selectedChips, setSelectedChips] = useState<string[]>([])
  const [customText, setCustomText] = useState('')
  const [aspectRatio, setAspectRatio] = useState<AspectRatio>('1:1')

  // UI state
  const [defaultSaved, setDefaultSaved] = useState(false)
  const [showOtpSheet, setShowOtpSheet] = useState(false)

  const { generate, isLoading, error, setError } = useGenerate()

  // Hydrate from sessionStorage
  useEffect(() => {
    const key = sessionStorage.getItem('leve_upload_key')
    const preview = sessionStorage.getItem('leve_upload_preview')
    const cat = sessionStorage.getItem('leve_category') as ProductCategory | null
    const favScene = sessionStorage.getItem('leve_favorite_scene')

    if (!key || !preview) {
      // No upload — send back to upload
      router.replace('/upload')
      return
    }

    setUploadKey(key)
    setUploadPreview(preview)
    setCategory(cat)
    if (favScene) {
      setFavoriteSceneId(favScene)
    }

    // Also try to get favorite scene from session API
    fetch('/api/session/me', { credentials: 'include' })
      .then((r) => r.json())
      .then((data) => {
        if (data?.data?.favoriteSceneId) {
          setFavoriteSceneId(data.data.favoriteSceneId)
          sessionStorage.setItem('leve_favorite_scene', data.data.favoriteSceneId)
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
      setDefaultSaved(true)
      setTimeout(() => setDefaultSaved(false), 2000)
    } catch {
      // non-fatal
    }
  }, [])

  const handleGenerate = useCallback(async () => {
    if (!uploadKey || !selectedScene) return

    const result = await generate({
      uploadKey,
      sceneId: selectedScene.id,
      category: category ?? 'custom',
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

    if (result.softCapReached) {
      sessionStorage.setItem('leve_soft_cap_reached', '1')
    }

    router.push('/processing')
  }, [uploadKey, selectedScene, category, selectedChips, customText, aspectRatio, generate, router])

  const getCategoryLabel = () => {
    if (!category) return ''
    const labels: Record<string, string> = {
      beauty_cosmetics: locale === 'hy' ? 'Գեղեցկություն' : locale === 'ru' ? 'Красота' : 'Beauty',
      jewelry_accessories: locale === 'hy' ? 'Զարդեր' : locale === 'ru' ? 'Украшения' : 'Jewelry',
      fashion_clothing: locale === 'hy' ? 'Նորաձևություն' : locale === 'ru' ? 'Мода' : 'Fashion',
      food_cafe: locale === 'hy' ? 'Սնունդ' : locale === 'ru' ? 'Еда' : 'Food',
      marketplace_export: locale === 'hy' ? 'Մարկետփլեյս' : locale === 'ru' ? 'Маркетплейс' : 'Marketplace',
      custom: locale === 'hy' ? 'Այլ' : locale === 'ru' ? 'Другое' : 'Custom',
    }
    return labels[category] ?? category
  }

  if (!uploadKey) return null // redirecting

  return (
    <div className="flex flex-col h-[100dvh] overflow-hidden bg-bg-base">
      <AppHeader
        variant="app"
        showBack
        title={t('title')}
      />

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
                {category && (
                  <span className="text-[12px] font-medium text-accent bg-accent-subtle px-2 py-0.5 rounded-full">
                    {getCategoryLabel()}
                  </span>
                )}
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

            {/* Default saved toast */}
            {defaultSaved && (
              <div className="mb-3 px-3 py-2 bg-accent-subtle border border-accent-border rounded-[10px]">
                <p className="text-[13px] text-accent font-medium">
                  ★ {t('default_scene_saved')}
                </p>
              </div>
            )}

            <SceneGrid
              category={category}
              selectedSceneId={selectedScene?.id ?? null}
              favoriteSceneId={favoriteSceneId}
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
              {locale === 'hy'
                ? 'Բավարար կրեդիտ չկա'
                : locale === 'ru'
                ? 'Недостаточно кредитов'
                : 'Insufficient credits — buy a pack to continue'}
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
              {locale === 'hy'
                ? 'Ձեր 2 անվճար փորձն ավարտվեց'
                : locale === 'ru'
                ? 'Ваши 2 бесплатных попытки использованы'
                : 'Your 2 free generations used'}
            </h3>
            <p className="text-[14px] text-text-muted text-center mt-2 mb-6">
              {locale === 'hy'
                ? 'Գրանցվեք անվճար՝ 2 անվճար HD ներբեռնում ստանալու համար'
                : locale === 'ru'
                ? 'Зарегистрируйтесь бесплатно и получите 2 HD-изображения'
                : 'Register free to get 2 HD studio images'}
            </p>
            <button
              className="btn-primary btn-full h-14 text-[16px]"
              onClick={() => {
                sessionStorage.setItem('leve_return_to', '/templates')
                router.push('/register')
              }}
            >
              {locale === 'hy'
                ? 'Գրանցվել անվճար'
                : locale === 'ru'
                ? 'Зарегистрироваться бесплатно'
                : 'Register free — get 2 HD images'}
            </button>
            <button
              className="btn-secondary w-full mt-3 h-12"
              onClick={() => setShowOtpSheet(false)}
            >
              {locale === 'hy' ? 'Հետ' : locale === 'ru' ? 'Назад' : 'Back'}
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
