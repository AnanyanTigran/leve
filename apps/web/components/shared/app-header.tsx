'use client'

import { ChevronLeft } from 'lucide-react'
import Link from 'next/link'

interface AppHeaderProps {
  variant: 'landing' | 'app'
  title?: string
  showBack?: boolean
  backHref?: string
  rightSlot?: React.ReactNode
}

export function AppHeader({
  variant,
  title,
  showBack = false,
  backHref = '/',
  rightSlot,
}: AppHeaderProps) {
  return (
    <header className="flex items-center justify-between h-[52px] px-4 bg-bg-base border-b border-border-default">
      {/* Left side */}
      <div className="flex items-center min-w-[44px]">
        {variant === 'landing' ? (
          <span className="font-display font-semibold text-2xl tracking-tight text-text-primary select-none">
            LEVE
          </span>
        ) : showBack ? (
          <Link
            href={backHref}
            className="flex items-center justify-center w-11 h-11 -ml-2 rounded-md transition-colors hover:bg-bg-elevated active:scale-95"
            aria-label="Go back"
          >
            <ChevronLeft className="w-6 h-6 text-text-primary" />
          </Link>
        ) : (
          <div className="w-11 h-11" />
        )}
      </div>

      {/* Center (app variant only) */}
      {variant === 'app' && title && (
        <span className="font-ui font-semibold text-base text-text-primary absolute left-1/2 -translate-x-1/2">
          {title}
        </span>
      )}

      {/* Right side */}
      <div className="flex items-center min-w-[44px] justify-end">
        {rightSlot}
      </div>
    </header>
  )
}
