'use client'

import { useState } from 'react'
import { cn } from '@/lib/utils'

type AuthMethod = 'phone' | 'email'

interface RegistrationFormProps {
  onContinue: (contact: string, method: AuthMethod) => void
}

function isValidPhone(value: string): boolean {
  return /^\d{8}$/.test(value.replace(/\s/g, ''))
}

function isValidEmail(value: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)
}

export function RegistrationForm({ onContinue }: RegistrationFormProps) {
  const [method, setMethod] = useState<AuthMethod>('phone')
  const [value, setValue] = useState('')

  const isValid = method === 'phone' ? isValidPhone(value) : isValidEmail(value)

  function handleSubmit() {
    if (!isValid) return
    onContinue(value, method)
  }

  return (
    <div className="bg-bg-surface border border-border-default rounded-[12px] p-6 lg:p-8">
      {/* Auth method toggle */}
      <div className="flex gap-2 mb-6">
        <button
          type="button"
          onClick={() => { setMethod('phone'); setValue('') }}
          className={cn(
            'flex-1 h-10 rounded-[10px] text-[14px] font-semibold transition-colors',
            method === 'phone'
              ? 'bg-accent text-white'
              : 'bg-bg-elevated text-text-secondary hover:text-text-primary'
          )}
        >
          📱 Phone number
        </button>
        <button
          type="button"
          onClick={() => { setMethod('email'); setValue('') }}
          className={cn(
            'flex-1 h-10 rounded-[10px] text-[14px] font-semibold transition-colors',
            method === 'email'
              ? 'bg-accent text-white'
              : 'bg-bg-elevated text-text-secondary hover:text-text-primary'
          )}
        >
          ✉️ Email
        </button>
      </div>

      {method === 'phone' ? (
        <div>
          <label className="block text-[13px] font-semibold text-text-primary mb-2">
            Phone number
          </label>
          <div className="flex items-center h-12 bg-bg-elevated border border-border-default rounded-[10px] overflow-hidden focus-within:border-accent transition-colors">
            <span className="px-3 text-[14px] text-text-muted border-r border-border-default h-full flex items-center shrink-0 select-none">
              +374
            </span>
            <input
              type="tel"
              value={value}
              onChange={(e) => setValue(e.target.value)}
              placeholder="77 123 456"
              maxLength={10}
              className="flex-1 px-3 text-[14px] text-text-primary bg-transparent outline-none placeholder:text-text-muted"
            />
          </div>
        </div>
      ) : (
        <div>
          <label className="block text-[13px] font-semibold text-text-primary mb-2">
            Email address
          </label>
          <input
            type="email"
            value={value}
            onChange={(e) => setValue(e.target.value)}
            placeholder="your@email.com"
            className="w-full h-12 bg-bg-elevated border border-border-default rounded-[10px] px-4 text-[14px] text-text-primary outline-none placeholder:text-text-muted focus:border-accent transition-colors"
          />
        </div>
      )}

      <button
        type="button"
        onClick={handleSubmit}
        disabled={!isValid}
        className="btn-primary btn-full mt-6"
      >
        Continue
      </button>
    </div>
  )
}
