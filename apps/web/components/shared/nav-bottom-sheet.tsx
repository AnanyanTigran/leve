'use client'

import { useEffect } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import { useTranslations } from 'next-intl'
import { motion, AnimatePresence } from 'framer-motion'
import { Home, Plus, Clock, LogIn, LogOut } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useSession, refreshSession } from '@/hooks/use-session'
import { apiFetch } from '@/lib/api-client'

interface NavBottomSheetProps {
  isOpen: boolean
  onClose: () => void
}

export function NavBottomSheet({ isOpen, onClose }: NavBottomSheetProps) {
  const router = useRouter()
  const pathname = usePathname()
  const t = useTranslations('nav')
  const { session } = useSession()

  useEffect(() => {
    if (!isOpen) return
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => { document.body.style.overflow = prev }
  }, [isOpen])

  function navigate(href: string) {
    onClose()
    router.push(href)
  }

  async function handleSignOut() {
    onClose()
    try { await apiFetch('/api/session/logout', { method: 'POST' }) } catch { /* best-effort */ }
    await refreshSession()
    router.push('/')
    router.refresh()
  }

  const navItems = [
    {
      href: '/',
      labelKey: 'home',
      Icon: Home,
      isActive: pathname === '/',
    },
    {
      href: '/upload',
      labelKey: 'upload',
      Icon: Plus,
      isActive: pathname.startsWith('/upload') || pathname.startsWith('/templates'),
    },
    {
      href: '/history',
      labelKey: 'history',
      Icon: Clock,
      isActive: pathname === '/history',
    },
  ]

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            onClick={onClose}
            className="fixed inset-0 z-40 bg-black/60"
          />

          {/* Sheet */}
          <motion.div
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            transition={{ type: 'spring', damping: 30, stiffness: 300 }}
            drag="y"
            dragConstraints={{ top: 0, bottom: 0 }}
            dragElastic={{ top: 0, bottom: 0.5 }}
            onDragEnd={(_e, info) => {
              if (info.offset.y > 80 || info.velocity.y > 400) onClose()
            }}
            className="fixed bottom-0 left-0 right-0 z-50 rounded-t-[20px] bg-bg-surface border-t border-border-default"
            style={{
              touchAction: 'none',
              maxHeight: '80vh',
              paddingBottom: 'var(--safe-area-inset-bottom, 0px)',
            }}
          >
            {/* Drag handle */}
            <div className="flex justify-center pt-3 pb-2" aria-hidden>
              <div className="w-10 h-1 rounded-full bg-border-strong" />
            </div>

            {/* Navigation items */}
            <nav className="flex flex-col px-3 pb-6">
              {navItems.map(({ href, labelKey, Icon, isActive }) => (
                <button
                  key={href}
                  type="button"
                  onClick={() => navigate(href)}
                  className={cn(
                    'flex items-center gap-4 rounded-[12px] px-4 transition-colors min-h-[56px]',
                    isActive
                      ? 'bg-accent-subtle text-accent'
                      : 'text-text-secondary hover:bg-bg-elevated hover:text-text-primary',
                  )}
                >
                  <Icon
                    className={cn('w-5 h-5 shrink-0', isActive ? 'text-accent' : 'text-text-muted')}
                    strokeWidth={1.75}
                  />
                  <span className="text-[16px] font-medium">{t(labelKey)}</span>
                </button>
              ))}

              <div className="h-px bg-border-default my-2 mx-4" />

              {session?.isVerified ? (
                <button
                  type="button"
                  onClick={handleSignOut}
                  className="flex items-center gap-4 rounded-[12px] px-4 min-h-[56px] text-text-secondary hover:bg-bg-elevated hover:text-text-primary transition-colors"
                >
                  <LogOut className="w-5 h-5 shrink-0 text-text-muted" strokeWidth={1.75} />
                  <span className="text-[16px] font-medium">{t('sign_out')}</span>
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => navigate('/register')}
                  className="flex items-center gap-4 rounded-[12px] px-4 min-h-[56px] text-accent hover:bg-accent-subtle transition-colors"
                >
                  <LogIn className="w-5 h-5 shrink-0" strokeWidth={1.75} />
                  <span className="text-[16px] font-medium">{t('sign_in')}</span>
                </button>
              )}
            </nav>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  )
}
