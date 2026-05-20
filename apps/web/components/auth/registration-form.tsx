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
  const [phone, setPhone] = useState<string>('')
  const [email, setEmail] = useState('')

  const phoneValid = phone ? isValidPhoneNumber(phone) : false
  const emailValid = email ? isValidEmail(email) : false
  const canContinue = phoneValid || emailValid

  function handleSubmit() {
    if (!canContinue) return
    // Prefer phone if both provided
    if (phoneValid) onContinue(phone, 'phone')
    else onContinue(email, 'email')
  }

  return (
    <div className="bg-bg-surface border border-border-default rounded-[12px] p-6 lg:p-8 flex flex-col gap-5">
      {/* Phone field */}
      <div>
        <label className="block text-[13px] font-semibold text-text-primary mb-2">
          {t('phone_label')} <span className="text-text-muted font-normal">{t('optional_if_email')}</span>
        </label>
        <div className={cn(
          'flex items-center h-12 bg-bg-elevated border rounded-[10px] overflow-hidden transition-colors px-3',
          phoneValid ? 'border-accent' : 'border-border-default focus-within:border-accent'
        )}>
          <PhoneInput
            international
            defaultCountry="AM"
            value={phone}
            onChange={(val) => setPhone(val ?? '')}
            className="flex-1 text-[14px] text-text-primary bg-transparent outline-none phone-input-dark"
          />
        </div>
        {phone && !phoneValid && (
          <p className="text-[12px] text-red-400 mt-1">{t('phone_invalid')}</p>
        )}
      </div>

      {/* Divider */}
      <div className="flex items-center gap-3">
        <hr className="flex-1 border-border-default" />
        <span className="text-[12px] text-text-muted">{t('or')}</span>
        <hr className="flex-1 border-border-default" />
      </div>

      {/* Email field */}
      <div>
        <label className="block text-[13px] font-semibold text-text-primary mb-2">
          {t('email_label')} <span className="text-text-muted font-normal">{t('optional_if_phone')}</span>
        </label>
        <input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder={t('email_placeholder')}
          className={cn(
            'w-full h-12 bg-bg-elevated border rounded-[10px] px-4 text-[14px] text-text-primary outline-none placeholder:text-text-muted transition-colors',
            emailValid ? 'border-accent' : 'border-border-default focus:border-accent'
          )}
        />
        {email && !emailValid && (
          <p className="text-[12px] text-red-400 mt-1">{t('email_invalid')}</p>
        )}
      </div>

      <button
        type="button"
        onClick={handleSubmit}
        disabled={!canContinue}
        className="btn-primary btn-full"
      >
        {t('continue')}
      </button>
    </div>
  )
}
