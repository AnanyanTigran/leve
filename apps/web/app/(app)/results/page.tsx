'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useTranslations } from 'next-intl'
import { Phone } from 'lucide-react'
import { AppHeader } from '@/components/shared/app-header'
import { isVerified } from '@/lib/session'
import { BottomNav } from '@/components/shared/bottom-nav'
import { BeforeAfterSlider } from '@/components/results/before-after-slider'
import { VariantGrid } from '@/components/results/variant-grid'
import { TextOverlaySection } from '@/components/results/text-overlay-section'
import { PaywallSheet } from '@/components/results/paywall-sheet'

const VARIANT_GRADIENTS: Record<number, string> = {
  1: 'linear-gradient(135deg, #fdf0eb, #f5d5c5)',
  2: 'linear-gradient(135deg, #f5e6d3, #e8c9a8)',
  3: 'linear-gradient(135deg, #fef9f0, #fdecd5)',
  4: 'linear-gradient(135deg, #f8e8d8, #f0cdb0)',
}

export default function ResultsPage() {
  const router = useRouter()
  const t = useTranslations('results')
  const tPaywall = useTranslations('paywall')
  const [selectedVariant, setSelectedVariant] = useState(1)
  const [paywallOpen, setPaywallOpen] = useState(false)
  const [shareCopied, setShareCopied] = useState(false)

  useEffect(() => {
    const hasUpload = sessionStorage.getItem('leve_upload_preview')
    if (!hasUpload) router.replace('/')
  }, [router])

  const verified = typeof window !== 'undefined' ? isVerified() : false
  const freeCredits = verified
    ? Number(sessionStorage.getItem('leve_free_credits') ?? 0)
    : 0

  const uploadPreview = typeof window !== 'undefined'
    ? sessionStorage.getItem('leve_upload_preview')
    : null

  const afterGradient = VARIANT_GRADIENTS[selectedVariant] ?? VARIANT_GRADIENTS[1]

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
            <button
              onClick={() => setPaywallOpen(true)}
              className="flex items-center gap-1.5 bg-accent text-white text-[12px] font-semibold px-3 h-8 rounded-[8px] whitespace-nowrap"
            >
              {verified && freeCredits > 0 && (
                <span className="bg-white/25 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full leading-none">
                  {freeCredits}
                </span>
              )}
              {tPaywall('title')}
            </button>
          </div>
        }
      />

      <main className="page-content flex-1 overflow-y-auto pb-24">
        <div className="py-4 flex flex-col gap-4">
          <BeforeAfterSlider beforeSrc={uploadPreview} afterGradient={afterGradient} />
          <VariantGrid
            selectedId={selectedVariant}
            onSelect={setSelectedVariant}
            onRegenerate={() => router.push('/processing')}
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
            {verified && freeCredits > 0 && (
              <p className="text-center text-[12px] text-text-muted mt-2">
                {t('free_bar', { count: freeCredits })}
              </p>
            )}
          </div>
        </div>
      </main>

      {!paywallOpen && <BottomNav />}
      <PaywallSheet isOpen={paywallOpen} onClose={() => setPaywallOpen(false)} />
    </div>
  )
}
