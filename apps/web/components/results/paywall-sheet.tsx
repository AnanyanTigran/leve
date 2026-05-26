'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { useTranslations, useLocale } from 'next-intl'
import { CheckCircle, XCircle, X } from 'lucide-react'
import { cn } from '@/lib/utils'
import { CREDIT_PACKAGES } from '@/lib/constants'
import { isVerified } from '@/lib/session'

type PaywallState = 'pricing' | 'processing' | 'success' | 'failed'
type PlanId = 'starter' | 'creator' | 'pro_monthly'

interface PaywallSheetProps {
  isOpen: boolean
  onClose: () => void
  onAutoOpen?: () => void
  jobId?: string
}

const POLL_INTERVAL_MS = 3000
const POLL_MAX_ATTEMPTS = 40 // 2 minutes at 3s intervals

export function PaywallSheet({ isOpen, onClose, onAutoOpen, jobId }: PaywallSheetProps) {
  const router = useRouter()
  const t = useTranslations('paywall')
  const locale = useLocale()
  const [paywallState, setPaywallState] = useState<PaywallState>('pricing')
  const [selectedPlan, setSelectedPlan] = useState<PlanId>('creator')
  const [isDesktop, setIsDesktop] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const pollAttemptsRef = useRef(0)

  useEffect(() => {
    const check = () => setIsDesktop(window.innerWidth >= 1024)
    check()
    window.addEventListener('resize', check)
    return () => window.removeEventListener('resize', check)
  }, [])

  // Reset state when sheet closes
  useEffect(() => {
    if (!isOpen) {
      const timer = setTimeout(() => {
        setPaywallState('pricing')
        setIsLoading(false)
      }, 350)
      return () => clearTimeout(timer)
    }
  }, [isOpen])

  // Lock body scroll when open
  useEffect(() => {
    document.body.style.overflow = isOpen ? 'hidden' : ''
    return () => { document.body.style.overflow = '' }
  }, [isOpen])

  // On mount: check if user returned from a payment redirect and start polling
  useEffect(() => {
    const orderId = sessionStorage.getItem('leve_order_id')
    if (!orderId) return

    setPaywallState('processing')
    onAutoOpen?.()
    pollAttemptsRef.current = 0

    const poll = async () => {
      pollAttemptsRef.current += 1

      if (pollAttemptsRef.current > POLL_MAX_ATTEMPTS) {
        if (pollRef.current) clearInterval(pollRef.current)
        return
      }

      try {
        const res = await fetch(`/api/payments/status/${orderId}`, { credentials: 'include' })
        const data = await res.json()
        if (!res.ok || !data.success) return

        if (data.data.status === 'completed') {
          if (pollRef.current) clearInterval(pollRef.current)
          sessionStorage.removeItem('leve_order_id')
          setPaywallState('success')
        } else if (data.data.status === 'failed') {
          if (pollRef.current) clearInterval(pollRef.current)
          sessionStorage.removeItem('leve_order_id')
          setPaywallState('failed')
        }
      } catch {
        // network error — keep polling
      }
    }

    poll()
    pollRef.current = setInterval(poll, POLL_INTERVAL_MS)

    return () => { if (pollRef.current) clearInterval(pollRef.current) }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const handlePayment = useCallback(
    async (provider: 'idram' | 'telcell') => {
      if (isLoading) return
      setIsLoading(true)

      try {
        const res = await fetch('/api/payments/intent', {
          method: 'POST',
          credentials: 'include',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            packId: selectedPlan,
            jobId: jobId ?? sessionStorage.getItem('leve_job_id') ?? '',
          }),
        })

        const data = await res.json()

        if (!res.ok || !data.success) {
          setPaywallState('failed')
          setIsLoading(false)
          return
        }

        // Save orderId for polling after redirect
        sessionStorage.setItem('leve_order_id', data.data.orderId)
        sessionStorage.setItem('leve_payment_provider', provider)

        // Show processing state then redirect to provider
        setPaywallState('processing')

        const redirectUrl =
          provider === 'idram' ? data.data.idramUrl : data.data.telcellUrl

        // Brief delay so user sees the processing state before leaving
        setTimeout(() => {
          window.location.href = redirectUrl
        }, 800)
      } catch {
        setPaywallState('failed')
        setIsLoading(false)
      }
    },
    [selectedPlan, jobId, isLoading],
  )

  const userIsVerified = typeof window !== 'undefined' ? isVerified() : false

  const content = (
    <>
      {paywallState === 'pricing' && (
        <div className="px-4 pb-8 lg:px-6 lg:pb-6">

          {/* Close button */}
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-[20px] font-semibold text-text-primary">
                {t('title')}
              </h2>
              <p className="text-[13px] text-text-muted mt-0.5">
                {t('subtitle')}
              </p>
            </div>
            <button
              onClick={onClose}
              className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-bg-elevated ml-3 shrink-0"
            >
              <X className="w-4 h-4 text-text-secondary" />
            </button>
          </div>

          {/* Free images banner — shown to unverified users */}
          {!userIsVerified && (
            <div className="mb-5 p-4 bg-accent-subtle border border-accent-border rounded-[12px]">
              <p className="text-[15px] font-semibold text-text-primary">
                {t('free_banner_title')}
              </p>
              <p className="text-[12px] text-text-muted mt-1">
                {t('free_banner_sub')}
              </p>
              <button
                onClick={() => {
                  onClose()
                  sessionStorage.setItem('leve_return_to', '/results')
                  router.push('/register')
                }}
                className="btn-primary btn-full mt-3 h-11 text-[14px]"
              >
                {t('free_banner_btn')}
              </button>
              <div className="flex items-center gap-3 mt-4 mb-1">
                <hr className="flex-1 border-border-default" />
                <span className="text-[11px] text-text-muted">
                  {locale === 'hy'
                    ? 'կամ գնել փաթեթ'
                    : locale === 'ru'
                    ? 'или купить пакет'
                    : 'or buy a pack'}
                </span>
                <hr className="flex-1 border-border-default" />
              </div>
            </div>
          )}

          {/* Pack options */}
          <div className="flex flex-col gap-3">
            {CREDIT_PACKAGES.filter(
              // TODO: read purchaseCount from session and show monthly only when >= 3
              (pkg) => pkg.id !== 'pro_monthly'
            ).map((pkg) => {
              const isSelected = selectedPlan === pkg.id
              const isBestValue = pkg.id === 'creator'

              const label =
                locale === 'hy' ? pkg.labelHY
                : locale === 'ru' ? pkg.labelRU
                : pkg.label

              return (
                <button
                  key={pkg.id}
                  type="button"
                  onClick={() => setSelectedPlan(pkg.id as PlanId)}
                  className={cn(
                    'bg-bg-surface border-2 rounded-[12px] p-4 text-left transition-all relative',
                    isSelected
                      ? 'border-accent bg-accent-subtle'
                      : 'border-border-default hover:border-border-strong',
                  )}
                >
                  {/* Best value badge */}
                  {isBestValue && (
                    <span className="absolute top-3 right-3 text-[10px] font-semibold text-accent bg-accent-subtle border border-accent-border px-2 py-0.5 rounded-full">
                      {locale === 'hy' ? 'Լավագույն' : locale === 'ru' ? 'Выгоднее' : 'Best value'}
                    </span>
                  )}
                  <p className="text-[15px] font-semibold text-text-primary">
                    {label} —{' '}
                    {pkg.isMonthly
                      ? t('images_month', { count: pkg.images })
                      : t('images', { count: pkg.images })}
                  </p>
                  <p className="text-[28px] font-display font-semibold text-accent mt-1 leading-none">
                    {pkg.priceAMD.toLocaleString()}
                    <span className="text-[18px] ml-1">֏</span>
                  </p>
                  <p className="text-[12px] text-text-muted mt-1">
                    {pkg.perImageAMD}֏ {t('per_image')}
                  </p>
                  {isBestValue && (
                    <p className="text-[11px] text-accent mt-0.5">
                      {t('lowest_cost')}
                    </p>
                  )}
                  {pkg.isMonthly && (
                    <p className="text-[11px] text-text-muted mt-0.5">
                      {t('resets_monthly')}
                    </p>
                  )}
                </button>
              )
            })}
          </div>

          {/* Payment buttons */}
          <div className="mt-5 flex flex-col gap-2">
            <button
              onClick={() => handlePayment('idram')}
              disabled={isLoading}
              className={cn(
                'btn-primary btn-full h-13',
                isLoading && 'opacity-50 cursor-not-allowed',
              )}
            >
              {t('pay_idram')}
            </button>
            <button
              onClick={() => handlePayment('telcell')}
              disabled={isLoading}
              className={cn(
                'w-full border border-border-default rounded-[12px] h-12',
                'flex items-center justify-between px-4',
                'hover:border-border-strong hover:bg-bg-surface transition-colors',
                isLoading && 'opacity-50 cursor-not-allowed',
              )}
            >
              <span className="text-[15px] font-semibold text-text-primary">
                {t('pay_telcell')}
              </span>
              <span className="text-[11px] text-text-muted">Wallet</span>
            </button>
          </div>

          <p className="mt-4 text-center text-[11px] text-text-muted">
            {t('secure')}
          </p>
        </div>
      )}

      {paywallState === 'processing' && (
        <div className="flex flex-col items-center justify-center py-14 gap-5 px-4 pb-10">
          <div className="w-16 h-16 rounded-full border-4 border-bg-elevated border-t-accent animate-spin" />
          <div className="text-center">
            <p className="text-[17px] font-semibold text-text-primary">
              {t('processing_title')}
            </p>
            <p className="text-[13px] text-text-muted mt-1">
              {t('processing_idram')}
            </p>
            <p className="text-[12px] text-text-muted mt-1">
              {t('processing_warning')}
            </p>
          </div>
        </div>
      )}

      {paywallState === 'success' && (
        <div className="flex flex-col items-center justify-center py-14 gap-5 px-4 pb-10">
          <div
            className="w-16 h-16 rounded-full bg-[#F0FDF4] flex items-center justify-center"
            style={{ animation: 'scale-in 0.4s cubic-bezier(0.34, 1.56, 0.64, 1) both' }}
          >
            <CheckCircle size={32} className="text-[#16A34A]" />
          </div>
          <div className="text-center">
            <p className="text-[18px] font-semibold text-text-primary">
              {t('success_title')}
            </p>
            <p className="text-[14px] text-text-secondary mt-1">
              {t('success_subtitle')}
            </p>
          </div>
          <button
            className="btn-primary btn-full mt-2"
            onClick={() => {
              onClose()
              router.push('/download/success')
            }}
          >
            {t('download_hd')}
          </button>
        </div>
      )}

      {paywallState === 'failed' && (
        <div className="flex flex-col items-center justify-center py-14 gap-5 px-4 pb-10">
          <div className="w-16 h-16 rounded-full bg-[#FEF2F2] flex items-center justify-center">
            <XCircle size={32} className="text-[#DC2626]" />
          </div>
          <div className="text-center">
            <p className="text-[18px] font-semibold text-text-primary">
              {t('failed_title')}
            </p>
            <p className="text-[14px] text-text-secondary mt-1">
              {t('failed_subtitle')}
            </p>
          </div>
          <div className="flex flex-col gap-2 w-full mt-2">
            <button
              className="btn-primary btn-full"
              onClick={() => setPaywallState('pricing')}
            >
              {t('retry')}
            </button>
            <button
              className="btn-secondary"
              onClick={() => setPaywallState('pricing')}
            >
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
              className="bg-bg-surface rounded-[20px] w-full max-w-[440px] mx-4 overflow-hidden"
              onClick={(e) => e.stopPropagation()}
            >
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
          className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm flex items-end"
          onClick={paywallState === 'pricing' ? onClose : undefined}
        >
          <div
            className="bg-bg-surface rounded-t-[20px] w-full overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="w-10 h-1 bg-border-strong rounded-full mx-auto mt-3 mb-2" />
            {content}
          </div>
        </div>
      )}
    </>
  )
}
