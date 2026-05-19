'use client'

import { useState, useRef, useCallback, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useTranslations } from 'next-intl'
import { UploadCloud, X, AlertCircle, ShieldCheck, CheckCircle } from 'lucide-react'
import { isVerified } from '@/lib/session'

const MAX_FILE_SIZE = 20 * 1024 * 1024 // 20MB
const ACCEPTED_TYPES = ['image/jpeg', 'image/png', 'image/webp']
const PREVIEW_MAX_PX = 600

function compressToDataUrl(file: File): Promise<string> {
  return new Promise((resolve) => {
    const img = new Image()
    const blobUrl = URL.createObjectURL(file)
    img.onload = () => {
      const scale = Math.min(PREVIEW_MAX_PX / img.width, PREVIEW_MAX_PX / img.height, 1)
      const canvas = document.createElement('canvas')
      canvas.width = Math.round(img.width * scale)
      canvas.height = Math.round(img.height * scale)
      canvas.getContext('2d')!.drawImage(img, 0, 0, canvas.width, canvas.height)
      URL.revokeObjectURL(blobUrl)
      resolve(canvas.toDataURL('image/jpeg', 0.82))
    }
    img.src = blobUrl
  })
}

interface FileState {
  file: File
  preview: string
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
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (!isVerified()) router.replace('/register')
  }, [router])

  const [fileState, setFileState] = useState<FileState | null>(null)
  const [isDragging, setIsDragging] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const validateFile = useCallback((file: File): string | null => {
    if (!ACCEPTED_TYPES.includes(file.type)) return t('error_type')
    if (file.size > MAX_FILE_SIZE) return t('error_size')
    return null
  }, [t])

  const handleFile = useCallback((file: File) => {
    const validationError = validateFile(file)
    if (validationError) {
      setError(validationError)
      setFileState(null)
      return
    }
    setError(null)
    const preview = URL.createObjectURL(file)
    setFileState({ file, preview })
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
    if (fileState) {
      sessionStorage.setItem('leve_upload_name', fileState.file.name)
      const dataUrl = await compressToDataUrl(fileState.file)
      sessionStorage.setItem('leve_upload_preview', dataUrl)
      router.push('/templates')
    }
  }, [fileState, router])

  const isValid = fileState !== null && error === null

  return (
    <div className="flex flex-col flex-1">
      <main className="page-funnel flex-1 flex flex-col py-4 gap-4">
        <div className="lg:grid lg:grid-cols-[1fr_320px] lg:gap-6 lg:items-start flex-1 flex flex-col lg:flex-none">

          {/* Upload zone */}
          <div
            onClick={() => !fileState && inputRef.current?.click()}
            onDrop={handleDrop}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            className={[
              'relative flex flex-col rounded-[14px] overflow-hidden transition-all duration-150 ease-out',
              'flex-1 min-h-[300px] lg:min-h-[420px]',
              fileState
                ? 'border-0'
                : isDragging
                ? 'border-[1.5px] border-solid border-accent bg-accent-subtle cursor-pointer'
                : 'border-[1.5px] border-dashed border-border-default bg-bg-base cursor-pointer',
            ].join(' ')}
          >
            {fileState ? (
              <>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={fileState.preview}
                  alt="Preview"
                  className="absolute inset-0 w-full h-full object-cover rounded-[14px]"
                />
                <button
                  type="button"
                  onClick={(e) => { e.stopPropagation(); handleRemove() }}
                  className="absolute top-3 right-3 w-9 h-9 flex items-center justify-center rounded-lg bg-black/40 hover:bg-black/60 transition-colors"
                  aria-label="Remove file"
                >
                  <X className="w-5 h-5 text-white" />
                </button>
                <div className="absolute bottom-0 left-0 right-0 h-20 bg-gradient-to-t from-black/70 to-transparent flex flex-col justify-end p-3">
                  <span className="text-[13px] text-white font-medium truncate">{fileState.file.name}</span>
                  <span className="text-[11px] text-white/70">{formatFileSize(fileState.file.size)}</span>
                </div>
              </>
            ) : (
              <div className="flex flex-col items-center justify-center h-full w-full min-h-[300px] lg:min-h-[420px] gap-3 text-center p-8">
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
              accept=".jpg,.jpeg,.png,.webp"
              onChange={handleInputChange}
              className="hidden"
            />
          </div>

          {/* Desktop tips panel */}
          <div className="hidden lg:flex lg:flex-col bg-bg-surface border border-border-default rounded-[12px] p-5 self-start lg:sticky lg:top-4">
            <h3 className="text-[16px] font-semibold text-text-primary mb-5">{t('tips_title')}</h3>
            <div className="flex flex-col gap-4">
              {(['tip1', 'tip2', 'tip3', 'tip4'] as const).map((key) => (
                <div key={key} className="flex items-start gap-3">
                  <CheckCircle className="w-4 h-4 text-accent shrink-0 mt-0.5" />
                  <span className="text-[14px] text-text-secondary">{t(key)}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {error && (
          <div className="flex items-center gap-2 px-1">
            <AlertCircle className="w-4 h-4 text-[#DC2626] shrink-0" />
            <span className="text-[13px] text-[#DC2626]">{error}</span>
          </div>
        )}

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
            disabled={!isValid}
            className="btn-primary btn-full"
          >
            {tCommon('continue')}
          </button>
        </div>
      </div>
    </div>
  )
}
