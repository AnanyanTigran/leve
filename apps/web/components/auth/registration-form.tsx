'use client'

import { useState } from 'react'
import { useTranslations } from 'next-intl'
import { isValidPhoneNumber } from 'libphonenumber-js'
import { MaskedPhoneInput } from './masked-phone-input'
import { cn } from '@/lib/utils'

interface RegistrationFormProps {
  onContinue: (contact: string, method: 'phone' | 'email') => void
  disabled?: boolean
  isSubmitting?: boolean
}

function isValidEmail(v: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v)
}

export function RegistrationForm({ onContinue, disabled = false, isSubmitting = false }: RegistrationFormProps) {
  const t = useTranslations('register')
  const [useEmail, setUseEmail] = useState(false)
  const [phone, setPhone] = useState<string>('')
  const [email, setEmail] = useState('')
  const [touched, setTouched] = useState(false)

  const phoneValid = phone ? isValidPhoneNumber(phone) : false
  const emailValid = email ? isValidEmail(email) : false
  const isValid = useEmail ? emailValid : phoneValid
  const showError = touched && !isValid

  function handleSubmit() {
    setTouched(true)
    if (!isValid) return
    if (useEmail) onContinue(email, 'email')
    else onContinue(phone, 'phone')
  }

  function switchToEmail() {
    setUseEmail(true)
    setPhone('')
    setTouched(false)
  }

  function switchToPhone() {
    setUseEmail(false)
    setEmail('')
    setTouched(false)
  }

  return (
    <div className="flex flex-col gap-5">
      {!useEmail ? (
        <div className="flex flex-col gap-2">
          <div className={cn(
            'flex items-center h-[56px] bg-bg-surface border-2 rounded-[14px] transition-all duration-150 px-4',
            phoneValid
              ? 'border-accent'
              : showError
                ? 'border-[#EF4444]'
                : 'border-border-default focus-within:border-accent'
          )}>
            <MaskedPhoneInput
              value={phone}
              onChange={(val) => { setPhone(val); setTouched(false) }}
              placeholder={t('phone_placeholder')}
              autoFocus
              className="flex-1"
            />
          </div>
          {showError && (
            <p className="text-[12px] text-[#EF4444] px-1">{t('phone_invalid')}</p>
          )}
          <button
            type="button"
            onClick={switchToEmail}
            className="text-[13px] text-text-muted hover:text-text-secondary transition-colors text-center mt-1"
          >
            {t('use_email_instead')}
          </button>
        </div>
      ) : (
        <div className="flex flex-col gap-2">
          <input
            type="email"
            value={email}
            onChange={(e) => { setEmail(e.target.value); setTouched(false) }}
            placeholder={t('email_placeholder')}
            autoFocus
            className={cn(
              'w-full h-[56px] bg-bg-surface border-2 rounded-[14px] px-4 text-[16px] text-text-primary outline-none placeholder:text-text-muted transition-all duration-150',
              emailValid
                ? 'border-accent'
                : showError
                  ? 'border-[#EF4444]'
                  : 'border-border-default focus:border-accent'
            )}
          />
          {showError && (
            <p className="text-[12px] text-[#EF4444] px-1">{t('email_invalid')}</p>
          )}
          <button
            type="button"
            onClick={switchToPhone}
            className="text-[13px] text-text-muted hover:text-text-secondary transition-colors text-center mt-1"
          >
            {t('use_phone_instead')}
          </button>
        </div>
      )}

      <button
        type="button"
        onClick={handleSubmit}
        disabled={disabled || isSubmitting || !isValid}
        className={cn(
          'btn-primary btn-full h-[56px] text-[16px]',
          (disabled || isSubmitting || !isValid) && 'opacity-50 cursor-not-allowed',
        )}
      >
        {isSubmitting ? (
          <span className="inline-flex items-center justify-center gap-2">
            <span className="w-4 h-4 rounded-full border-2 border-white border-t-transparent animate-spin" />
            {t('continue')}
          </span>
        ) : (
          t('continue')
        )}
      </button>
    </div>
  )
}
