// Re-export shared types + web-specific extensions
export type * from '@leve/types'

export interface UploadState {
  file: File | null
  preview: string | null
  isUploading: boolean
  progress: number
  error: string | null
}

export interface GenerationState {
  jobId: string | null
  status: 'idle' | 'uploading' | 'queued' | 'processing' | 'done' | 'error'
  previewUrls: string[]
  selectedVariant: number | null
  error: string | null
}

export interface PaywallState {
  isOpen: boolean
  selectedPack: import('@leve/types').CreditPack | null
}
