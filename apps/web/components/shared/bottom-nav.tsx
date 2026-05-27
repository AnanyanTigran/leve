'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useTranslations } from 'next-intl'
import { Home, Plus, Clock } from 'lucide-react'
import { cn } from '@/lib/utils'

export function BottomNav() {
  const pathname = usePathname()
  const t = useTranslations('nav')
  const isHome = pathname === '/'
  const isUpload =
    pathname.startsWith('/upload') ||
    pathname.startsWith('/templates') ||
    pathname.startsWith('/processing')
  const isHistory = pathname === '/history'

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 bg-bg-base border-t border-border-default pb-[var(--safe-area-inset-bottom)]">
      <div className="flex items-center justify-around h-16">
        {/* Home */}
        <Link href="/" className="flex flex-col items-center justify-center flex-1 h-full min-h-[48px]">
          <Home
            className={cn('w-6 h-6 transition-colors', isHome ? 'text-accent' : 'text-text-muted')}
            strokeWidth={1.75}
          />
          <span
            className={cn(
              'text-[11px] font-ui mt-1 transition-colors',
              isHome ? 'text-accent' : 'text-text-muted'
            )}
          >
            {t('home')}
          </span>
        </Link>

        {/* Upload — always accent solid circle */}
        <Link href="/upload" className="flex flex-col items-center justify-center flex-1 h-full min-h-[48px]">
          <div className="w-10 h-10 rounded-full bg-accent flex items-center justify-center">
            <Plus size={20} className="text-white" strokeWidth={2} />
          </div>
          <span
            className={cn(
              'text-[11px] font-ui mt-1 transition-colors',
              isUpload ? 'text-accent' : 'text-text-muted'
            )}
          >
            {t('upload')}
          </span>
        </Link>

        {/* History */}
        <Link href="/history" className="flex flex-col items-center justify-center flex-1 h-full min-h-[48px]">
          <Clock
            className={cn(
              'w-6 h-6 transition-colors',
              isHistory ? 'text-accent' : 'text-text-muted'
            )}
            strokeWidth={1.75}
          />
          <span
            className={cn(
              'text-[11px] font-ui mt-1 transition-colors',
              isHistory ? 'text-accent' : 'text-text-muted'
            )}
          >
            {t('history')}
          </span>
        </Link>
      </div>
    </nav>
  )
}
