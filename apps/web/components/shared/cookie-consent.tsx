'use client'

import { useEffect, useState } from 'react'
import { motion, AnimatePresence, useReducedMotion } from 'framer-motion'
import { useTranslations } from 'next-intl'
import Link from 'next/link'
import { Aperture } from 'lucide-react'
import { cn } from '@/lib/utils'

type View = 'banner' | 'customize'
interface Consent { essential: true; analytics: boolean }

const COOKIE_NAME = 'leve_cookie_consent'

function readConsent(): Consent | null {
  if (typeof document === 'undefined') return null
  const match = document.cookie.match(new RegExp(`(?:^|; )${COOKIE_NAME}=([^;]+)`))
  if (!match || !match[1]) return null
  try { return JSON.parse(decodeURIComponent(match[1])) } catch { return null }
}

function writeConsent(consent: Consent) {
  const expires = new Date()
  expires.setFullYear(expires.getFullYear() + 1)
  document.cookie = `${COOKIE_NAME}=${encodeURIComponent(JSON.stringify(consent))}; expires=${expires.toUTCString()}; path=/; SameSite=Lax`
}

export function CookieConsent() {
  const t = useTranslations('cookie')
  const reduced = useReducedMotion() ?? false
  const [visible, setVisible] = useState(false)
  const [view, setView] = useState<View>('banner')
  const [analytics, setAnalytics] = useState(false)

  useEffect(() => {
    if (!readConsent()) setVisible(true)
  }, [])

  function acceptAll() {
    writeConsent({ essential: true, analytics: true })
    setVisible(false)
  }

  function acceptEssential() {
    writeConsent({ essential: true, analytics: false })
    setVisible(false)
  }

  function saveChoices() {
    writeConsent({ essential: true, analytics })
    setVisible(false)
  }

  const springIn = reduced
    ? { duration: 0.01 }
    : { type: 'spring' as const, stiffness: 320, damping: 34, mass: 1 }

  const slideOut = reduced
    ? { duration: 0.01 }
    : { duration: 0.2, ease: [0.4, 0, 1, 1] as const }

  const expandTransition = reduced
    ? { duration: 0.01 }
    : { duration: 0.24, ease: [0.25, 0, 0, 1] as const }

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          key="cookie"
          initial={{ y: '100%', opacity: 0 }}
          animate={{ y: 0, opacity: 1, transition: springIn }}
          exit={{ y: '100%', opacity: 0, transition: slideOut }}
          className="fixed bottom-0 left-0 right-0 z-[60] p-3 sm:right-auto sm:max-w-[480px] sm:p-4"
          role="dialog"
          aria-modal="false"
          aria-label={t('heading')}
        >
          {/* Card */}
          <div
            className="rounded-2xl bg-bg-elevated shadow-[0_-8px_40px_rgba(0,0,0,0.5)]"
            style={{
              border: '1px solid var(--accent-border)',
              borderLeftWidth: '2.5px',
            }}
          >
            {/* Header */}
            <div className="px-4 pt-4 pb-3 sm:px-5">
              <div className="flex items-start gap-3">
                <Aperture
                  className="flex-shrink-0 mt-0.5 w-[18px] h-[18px]"
                  style={{ color: 'var(--accent)', opacity: 0.9, strokeWidth: 1.5 }}
                  aria-hidden
                />
                <div className="flex-1 min-w-0">
                  <p className="font-display font-semibold text-text-primary text-[14px] leading-tight mb-1.5">
                    {t('heading')}
                  </p>
                  <p className="font-ui text-[12px] text-text-secondary leading-[1.55]">
                    {t('body')}{' '}
                    <Link
                      href="/privacy"
                      className="font-medium hover:underline underline-offset-2 transition-colors"
                      style={{ color: 'var(--accent)' }}
                    >
                      {t('privacy_link')}
                    </Link>
                  </p>
                </div>
              </div>
            </div>

            {/* Customize expansion */}
            <AnimatePresence>
              {view === 'customize' && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1, transition: expandTransition }}
                  exit={{ height: 0, opacity: 0, transition: expandTransition }}
                  style={{ overflow: 'hidden' }}
                >
                  <div className="px-4 sm:px-5">
                    <div className="h-px" style={{ background: 'var(--border-default)' }} />

                    {/* Essential — always on */}
                    <ToggleRow
                      label={t('essential_label')}
                      description={t('essential_desc')}
                      checked
                      disabled
                    />

                    <div className="h-px" style={{ background: 'var(--border-default)' }} />

                    {/* Analytics — default off */}
                    <ToggleRow
                      label={t('analytics_label')}
                      description={t('analytics_desc')}
                      checked={analytics}
                      onChange={setAnalytics}
                    />
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Buttons */}
            <div className="px-4 pb-4 pt-2 sm:px-5">
              {view === 'banner' ? (
                <div className="grid grid-cols-3 gap-2">
                  <ConsentButton onClick={acceptAll}>
                    {t('accept_all')}
                  </ConsentButton>
                  <ConsentButton onClick={acceptEssential}>
                    {t('essential_only')}
                  </ConsentButton>
                  <ConsentButton onClick={() => setView('customize')}>
                    {t('customize')}
                  </ConsentButton>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={saveChoices}
                  className="w-full min-h-[48px] rounded-[10px] font-ui text-[13px] font-semibold text-text-primary transition-colors"
                  style={{
                    background: 'var(--bg-surface)',
                    border: '1px solid var(--border-default)',
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.borderColor = 'var(--border-hover)'
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.borderColor = 'var(--border-default)'
                  }}
                >
                  {t('save_choices')}
                </button>
              )}
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}

