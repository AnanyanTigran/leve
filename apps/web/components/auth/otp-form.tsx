'use client'

import { useState, useRef, useEffect, useCallback } from 'react'
import { cn } from '@/lib/utils'

interface OtpFormProps {
  contact: string
  onVerify: () => void
  onResend: () => void
}

const OTP_LENGTH = 6
const RESEND_SECONDS = 45

export function OtpForm({ contact, onVerify, onResend }: OtpFormProps) {
  const [digits, setDigits] = useState<string[]>(Array(OTP_LENGTH).fill(''))
  const [error, setError] = useState(false)
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
    // Handle paste of 6 digits
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

    if (char && index < OTP_LENGTH - 1) {
      inputRefs.current[index + 1]?.focus()
    }
  }, [digits])

  function handleKeyDown(index: number, e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'Backspace' && !digits[index] && index > 0) {
      inputRefs.current[index - 1]?.focus()
    }
  }

  function handleVerify() {
    const code = digits.join('')
    if (code.length < OTP_LENGTH) return
    // V1: simulate success
    onVerify()
  }

  function handleResend() {
    if (countdown > 0) return
    setCountdown(RESEND_SECONDS)
    setDigits(Array(OTP_LENGTH).fill(''))
    setError(false)
    inputRefs.current[0]?.focus()
    onResend()
  }

  const isFilled = digits.every((d) => d !== '')

  return (
    <div
      className="overflow-hidden"
      style={{
        maxHeight: '400px',
        transition: 'max-height 300ms ease',
      }}
    >
      <p className="text-[14px] text-text-secondary text-center mb-4">
        Enter the code we sent to{' '}
        <span className="text-text-primary font-semibold">{contact}</span>
      </p>

      {/* OTP boxes */}
      <div className="flex justify-center gap-2">
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
              'w-12 h-[52px] text-center text-[24px] font-semibold text-text-primary',
              'bg-bg-elevated border rounded-[8px] outline-none',
              'transition-colors',
              error
                ? 'border-[#DC2626]'
                : digit
                  ? 'border-accent'
                  : 'border-border-default focus:border-accent'
            )}
          />
        ))}
      </div>

      {/* Resend */}
      <p className="text-center mt-4">
        {countdown > 0 ? (
          <span className="text-[13px] text-text-muted">Resend in {countdown}s</span>
        ) : (
          <button
            type="button"
            onClick={handleResend}
            className="text-[13px] text-accent font-medium"
          >
            Resend code
          </button>
        )}
      </p>

      {error && (
        <p className="text-[13px] text-[#DC2626] text-center mt-2">
          Invalid code. Please try again.
        </p>
      )}

      <button
        type="button"
        onClick={handleVerify}
        disabled={!isFilled}
        className="btn-primary btn-full mt-4"
      >
        Verify
      </button>
    </div>
  )
}
