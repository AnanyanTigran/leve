'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useTranslations } from 'next-intl'
import { ChevronLeft } from 'lucide-react'
import { RegistrationForm } from '@/components/auth/registration-form'
import { OtpForm } from '@/components/auth/otp-form'
import { setVerified } from '@/lib/session'

type Step = 'contact' | 'otp'

export default function RegisterPage() {
  const router = useRouter()
  const t = useTranslations('register')
  const [step, setStep] = useState<Step>('contact')
  const [contact, setContact] = useState('')
  const [method, setMethod] = useState<'phone' | 'email'>('phone')

  function handleContinue(contactValue: string, authMethod: 'phone' | 'email') {
    setContact(contactValue)
    setMethod(authMethod)
    setStep('otp')
  }

  function handleVerify() {
    setVerified(contact, method)
    const returnTo = typeof window !== 'undefined'
      ? sessionStorage.getItem('leve_return_to') || '/upload'
      : '/upload'
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
      </main>
    </div>
  )
}