// ── Sub-components ─────────────────────────────────────────────────────────────

function ConsentButton({
  onClick,
  children,
}: {
  onClick: () => void
  children: React.ReactNode
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="min-h-[48px] rounded-[10px] font-ui text-[12px] font-medium text-text-primary text-center leading-tight px-2 py-2 transition-colors"
      style={{
        background: 'var(--bg-surface)',
        border: '1px solid var(--border-default)',
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.borderColor = 'var(--border-hover)'
        e.currentTarget.style.background = 'var(--bg-elevated)'
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.borderColor = 'var(--border-default)'
        e.currentTarget.style.background = 'var(--bg-surface)'
      }}
    >
      {children}
    </button>
  )
}

function ToggleRow({
  label,
  description,
  checked,
  disabled,
  onChange,
}: {
  label: string
  description: string
  checked: boolean
  disabled?: boolean
  onChange?: (v: boolean) => void
}) {
  return (
    <div className={cn('flex items-center justify-between gap-4 py-3', disabled && 'opacity-60')}>
      <div>
        <p className="font-ui text-[13px] font-semibold text-text-primary leading-tight">{label}</p>
        <p className="font-ui text-[11px] text-text-muted leading-snug mt-0.5">{description}</p>
      </div>

      {disabled ? (
        /* Always-on pill */
        <div
          className="flex-shrink-0 relative w-10 h-6 rounded-full"
          aria-label="Always on"
          style={{ background: 'var(--accent)' }}
        >
          <span className="absolute top-0.5 right-0.5 w-5 h-5 rounded-full bg-white shadow-sm" />
        </div>
      ) : (
        <button
          type="button"
          role="switch"
          aria-checked={checked}
          onClick={() => onChange?.(!checked)}
          className="flex-shrink-0 relative w-10 h-6 rounded-full transition-colors duration-200 focus-visible:ring-2 focus-visible:ring-offset-1 focus-visible:outline-none"
          style={{
            background: checked ? 'var(--accent)' : 'var(--bg-surface)',
            border: checked ? '1px solid transparent' : '1px solid var(--border-default)',
          }}
        >
          <span
            className="absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white shadow-sm pointer-events-none transition-transform duration-200"
            style={{ transform: checked ? 'translateX(16px)' : 'translateX(0)' }}
          />
        </button>
      )}
    </div>
  )
}
