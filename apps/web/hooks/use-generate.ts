'use client'

import { useState, useCallback } from 'react'
import type { AspectRatio } from '@leve/types'
import { apiFetch } from '@/lib/api-client'

interface GenerateParams {
  uploadKey: string
  sceneId: string
  category: string
  intent: string
  selectedChips: string[]
  customText: string
  aspectRatio: AspectRatio
  isEdit?: boolean
  sourceJobId?: string
}

interface GenerateResult {
  jobId: string
  softCapReached: boolean
  anonGenerationsUsed: number | null
  anonGenerationsLimit: number | null
}

type GenerateError =
  | 'otp_required'
  | 'insufficient_credits'
  | 'rate_limit_exceeded'
  | 'upload_missing'
  | 'generation_failed'

export function useGenerate() {
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<GenerateError | null>(null)

  const generate = useCallback(
    async (params: GenerateParams): Promise<GenerateResult | null> => {
      setIsLoading(true)
      setError(null)

      try {
        const res = await apiFetch('/api/generate/preview', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            uploadKey: params.uploadKey,
            sceneId: params.sceneId,
            category: params.category,
            intent: params.intent,
            refinementChips: params.selectedChips,
            customText: params.customText || undefined,
            aspectRatio: params.aspectRatio,
            isEdit: params.isEdit ?? false,
            sourceJobId: params.sourceJobId,
          }),
        })

        const data = await res.json()

        if (!res.ok) {
          // Map API error codes to typed errors
          if (res.status === 403 && data.errorCode === 'anon_limit_reached') {
            sessionStorage.setItem('leve_pending_generate', JSON.stringify({
              sceneId: params.sceneId,
              chips: params.selectedChips,
              customText: params.customText,
              aspectRatio: params.aspectRatio,
              category: params.category,
            }))
            setError('otp_required')
            return null
          }
          if (res.status === 402) {
            setError('insufficient_credits')
            return null
          }
          if (res.status === 429) {
            setError('rate_limit_exceeded')
            return null
          }
          setError('generation_failed')
          return null
        }

        // Save jobId to sessionStorage for polling on /processing
        sessionStorage.setItem('leve_job_id', data.data.jobId)
        sessionStorage.setItem('leve_job_dispatched_at', Date.now().toString())
        sessionStorage.setItem('leve_job_upload_session_id', sessionStorage.getItem('leve_upload_session_id') ?? '')
        sessionStorage.setItem('leve_aspect_ratio', params.aspectRatio)

        return {
          jobId: data.data.jobId,
          softCapReached: data.data.softCapReached ?? false,
          anonGenerationsUsed: data.data.anonGenerationsUsed ?? null,
          anonGenerationsLimit: data.data.anonGenerationsLimit ?? null,
        }
      } catch {
        setError('generation_failed')
        return null
      } finally {
        setIsLoading(false)
      }
    },
    [],
  )

  return { generate, isLoading, error, setError }
}
