'use client'

import { useTheme } from 'next-themes'
import { Sun, Moon, ChevronLeft } from 'lucide-react'
import { useEffect, useState } from 'react'
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
      <div className="flex items-center min-w-[40px]">
        {variant === 'landing' ? (
          <span className="font-display font-bold text-xl tracking-tight text-text-primary select-none">
            LEVE
          </span>
        ) : showBack ? (
          <Link
            href={backHref}
            className="flex items-center justify-center w-9 h-9 -ml-1 rounded-md transition-colors hover:bg-bg-elevated active:scale-95"
            aria-label="Go back"
          >
            <ChevronLeft className="w-5 h-5 text-text-primary" />
          </Link>
        ) : (
          <div className="w-9 h-9" />
        )}
      </div>

      {/* Center (app variant only) */}
      {variant === 'app' && title && (
        <span className="font-ui font-semibold text-[16px] text-text-primary absolute left-1/2 -translate-x-1/2">
          {title}
        </span>
      )}

      {/* Right side */}
      <div className="flex items-center min-w-[40px] justify-end">
        {rightSlot}
      </div>
    </header>
  )
}

export function ThemeToggle() {
  const { theme, setTheme } = useTheme()
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  return (
    <button
      type="button"
      onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
      className="flex items-center justify-center w-9 h-9 rounded-md transition-colors hover:bg-bg-elevated active:scale-95"
      aria-label={mounted ? (theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode') : 'Toggle theme'}
    >
      {mounted ? (
        theme === 'dark' ? (
          <Sun className="w-5 h-5 text-text-secondary" />
        ) : (
          <Moon className="w-5 h-5 text-text-secondary" />
        )
      ) : (
        <div className="w-5 h-5" />
      )}
    </button>
  )
}
