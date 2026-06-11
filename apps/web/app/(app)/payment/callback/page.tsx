'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useTranslations } from 'next-intl'
import { apiFetch } from '@/lib/api-client'

type CallbackState = 'polling' | 'success' | 'failed' | 'timeout'

export default function PaymentCallbackPage() {
  const router = useRouter()
  const t = useTranslations('payment')
  const [state, setState] = useState<CallbackState>('polling')

  const MAX_ATTEMPTS = 15 // 30 seconds total at 2s interval

  useEffect(() => {
    const orderId = sessionStorage.getItem('leve_order_id')
    if (!orderId) {
      router.replace('/')
      return
    }

    router.prefetch('/download/success')

    const poll = async (): Promise<boolean> => {
      try {
        const res = await apiFetch(`/api/payments/status/${orderId}`)

        // Auth or missing-order: terminal — stop polling and surface failure
        if (res.status === 401 || res.status === 403 || res.status === 404) {
          sessionStorage.removeItem('leve_order_id')
          sessionStorage.removeItem('leve_order_initiated_at')
          sessionStorage.removeItem('leve_payment_provider')
          setState('failed')
          return true
        }

        const data = await res.json().catch(() => null)

        if (data?.data?.status === 'completed') {
          sessionStorage.removeItem('leve_order_id')
          sessionStorage.removeItem('leve_order_initiated_at')
          sessionStorage.removeItem('leve_payment_provider')
          setState('success')
          setTimeout(() => router.push('/download/success'), 600)
          return true
        }

        if (data?.data?.status === 'failed') {
          sessionStorage.removeItem('leve_order_id')
          sessionStorage.removeItem('leve_order_initiated_at')
          sessionStorage.removeItem('leve_payment_provider')
          setState('failed')
          return true
        }

        return false
      } catch {
        return false
      }
    }

    let attemptCount = 0
    const interval = setInterval(async () => {
      attemptCount++

      const done = await poll()

      if (done || attemptCount >= MAX_ATTEMPTS) {
        clearInterval(interval)
        if (!done) {
          sessionStorage.removeItem('leve_order_id')
          sessionStorage.removeItem('leve_order_initiated_at')
          sessionStorage.removeItem('leve_payment_provider')
          setState('timeout')
        }
      }
    }, 2000)

    // Poll immediately on mount
    poll()

    return () => clearInterval(interval)
  }, [router])

  if (state === 'success') {
    return (
      <div className="flex flex-col items-center justify-center h-[100dvh] bg-bg-base px-6">
        <div className="w-16 h-16 rounded-full bg-success-subtle flex items-center justify-center mb-5">
          <svg viewBox="0 0 24 24" fill="none" stroke="var(--color-success)" strokeWidth="2.5" className="w-8 h-8">
            <polyline points="20 6 9 17 4 12" />
          </svg>
        </div>
        <h2 className="text-[22px] font-semibold text-text-primary text-center">
          {t('confirmed_title')}
        </h2>
        <p className="text-[14px] text-text-muted text-center mt-2">
          {t('confirmed_sub')}
        </p>
      </div>
    )
  }

  if (state === 'failed' || state === 'timeout') {
    return (
      <div className="flex flex-col items-center justify-center h-[100dvh] bg-bg-base px-6">
        <div className="w-16 h-16 rounded-full bg-error-subtle flex items-center justify-center mb-5">
          <svg viewBox="0 0 24 24" fill="none" stroke="var(--color-error)" strokeWidth="2" className="w-8 h-8">
            <circle cx="12" cy="12" r="10" />
            <line x1="15" y1="9" x2="9" y2="15" />
            <line x1="9" y1="9" x2="15" y2="15" />
          </svg>
        </div>
        <h2 className="text-[20px] font-semibold text-text-primary text-center">
          {t('failed_title')}
        </h2>
        <p className="text-[13px] text-text-muted text-center mt-2 mb-6">
          {state === 'timeout' ? t('timeout_sub') : t('failed_sub')}
        </p>
        <div className="w-full md:max-w-[320px] md:mx-auto">
          <button
            className="btn-primary btn-full"
            onClick={() => router.push('/results')}
          >
            {t('back_to_results')}
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="flex flex-col items-center justify-center h-[100dvh] bg-bg-base px-6">
      <div className="w-14 h-14 rounded-full border-4 border-bg-elevated border-t-accent animate-spin mb-6" />
      <h2 className="text-[20px] font-semibold text-text-primary text-center">
        {t('confirming_title')}
      </h2>
      <p className="text-[13px] text-text-muted text-center mt-2">
        {t('confirming_sub')}
      </p>
    </div>
  )
}
