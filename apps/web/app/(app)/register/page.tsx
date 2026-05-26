'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useTranslations, useLocale } from 'next-intl'
import { ChevronLeft } from 'lucide-react'
import { RegistrationForm } from '@/components/auth/registration-form'
import { OtpForm } from '@/components/auth/otp-form'
import { setVerified } from '@/lib/session'

type Step = 'contact' | 'otp' | 'brand_name'

export default function RegisterPage() {
  const router = useRouter()
  const t = useTranslations('register')
  const locale = useLocale()
  const [step, setStep] = useState<Step>('contact')
  const [contact, setContact] = useState('')
  const [method, setMethod] = useState<'phone' | 'email'>('phone')
  const [brandName, setBrandName] = useState('')

  useEffect(() => {
    fetch('/api/session/me', { credentials: 'include' })
      .then((r) => r.json())
      .then((data) => {
        if (data?.data?.isVerified) {
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
      .catch(() => {})
  }, [router])

  function handleContinue(contactValue: string, authMethod: 'phone' | 'email') {
    setContact(contactValue)
    setMethod(authMethod)
    setStep('otp')
  }

  function handleVerify() {
    setVerified(contact, method)
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

            <RegistrationForm onContinue={handleContinue} />

            <p className="text-[11px] text-text-muted text-center mt-6 leading-relaxed px-4">
              {t('terms_full')}
            </p>
          </>
        )}

        {step === 'otp' && (
          <OtpForm
            contact={contact}
            onVerify={handleVerify}
            onResend={() => {}}
          />
        )}

        {step === 'brand_name' && (
          <div>
            <div className="mb-8">
              <h1 className="text-[26px] font-display font-semibold text-text-primary leading-tight">
                {locale === 'hy'
                  ? 'Ձեր բրենդի անունը'
                  : locale === 'ru'
                  ? 'Название вашего бренда'
                  : 'Your brand name'}
              </h1>
              <p className="text-[14px] text-text-secondary mt-2 leading-relaxed">
                {locale === 'hy'
                  ? 'Կկիրառվի բոլոր նկարների վրա։ Կարող եք բաց թողնել։'
                  : locale === 'ru'
                  ? 'Будет добавляться на все фото. Можно пропустить.'
                  : 'Added to all your images. You can skip this.'}
              </p>
            </div>

            <input
              type="text"
              value={brandName}
              onChange={(e) => setBrandName(e.target.value)}
              placeholder={
                locale === 'hy' ? 'օրինակ՝ Bella Beauty'
                : locale === 'ru' ? 'например: Bella Beauty'
                : 'e.g. Bella Beauty'
              }
              maxLength={60}
              className="w-full bg-bg-surface border border-border-default rounded-[12px] px-4 py-3.5 text-[16px] text-text-primary placeholder:text-text-muted focus:outline-none focus:border-accent transition-colors"
            />

            <button
              className="btn-primary btn-full mt-5 h-14 text-[16px]"
              onClick={handleBrandNameSave}
            >
              {locale === 'hy' ? 'Պահել և շարունակել'
               : locale === 'ru' ? 'Сохранить и продолжить'
               : 'Save and continue'}
            </button>

            <button
              className="w-full mt-3 text-[14px] text-text-muted hover:text-text-secondary transition-colors py-3"
              onClick={handleBrandNameSkip}
            >
              {locale === 'hy' ? 'Բաց թողնել'
               : locale === 'ru' ? 'Пропустить'
               : 'Skip for now'}
            </button>
          </div>
        )}
      </main>
    </div>
  )
}
