'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { ChevronDown } from 'lucide-react'
import { AsYouType } from 'libphonenumber-js'
import { cn } from '@/lib/utils'

type CountryKey = 'AM' | 'RU' | 'OTHER'

interface CountryProfile {
  key: CountryKey
  dial: string
  flag: string
  label: string
  // mask uses 'X' as a digit slot; everything else is a literal mask char.
  mask?: string
  placeholder?: string
  maxDigits?: number
}

const COUNTRIES: CountryProfile[] = [
  { key: 'AM', dial: '+374', flag: '🇦🇲', label: 'Armenia', mask: '(XX) XXX-XXX', placeholder: '(99) 123-456', maxDigits: 8 },
  { key: 'RU', dial: '+7', flag: '🇷🇺', label: 'Russia', mask: '(XXX) XXX-XX-XX', placeholder: '(999) 123-45-67', maxDigits: 10 },
  { key: 'OTHER', dial: '+', flag: '🌐', label: 'Other' },
]

function applyMask(digits: string, mask: string): string {
  let out = ''
  let i = 0
  for (const ch of mask) {
    if (ch === 'X') {
      if (i >= digits.length) break
      out += digits[i++]
    } else {
      if (i >= digits.length) break
      out += ch
    }
  }
  return out
}

function detectCountry(e164: string): CountryProfile {
  if (e164.startsWith('+374')) return COUNTRIES[0]!
  if (e164.startsWith('+7')) return COUNTRIES[1]!
  if (e164.startsWith('+')) return COUNTRIES[2]!
  return COUNTRIES[0]!
}

interface MaskedPhoneInputProps {
  value: string
  onChange: (e164: string) => void
  placeholder?: string
  autoFocus?: boolean
  className?: string
}

export function MaskedPhoneInput({
  value,
  onChange,
  placeholder,
  autoFocus,
  className,
}: MaskedPhoneInputProps) {
  const [country, setCountry] = useState<CountryProfile>(() => detectCountry(value))
  const [open, setOpen] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)
  const rootRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    function onClick(e: MouseEvent) {
      if (!rootRef.current?.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', onClick)
    return () => document.removeEventListener('mousedown', onClick)
  }, [open])

  // National part of the current E.164 value — what the user actually types.
  const nationalDigits = useMemo(() => {
    if (country.key === 'OTHER') {
      return value.replace(/^\+/, '').replace(/\D/g, '')
    }
    if (value.startsWith(country.dial)) {
      return value.slice(country.dial.length).replace(/\D/g, '')
    }
    return ''
  }, [value, country])

  // What the input shows. For AM/RU we run our own mask; for OTHER we hand
  // off to libphonenumber's AsYouType so the format adapts per country prefix.
  const display = useMemo(() => {
    if (country.mask) return applyMask(nationalDigits, country.mask)
    // OTHER: format the whole E.164 string
    const asYouType = new AsYouType()
    return asYouType.input(value || '+')
  }, [country, nationalDigits, value])

  function handleInputChange(e: React.ChangeEvent<HTMLInputElement>) {
    const raw = e.target.value
    if (country.key === 'OTHER') {
      // Strip everything except digits, keep a leading +.
      const digits = raw.replace(/[^\d]/g, '').slice(0, 15)
      onChange(digits ? `+${digits}` : '+')
      return
    }
    const digits = raw.replace(/\D/g, '').slice(0, country.maxDigits ?? 15)
    onChange(country.dial + digits)
  }

  function selectCountry(next: CountryProfile) {
    setCountry(next)
    setOpen(false)
    // Reset to just the dial prefix on switch — formatting and validation
    // for the previous country no longer apply.
    onChange(next.key === 'OTHER' ? '+' : next.dial)
    // Bring focus back to the digit input so the user can keep typing.
    requestAnimationFrame(() => inputRef.current?.focus())
  }

  return (
    <div ref={rootRef} className={cn('relative flex items-center gap-2 w-full', className)}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-haspopup="listbox"
        aria-expanded={open}
        className="flex items-center gap-1.5 pr-2 mr-1 border-r border-border-default text-text-primary shrink-0"
      >
        <span className="text-[20px] leading-none">{country.flag}</span>
        <span className="text-[15px] font-medium">{country.dial}</span>
        <ChevronDown className="w-3.5 h-3.5 text-text-muted" />
      </button>

      <input
        ref={inputRef}
        type="tel"
        inputMode="numeric"
        autoComplete="tel"
        autoFocus={autoFocus}
        value={display}
        onChange={handleInputChange}
        placeholder={country.placeholder ?? placeholder}
        className="flex-1 bg-transparent border-0 outline-none text-text-primary text-[16px] placeholder:text-text-muted min-w-0"
      />

      {open && (
        <ul
          role="listbox"
          className="absolute left-0 top-[calc(100%+8px)] z-50 w-[220px] rounded-xl border border-border-default bg-bg-elevated shadow-lg overflow-hidden"
        >
          {COUNTRIES.map((c) => (
            <li key={c.key}>
              <button
                type="button"
                role="option"
                aria-selected={c.key === country.key}
                onClick={() => selectCountry(c)}
                className={cn(
                  'w-full flex items-center gap-3 px-4 py-3 text-[14px] text-text-primary hover:bg-border-default transition-colors',
                  c.key === country.key && 'bg-border-default/60',
                )}
              >
                <span className="text-[18px] leading-none">{c.flag}</span>
                <span className="flex-1 text-left">{c.label}</span>
                <span className="text-[13px] text-text-muted">{c.dial}</span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
