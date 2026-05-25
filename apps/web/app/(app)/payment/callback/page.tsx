'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useLocale } from 'next-intl'

type CallbackState = 'polling' | 'success' | 'failed' | 'timeout'

export default function PaymentCallbackPage() {
  const router = useRouter()
  const locale = useLocale()
  const [state, setState] = useState<CallbackState>('polling')

  const MAX_ATTEMPTS = 15 // 30 seconds total at 2s interval

  useEffect(() => {
    const orderId = sessionStorage.getItem('leve_order_id')
    if (!orderId) {
      router.replace('/results')
      return
    }

    const poll = async () => {
      try {
        const res = await fetch(`/api/payments/status/${orderId}`, {
          credentials: 'include',
        })
        const data = await res.json()

        if (data?.data?.status === 'completed') {
          sessionStorage.removeItem('leve_order_id')
          sessionStorage.removeItem('leve_payment_provider')
          setState('success')
          setTimeout(() => router.push('/download/success'), 1500)
          return true
        }

        if (data?.data?.status === 'failed') {
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
        if (!done) setState('timeout')
      }
    }, 2000)

    // Poll immediately on mount
    poll()

    return () => clearInterval(interval)
  }, [router])

  if (state === 'success') {
    return (
      <div className="flex flex-col items-center justify-center h-[100dvh] bg-bg-base px-6">
        <div className="w-16 h-16 rounded-full bg-[#F0FDF4] flex items-center justify-center mb-5">
          <svg viewBox="0 0 24 24" fill="none" stroke="#16A34A" strokeWidth="2.5" className="w-8 h-8">
            <polyline points="20 6 9 17 4 12" />
          </svg>
        </div>
        <h2 className="text-[22px] font-semibold text-text-primary text-center">
          {locale === 'hy' ? 'Վճարումը հաստատված է' : locale === 'ru' ? 'Оплата подтверждена' : 'Payment confirmed!'}
        </h2>
        <p className="text-[14px] text-text-muted text-center mt-2">
          {locale === 'hy' ? 'Ձեր նկարը պատրաստ է' : locale === 'ru' ? 'Ваше фото готово' : 'Your image is ready'}
        </p>
      </div>
    )
  }

  if (state === 'failed' || state === 'timeout') {
    return (
      <div className="flex flex-col items-center justify-center h-[100dvh] bg-bg-base px-6">
        <div className="w-16 h-16 rounded-full bg-[#FEF2F2] flex items-center justify-center mb-5">
          <svg viewBox="0 0 24 24" fill="none" stroke="#DC2626" strokeWidth="2" className="w-8 h-8">
            <circle cx="12" cy="12" r="10" />
            <line x1="15" y1="9" x2="9" y2="15" />
            <line x1="9" y1="9" x2="15" y2="15" />
          </svg>
        </div>
        <h2 className="text-[20px] font-semibold text-text-primary text-center">
          {locale === 'hy' ? 'Վճարումը ձախողվեց' : locale === 'ru' ? 'Оплата не прошла' : 'Payment not completed'}
        </h2>
        <p className="text-[13px] text-text-muted text-center mt-2 mb-6">
          {state === 'timeout'
            ? (locale === 'hy' ? 'Ժամանակն անցավ' : locale === 'ru' ? 'Время истекло' : 'Payment timed out — try again')
            : (locale === 'hy' ? 'Փորձեք կրկին' : locale === 'ru' ? 'Попробуйте снова' : 'Payment was not completed')}
        </p>
        <button
          className="btn-primary btn-full max-w-[280px]"
          onClick={() => router.push('/results')}
        >
          {locale === 'hy' ? 'Վերադառնալ' : locale === 'ru' ? 'Вернуться' : 'Back to results'}
        </button>
      </div>
    )
  }

  return (
    <div className="flex flex-col items-center justify-center h-[100dvh] bg-bg-base px-6">
      <div className="w-14 h-14 rounded-full border-4 border-bg-elevated border-t-accent animate-spin mb-6" />
      <h2 className="text-[20px] font-semibold text-text-primary text-center">
        {locale === 'hy' ? 'Վճարումը ստուգվում է...' : locale === 'ru' ? 'Проверяем оплату...' : 'Confirming payment...'}
      </h2>
      <p className="text-[13px] text-text-muted text-center mt-2">
        {locale === 'hy' ? 'Մի փակեք այս էկրանը' : locale === 'ru' ? 'Не закрывайте экран' : 'Please keep this screen open'}
      </p>
    </div>
  )
}
