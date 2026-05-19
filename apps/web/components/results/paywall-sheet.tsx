'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useTranslations } from 'next-intl'
import { CheckCircle, XCircle } from 'lucide-react'
import { cn } from '@/lib/utils'
import { CREDIT_PACKAGES } from '@/lib/constants'

type PaywallState = 'pricing' | 'processing' | 'success' | 'failed'
type PlanId = 'starter' | 'creator' | 'monthly'

interface PaywallSheetProps {
  isOpen: boolean
  onClose: () => void
}

export function PaywallSheet({ isOpen, onClose }: PaywallSheetProps) {
  const router = useRouter()
  const t = useTranslations('paywall')
  const [paywallState, setPaywallState] = useState<PaywallState>('pricing')
  const [selectedPlan, setSelectedPlan] = useState<PlanId>('creator')
  const [isDesktop, setIsDesktop] = useState(false)

  useEffect(() => {
    const check = () => setIsDesktop(window.innerWidth >= 1024)
    check()
    window.addEventListener('resize', check)
    return () => window.removeEventListener('resize', check)
  }, [])

  useEffect(() => {
    if (!isOpen) {
      const timer = setTimeout(() => setPaywallState('pricing'), 350)
      return () => clearTimeout(timer)
    }
  }, [isOpen])

  useEffect(() => {
    if (paywallState !== 'processing') return
    const timer = setTimeout(() => setPaywallState('success'), 2500)
    return () => clearTimeout(timer)
  }, [paywallState])

  function handlePayment() {
    setPaywallState('processing')
  }

  const content = (
    <>
      {paywallState === 'pricing' && (
        <div className="px-4 pb-8 lg:px-6 lg:pb-6">
          <h2 className="text-[20px] font-semibold text-text-primary">{t('title')}</h2>
          <p className="text-[13px] text-text-muted mt-1">{t('subtitle')}</p>

          <div className="mt-6 flex flex-col gap-3">
            {CREDIT_PACKAGES.map((pkg) => {
              const isSelected = selectedPlan === pkg.id
              const isCheapest = pkg.id === 'creator'
              return (
                <button
                  key={pkg.id}
                  type="button"
                  onClick={() => setSelectedPlan(pkg.id as PlanId)}
                  className={cn(
                    'bg-bg-surface border-2 rounded-[12px] p-4 text-left transition-all',
                    isSelected
                      ? 'border-accent bg-accent-subtle'
                      : 'border-border-default hover:border-border-strong'
                  )}
                >
                  <p className="text-[16px] font-semibold text-text-primary">
                    {pkg.isMonthly
                      ? t('images_month', { count: pkg.images })
                      : t('images', { count: pkg.images })}
                  </p>
                  <p className="text-[26px] font-display font-semibold text-accent mt-1">
                    {pkg.priceAMD.toLocaleString()} ֏
                  </p>
                  <p className="text-[12px] text-text-muted">{pkg.perImageAMD} {t('per_image')}</p>
                  {isCheapest && (
                    <p className="text-[11px] text-accent mt-0.5">{t('lowest_cost')}</p>
                  )}
                  {pkg.isMonthly && (
                    <p className="text-[11px] text-text-muted mt-0.5">{t('resets_monthly')}</p>
                  )}
                </button>
              )
            })}
          </div>

          <div className="mt-6 flex flex-col gap-2">
            <button onClick={handlePayment} className="btn-primary btn-full">
              {t('pay_idram')}
            </button>
            <button
              onClick={handlePayment}
              className="w-full border border-border-default rounded-[12px] h-12 flex items-center justify-between px-4 hover:border-border-strong hover:bg-bg-surface transition-colors"
            >
              <span className="text-[15px] font-semibold text-text-primary">{t('pay_telcell')}</span>
              <span className="text-[11px] text-text-muted">Wallet</span>
            </button>
          </div>

          <p className="mt-4 text-center text-[11px] text-text-muted">{t('secure')}</p>
        </div>
      )}

      {paywallState === 'processing' && (
        <div className="flex flex-col items-center justify-center py-12 gap-5 px-4 pb-8">
          <div className="w-16 h-16 rounded-full border-4 border-bg-elevated border-t-accent animate-spin" />
          <div className="text-center">
            <p className="text-[16px] font-semibold text-text-primary">{t('processing_title')}</p>
            <p className="text-[13px] text-text-muted mt-1">{t('processing_idram')}</p>
            <p className="text-[12px] text-text-muted mt-1">{t('processing_warning')}</p>
          </div>
        </div>
      )}

      {paywallState === 'success' && (
        <div className="flex flex-col items-center justify-center py-12 gap-5 px-4 pb-8">
          <div
            className="w-16 h-16 rounded-full bg-[#F0FDF4] flex items-center justify-center"
            style={{ animation: 'scale-in 0.4s cubic-bezier(0.34, 1.56, 0.64, 1) both' }}
          >
            <CheckCircle size={32} className="text-[#16A34A]" />
          </div>
          <div className="text-center">
            <p className="text-[18px] font-semibold text-text-primary">{t('success_title')}</p>
            <p className="text-[14px] text-text-secondary mt-1">{t('success_subtitle')}</p>
          </div>
          <button
            className="btn-primary btn-full mt-2"
            onClick={() => { onClose(); router.push('/download/success') }}
          >
            {t('download_hd')}
          </button>
        </div>
      )}

      {paywallState === 'failed' && (
        <div className="flex flex-col items-center justify-center py-12 gap-5 px-4 pb-8">
          <div className="w-16 h-16 rounded-full bg-[#FEF2F2] flex items-center justify-center">
            <XCircle size={32} className="text-[#DC2626]" />
          </div>
          <div className="text-center">
            <p className="text-[18px] font-semibold text-text-primary">{t('failed_title')}</p>
            <p className="text-[14px] text-text-secondary mt-1">{t('failed_subtitle')}</p>
          </div>
          <div className="flex flex-col gap-2 w-full mt-2">
            <button className="btn-primary btn-full" onClick={() => setPaywallState('pricing')}>
              {t('retry')}
            </button>
            <button className="btn-secondary" onClick={() => setPaywallState('pricing')}>
              {t('choose_method')}
            </button>
          </div>
        </div>
      )}
    </>
  )

  if (isDesktop) {
    return (
      <>
        {isOpen && (
          <div
            className="fixed inset-0 z-40 bg-black/40 backdrop-blur-sm flex items-center justify-center"
            onClick={paywallState === 'pricing' ? onClose : undefined}
          >
            <div
              className="bg-bg-base rounded-[20px] w-full max-w-[480px] shadow-xl"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="w-8 h-1 bg-border-strong rounded-full mx-auto mt-5 mb-2" />
              {content}
            </div>
          </div>
        )}
      </>
    )
  }

  return (
    <>
      {isOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/40 backdrop-blur-[2px]"
          onClick={paywallState === 'pricing' ? onClose : undefined}
        />
      )}
      <div
        className="fixed bottom-0 left-0 right-0 z-50 bg-bg-base rounded-t-[20px] max-w-[640px] mx-auto"
        style={{
          transform: isOpen ? 'translateY(0)' : 'translateY(100%)',
          transition: 'transform 300ms cubic-bezier(0.32, 0.72, 0, 1)',
        }}
      >
        <div className="w-8 h-1 bg-border-strong rounded-full mx-auto mt-3 mb-4" />
        {content}
      </div>
    </>
  )
}
