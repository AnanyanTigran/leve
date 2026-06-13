'use client'

import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { useTranslations } from 'next-intl'
import { Phone } from 'lucide-react'
import { PromptTextarea } from '@/components/ui/prompt-textarea'
import { AppHeader } from '@/components/shared/app-header'
import { useSession } from '@/hooks/use-session'
import { BottomNav } from '@/components/shared/bottom-nav'
import { BeforeAfterSlider } from '@/components/results/before-after-slider'
import { FullscreenImage } from '@/components/shared/fullscreen-image'
import { PaywallSheet } from '@/components/results/paywall-sheet'
import { useGenerate } from '@/hooks/use-generate'
import { apiFetch } from '@/lib/api-client'
import type { AspectRatio } from '@leve/types'

type JobStatus = 'queued' | 'processing' | 'done' | 'failed' | 'credit_refunded' | null
type EditPhase = 'idle' | 'queued' | 'processing' | 'finalizing' | 'done'

// Stop polling silently in the background after this many consecutive failures —
// surface a "Reconnecting…" hint to the user instead.
const POLL_FAILURE_OFFLINE_THRESHOLD = 3
// Preview URL fetch should not hang forever — fail fast and show retry button.
const PREVIEW_URL_TIMEOUT_MS = 10_000

async function fetchPreviewUrlWithTimeout(jobId: string, signal: AbortSignal) {
  const res = await apiFetch(`/api/download/preview-url?jobId=${jobId}`, { signal })
  return res.json() as Promise<{ success: boolean; data?: { previewUrls?: string[] } }>
}

