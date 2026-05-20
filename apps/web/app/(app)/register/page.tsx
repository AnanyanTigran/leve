'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useTranslations } from 'next-intl'
import { AppHeader } from '@/components/shared/app-header'
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
    router.push('/upload')
  }

  function handleResend() {
    // V1: no-op, would trigger resend API call
  }

  return (
    <div className="flex flex-col h-[100dvh] overflow-hidden bg-bg-base">
      <AppHeader variant="app" showBack backHref="/" title="" />

      <main className="flex-1 overflow-y-auto flex flex-col justify-center px-4 py-8">
        <div className="w-full max-w-[480px] mx-auto">
          <div className="text-center mb-8">
            <span className="font-display font-semibold text-[32px] text-accent select-none">LEVE</span>
            <h1 className="text-[22px] font-semibold text-text-primary mt-4">
              {t('title')}
            </h1>
            <p className="text-[14px] text-text-secondary mt-2">
              {t('subtitle')}
            </p>
          </div>

          {step === 'contact' && (
            <RegistrationForm onContinue={handleContinue} />
          )}

          {step === 'otp' && (
            <div className="bg-bg-surface border border-border-default rounded-[12px] p-6 lg:p-8">
              <OtpForm
                contact={method === 'phone' ? `+374 ${contact}` : contact}
                onVerify={handleVerify}
                onResend={handleResend}
              />
            </div>
          )}

          <p className="text-[13px] text-text-muted text-center mt-4">
            {t('signin_hint')}{' '}
            <button
              type="button"
              onClick={() => setStep('contact')}
              className="text-accent font-medium"
            >
              {t('signin_link')}
            </button>
          </p>

          <p className="text-[11px] text-text-muted text-center mt-4">
            {t('terms_full')}
          </p>
        </div>
      </main>
    </div>
  )
}
