'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useTranslations } from 'next-intl'
import { ChevronLeft } from 'lucide-react'
import { RegistrationForm } from '@/components/auth/registration-form'
import { OtpForm } from '@/components/auth/otp-form'
import { refreshSession } from '@/hooks/use-session'

// Stale order id (older than this) is removed on landing so the user
// doesn't get parked in a stuck "Processing payment…" sheet on /results.
const STALE_ORDER_MS = 5 * 60 * 1000

type Step = 'contact' | 'otp' | 'brand_name'

export default function RegisterPage() {
  const router = useRouter()
  const t = useTranslations('register')
  const [step, setStep] = useState<Step>('contact')
  const [contact, setContact] = useState('')
  const [method, setMethod] = useState<'phone' | 'email'>('phone')
  const [brandName, setBrandName] = useState('')
  // Until we know server-side verified status, the contact form is disabled —
  // prevents a verified user from sending a redundant OTP by racing the redirect.
  const [authChecked, setAuthChecked] = useState(false)
  const [isSendingOtp, setIsSendingOtp] = useState(false)

  useEffect(() => {
    const controller = new AbortController()

    // Drop any stale order id from a previously abandoned payment flow.
    const initiatedAt = parseInt(
      sessionStorage.getItem('leve_order_initiated_at') ?? '0',
      10,
    )
    if (initiatedAt && Date.now() - initiatedAt > STALE_ORDER_MS) {
      sessionStorage.removeItem('leve_order_id')
      sessionStorage.removeItem('leve_order_initiated_at')
    }

    fetch('/api/session/me', { credentials: 'include', signal: controller.signal })
      .then((r) => r.json())
      .then((data) => {
        if (data?.data?.isVerified) {
          void refreshSession()
          const returnTo = sessionStorage.getItem('leve_return_to')
          if (returnTo) {
            sessionStorage.removeItem('leve_return_to')
            router.replace(returnTo)
          } else if (sessionStorage.getItem('leve_job_id')) {
            router.replace('/results')
          } else {
            router.replace('/')
          }
        }
      })
      .catch((err) => {
        if (err.name !== 'AbortError') {
          // non-fatal — let user proceed with registration
        }
      })
      .finally(() => {
        if (!controller.signal.aborted) setAuthChecked(true)
      })

    return () => controller.abort()
  }, [router])

  async function handleContinue(contactValue: string, authMethod: 'phone' | 'email') {
    // Block until the initial /api/session/me check resolves so a verified
    // user racing the redirect doesn't trigger a wasted OTP send. Also
    // debounces double-tap on the Continue button.
    if (!authChecked || isSendingOtp) return
    setIsSendingOtp(true)
    setContact(contactValue)
    setMethod(authMethod)
    try {
      await fetch('/api/register/otp/send', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ identifier: contactValue, identifierType: authMethod }),
      })
    } catch {
      // non-fatal — proceed to OTP step anyway, user can resend
    } finally {
      setIsSendingOtp(false)
    }

    setStep('otp')
  }

  function handleVerify() {
    // Pull the just-promoted session into the shared cache so the rest of
    // the app reflects the verified state without a per-page re-fetch.
    void refreshSession()
    setStep('brand_name')
  }

  async function handleBrandNameSave() {
    if (brandName.trim()) {
      try {
        await fetch('/api/session/brand-name', {
          method: 'POST',
          credentials: 'include',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ brandName: brandName.trim() }),
        })
        sessionStorage.setItem('leve_brand_name', brandName.trim())
      } catch {
        // Non-fatal — continue anyway
      }
    }
    navigateToReturn()
  }

  function handleBrandNameSkip() {
    navigateToReturn()
  }

  function navigateToReturn() {
    const returnTo =
      typeof window !== 'undefined'
        ? sessionStorage.getItem('leve_return_to') || '/templates'
        : '/templates'
    if (typeof window !== 'undefined') {
      sessionStorage.removeItem('leve_return_to')
    }
    router.push(returnTo)
  }

  return (
    <div className="flex flex-col h-[100dvh] bg-bg-base">
      {step === 'otp' && (
        <button
          onClick={() => setStep('contact')}
          className="absolute top-4 left-4 z-10 w-10 h-10 flex items-center justify-center rounded-[10px] hover:bg-bg-surface transition-colors"
          aria-label="Back"
        >
          <ChevronLeft className="w-5 h-5 text-text-secondary" />
        </button>
      )}
      {step === 'brand_name' && (
        <button
          onClick={() => setStep('otp')}
          className="absolute top-4 left-4 z-10 w-10 h-10 flex items-center justify-center rounded-[10px] hover:bg-bg-surface transition-colors"
          aria-label="Back"
        >
          <ChevronLeft className="w-5 h-5 text-text-secondary" />
        </button>
      )}
      {step === 'contact' && (
        <button
          onClick={() => router.back()}
          className="absolute top-4 left-4 z-10 w-10 h-10 flex items-center justify-center rounded-[10px] hover:bg-bg-surface transition-colors"
          aria-label="Back"
        >
          <ChevronLeft className="w-5 h-5 text-text-secondary" />
        </button>
      )}

      <main className="flex-1 flex flex-col justify-center px-6 py-12 max-w-[400px] mx-auto w-full">
        <div className="text-center mb-10">
          <span className="font-display font-semibold text-[36px] text-accent tracking-tight select-none">
            LEVE
          </span>
        </div>

        {step === 'contact' && (
          <>
            <div className="mb-8">
              <h1 className="text-[28px] font-display font-semibold text-text-primary leading-tight">
                {t('title')}
              </h1>
              <p className="text-[15px] text-text-secondary mt-2 leading-relaxed">
                {t('subtitle')}
              </p>
            </div>

            <RegistrationForm
              onContinue={handleContinue}
              disabled={!authChecked}
              isSubmitting={isSendingOtp}
            />

            <p className="text-[11px] text-text-muted text-center mt-6 leading-relaxed px-4">
              {t('terms_full')}
            </p>
          </>
        )}

        {step === 'otp' && (
          <OtpForm
            contact={contact}
            identifierType={method}
            onVerify={handleVerify}
            onResend={async () => {
              try {
                await fetch('/api/register/otp/send', {
                  method: 'POST',
                  credentials: 'include',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({ identifier: contact, identifierType: method }),
                })
              } catch {
                // non-fatal — OtpForm already reset the countdown
              }
            }}
          />
        )}

        {step === 'brand_name' && (
          <div>
            <div className="mb-8">
              <h1 className="text-[26px] font-display font-semibold text-text-primary leading-tight">
                {t('brand_step_title')}
              </h1>
              <p className="text-[14px] text-text-secondary mt-2 leading-relaxed">
                {t('brand_step_sub')}
              </p>
            </div>

            <input
              type="text"
              value={brandName}
              onChange={(e) => setBrandName(e.target.value)}
              placeholder={t('brand_step_placeholder')}
              maxLength={60}
              className="w-full bg-bg-surface border border-border-default rounded-[12px] px-4 py-3.5 text-[16px] text-text-primary placeholder:text-text-muted focus:outline-none focus:border-accent transition-colors"
            />

            <button
              className="btn-primary btn-full mt-5 h-14 text-[16px]"
              onClick={handleBrandNameSave}
            >
              {t('brand_step_save')}
            </button>

            <button
              className="w-full mt-3 text-[14px] text-text-muted hover:text-text-secondary transition-colors py-3"
              onClick={handleBrandNameSkip}
            >
              {t('brand_step_skip')}
            </button>
          </div>
        )}
      </main>
    </div>
  )
}
