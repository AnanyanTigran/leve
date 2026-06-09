'use client'

import { useState, useRef, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { useTranslations } from 'next-intl'
import { UploadCloud, X, AlertCircle, ShieldCheck, CheckCircle, ImageIcon } from 'lucide-react'
import { CATEGORY_ITEMS } from '@/lib/constants'
import { cn } from '@/lib/utils'
import { apiFetch } from '@/lib/api-client'
import type { ProductCategory } from '@leve/types'

const MAX_FILE_SIZE = 20 * 1024 * 1024 // 20MB
const ACCEPTED_TYPES = [
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/heic',
  'image/heif',
  'image/avif',
  'image/tiff',
]
// Formats that no major browser will decode in <img>/canvas. AVIF works in
// modern Chrome/Firefox/Safari so we attempt it and fall back on failure.
const BROWSER_UNRENDERABLE_MIMES = new Set(['image/heic', 'image/heif', 'image/tiff'])
const PREVIEW_MAX_PX = 600
// 1x1 transparent PNG — used as a placeholder for the templates page when
// the browser can't decode the source (HEIC, TIFF) into a canvas.
const PLACEHOLDER_DATA_URL =
  'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII='

// iOS Safari frequently sends an empty file.type for HEIC pulled from the
// camera roll — infer from the extension so validation doesn't reject it.
function getEffectiveMime(file: File): string {
  if (file.type) return file.type.toLowerCase()
  const ext = file.name.split('.').pop()?.toLowerCase()
  switch (ext) {
    case 'heic': return 'image/heic'
    case 'heif': return 'image/heif'
    case 'avif': return 'image/avif'
    case 'tif':
    case 'tiff': return 'image/tiff'
    case 'jpg':
    case 'jpeg': return 'image/jpeg'
    case 'png': return 'image/png'
    case 'webp': return 'image/webp'
    default: return ''
  }
}

function compressToDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const img = new Image()
    const blobUrl = URL.createObjectURL(file)
    img.onload = () => {
      try {
        const scale = Math.min(PREVIEW_MAX_PX / img.width, PREVIEW_MAX_PX / img.height, 1)
        const canvas = document.createElement('canvas')
        canvas.width = Math.round(img.width * scale)
        canvas.height = Math.round(img.height * scale)
        canvas.getContext('2d')!.drawImage(img, 0, 0, canvas.width, canvas.height)
        resolve(canvas.toDataURL('image/jpeg', 0.82))
      } catch (err) {
        reject(err)
      } finally {
        URL.revokeObjectURL(blobUrl)
      }
    }
    img.onerror = () => {
      URL.revokeObjectURL(blobUrl)
      reject(new Error('preview_decode_failed'))
    }
    img.src = blobUrl
  })
}

interface FileState {
  file: File
  preview: string | null
  mime: string
}

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

