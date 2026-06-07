'use client'

import { useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useTranslations } from 'next-intl'
import { Coins, Clock, LogOut, User } from 'lucide-react'
import { useSession, refreshSession } from '@/hooks/use-session'
import { cn } from '@/lib/utils'
import { apiFetch } from '@/lib/api-client'

const LOCALES = [
  { id: 'hy', label: 'ՀԱՅ' },
  { id: 'ru', label: 'РУС' },
  { id: 'en', label: 'ENG' },
] as const

type LocaleId = (typeof LOCALES)[number]['id']

function getCurrentLocale(): LocaleId {
  if (typeof document === 'undefined') return 'hy'
  const match = document.cookie.match(/leve_locale=([^;]+)/)
  const val = match?.[1]
  return val === 'hy' || val === 'ru' || val === 'en' ? val : 'hy'
}

// Returns the letter to show in the avatar circle, or null when a generic
// icon should be used instead (phone-only users — "+" is not a letter).
function getInitial(session: { email: string | null; phone: string | null; brandName: string | null }): string | null {
  if (session.brandName?.trim()) return session.brandName.trim().charAt(0).toUpperCase()
  if (session.email?.trim()) return session.email.trim().charAt(0).toUpperCase()
  return null
}

// Inserts spaces into an Armenian mobile number for readability.
// +374XXXXXXXX → +374 XX XXX XXX. Other formats are returned unchanged.
function formatPhone(phone: string): string {
  const m = phone.match(/^(\+374)(\d{2})(\d{3})(\d{3})$/)
  return m ? `${m[1]} ${m[2]} ${m[3]} ${m[4]}` : phone
}

// The display name shown in the menu header follows brandName > email > phone.
function getDisplayName(session: { email: string | null; phone: string | null; brandName: string | null }): string {
  if (session.brandName?.trim()) return session.brandName.trim()
  if (session.email?.trim()) return session.email.trim()
  if (session.phone?.trim()) return formatPhone(session.phone.trim())
  return ''
}

function truncate(value: string, max = 22): string {
  return value.length > max ? `${value.slice(0, max - 1)}…` : value
}

export function UserMenu() {
  const router = useRouter()
  const t = useTranslations('user_menu')
  const { session, status } = useSession()
  const [open, setOpen] = useState(false)
  const [locale, setLocale] = useState<LocaleId>('hy')
  const rootRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    setLocale(getCurrentLocale())
  }, [])

  useEffect(() => {
    if (!open) return
    function onClick(e: MouseEvent) {
      if (!rootRef.current?.contains(e.target as Node)) setOpen(false)
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') setOpen(false)
    }
    document.addEventListener('mousedown', onClick)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('mousedown', onClick)
      document.removeEventListener('keydown', onKey)
    }
  }, [open])

  // Skeleton while the session hook hydrates so the header doesn't flicker
  // between sign-in CTA and avatar on first paint.
  if (status === 'loading' || status === 'idle') {
    return <div className="w-12 h-12 rounded-full bg-bg-elevated animate-pulse" />
  }

  if (!session?.isVerified) return null

  const displayName = getDisplayName(session)
  const initial = getInitial(session)

  function switchLocale(next: LocaleId) {
    document.cookie = `leve_locale=${next};path=/;max-age=31536000;SameSite=Lax`
    setLocale(next)
    router.refresh()
  }

  async function handleLogout() {
    setOpen(false)
    try {
      await apiFetch('/api/session/logout', { method: 'POST' })
    } catch {
      // Best-effort — even if the network failed, the FE state is cleared
      // below and the cookie will expire eventually.
    }
    await refreshSession()
    router.push('/')
    router.refresh()
  }

  return (
    <div ref={rootRef} className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-label={t('open_menu')}
        aria-haspopup="menu"
        aria-expanded={open}
        className="w-12 h-12 rounded-full bg-accent text-white flex items-center justify-center font-semibold text-[14px] hover:bg-accent-hover transition-colors"
      >
        {initial || <User className="w-4 h-4" strokeWidth={2} />}
      </button>

      {open && (
        <div
          role="menu"
          className="absolute right-0 top-[calc(100%+8px)] z-50 w-[260px] rounded-xl border border-border-default bg-bg-elevated shadow-lg overflow-hidden"
        >
          <div className="px-4 py-3 flex flex-col gap-1">
            {displayName && (
              <p className="text-[13px] font-semibold text-text-primary truncate">
                {truncate(displayName)}
              </p>
            )}
            <div className="flex items-center gap-1.5 mt-1">
              <Coins className="w-3.5 h-3.5 text-accent" strokeWidth={2} />
              <span className="text-[12px] text-text-secondary">
                {t('credits', { count: session.creditsRemaining })}
              </span>
            </div>
          </div>

          <div className="h-px bg-border-default" />

          <button
            type="button"
            role="menuitem"
            onClick={() => {
              setOpen(false)
              router.push('/history')
            }}
            className="w-full flex items-center gap-3 px-4 py-3 text-[14px] text-text-primary hover:bg-border-default transition-colors"
          >
            <Clock className="w-4 h-4 text-text-secondary" strokeWidth={1.75} />
            {t('history')}
          </button>

          <div className="px-4 py-3">
            <p className="text-[11px] uppercase tracking-wide text-text-muted mb-2">
              {t('language')}
            </p>
            <div className="flex items-center gap-1">
              {LOCALES.map(({ id, label }) => (
                <button
                  key={id}
                  type="button"
                  onClick={() => switchLocale(id)}
                  className={cn(
                    'text-[12px] font-semibold px-3 py-1.5 rounded-full transition-colors',
                    locale === id
                      ? 'bg-accent text-white'
                      : 'text-text-muted hover:text-text-secondary'
                  )}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>

          <div className="h-px bg-border-default" />

          <button
            type="button"
            role="menuitem"
            onClick={handleLogout}
            className="w-full flex items-center gap-3 px-4 py-3 text-[14px] text-text-primary hover:bg-border-default transition-colors"
          >
            <LogOut className="w-4 h-4 text-text-secondary" strokeWidth={1.75} />
            {t('logout')}
          </button>
        </div>
      )}
    </div>
  )
}
