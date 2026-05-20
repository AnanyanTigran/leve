'use client'

import { useState } from 'react'
import { useTranslations } from 'next-intl'
import PhoneInput, { isValidPhoneNumber } from 'react-phone-number-input'
import 'react-phone-number-input/style.css'
import { cn } from '@/lib/utils'

interface RegistrationFormProps {
  onContinue: (contact: string, method: 'phone' | 'email') => void
}

function isValidEmail(v: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v)
}

export function RegistrationForm({ onContinue }: RegistrationFormProps) {
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
            'flex items-center h-[56px] bg-bg-surface border-2 rounded-[14px] overflow-hidden transition-all duration-150 px-4',
            phoneValid
              ? 'border-accent'
              : showError
                ? 'border-[#EF4444]'
                : 'border-border-default focus-within:border-accent'
          )}>
            <PhoneInput
              international
              defaultCountry="AM"
              value={phone}
              onChange={(val) => { setPhone(val ?? ''); setTouched(false) }}
              placeholder={t('phone_placeholder')}
              className="flex-1 phone-input-leve"
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
        className="btn-primary btn-full h-[56px] text-[16px]"
      >
        {t('continue')}
      </button>
    </div>
  )
}