export function UploadZone() {
  const router = useRouter()
  const t = useTranslations('upload')
  const tCommon = useTranslations('common')
  const tLanding = useTranslations('landing')
  const inputRef = useRef<HTMLInputElement>(null)

  const [fileState, setFileState] = useState<FileState | null>(null)
  const [isDragging, setIsDragging] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [isUploading, setIsUploading] = useState(false)
  const [isRetrying, setIsRetrying] = useState(false)

  const [selectedCategory, setSelectedCategory] = useState<ProductCategory | null>(() => {
    if (typeof window === 'undefined') return null
    return sessionStorage.getItem('leve_category') as ProductCategory | null
  })

  const handleCategorySelect = useCallback((cat: ProductCategory) => {
    setSelectedCategory(cat)
    sessionStorage.setItem('leve_category', cat)
  }, [])

  const validateFile = useCallback((file: File): { error: string | null; mime: string } => {
    const mime = getEffectiveMime(file)
    if (!ACCEPTED_TYPES.includes(mime)) return { error: t('error_type'), mime }
    if (file.size > MAX_FILE_SIZE) return { error: t('error_size'), mime }
    return { error: null, mime }
  }, [t])

  const handleFile = useCallback((file: File) => {
    const { error: validationError, mime } = validateFile(file)
    if (validationError) {
      setError(validationError)
      setFileState(null)
      return
    }
    setError(null)
    // Skip the blob URL for formats the browser can't decode — the <img>
    // would just show a broken icon. The placeholder branch handles them.
    const preview = BROWSER_UNRENDERABLE_MIMES.has(mime)
      ? null
      : URL.createObjectURL(file)
    setFileState({ file, preview, mime })
  }, [validateFile])

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(false)
    const file = e.dataTransfer.files[0]
    if (file) handleFile(file)
  }, [handleFile])

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(true)
  }, [])

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(false)
  }, [])

  const handleInputChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) handleFile(file)
  }, [handleFile])

  const handleRemove = useCallback(() => {
    if (fileState?.preview) URL.revokeObjectURL(fileState.preview)
    setFileState(null)
    setError(null)
    if (inputRef.current) inputRef.current.value = ''
  }, [fileState])

  const handleContinue = useCallback(async () => {
    if (!fileState || !selectedCategory || isUploading) return
    setIsUploading(true)
    setError(null)

    const existingJobId = sessionStorage.getItem('leve_job_id')
    const existingPreview = sessionStorage.getItem('leve_upload_preview')
    if (existingJobId && existingPreview) {
      sessionStorage.removeItem('leve_job_id')
      sessionStorage.removeItem('leve_job_dispatched_at')
      sessionStorage.removeItem('leve_job_upload_session_id')
      sessionStorage.removeItem('leve_scene_id')
      sessionStorage.removeItem('leve_scene_name')
      // Clear the previously-saved aspect ratio so the new upload's natural
      // ratio drives the auto-selection on /templates instead of inheriting
      // the prior generation's choice.
      sessionStorage.removeItem('leve_aspect_ratio')
    }

    let navigating = false
    try {
      // Generate compressed preview for the scene selection page. HEIC/TIFF
      // can't decode in canvas — server transcodes to JPEG anyway, so we just
      // store a 1x1 placeholder and let /templates show it.
      let dataUrl: string
      try {
        dataUrl = await compressToDataUrl(fileState.file)
      } catch {
        dataUrl = PLACEHOLDER_DATA_URL
      }

      // Upload file to API to get S3 key
      const formData = new FormData()
      formData.append('file', fileState.file)

      // Silent retry on non-2xx or network error — handles Railway edge warmup failures
      let res = await apiFetch('/api/upload', {
        method: 'POST',
        body: formData,
      }).catch(() => null)

      if (!res || !res.ok) {
        setIsRetrying(true)
        await new Promise<void>((resolve) => setTimeout(resolve, 1000))
        setIsRetrying(false)
        res = await apiFetch('/api/upload', {
          method: 'POST',
          body: formData,
        })
      }

      const json = await res.json()

      if (!res.ok) {
        const code = typeof json?.error === 'string' ? json.error : null
        const ERROR_MAP: Record<string, string> = {
          invalid_file_type: t('error_type'),
          file_too_large: t('error_size'),
          resolution_too_low: t('error_resolution_too_low'),
          resolution_too_high: t('error_resolution_too_high'),
          content_policy_violation: t('error_content_policy'),
          validation_failed: t('error_validation_failed'),
          rate_limit_exceeded: t('error_rate_limit'),
          upload_error: t('error_upload_failed'),
          no_file: t('error_upload_failed'),
        }
        setError((code && ERROR_MAP[code]) ?? t('error_upload_failed'))
        return
      }

      const uploadKey: string = json.data.uploadKey
      const qualityWarning: string | null = json.data.qualityWarning ?? null
      const uploadWidth = typeof json.data.width === 'number' ? json.data.width : null
      const uploadHeight = typeof json.data.height === 'number' ? json.data.height : null

      sessionStorage.setItem('leve_upload_key', uploadKey)
      sessionStorage.setItem('leve_upload_preview', dataUrl)
      sessionStorage.setItem('leve_upload_session_id', Date.now().toString())
      sessionStorage.setItem('leve_upload_name', fileState.file.name)
      // leve_category is already written by handleCategorySelect

      // Store natural aspect ratio so /templates can auto-select the closest
      // chip and warn when the user picks a format that would crop the product.
      if (uploadWidth && uploadHeight && uploadHeight > 0) {
        sessionStorage.setItem(
          'leve_upload_aspect_ratio',
          (uploadWidth / uploadHeight).toFixed(4),
        )
      } else {
        sessionStorage.removeItem('leve_upload_aspect_ratio')
      }

      if (qualityWarning) {
        sessionStorage.setItem('leve_upload_quality', qualityWarning)
      } else {
        sessionStorage.removeItem('leve_upload_quality')
      }

      router.push('/templates')
      navigating = true
    } catch {
      setError(t('error_upload_failed'))
    } finally {
      setIsRetrying(false)
      if (!navigating) setIsUploading(false)
    }
  }, [fileState, selectedCategory, isUploading, router, t])

  const categoryPrompt = t('category_prompt')

  const canContinue = fileState !== null && error === null && !isUploading && selectedCategory !== null

  return (
    <div className="flex flex-col flex-1">
      <main className="page-funnel lg:page-content flex-1 overflow-y-auto flex flex-col py-4 gap-4">
        <div className="lg:grid lg:grid-cols-[1fr_280px] lg:gap-8 lg:items-start flex-1 flex flex-col lg:flex-none">

          {/* Upload zone */}
          <div
            onClick={() => !fileState && inputRef.current?.click()}
            onDrop={handleDrop}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            className={[
              'relative flex flex-col rounded-[14px] overflow-hidden transition-all duration-150 ease-out',
              'flex-1 min-h-[300px] lg:min-h-[520px]',
              fileState
                ? 'border-0'
                : isDragging
                ? 'border-[1.5px] border-solid border-accent bg-accent-subtle cursor-pointer'
                : error
                ? 'border-[1.5px] border-dashed border-[#EF4444]/40 bg-[#EF4444]/5 cursor-pointer'
                : 'border-[1.5px] border-dashed border-border-default bg-bg-base cursor-pointer',
            ].join(' ')}
          >
            {fileState ? (
              <>
                {fileState.preview ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={fileState.preview}
                    alt="Preview"
                    className="absolute inset-0 w-full h-full object-cover rounded-[14px]"
                  />
                ) : (
                  <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-bg-elevated rounded-[14px]">
                    <ImageIcon className="w-12 h-12 text-text-muted" strokeWidth={1.5} />
                    <span className="text-[12px] text-text-secondary uppercase tracking-wide">
                      {fileState.mime.replace('image/', '')}
                    </span>
                  </div>
                )}
                <button
                  type="button"
                  onClick={(e) => { e.stopPropagation(); handleRemove() }}
                  className="absolute top-2 right-2 w-12 h-12 flex items-center justify-center rounded-lg bg-black/40 hover:bg-black/60 transition-colors"
                  aria-label="Remove file"
                >
                  <X className="w-5 h-5 text-white" />
                </button>
                <div className="absolute bottom-0 left-0 right-0 bg-bg-elevated border-t border-border-default flex items-center p-3 gap-3">
                  <div className="flex-1 min-w-0">
                    <span className="text-[13px] text-white font-medium truncate block">{fileState.file.name}</span>
                    <span className="text-[11px] text-white/60">{formatFileSize(fileState.file.size)}</span>
                  </div>
                  <button
                    type="button"
                    onClick={(e) => { e.stopPropagation(); inputRef.current?.click() }}
                    className="shrink-0 px-3 py-1.5 bg-white/20 hover:bg-white/30 backdrop-blur-sm rounded-lg text-[12px] text-white font-medium transition-colors"
                  >
                    {t('change')}
                  </button>
                </div>
              </>
            ) : (
              <div className="flex flex-col items-center justify-center h-full w-full min-h-[300px] lg:min-h-[520px] gap-3 text-center p-8">
                <UploadCloud
                  className={`w-12 h-12 transition-colors duration-150 ${isDragging ? 'text-accent' : 'text-text-muted'}`}
                />
                <div className="flex flex-col items-center">
                  <span className={`text-[16px] font-semibold transition-colors duration-150 ${isDragging ? 'text-accent' : 'text-text-primary'}`}>
                    {t('tap_to_upload')}
                  </span>
                  <span className="text-[14px] text-text-muted mt-1">{t('drag_drop')}</span>
                </div>
                <hr className="w-16 border-border-default my-2" />
                <span className="text-[12px] text-text-muted">{t('file_types')}</span>
              </div>
            )}

            <input
              ref={inputRef}
              type="file"
              accept=".jpg,.jpeg,.png,.webp,.heic,.heif,.avif,.tif,.tiff,image/jpeg,image/png,image/webp,image/heic,image/heif,image/avif,image/tiff"
              onChange={handleInputChange}
              className="hidden"
            />
          </div>

          {/* Error message — shown whether or not a file is selected */}
          {error && (
            <div className="flex items-start gap-2 px-3 py-2.5 bg-[#DC2626]/10 border border-[#DC2626]/30 rounded-[10px]">
              <AlertCircle className="w-4 h-4 text-[#DC2626] shrink-0 mt-0.5" />
              <span className="text-[13px] text-[#DC2626] font-medium">{error}</span>
            </div>
          )}

          {/* Desktop tips panel */}
          <div className="hidden lg:flex lg:flex-col bg-bg-surface border border-border-default rounded-[12px] p-6 self-start lg:sticky lg:top-4">
            <h3 className="text-[18px] font-semibold text-text-primary mb-5">{t('tips_title')}</h3>
            <div className="flex flex-col gap-5">
              {(['tip1', 'tip2', 'tip3', 'tip4'] as const).map((key) => (
                <div key={key} className="flex items-start gap-3">
                  <CheckCircle className="w-4 h-4 text-accent shrink-0 mt-0.5" />
                  <span className="text-[15px] text-text-secondary">{t(key)}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Mobile tips — horizontal scroll */}
        <div className="flex lg:hidden gap-2 overflow-x-auto no-scrollbar pb-1">
          {(['tip1', 'tip2', 'tip3', 'tip4'] as const).map((key) => (
            <span
              key={key}
              className="shrink-0 flex items-center gap-1.5 bg-bg-surface border border-border-default rounded-full px-3 py-1.5 text-[12px] text-text-secondary"
            >
              <CheckCircle className="w-3 h-3 text-accent shrink-0" />
              {t(key)}
            </span>
          ))}
        </div>

        {/* Category picker */}
        <div className="flex flex-col gap-2">
          <p className="text-[13px] text-text-muted font-medium">{categoryPrompt}</p>
          <div className="flex gap-2 overflow-x-auto no-scrollbar pb-1">
            {CATEGORY_ITEMS.map((item) => {
              const Icon = item.icon
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => handleCategorySelect(item.id)}
                  className={cn(
                    'shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[13px] font-medium border transition-all min-h-[36px]',
                    selectedCategory === item.id
                      ? 'bg-accent text-white border-accent'
                      : 'bg-bg-elevated text-text-secondary border-border-default hover:border-border-hover',
                  )}
                >
                  <Icon size={14} />
                  {tLanding(item.tKey)}
                </button>
              )
            })}
          </div>
        </div>

        <div className="flex flex-col items-center gap-1 py-2">
          <p className="flex items-center gap-1.5 text-[12px] text-text-muted">
            <ShieldCheck size={14} />
            {t('privacy_note')}
          </p>
        </div>
      </main>

      <div className="sticky bottom-0 bg-bg-base border-t border-border-default py-3 safe-bottom">
        <div className="page-funnel">
          <button
            type="button"
            onClick={handleContinue}
            disabled={!canContinue}
            className={cn(
              'btn-primary btn-full',
              !canContinue && 'opacity-50 cursor-not-allowed',
            )}
          >
            {isUploading ? (
              <div className="flex items-center justify-center gap-2">
                <div className="w-4 h-4 rounded-full border-2 border-white border-t-transparent animate-spin" />
                {isRetrying ? tCommon('retrying') : tCommon('loading')}
              </div>
            ) : (
              tCommon('continue')
            )}
          </button>
        </div>
      </div>
    </div>
  )
}
