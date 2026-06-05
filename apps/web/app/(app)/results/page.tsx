'use client'

import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { useTranslations } from 'next-intl'
import { Phone } from 'lucide-react'
import { AppHeader } from '@/components/shared/app-header'
import { useSession } from '@/hooks/use-session'
import { BottomNav } from '@/components/shared/bottom-nav'
import { BeforeAfterSlider } from '@/components/results/before-after-slider'
import { TextOverlaySection, type OverlayState } from '@/components/results/text-overlay-section'
import { PaywallSheet } from '@/components/results/paywall-sheet'
import { useGenerate } from '@/hooks/use-generate'
import { cn } from '@/lib/utils'
import type { AspectRatio } from '@leve/types'

type JobStatus = 'queued' | 'processing' | 'done' | 'failed' | 'credit_refunded' | null

// Stop polling silently in the background after this many consecutive failures —
// surface a "Reconnecting…" hint to the user instead.
const POLL_FAILURE_OFFLINE_THRESHOLD = 3
// Preview URL fetch should not hang forever — fail fast and show retry button.
const PREVIEW_URL_TIMEOUT_MS = 10_000

async function fetchPreviewUrlWithTimeout(jobId: string, signal: AbortSignal) {
  const res = await fetch(`/api/download/preview-url?jobId=${jobId}`, {
    credentials: 'include',
    signal,
  })
  return res.json() as Promise<{ success: boolean; data?: { previewUrls?: string[] } }>
}

