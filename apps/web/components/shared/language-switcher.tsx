'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { cn } from '@/lib/utils'

const LOCALES = [
  { id: 'hy', label: 'ՀԱՅ' },
  { id: 'ru', label: 'РУС' },
  { id: 'en', label: 'ENG' },
] as const

type LocaleId = typeof LOCALES[number]['id']

function getCurrentLocale(): LocaleId {
  if (typeof document === 'undefined') return 'hy'
  const match = document.cookie.match(/leve_locale=([^;]+)/)
  const val = match?.[1]
  return (val === 'hy' || val === 'ru' || val === 'en') ? val : 'hy'
}

export function LanguageSwitcher() {
  const router = useRouter()
  const [current, setCurrent] = useState<LocaleId>('hy')

  useEffect(() => {
    setCurrent(getCurrentLocale())
  }, [])

  function switchLocale(locale: LocaleId) {
    document.cookie = `leve_locale=${locale};path=/;max-age=31536000;SameSite=Lax`
    setCurrent(locale)
    router.refresh()
  }

  return (
    <div className="flex items-center gap-1">
      {LOCALES.map(({ id, label }) => (
        <button
          key={id}
          type="button"
          onClick={() => switchLocale(id)}
          className={cn(
            'text-[12px] font-semibold px-2 py-1 rounded-full transition-colors',
            current === id
              ? 'bg-accent text-white'
              : 'text-text-muted hover:text-text-secondary'
          )}
        >
          {label}
        </button>
      ))}
    </div>
  )
}
