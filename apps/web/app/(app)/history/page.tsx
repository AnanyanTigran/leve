'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useTranslations, useLocale } from 'next-intl'
import { ImageIcon } from 'lucide-react'
import { AppHeader } from '@/components/shared/app-header'
import { SCENES } from '@/lib/constants'
import { BottomNav } from '@/components/shared/bottom-nav'
import { useVerifiedGuard } from '@/hooks/use-verified-guard'

interface HistoryJob {
  id: string
  templateId: string
  category: string
  status: string
  previewS3Keys: string[]
  hdS3Key: string | null
  createdAt: string
}

export default function HistoryPage() {
  const router = useRouter()
  const t = useTranslations('history')
  const locale = useLocale()
  const { checked, isVerified } = useVerifiedGuard()
  const [hasActiveSession, setHasActiveSession] = useState(false)
  const [jobs, setJobs] = useState<HistoryJob[]>([])
  const [isLoadingJobs, setIsLoadingJobs] = useState(true)
  const [previewUrls, setPreviewUrls] = useState<Record<string, string>>({})

  useEffect(() => {
    setHasActiveSession(
      !!sessionStorage.getItem('leve_upload_preview') &&
      !!sessionStorage.getItem('leve_job_id')
    )
  }, [])

  useEffect(() => {
    if (!isVerified) return

    fetch('/api/session/history', { credentials: 'include' })
      .then((r) => r.json())
      .then((data) => {
        if (data?.data?.jobs) setJobs(data.data.jobs)
      })
      .catch(() => {})
      .finally(() => setIsLoadingJobs(false))
  }, [isVerified])

  useEffect(() => {
    if (jobs.length === 0) return

    Promise.all(
      jobs.map((job) =>
        fetch(`/api/download/preview-url?jobId=${job.id}`, { credentials: 'include' })
          .then((r) => r.json())
          .then((data) => ({ jobId: job.id, url: data?.data?.previewUrls?.[0] ?? null }))
          .catch(() => ({ jobId: job.id, url: null }))
      )
    ).then((results) => {
      const urlMap: Record<string, string> = {}
      results.forEach(({ jobId, url }) => {
        if (url) urlMap[jobId] = url
      })
      setPreviewUrls(urlMap)
    })
  }, [jobs])

  if (!checked) {
    return (
      <div className="flex items-center justify-center h-[100dvh] bg-bg-base">
        <div className="w-8 h-8 rounded-full border-2 border-accent border-t-transparent animate-spin" />
      </div>
    )
  }

  return (
    <div className="flex flex-col h-[100dvh] overflow-hidden bg-bg-base">
      <AppHeader variant="app" showBack={false} title={t('title')} rightSlot={null} />

      <main className="page-content flex-1 overflow-y-auto pb-24">
        {/* Active session banner */}
        {hasActiveSession && (
          <div className="mt-4 mb-2 bg-bg-surface border border-border-default rounded-[10px] p-4 flex items-center gap-3">
            <div className="flex-1">
              <p className="text-[13px] font-semibold text-text-primary">{t('active_session')}</p>
              <p className="text-[12px] text-text-muted">{t('active_session_sub')}</p>
            </div>
            <button
              onClick={() => router.push('/results')}
              className="shrink-0 px-3 py-2 bg-accent text-white text-[12px] font-semibold rounded-[8px]"
            >
              {t('active_session_btn')}
            </button>
          </div>
        )}

        {/* Job grid */}
        {isLoadingJobs ? (
          <div className="grid grid-cols-2 gap-3 mt-4">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="aspect-square rounded-[12px] bg-bg-elevated animate-pulse" />
            ))}
          </div>
        ) : jobs.length === 0 ? (
          <div className="flex flex-col items-center justify-center min-h-[300px] gap-4">
            <ImageIcon className="w-12 h-12 text-border-strong" />
            <p className="text-[16px] font-semibold text-text-primary">{t('empty_title')}</p>
            <p className="text-[14px] text-text-muted text-center">{t('empty_subtitle')}</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-3 mt-4">
            {jobs.map((job) => (
              <button
                key={job.id}
                onClick={() => {
                  sessionStorage.setItem('leve_job_id', job.id)
                  router.push('/results')
                }}
                className="relative aspect-square rounded-[12px] overflow-hidden bg-bg-elevated"
              >
                {previewUrls[job.id] ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={previewUrls[job.id]}
                    alt=""
                    className="absolute inset-0 w-full h-full object-cover"
                  />
                ) : (
                  <div className="absolute inset-0 animate-pulse bg-bg-elevated" />
                )}
                <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/60 to-transparent p-2">
                  <p className="text-[11px] text-white font-medium truncate">
                    {(() => {
                      const scene = SCENES.find((s) => s.id === job.templateId)
                      return scene
                        ? (locale === 'hy' ? scene.nameHY : locale === 'ru' ? scene.nameRU : scene.name)
                        : job.templateId.replace(/_/g, ' ')
                    })()}
                  </p>
                </div>
              </button>
            ))}
          </div>
        )}
      </main>

      <div className="sticky bottom-0 bg-bg-base border-t border-border-default py-3 safe-bottom">
        <div className="page-content">
          <button
            onClick={() => router.push('/upload')}
            className="btn-primary btn-full"
          >
            {t('generate_first')}
          </button>
        </div>
      </div>

      <BottomNav />
    </div>
  )
}