export default function ResultsPage() {
  const router = useRouter()
  const t = useTranslations('results')
  const tPaywall = useTranslations('paywall')
  const tCommon = useTranslations('common')
  const { generate } = useGenerate()
  const { session, mutate: refreshSession } = useSession()
  const verified = session?.isVerified === true

  const [guarded, setGuarded] = useState(false)
  // null = still checking; true = user already paid for this job (DownloadGrant exists);
  // false = paywall is required. Drives the sticky CTA at the bottom of the page.
  const [hasGrant, setHasGrant] = useState<boolean | null>(null)
  const [paywallOpen, setPaywallOpen] = useState(false)
  const [paywallInitialState, setPaywallInitialState] = useState<'pricing' | 'processing'>('pricing')
  const [jobId, setJobId] = useState<string | null>(null)
  const [jobStatus, setJobStatus] = useState<JobStatus>(null)
  const [generatedImageUrl, setGeneratedImageUrl] = useState<string | null>(null)
  const [previewUrlError, setPreviewUrlError] = useState(false)
  const [isReconnecting, setIsReconnecting] = useState(false)
  // True while POST /api/download/spend-credit is in flight, so the sticky
  // CTA can show a loading state and ignore double clicks.
  const [isSpendingCredit, setIsSpendingCredit] = useState(false)
  const [isNavigating, setIsNavigating] = useState(false)
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const pollFailuresRef = useRef(0)

  // Before-image for the slider, resolved per job: the local upload preview
  // when it belongs to this job, otherwise a signed URL for the job's own
  // uploadS3Key fetched from the server (history path). sourceAvailable is
  // tri-state: null = still resolving, false = original upload is gone
  // (deleted by the 48h lifecycle rule) — render the generated image alone.
  const [beforeImageUrl, setBeforeImageUrl] = useState<string | null>(null)
  const [sourceAvailable, setSourceAvailable] = useState<boolean | null>(null)
  const [aspectRatioMismatch, setAspectRatioMismatch] = useState(false)
  // Soft daily cap (15 free generations/day) — business rule says nudge to
  // buy, never hard-block. The flag was being written by the templates page
  // but never read; this banner is that nudge.
  const [showSoftCapNudge, setShowSoftCapNudge] = useState(false)

  // Edit flow state
  const [editPrompt, setEditPrompt] = useState('')
  const [editPhase, setEditPhase] = useState<EditPhase>('idle')
  const [editError, setEditError] = useState(false)
  const [previousImageUrl, setPreviousImageUrl] = useState<string | null>(null)

  // Derived from shared session — re-derives whenever session changes, so a
  // post-edit or post-purchase refreshSession() updates the UI without a
  // separate fetch.
  const canEdit: boolean | null = (() => {
    if (!session) return null
    if (session.isVerified) return session.creditsRemaining > 0
    return session.anonGenerationsUsed < session.anonGenerationsLimit
  })()

  // Verified users who already have free credits should be able to spend one
  // directly from the sticky CTA instead of being routed through the paywall.
  const hasCredits = session !== null && session.creditsRemaining > 0

  // Refs so polling closures read current edit state without stale closure issues
  const editPhaseRef = useRef<EditPhase>('idle')
  const previousImageUrlRef = useRef<string | null>(null)

  useEffect(() => {
    if (!beforeImageUrl) { setAspectRatioMismatch(false); return }
    const storedRatio = sessionStorage.getItem('leve_aspect_ratio') ?? '1:1'
    const parts = storedRatio.split(':').map(Number)
    const W = parts[0] ?? 1
    const H = parts[1] ?? 1
    const targetRatio = W / H
    const img = new Image()
    img.onload = () => {
      const uploadRatio = img.naturalWidth / img.naturalHeight
      setAspectRatioMismatch(Math.abs(uploadRatio - targetRatio) / targetRatio > 0.05)
    }
    img.src = beforeImageUrl
  }, [beforeImageUrl])

  useEffect(() => {
    const id = sessionStorage.getItem('leve_job_id')
    if (!id) { router.replace('/'); return }

    if (sessionStorage.getItem('leve_soft_cap_reached') === '1') {
      sessionStorage.removeItem('leve_soft_cap_reached')
      setShowSoftCapNudge(true)
    }

    setJobId(id)
    setGuarded(true)

    const alreadyDone = sessionStorage.getItem('leve_job_done') === '1'
    if (alreadyDone) {
      sessionStorage.removeItem('leve_job_done')
      setJobStatus('done')
      const ctl = new AbortController()
      const timeoutId = setTimeout(() => ctl.abort(), PREVIEW_URL_TIMEOUT_MS)
      fetchPreviewUrlWithTimeout(id, ctl.signal)
        .then(urlData => {
          if (urlData.success && urlData.data?.previewUrls?.[0]) {
            setGeneratedImageUrl(urlData.data.previewUrls[0])
            setPreviewUrlError(false)
          } else {
            setPreviewUrlError(true)
          }
        })
        .catch(() => setPreviewUrlError(true))
        .finally(() => clearTimeout(timeoutId))
      return () => ctl.abort()
    }
  }, [router])

  // Resolve the before-image from THIS job's source, never from shared
  // last-generation state. The local preview in sessionStorage is trusted only
  // when leve_upload_preview_key matches the job's upload key (fresh-generation
  // and edit paths — edits reuse the same upload). Otherwise (history path,
  // cross-session restore) ask the server for a signed URL to the job's own
  // uploadS3Key. The upload may be gone — deleted after 48h per storage
  // policy — in which case sourceAvailable resolves false and the slider is
  // replaced by the generated image alone.
  // On re-resolution (jobId changes after an edit) previous values are kept
  // until the new ones arrive so the slider doesn't unmount mid-edit.
  useEffect(() => {
    if (!jobId) return

    const storedPreview = sessionStorage.getItem('leve_upload_preview')
    const previewKey = sessionStorage.getItem('leve_upload_preview_key')
    const uploadKey = sessionStorage.getItem('leve_upload_key')

    if (storedPreview && uploadKey && previewKey === uploadKey) {
      setBeforeImageUrl(storedPreview)
      setSourceAvailable(true)
      return
    }

    const ctl = new AbortController()
    apiFetch(`/api/download/source-url?jobId=${jobId}`, { signal: ctl.signal })
      .then((r) => r.json())
      .then((d) => {
        if (d?.success && d.data?.sourceAvailable && d.data?.sourceUrl) {
          setBeforeImageUrl(d.data.sourceUrl)
          setSourceAvailable(true)
          // Rebind the shared upload slots to THIS job's source so downstream
          // pages that read them ("Generate another scene" → /templates,
          // processing screen) show the right image instead of the previous
          // upload's preview. The signed URL is valid 48h — the upload's max
          // remaining lifetime.
          if (d.data.uploadS3Key) {
            sessionStorage.setItem('leve_upload_key', d.data.uploadS3Key)
            sessionStorage.setItem('leve_upload_preview', d.data.sourceUrl)
            sessionStorage.setItem('leve_upload_preview_key', d.data.uploadS3Key)
          }
        } else {
          setBeforeImageUrl(null)
          setSourceAvailable(false)
        }
      })
      .catch((err: unknown) => {
        if ((err as { name?: string })?.name !== 'AbortError') {
          setBeforeImageUrl(null)
          setSourceAvailable(false)
        }
      })
    return () => ctl.abort()
  }, [jobId])

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
        const res = await apiFetch(`/api/generate/status/${jobId}`)
        if (res.status === 404) {
          if (pollRef.current) { clearInterval(pollRef.current); pollRef.current = null }
          sessionStorage.removeItem('leve_job_id')
          router.replace('/')
          return
        }
        if (res.status === 401 || res.status === 403) {
          if (pollRef.current) { clearInterval(pollRef.current); pollRef.current = null }
          router.replace('/register')
          return
        }
        const data = await res.json()
        if (!res.ok || !data.success) return

        // Successful poll — clear any "reconnecting" indicator
        pollFailuresRef.current = 0
        if (isReconnecting) setIsReconnecting(false)

        // Restore upload key for cross-session job editing
        if (data.data.uploadS3Key && !sessionStorage.getItem('leve_upload_key')) {
          sessionStorage.setItem('leve_upload_key', data.data.uploadS3Key)
        }

        const status: JobStatus = data.data.status
        setJobStatus(status)

        // Advance edit phase when the job transitions from queued → processing
        if (editPhaseRef.current === 'queued' && status === 'processing') {
          editPhaseRef.current = 'processing'
          setEditPhase('processing')
        }

        if (status === 'done') {
          if (pollRef.current) { clearInterval(pollRef.current); pollRef.current = null }

          const isEditMode = editPhaseRef.current !== 'idle'
          if (isEditMode) {
            editPhaseRef.current = 'finalizing'
            setEditPhase('finalizing')
          }

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

          if (isEditMode) {
            editPhaseRef.current = 'done'
            setEditPhase('done')
            setTimeout(() => {
              editPhaseRef.current = 'idle'
              setEditPhase('idle')
              setEditPrompt('')
              setPreviousImageUrl(null)
              previousImageUrlRef.current = null
            }, 600)
          } else {
            // Snapshot the last successful selection so the templates page can
            // offer a "Use my last setup" quick action on the next upload.
            // Skipped for iterative edits — the iterative prompt isn't useful
            // to replay against a different upload.
            const sceneId = sessionStorage.getItem('leve_scene_id')
            const chips = sessionStorage.getItem('leve_selected_chips')
            const ratio = sessionStorage.getItem('leve_aspect_ratio')
            const custom = sessionStorage.getItem('leve_custom_text')
            if (sceneId) sessionStorage.setItem('leve_last_scene_id', sceneId)
            if (chips)   sessionStorage.setItem('leve_last_chips', chips)
            if (ratio)   sessionStorage.setItem('leve_last_aspect_ratio', ratio)
            if (custom !== null) sessionStorage.setItem('leve_last_custom_text', custom)
          }
        }

        if (status === 'failed' || status === 'credit_refunded') {
          if (pollRef.current) { clearInterval(pollRef.current); pollRef.current = null }
          if (editPhaseRef.current !== 'idle') {
            setGeneratedImageUrl(previousImageUrlRef.current)
            setPreviousImageUrl(null)
            previousImageUrlRef.current = null
            setEditError(true)
            editPhaseRef.current = 'idle'
            setEditPhase('idle')
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
    // Mobile Safari throttles background timers — poll immediately when the
    // tab becomes visible again so an edit doesn't look stuck on return.
    const onVisible = () => {
      if (document.visibilityState === 'visible' && pollRef.current) void poll()
    }
    document.addEventListener('visibilitychange', onVisible)
    return () => {
      document.removeEventListener('visibilitychange', onVisible)
      if (pollRef.current) {
        clearInterval(pollRef.current)
        pollRef.current = null
      }
    }
  }, [jobId, jobStatus, paywallInitialState, router, isReconnecting])

  // When a job finishes (initial generation only), pull fresh session +
  // download-grant state. canEdit is derived from session.creditsRemaining /
  // anon budget, hasGrant gates the sticky download CTA.
  // Edits reuse the original job's grant — skipping the re-fetch avoids a
  // brief loading flicker on the download CTA after each iterative edit.
  useEffect(() => {
    if (jobStatus !== 'done' || !jobId) return
    void refreshSession()
    if (editPhaseRef.current !== 'idle') return
    setHasGrant(null)
    const ctl = new AbortController()
    apiFetch(`/api/download/check?jobId=${jobId}`, { signal: ctl.signal })
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
    apiFetch(`/api/download/check?jobId=${jobId}`, { signal: ctl.signal })
      .then((r) => r.json())
      .then((d) => {
        if (d?.success) setHasGrant(Boolean(d.data?.hasGrant))
      })
      .catch(() => {})
    return () => ctl.abort()
  }, [paywallOpen, jobId, jobStatus])

  // Verified user with a free credit clicks "Download HD" on the sticky CTA.
  // Spends the credit server-side, creates a DownloadGrant, then refreshes
  // the local session + grant state so the CTA flips to "Download HD".
  async function handleSpendCredit() {
    if (!jobId || isSpendingCredit || isNavigating) return
    setIsSpendingCredit(true)
    try {
      const res = await apiFetch('/api/download/spend-credit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ jobId }),
      })
      const data = await res.json().catch(() => null)
      if (res.ok && data?.success) {
        setIsNavigating(true)
        router.push('/download/success')
        return
      } else if (res.status === 402) {
        // Race: credit was spent elsewhere between render and click.
        void refreshSession()
        setPaywallOpen(true)
      } else {
        // Unknown failure — fall back to the paywall so the user is not stuck.
        setPaywallOpen(true)
      }
    } catch {
      setPaywallOpen(true)
    } finally {
      setIsSpendingCredit(false)
    }
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

  async function handleEditSubmit() {
    if (!editPrompt.trim() || !jobId || editPhase !== 'idle') return

    const currentImage = generatedImageUrl
    const uploadKey = sessionStorage.getItem('leve_upload_key') ?? ''
    const sceneId = sessionStorage.getItem('leve_scene_id') ?? 'studio_white'
    const category = sessionStorage.getItem('leve_category') ?? 'custom'
    const aspectRatio = (sessionStorage.getItem('leve_aspect_ratio') ?? '1:1') as AspectRatio

    setEditError(false)
    editPhaseRef.current = 'queued'
    setEditPhase('queued')
    setPreviousImageUrl(currentImage)
    previousImageUrlRef.current = currentImage

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
      editPhaseRef.current = 'idle'
      setEditPhase('idle')
      setPreviousImageUrl(null)
      previousImageUrlRef.current = null
      setJobStatus('done')
      setEditError(true)
      return
    }

    // Set jobId first, then reset status — React 18 batches both; polling
    // effect sees the correct new jobId when it re-fires.
    setJobId(result.jobId)
    setJobStatus(null)
  }

  if (!guarded) {
    return (
      <div className="flex items-center justify-center h-[100dvh] bg-bg-base">
        <div className="w-8 h-8 rounded-full border-2 border-accent border-t-transparent animate-spin" />
      </div>
    )
  }

  if (jobStatus === 'failed' && editPhaseRef.current === 'idle') {
    return (
      <div className="flex flex-col h-[100dvh] items-center justify-center bg-bg-base gap-4 px-6">
        <p className="text-text-primary text-[18px] font-semibold text-center">
          {t('generation_failed')}
        </p>
        <p className="text-text-secondary text-[14px] text-center">{t('generation_failed_sub')}</p>
        <button onClick={() => { setIsNavigating(true); router.push('/templates') }} className="btn-primary">
          {t('try_again')}
        </button>
      </div>
    )
  }

  const sliderAspectRatio = (
    (typeof window !== 'undefined' && sessionStorage.getItem('leve_aspect_ratio')) || '1:1'
  ) as AspectRatio
  const [arW, arH] = sliderAspectRatio.split(':').map(Number) as [number, number]

  return (
    <div className="flex flex-col min-h-[100dvh] bg-bg-base">
      {!paywallOpen && (
        <AppHeader
          variant="app"
          showBack={false}
          title={t('title')}
        />
      )}

      <main className="page-content flex-1 pb-16">
        <div className="py-4 flex flex-col gap-4">
          {isReconnecting && (
            <div className="px-3 py-2 bg-bg-surface border border-border-default rounded-[10px] flex items-center gap-2">
              <div className="w-3 h-3 rounded-full border-2 border-text-muted border-t-transparent animate-spin" />
              <span className="text-[12px] text-text-secondary">{t('reconnecting')}</span>
            </div>
          )}
          {previewUrlError && (
            <div className="px-4 py-3 bg-error-subtle border border-[var(--color-error)]/30 rounded-[10px] flex items-center justify-between gap-3">
              <p className="text-[13px] text-error font-medium">
                {t('preview_load_failed')}
              </p>
              <button
                type="button"
                onClick={handleRetryPreviewUrl}
                className="text-[13px] text-error font-semibold underline"
              >
                {t('preview_load_retry')}
              </button>
            </div>
          )}
          {showSoftCapNudge && (
            <div className="px-4 py-3 bg-accent-subtle border border-accent-border rounded-[10px] flex items-center justify-between gap-3">
              <p className="text-[13px] text-text-primary">{t('soft_cap_nudge')}</p>
              <div className="flex items-center gap-3 shrink-0">
                <button
                  type="button"
                  onClick={() => setPaywallOpen(true)}
                  className="text-[13px] text-accent font-semibold"
                >
                  {t('soft_cap_cta')}
                </button>
                <button
                  type="button"
                  onClick={() => setShowSoftCapNudge(false)}
                  className="text-[12px] text-text-secondary min-w-[44px] min-h-[44px] -m-3 flex items-center justify-center"
                  aria-label={tCommon('dismiss')}
                >
                  ✕
                </button>
              </div>
            </div>
          )}
          {/* Corner-button trigger so the before/after slider keeps its drag
              gestures; the affordance hides while an edit is generating. */}
          <FullscreenImage
            src={generatedImageUrl}
            iconPosition="bottom-right"
            showAffordance={!!generatedImageUrl && editPhase === 'idle'}
          >
            {sourceAvailable ? (
              <BeforeAfterSlider
                beforeSrc={previousImageUrl ?? beforeImageUrl}
                afterSrc={generatedImageUrl ?? beforeImageUrl}
                aspectRatio={sliderAspectRatio}
              />
            ) : (
              // Source unavailable (upload deleted after 48h) or still
              // resolving — show the generated image only
              <div
                className="relative w-full mx-auto overflow-hidden rounded-[12px] border border-border-default"
                style={{
                  aspectRatio: `${arW} / ${arH}`,
                  maxHeight: '70vh',
                  maxWidth: `calc(70vh * ${arW} / ${arH})`,
                }}
              >
                {generatedImageUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={generatedImageUrl}
                    alt=""
                    draggable={false}
                    className="absolute inset-0 w-full h-full object-cover"
                  />
                ) : (
                  <div className="absolute inset-0 bg-bg-elevated animate-pulse" />
                )}
              </div>
            )}
            {/* Edit phase overlay — visible during editing, pointer-events none
                so the slider handle remains interactive underneath. */}
            {editPhase !== 'idle' && (
              <div
                className="absolute inset-x-0 bottom-0 pointer-events-none z-20 flex flex-col justify-end px-4 pb-4 pt-12"
                style={{
                  background: 'linear-gradient(to top, rgba(0,0,0,0.72) 0%, rgba(0,0,0,0.25) 60%, transparent 100%)',
                  borderRadius: '0 0 12px 12px',
                }}
              >
                <div className="flex items-center gap-2">
                  {editPhase === 'done' ? (
                    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" className="shrink-0">
                      <path d="M3 8l3.5 3.5L13 4.5" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  ) : (
                    <div className="flex gap-[3px] items-center shrink-0">
                      <span className="w-1.5 h-1.5 rounded-full bg-white animate-bounce" style={{ animationDelay: '0ms' }} />
                      <span className="w-1.5 h-1.5 rounded-full bg-white animate-bounce" style={{ animationDelay: '200ms' }} />
                      <span className="w-1.5 h-1.5 rounded-full bg-white animate-bounce" style={{ animationDelay: '400ms' }} />
                    </div>
                  )}
                  <span className="text-white text-[13px] font-medium select-none">
                    {editPhase === 'queued' && t('edit_phase_queued')}
                    {editPhase === 'processing' && t('edit_phase_processing')}
                    {editPhase === 'finalizing' && t('edit_phase_finalizing')}
                    {editPhase === 'done' && t('edit_phase_done')}
                  </span>
                </div>
              </div>
            )}
          </FullscreenImage>
          {aspectRatioMismatch && beforeImageUrl && (
            <p className="text-[11px] text-text-muted text-center">
              {t('aspect_ratio_mismatch_note')}
            </p>
          )}
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
                onClick={() => { setIsNavigating(true); router.push('/register') }}
                className="text-[12px] text-accent font-semibold shrink-0"
              >
                {t('add_phone')}
              </button>
            </div>
          )}

          {/* Iterative edit section — shown only when a result exists and session allows it */}
          {generatedImageUrl && canEdit !== null && (
            <div className="bg-bg-surface border border-border-default rounded-[12px] p-4 flex flex-col gap-3">
              <p className="text-[14px] font-semibold text-text-primary">{t('edit_heading')}</p>
              {canEdit ? (
                <>
                  <PromptTextarea
                    value={editPrompt}
                    onChange={setEditPrompt}
                    onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleEditSubmit() } }}
                    placeholder={t('edit_placeholder')}
                    disabled={editPhase !== 'idle'}
                    hasError={!!editError}
                  />
                  {editError && (
                    <p className="text-[12px] text-error">{t('edit_error')}</p>
                  )}
                  <div className="md:max-w-[320px] md:mx-auto">
                    <button
                      onClick={handleEditSubmit}
                      disabled={editPhase !== 'idle' || !editPrompt.trim()}
                      className="btn-primary btn-full disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                    >
                      {editPhase !== 'idle' ? (
                        <>
                          <span className="w-4 h-4 rounded-full border-2 border-white border-t-transparent animate-spin" />
                          <span>{t('edit_regenerating')}</span>
                        </>
                      ) : t('edit_submit')}
                    </button>
                  </div>
                </>
              ) : (
                <div className="md:max-w-[320px] md:mx-auto">
                  <button
                    onClick={() => setPaywallOpen(true)}
                    className="btn-primary btn-full"
                  >
                    {t('edit_no_credits')}
                  </button>
                </div>
              )}
            </div>
          )}

          {/* End-of-page next action — "Generate another scene" reuses this
              job's source upload, so it's only offered while that upload still
              exists. Uploading a fresh photo lives in the bottom nav. */}
          {sourceAvailable === true && (
            <div className="flex flex-col gap-2 pt-2 md:items-center">
              <div className="w-full md:max-w-[320px]">
                <button
                  type="button"
                  onClick={() => { setIsNavigating(true); router.push('/templates') }}
                  disabled={isNavigating}
                  className="btn-secondary btn-full"
                >
                  {t('generate_another')}
                </button>
              </div>
            </div>
          )}

        </div>

        {/* Sticky Download HD CTA — lives in the document flow so the whole
            page scrolls as one unit. Stays 64px above the viewport bottom
            (BottomNav's height) so it never overlaps the nav. The gradient
            fade lets content scroll behind it. */}
        {!paywallOpen && (
          <div className="sticky bottom-16 z-40 -mx-4 px-4 pb-3 pt-3 bg-bg-base border-t border-border-default safe-bottom">
            <div className="md:max-w-[320px] md:mx-auto">
              {hasGrant === null ? (
                <div className="h-12 rounded-[12px] bg-bg-elevated animate-pulse" />
              ) : hasGrant ? (
                <button
                  onClick={() => { setIsNavigating(true); router.push('/download/success') }}
                  disabled={isNavigating}
                  className="btn-primary btn-full h-12 text-[15px] font-semibold"
                >
                  {t('download_hd')}
                </button>
              ) : hasCredits ? (
                <button
                  onClick={handleSpendCredit}
                  disabled={isSpendingCredit || isNavigating}
                  className="btn-primary btn-full h-12 text-[15px] font-semibold disabled:opacity-70 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                  {isSpendingCredit ? (
                    <>
                      <span className="w-4 h-4 rounded-full border-2 border-white border-t-transparent animate-spin" />
                      <span>{t('download_hd_spending')}</span>
                    </>
                  ) : (
                    <>
                      <span>{t('download_hd')}</span>
                      <span className="text-[12px] font-medium opacity-80">({t('download_hd_credit')})</span>
                    </>
                  )}
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
