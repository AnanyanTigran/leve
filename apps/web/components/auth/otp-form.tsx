'use client'

import { useState, useRef, useEffect, useCallback } from 'react'
import { useTranslations } from 'next-intl'
import { cn } from '@/lib/utils'

interface OtpFormProps {
  contact: string
  identifierType: 'phone' | 'email'
  onVerify: () => void
  onResend: () => void
}

const OTP_LENGTH = 6
const RESEND_SECONDS = 45

export function OtpForm({ contact, identifierType, onVerify, onResend }: OtpFormProps) {
  const t = useTranslations('register')
  const [digits, setDigits] = useState<string[]>(Array(OTP_LENGTH).fill(''))
  const [error, setError] = useState(false)
  const [incomplete, setIncomplete] = useState(false)
  const [isVerifying, setIsVerifying] = useState(false)
  const [countdown, setCountdown] = useState(RESEND_SECONDS)
  const inputRefs = useRef<(HTMLInputElement | null)[]>([])

  useEffect(() => {
    inputRefs.current[0]?.focus()
  }, [])

  useEffect(() => {
    if (countdown <= 0) return
    const t = setTimeout(() => setCountdown((c) => c - 1), 1000)
    return () => clearTimeout(t)
  }, [countdown])

  const handleChange = useCallback((index: number, raw: string) => {
    if (raw.length === OTP_LENGTH && /^\d+$/.test(raw)) {
      const next = raw.split('')
      setDigits(next)
      inputRefs.current[OTP_LENGTH - 1]?.focus()
      return
    }

    const char = raw.replace(/\D/g, '').slice(-1)
    const next = [...digits]
    next[index] = char
    setDigits(next)
    setError(false)
    setIncomplete(false)

    if (char && index < OTP_LENGTH - 1) {
      inputRefs.current[index + 1]?.focus()
    }
  }, [digits])

  function handleKeyDown(index: number, e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'Backspace' && !digits[index] && index > 0) {
      inputRefs.current[index - 1]?.focus()
    }
  }

  async function handleVerify() {
    if (isVerifying) return
    const code = digits.join('')
    if (code.length < OTP_LENGTH) {
      setIncomplete(true)
      return
    }
    setIncomplete(false)
    setError(false)
    setIsVerifying(true)
    try {
      const res = await fetch('/api/register/otp/verify', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ identifier: contact, identifierType, code }),
      })
      const data = await res.json().catch(() => null)
      if (!res.ok || !data?.success) {
        setError(true)
        return
      }
      onVerify()
    } catch {
      setError(true)
    } finally {
      setIsVerifying(false)
    }
  }

  function handleResend() {
    if (countdown > 0) return
    setCountdown(RESEND_SECONDS)
    setDigits(Array(OTP_LENGTH).fill(''))
    setError(false)
    inputRefs.current[0]?.focus()
    onResend()
  }

  return (
    <div className="bg-bg-surface border border-border-default rounded-[16px] p-6 flex flex-col gap-5">
      <p className="text-[14px] text-text-secondary text-center">
        {t('otp_sent_to', { contact })}
      </p>

      <div className="flex justify-center gap-1.5">
        {digits.map((digit, i) => (
          <input
            key={i}
            ref={(el) => { inputRefs.current[i] = el }}
            type="text"
            inputMode="numeric"
            maxLength={OTP_LENGTH}
            value={digit}
            onChange={(e) => handleChange(i, e.target.value)}
            onKeyDown={(e) => handleKeyDown(i, e)}
            className={cn(
              'w-10 h-12 text-center text-[20px] font-semibold text-text-primary',
              'bg-bg-elevated border-2 rounded-[10px] outline-none transition-colors',
              error
                ? 'border-[#DC2626]'
                : digit
                  ? 'border-accent'
                  : 'border-border-default focus:border-accent'
            )}
          />
        ))}
      </div>

      <p className="text-center">
        {countdown > 0 ? (
          <span className="text-[13px] text-text-muted">
            {t('otp_resend_countdown', { seconds: countdown })}
          </span>
        ) : (
          <button type="button" onClick={handleResend} className="text-[13px] text-accent font-medium">
            {t('resend')}
          </button>
        )}
      </p>

      {incomplete && (
        <p className="text-[13px] text-[#DC2626] text-center">{t('otp_incomplete')}</p>
      )}
      {error && !incomplete && (
        <p className="text-[13px] text-[#DC2626] text-center">{t('otp_invalid')}</p>
      )}

      <button
        type="button"
        onClick={handleVerify}
        disabled={isVerifying}
        className={cn('btn-primary btn-full', isVerifying && 'opacity-60 cursor-not-allowed')}
      >
        {isVerifying ? (
          <span className="inline-flex items-center justify-center gap-2">
            <span className="w-4 h-4 rounded-full border-2 border-white border-t-transparent animate-spin" />
            {t('verify')}
          </span>
        ) : (
          t('verify')
        )}
      </button>
    </div>
  )
}
