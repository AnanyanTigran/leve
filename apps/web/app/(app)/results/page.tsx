'use client'

import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { useTranslations } from 'next-intl'
import { Phone } from 'lucide-react'
import { AppHeader } from '@/components/shared/app-header'
import { isVerified } from '@/lib/session'
import { BottomNav } from '@/components/shared/bottom-nav'
import { BeforeAfterSlider } from '@/components/results/before-after-slider'
import { TextOverlaySection } from '@/components/results/text-overlay-section'
import { PaywallSheet } from '@/components/results/paywall-sheet'
import { useGenerate } from '@/hooks/use-generate'
import type { AspectRatio } from '@leve/types'

type JobStatus = 'queued' | 'processing' | 'done' | 'failed' | null

export default function ResultsPage() {
  const router = useRouter()
  const t = useTranslations('results')
  const tPaywall = useTranslations('paywall')
  const { generate } = useGenerate()

  const [guarded, setGuarded] = useState(false)
  const [paywallOpen, setPaywallOpen] = useState(false)
  const [paywallInitialState, setPaywallInitialState] = useState<'pricing' | 'processing'>('pricing')
  const [shareCopied, setShareCopied] = useState(false)
  const [jobId, setJobId] = useState<string | null>(null)
  const [jobStatus, setJobStatus] = useState<JobStatus>(null)
  const [generatedImageUrl, setGeneratedImageUrl] = useState<string | null>(null)
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null)

  // Edit flow state
  const [editPrompt, setEditPrompt] = useState('')
  const [isEditing, setIsEditing] = useState(false)
  const [editError, setEditError] = useState(false)
  const [previousImageUrl, setPreviousImageUrl] = useState<string | null>(null)
  const [canEdit, setCanEdit] = useState<boolean | null>(null)
  const [uploadPreview, setUploadPreview] = useState<string | null>(null)

  // Refs so the polling closure reads current edit state without being in its dep array
  const editStateRef = useRef({ isEditing: false, previousImageUrl: null as string | null })

  useEffect(() => {
    const id = sessionStorage.getItem('leve_job_id')
    if (!id) { router.replace('/'); return }

    const storedPreview = sessionStorage.getItem('leve_upload_preview')
    const uploadSessionId = sessionStorage.getItem('leve_upload_session_id')
    const jobUploadSessionId = sessionStorage.getItem('leve_job_upload_session_id')
    const pairingValid = uploadSessionId === jobUploadSessionId

    // Only show before/after when the upload and job are from the same flow.
    // If mismatched (user uploaded a new image without regenerating), hide the
    // stale upload preview so the before side is empty rather than misleading.
    setUploadPreview(pairingValid ? storedPreview : null)
    setJobId(id)
    setGuarded(true)
  }, [router])

  // Detect return from payment redirect and open paywall in processing state
  useEffect(() => {
    const orderId = sessionStorage.getItem('leve_order_id')
    if (!orderId) return

    const initiatedAt = parseInt(
      sessionStorage.getItem('leve_order_initiated_at') ?? '0',
      10,
    )
    const isRecent = Date.now() - initiatedAt < 15 * 60 * 1000

    if (isRecent) {
      setPaywallOpen(true)
      setPaywallInitialState('processing')
    } else {
      sessionStorage.removeItem('leve_order_id')
      sessionStorage.removeItem('leve_order_initiated_at')
    }
  }, [])

  useEffect(() => {
    if (!jobId || jobStatus === 'done' || jobStatus === 'failed') return

    // When returning from a payment redirect the job is already done — skip
    // status polling and go straight to fetching the preview URL.
    if (paywallInitialState === 'processing') {
      fetch(`/api/download/preview-url?jobId=${jobId}`, { credentials: 'include' })
        .then(r => r.json())
        .then(urlData => {
          if (urlData.success && urlData.data.previewUrls?.[0]) {
            setGeneratedImageUrl(urlData.data.previewUrls[0])
          }
        })
        .catch(() => {})
        .finally(() => setJobStatus('done'))
      return
    }

    const poll = async () => {
      try {
        const res = await fetch(`/api/generate/status/${jobId}`, { credentials: 'include' })
        if (res.status === 404) {
          if (pollRef.current) clearInterval(pollRef.current)
          sessionStorage.removeItem('leve_job_id')
          router.replace('/')
          return
        }
        const data = await res.json()
        if (!res.ok || !data.success) return

        setJobStatus(data.data.status)

        if (data.data.status === 'done') {
          if (pollRef.current) clearInterval(pollRef.current)
          const urlRes = await fetch(`/api/download/preview-url?jobId=${jobId}`, {
            credentials: 'include',
          })
          const urlData = await urlRes.json()
          if (urlData.success && urlData.data.previewUrls?.[0]) {
            setGeneratedImageUrl(urlData.data.previewUrls[0])
          }
          // Snapshot the last successful selection so the templates page can
          // offer a "Use my last setup" quick action on the next upload.
          // Skipped for iterative edits — the iterative prompt isn't useful
          // to replay against a different upload.
          if (!editStateRef.current.isEditing) {
            const sceneId = sessionStorage.getItem('leve_scene_id')
            const chips = sessionStorage.getItem('leve_selected_chips')
            const ratio = sessionStorage.getItem('leve_aspect_ratio')
            const custom = sessionStorage.getItem('leve_custom_text')
            if (sceneId) sessionStorage.setItem('leve_last_scene_id', sceneId)
            if (chips)   sessionStorage.setItem('leve_last_chips', chips)
            if (ratio)   sessionStorage.setItem('leve_last_aspect_ratio', ratio)
            if (custom !== null) sessionStorage.setItem('leve_last_custom_text', custom)
          }
          if (editStateRef.current.isEditing) {
            setEditPrompt('')
            setIsEditing(false)
            editStateRef.current.isEditing = false
          }
        }

        if (data.data.status === 'failed') {
          if (pollRef.current) clearInterval(pollRef.current)
          if (editStateRef.current.isEditing) {
            setGeneratedImageUrl(editStateRef.current.previousImageUrl)
            setPreviousImageUrl(null)
            editStateRef.current.previousImageUrl = null
            setEditError(true)
            setIsEditing(false)
            editStateRef.current.isEditing = false
          }
        }
      } catch {
        // network error — keep polling
      }
    }

    poll()
    pollRef.current = setInterval(poll, 2000)
    return () => { if (pollRef.current) clearInterval(pollRef.current) }
  }, [jobId, jobStatus, paywallInitialState, router])

  // Check whether the user can still run edits (credits or anon budget remaining)
  useEffect(() => {
    if (jobStatus !== 'done') return
    fetch('/api/session/me', { credentials: 'include' })
      .then(r => r.json())
      .then(d => {
        if (!d.success) return
        const s = d.data
        setCanEdit(
          (s.isVerified && s.creditsRemaining > 0) ||
          (!s.isVerified && s.anonGenerationsUsed < s.anonGenerationsLimit),
        )
      })
      .catch(() => setCanEdit(true)) // fail-open: show edit section if check fails
  }, [jobStatus])

  const verified = typeof window !== 'undefined' ? isVerified() : false

  async function handleShare() {
    if (navigator.share) {
      try {
        await navigator.share({
          title: 'LEVE — AI Product Photography',
          text: 'Transform your product photos into studio-quality visuals in seconds.',
          url: window.location.origin,
        })
      } catch {
        // user cancelled, silent fail
      }
      return
    }
    try {
      await navigator.clipboard.writeText(window.location.origin)
      setShareCopied(true)
      setTimeout(() => setShareCopied(false), 2000)
    } catch {
      // silent fail
    }
  }

  async function handleEditSubmit() {
    if (!editPrompt.trim() || !jobId || isEditing) return

    const currentImage = generatedImageUrl
    const uploadKey = sessionStorage.getItem('leve_upload_key') ?? ''
    const sceneId = sessionStorage.getItem('leve_scene_id') ?? 'studio_white'
    const category = sessionStorage.getItem('leve_category') ?? 'custom'
    const aspectRatio = (sessionStorage.getItem('leve_aspect_ratio') ?? '1:1') as AspectRatio

    setEditError(false)
    setIsEditing(true)
    editStateRef.current.isEditing = true
    setPreviousImageUrl(currentImage)
    editStateRef.current.previousImageUrl = currentImage
    setGeneratedImageUrl(null)
    setJobStatus(null)

    const result = await generate({
      uploadKey,
      sceneId,
      category,
      intent: 'product_photo',
      selectedChips: [],
      customText: editPrompt,
      aspectRatio,
      isEdit: true,
      sourceJobId: jobId,
    })

    if (!result) {
      // useGenerate sets its own error state; restore image and mark edit as failed
      setGeneratedImageUrl(currentImage)
      setPreviousImageUrl(null)
      editStateRef.current.previousImageUrl = null
      setJobStatus('done')
      setIsEditing(false)
      editStateRef.current.isEditing = false
      setEditError(true)
      return
    }

    setJobId(result.jobId)
    // polling effect will restart since jobId changed and jobStatus is null
  }

  if (!guarded) {
    return (
      <div className="flex items-center justify-center h-[100dvh] bg-bg-base">
        <div className="w-8 h-8 rounded-full border-2 border-accent border-t-transparent animate-spin" />
      </div>
    )
  }

  if (jobStatus === 'failed' && !editStateRef.current.isEditing) {
    return (
      <div className="flex flex-col h-[100dvh] items-center justify-center bg-bg-base gap-4 px-6">
        <p className="text-text-primary text-[18px] font-semibold text-center">
          {t('generation_failed')}
        </p>
        <p className="text-text-secondary text-[14px] text-center">{t('generation_failed_sub')}</p>
        <button onClick={() => router.push('/templates')} className="btn-primary">
          {t('try_again')}
        </button>
      </div>
    )
  }

  return (
    <div className="flex flex-col h-[100dvh] overflow-hidden bg-bg-base">
      <AppHeader
        variant="app"
        showBack={false}
        title={t('title')}
        rightSlot={
          <div className="flex items-center gap-3">
            <button
              onClick={handleShare}
              className="text-[13px] text-accent font-ui font-semibold"
            >
              {shareCopied ? t('share_copied') : t('share')}
            </button>
          </div>
        }
      />

      <main className="page-content flex-1 overflow-y-auto pb-24">
        <div className="py-4 flex flex-col gap-4">
          <BeforeAfterSlider
            beforeSrc={previousImageUrl ?? uploadPreview}
            afterSrc={generatedImageUrl}
          />
          {!verified && (
            <div className="bg-bg-surface border border-border-default rounded-[12px] p-4 flex items-center gap-3">
              <div className="w-8 h-8 rounded-full bg-accent-subtle flex items-center justify-center shrink-0">
                <Phone className="w-4 h-4 text-accent" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-[13px] font-semibold text-text-primary">{t('save_designs')}</p>
                <p className="text-[12px] text-text-muted">{t('save_designs_sub')}</p>
              </div>
              <button
                onClick={() => router.push('/register')}
                className="text-[12px] text-accent font-semibold shrink-0"
              >
                {t('add_phone')}
              </button>
            </div>
          )}
          <TextOverlaySection />

          {/* Iterative edit section — shown only when a result exists and session allows it */}
          {generatedImageUrl && canEdit !== null && (
            <div className="bg-bg-surface border border-border-default rounded-[12px] p-4 flex flex-col gap-3">
              <p className="text-[14px] font-semibold text-text-primary">{t('edit_heading')}</p>
              {canEdit ? (
                <>
                  <input
                    type="text"
                    value={editPrompt}
                    onChange={e => setEditPrompt(e.target.value)}
                    onKeyDown={e => { if (e.key === 'Enter') handleEditSubmit() }}
                    placeholder={t('edit_placeholder')}
                    disabled={isEditing}
                    className="w-full h-12 rounded-[10px] border border-border-default bg-bg-elevated px-3 text-[14px] text-text-primary placeholder:text-text-muted focus:outline-none focus:border-border-strong disabled:opacity-50"
                  />
                  {editError && (
                    <p className="text-[12px] text-error">{t('edit_error')}</p>
                  )}
                  <button
                    onClick={handleEditSubmit}
                    disabled={isEditing || !editPrompt.trim()}
                    className="btn-primary btn-full disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {isEditing ? t('edit_regenerating') : t('edit_submit')}
                  </button>
                </>
              ) : (
                <button
                  onClick={() => setPaywallOpen(true)}
                  className="btn-primary btn-full"
                >
                  {t('edit_no_credits')}
                </button>
              )}
            </div>
          )}

          <div className="mt-4 mb-2">
            <button
              onClick={() => setPaywallOpen(true)}
              className="btn-primary btn-full"
            >
              {tPaywall('title')}
            </button>
          </div>
        </div>
      </main>

      {!paywallOpen && <BottomNav />}
      <PaywallSheet
        isOpen={paywallOpen}
        onClose={() => { setPaywallOpen(false); setPaywallInitialState('pricing') }}
        initialState={paywallInitialState}
      />
    </div>
  )
}
