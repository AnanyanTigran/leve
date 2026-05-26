'use client'

import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { useTranslations } from 'next-intl'
import { Phone } from 'lucide-react'
import { AppHeader } from '@/components/shared/app-header'
import { isVerified } from '@/lib/session'
import { BottomNav } from '@/components/shared/bottom-nav'
import { BeforeAfterSlider } from '@/components/results/before-after-slider'
import { GeneratedImageDisplay } from '@/components/results/variant-grid'
import { TextOverlaySection } from '@/components/results/text-overlay-section'
import { PaywallSheet } from '@/components/results/paywall-sheet'

type JobStatus = 'queued' | 'processing' | 'done' | 'failed' | null

export default function ResultsPage() {
  const router = useRouter()
  const t = useTranslations('results')
  const tPaywall = useTranslations('paywall')
  const [paywallOpen, setPaywallOpen] = useState(false)
  const [shareCopied, setShareCopied] = useState(false)
  const [jobId, setJobId] = useState<string | null>(null)
  const [jobStatus, setJobStatus] = useState<JobStatus>(null)
  const [generatedImageUrl, setGeneratedImageUrl] = useState<string | null>(null)
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null)

  const uploadPreview =
    typeof window !== 'undefined' ? sessionStorage.getItem('leve_upload_preview') : null

  useEffect(() => {
    const hasUpload = sessionStorage.getItem('leve_upload_preview')
    if (!hasUpload) { router.replace('/'); return }
    const id = sessionStorage.getItem('leve_job_id')
    if (id) setJobId(id)
  }, [router])

  useEffect(() => {
    if (!jobId || jobStatus === 'done' || jobStatus === 'failed') return

    const poll = async () => {
      try {
        const res = await fetch(`/api/generate/status/${jobId}`, { credentials: 'include' })
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
        }

        if (data.data.status === 'failed') {
          if (pollRef.current) clearInterval(pollRef.current)
        }
      } catch {
        // network error — keep polling
      }
    }

    poll()
    pollRef.current = setInterval(poll, 2000)
    return () => { if (pollRef.current) clearInterval(pollRef.current) }
  }, [jobId, jobStatus])

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

  if (jobStatus === 'failed') {
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
          <BeforeAfterSlider beforeSrc={uploadPreview} afterSrc={generatedImageUrl} />
          <GeneratedImageDisplay
            imageUrl={generatedImageUrl}
            onRegenerate={() => router.push('/templates')}
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
      <PaywallSheet isOpen={paywallOpen} onClose={() => setPaywallOpen(false)} />
    </div>
  )
}
