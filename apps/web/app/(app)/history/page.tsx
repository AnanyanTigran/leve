'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useTranslations } from 'next-intl'
import { Phone, ImageIcon } from 'lucide-react'
import { AppHeader } from '@/components/shared/app-header'
import { BottomNav } from '@/components/shared/bottom-nav'
import { isVerified } from '@/lib/session'

export default function HistoryPage() {
  const router = useRouter()
  const t = useTranslations('history')

  useEffect(() => {
    if (!isVerified()) router.replace('/register')
  }, [router])

  const hasActiveSession = typeof window !== 'undefined' &&
    !!sessionStorage.getItem('leve_upload_preview') &&
    !!sessionStorage.getItem('leve_template_id')

  return (
    <div className="flex flex-col h-[100dvh] overflow-hidden bg-bg-base">
      <AppHeader variant="app" showBack={false} title="Your designs" rightSlot={null} />

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

        {/* Phone capture banner */}
        <div className="mt-4 rounded-[12px] overflow-hidden border border-accent-border bg-accent-subtle p-4">
          <div className="flex items-start gap-3">
            <div className="w-9 h-9 rounded-full bg-accent/20 flex items-center justify-center shrink-0">
              <Phone className="w-4 h-4 text-accent" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-[14px] font-semibold text-text-primary">Access your designs anywhere</p>
              <p className="text-[12px] text-text-secondary mt-0.5">Add your phone number to sync designs across devices</p>
            </div>
          </div>
          <button
            onClick={() => router.push('/register')}
            className="mt-3 w-full h-10 rounded-[8px] border border-accent text-accent text-[13px] font-semibold hover:bg-accent hover:text-white transition-colors"
          >
            Add phone number
          </button>
        </div>

        {/* Empty state */}
        <div className="flex flex-col items-center justify-center min-h-[400px] pb-20 gap-4">
          <ImageIcon className="w-12 h-12 text-border-strong" />
          <p className="text-[16px] font-semibold text-text-primary">No designs yet</p>
          <p className="text-[14px] text-text-muted text-center">
            Your generated designs will appear here
          </p>
        </div>
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
