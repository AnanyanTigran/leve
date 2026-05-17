'use client'

import { useState, useRef, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { UploadCloud, X, AlertCircle, ShieldCheck, CheckCircle } from 'lucide-react'

const MAX_FILE_SIZE = 20 * 1024 * 1024 // 20MB
const ACCEPTED_TYPES = ['image/jpeg', 'image/png', 'image/webp']

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
  const inputRef = useRef<HTMLInputElement>(null)
  const [fileState, setFileState] = useState<FileState | null>(null)
  const [isDragging, setIsDragging] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const validateFile = useCallback((file: File): string | null => {
    if (!ACCEPTED_TYPES.includes(file.type)) {
      return 'Only JPEG, PNG and WEBP files are supported'
    }
    if (file.size > MAX_FILE_SIZE) {
      return 'File too large — max 20MB'
    }
    return null
  }, [])

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
    if (fileState?.preview) {
      URL.revokeObjectURL(fileState.preview)
    }
    setFileState(null)
    setError(null)
    if (inputRef.current) {
      inputRef.current.value = ''
    }
  }, [fileState])

  const handleContinue = useCallback(() => {
    if (fileState) {
      sessionStorage.setItem('leve_upload_name', fileState.file.name)
      router.push('/templates')
    }
  }, [fileState, router])

  const isValid = fileState !== null && error === null

  return (
    <div className="flex flex-col flex-1 lg:max-w-[960px] lg:mx-auto lg:w-full lg:grid lg:grid-cols-2 lg:gap-8 lg:px-8 lg:py-8">
      {/* Upload Zone */}
      <div className="flex flex-col flex-1 px-4 pt-4 lg:px-0 lg:pt-0">
        <div
          onClick={() => !fileState && inputRef.current?.click()}
          onDrop={handleDrop}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          className={`
            relative flex-1 min-h-[300px] lg:min-h-[400px] rounded-[14px] overflow-hidden
            transition-all duration-150 ease-out
            ${fileState 
              ? 'border-0' 
              : isDragging 
                ? 'border-[1.5px] border-solid border-accent bg-accent-subtle cursor-pointer' 
                : 'border-[1.5px] border-dashed border-border-default bg-bg-base cursor-pointer'
            }
          `}
        >
          {fileState ? (
            <>
              {/* Image preview */}
              <img
                src={fileState.preview}
                alt="Preview"
                className="absolute inset-0 w-full h-full object-cover rounded-[14px]"
              />
              
              {/* Remove button */}
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation()
                  handleRemove()
                }}
                className="absolute top-3 right-3 w-9 h-9 flex items-center justify-center rounded-lg bg-black/40 hover:bg-black/60 transition-colors"
                aria-label="Remove file"
              >
                <X className="w-5 h-5 text-white" />
              </button>

              {/* Bottom gradient overlay with file info */}
              <div className="absolute bottom-0 left-0 right-0 h-20 bg-gradient-to-t from-black/70 to-transparent flex flex-col justify-end p-3">
                <span className="text-[13px] text-white font-medium truncate">
                  {fileState.file.name}
                </span>
                <span className="text-[11px] text-white/70">
                  {formatFileSize(fileState.file.size)}
                </span>
              </div>
            </>
          ) : (
            <div className="flex flex-col items-center justify-center h-full px-6">
              <UploadCloud 
                className={`w-12 h-12 mb-4 transition-colors duration-150 ${
                  isDragging ? 'text-accent' : 'text-text-muted'
                }`} 
              />
              <span 
                className={`text-[16px] font-semibold mb-1 transition-colors duration-150 ${
                  isDragging ? 'text-accent' : 'text-text-primary'
                }`}
              >
                Tap to choose a photo
              </span>
              <span className="text-[14px] text-text-muted">
                or drag and drop
              </span>
              <hr className="w-16 border-border-default my-5" />
              <span className="text-[12px] text-text-muted">
                JPEG · PNG · WEBP · Max 20MB
              </span>
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

        {/* Validation error */}
        {error && (
          <div className="flex items-center gap-2 mt-3 px-1">
            <AlertCircle className="w-4 h-4 text-[#DC2626] shrink-0" />
            <span className="text-[13px] text-[#DC2626]">{error}</span>
          </div>
        )}

        {/* Trust badges */}
        <div className="flex flex-col items-center mt-4 gap-1">
          <div className="flex items-center gap-1.5">
            <ShieldCheck className="w-3.5 h-3.5 text-text-muted" />
            <span className="text-[12px] text-text-muted">No account needed</span>
          </div>
          <span className="text-[11px] text-text-muted">
            Your photo is deleted after 48 hours
          </span>
        </div>
      </div>

      {/* Desktop tips panel */}
      <div className="hidden lg:flex lg:flex-col bg-bg-surface border border-border-default rounded-md p-6 h-fit">
        <h3 className="text-[16px] font-semibold text-text-primary mb-5">
          For best results
        </h3>
        <div className="flex flex-col gap-4">
          {[
            'Use natural or studio lighting',
            'Keep the product centered',
            'Avoid busy backgrounds',
            'Minimum 800×800px resolution',
          ].map((tip) => (
            <div key={tip} className="flex items-start gap-3">
              <CheckCircle className="w-4 h-4 text-accent shrink-0 mt-0.5" />
              <span className="text-[14px] text-text-secondary">{tip}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Sticky bottom CTA - mobile only on its own row, desktop spans full width */}
      <div className="fixed bottom-0 left-0 right-0 px-4 pb-[calc(16px+var(--safe-area-inset-bottom))] pt-3 bg-bg-base lg:static lg:col-span-2 lg:p-0 lg:mt-4">
        <button
          type="button"
          onClick={handleContinue}
          disabled={!isValid}
          className={`btn-primary w-full ${!isValid ? 'opacity-50 pointer-events-none' : ''}`}
        >
          Continue
        </button>
      </div>
    </div>
  )
}