export default function ResultsPage() {
  const router = useRouter()
  const t = useTranslations('results')
  const tPaywall = useTranslations('paywall')
  const { generate } = useGenerate()
  const { session, mutate: refreshSession } = useSession()
  const verified = session?.isVerified === true

  const [guarded, setGuarded] = useState(false)
  // null = still checking; true = user already paid for this job (DownloadGrant exists);
  // false = paywall is required. Drives the sticky CTA at the bottom of the page.
  const [hasGrant, setHasGrant] = useState<boolean | null>(null)
  const [paywallOpen, setPaywallOpen] = useState(false)
  const [paywallInitialState, setPaywallInitialState] = useState<'pricing' | 'processing'>('pricing')
  const [shareCopied, setShareCopied] = useState(false)
  const [jobId, setJobId] = useState<string | null>(null)
  const [jobStatus, setJobStatus] = useState<JobStatus>(null)
  const [generatedImageUrl, setGeneratedImageUrl] = useState<string | null>(null)
  const [previewUrlError, setPreviewUrlError] = useState(false)
  const [isReconnecting, setIsReconnecting] = useState(false)
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const pollFailuresRef = useRef(0)

  // Edit flow state
  const [editPrompt, setEditPrompt] = useState('')
  const [isEditing, setIsEditing] = useState(false)
  const [editError, setEditError] = useState(false)
  const [previousImageUrl, setPreviousImageUrl] = useState<string | null>(null)
  const [uploadPreview, setUploadPreview] = useState<string | null>(null)

  // Derived from shared session — re-derives whenever session changes, so a
  // post-edit or post-purchase refreshSession() updates the UI without a
  // separate fetch.
  const canEdit: boolean | null = (() => {
    if (!session) return null
    if (session.isVerified) return session.creditsRemaining > 0
    return session.anonGenerationsUsed < session.anonGenerationsLimit
  })()

  // Refs so the polling closure reads current edit state without being in its dep array
  const editStateRef = useRef({ isEditing: false, previousImageUrl: null as string | null })

  // Text overlay (live CSS preview + persisted server-side at HD download time)
  const [overlay, setOverlay] = useState<OverlayState>({ template: null, text: '', position: 'bottom' })
  const overlayDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

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
    if (!jobId || jobStatus === 'done' || jobStatus === 'failed' || jobStatus === 'credit_refunded') return

    // When returning from a payment redirect the job is already done — skip
    // status polling and go straight to fetching the preview URL.
    if (paywallInitialState === 'processing') {
      const ctl = new AbortController()
      const timeoutId = setTimeout(() => ctl.abort(), PREVIEW_URL_TIMEOUT_MS)
      fetchPreviewUrlWithTimeout(jobId, ctl.signal)
        .then(urlData => {
          if (urlData.success && urlData.data?.previewUrls?.[0]) {
            setGeneratedImageUrl(urlData.data.previewUrls[0])
            setPreviewUrlError(false)
          } else {
            setPreviewUrlError(true)
          }
        })
        .catch(() => setPreviewUrlError(true))
        .finally(() => {
          clearTimeout(timeoutId)
          setJobStatus('done')
        })
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
        if (res.status === 401 || res.status === 403) {
          if (pollRef.current) clearInterval(pollRef.current)
          router.replace('/register')
          return
        }
        const data = await res.json()
        if (!res.ok || !data.success) return

        // Successful poll — clear any "reconnecting" indicator
        pollFailuresRef.current = 0
        if (isReconnecting) setIsReconnecting(false)

        setJobStatus(data.data.status)

        if (data.data.status === 'done') {
          if (pollRef.current) clearInterval(pollRef.current)
          const ctl = new AbortController()
          const timeoutId = setTimeout(() => ctl.abort(), PREVIEW_URL_TIMEOUT_MS)
          try {
            const urlData = await fetchPreviewUrlWithTimeout(jobId, ctl.signal)
            if (urlData.success && urlData.data?.previewUrls?.[0]) {
              setGeneratedImageUrl(urlData.data.previewUrls[0])
              setPreviewUrlError(false)
            } else {
              setPreviewUrlError(true)
            }
          } catch {
            setPreviewUrlError(true)
          } finally {
            clearTimeout(timeoutId)
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
            void refreshSession()
          }
        }

        if (data.data.status === 'failed' || data.data.status === 'credit_refunded') {
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
        // network error — keep polling, but surface "Reconnecting…" after a few failures
        pollFailuresRef.current += 1
        if (pollFailuresRef.current >= POLL_FAILURE_OFFLINE_THRESHOLD && !isReconnecting) {
          setIsReconnecting(true)
        }
      }
    }

    poll()
    pollRef.current = setInterval(poll, 2000)
    return () => { if (pollRef.current) clearInterval(pollRef.current) }
  }, [jobId, jobStatus, paywallInitialState, router, isReconnecting])

  // When a job finishes (initial or after an edit), pull fresh session +
  // download-grant state. canEdit is derived from session.creditsRemaining /
  // anon budget, hasGrant gates the sticky download CTA.
  useEffect(() => {
    if (jobStatus !== 'done' || !jobId) return
    void refreshSession()
    setHasGrant(null)
    const ctl = new AbortController()
    fetch(`/api/download/check?jobId=${jobId}`, {
      credentials: 'include',
      signal: ctl.signal,
    })
      .then((r) => r.json())
      .then((d) => {
        if (d?.success) setHasGrant(Boolean(d.data?.hasGrant))
        else setHasGrant(false)
      })
      .catch((err) => {
        if (err?.name !== 'AbortError') setHasGrant(false)
      })
    return () => ctl.abort()
  }, [jobStatus, jobId, refreshSession])

  // After the paywall sheet closes, re-pull the grant. The sheet itself
  // already refreshes session via the success-polling path, but the grant
  // only flips when the webhook lands, which may be just after.
  useEffect(() => {
    if (paywallOpen) return
    if (!jobId || jobStatus !== 'done') return
    const ctl = new AbortController()
    fetch(`/api/download/check?jobId=${jobId}`, {
      credentials: 'include',
      signal: ctl.signal,
    })
      .then((r) => r.json())
      .then((d) => {
        if (d?.success) setHasGrant(Boolean(d.data?.hasGrant))
      })
      .catch(() => {})
    return () => ctl.abort()
  }, [paywallOpen, jobId, jobStatus])

  // Persist overlay choice on the server (debounced) so that when the user
  // hits Download HD, the worker can composite the latest overlay onto the
  // HD output deterministically. Failures are swallowed — the live CSS
  // preview is already showing the correct overlay locally.
  function persistOverlay(next: OverlayState) {
    if (!jobId) return
    if (overlayDebounceRef.current) clearTimeout(overlayDebounceRef.current)
    overlayDebounceRef.current = setTimeout(() => {
      const body = JSON.stringify({
        text: next.template && next.text.trim() ? next.text.trim() : null,
        position: next.position,
      })
      fetch(`/api/jobs/${jobId}/overlay`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body,
      }).catch(() => {})
    }, 400)
  }

  function handleOverlayChange(next: OverlayState) {
    setOverlay(next)
    persistOverlay(next)
  }

  async function handleRetryPreviewUrl() {
    if (!jobId) return
    setPreviewUrlError(false)
    const ctl = new AbortController()
    const timeoutId = setTimeout(() => ctl.abort(), PREVIEW_URL_TIMEOUT_MS)
    try {
      const urlData = await fetchPreviewUrlWithTimeout(jobId, ctl.signal)
      if (urlData.success && urlData.data?.previewUrls?.[0]) {
        setGeneratedImageUrl(urlData.data.previewUrls[0])
      } else {
        setPreviewUrlError(true)
      }
    } catch {
      setPreviewUrlError(true)
    } finally {
      clearTimeout(timeoutId)
    }
  }

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

  const sliderAspectRatio = (
    (typeof window !== 'undefined' && sessionStorage.getItem('leve_aspect_ratio')) || '1:1'
  ) as AspectRatio

  return (
    <div className="flex flex-col min-h-[100dvh] bg-bg-base">
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

      <main className="page-content flex-1 pb-16">
        <div className="py-4 flex flex-col gap-4">
          {isReconnecting && (
            <div className="px-3 py-2 bg-bg-surface border border-border-default rounded-[10px] flex items-center gap-2">
              <div className="w-3 h-3 rounded-full border-2 border-text-muted border-t-transparent animate-spin" />
              <span className="text-[12px] text-text-secondary">{t('reconnecting')}</span>
            </div>
          )}
          {previewUrlError && (
            <div className="px-4 py-3 bg-[#FEF2F2] border border-[#FCA5A5] rounded-[10px] flex items-center justify-between gap-3">
              <p className="text-[13px] text-[#DC2626] font-medium">
                {t('preview_load_failed')}
              </p>
              <button
                type="button"
                onClick={handleRetryPreviewUrl}
                className="text-[13px] text-[#DC2626] font-semibold underline"
              >
                {t('preview_load_retry')}
              </button>
            </div>
          )}
          <div className="relative">
            <BeforeAfterSlider
              beforeSrc={previousImageUrl ?? uploadPreview}
              afterSrc={generatedImageUrl}
              aspectRatio={sliderAspectRatio}
            />
            {/* Live text-overlay preview — purely CSS, no server roundtrip.
                The HD download composites the same text deterministically. */}
            {overlay.template && overlay.text.trim().length > 0 && generatedImageUrl && (
              <div
                className={cn(
                  'pointer-events-none absolute left-0 right-0 flex justify-center px-6',
                  overlay.position === 'top' && 'top-[6%]',
                  overlay.position === 'center' && 'top-1/2 -translate-y-1/2',
                  overlay.position === 'bottom' && 'bottom-[8%]',
                )}
              >
                <span
                  className="inline-block max-w-[80%] truncate rounded-full px-5 py-2 text-white text-[15px] font-semibold"
                  style={{ background: 'rgba(0,0,0,0.55)', letterSpacing: '0.5px' }}
                >
                  {overlay.text}
                </span>
              </div>
            )}
          </div>
          {session !== null && !verified && (
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
          <TextOverlaySection state={overlay} onChange={handleOverlayChange} />

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

        </div>

        {/* Sticky Download HD CTA — lives in the document flow so the whole
            page scrolls as one unit. Stays 64px above the viewport bottom
            (BottomNav's height) so it never overlaps the nav. The gradient
            fade lets content scroll behind it. */}
        {!paywallOpen && (
          <div className="sticky bottom-16 z-40 -mx-4 px-4 pb-3 pt-6 bg-gradient-to-t from-bg-base from-50% to-transparent safe-bottom">
            {hasGrant === null ? (
              <div className="h-12 rounded-[12px] bg-bg-elevated animate-pulse" />
            ) : hasGrant ? (
              <button
                onClick={() => router.push('/download/success')}
                className="btn-primary btn-full h-12 text-[15px] font-semibold"
              >
                {t('download_hd')}
              </button>
            ) : (
              <button
                onClick={() => setPaywallOpen(true)}
                className="btn-primary btn-full h-12 text-[15px] font-semibold"
              >
                {tPaywall('title')}
              </button>
            )}
          </div>
        )}
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
