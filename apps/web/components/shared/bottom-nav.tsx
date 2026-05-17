'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Home, PlusCircle, Clock } from 'lucide-react'
import { cn } from '@/lib/utils'

const TABS = [
  { href: '/', icon: Home, label: 'Home' },
  { href: '/upload', icon: PlusCircle, label: 'Upload', isAccent: true },
  { href: '/history', icon: Clock, label: 'History' },
] as const

export function BottomNav() {
  const pathname = usePathname()

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 bg-bg-base border-t border-border-default pb-[var(--safe-area-inset-bottom)]">
      <div className="flex items-center justify-around h-16">
        {TABS.map((tab) => {
          const isActive = pathname === tab.href
          const Icon = tab.icon

          return (
            <Link
              key={tab.href}
              href={tab.href}
              className="flex flex-col items-center justify-center flex-1 h-full"
            >
              <Icon
                className={cn(
                  'transition-colors',
                  tab.isAccent ? 'w-7 h-7 text-accent' : 'w-6 h-6',
                  !tab.isAccent && (isActive ? 'text-accent' : 'text-text-muted')
                )}
                strokeWidth={tab.isAccent ? 1.5 : 1.75}
              />
              <span
                className={cn(
                  'text-[11px] font-ui mt-1 transition-colors',
                  isActive || tab.isAccent ? 'text-accent' : 'text-text-muted'
                )}
              >
                {tab.label}
              </span>
            </Link>
          )
        })}
      </div>
    </nav>
  )
}
