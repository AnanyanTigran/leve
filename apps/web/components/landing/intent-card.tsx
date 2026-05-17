'use client'

import { ChevronRight } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import { cn } from '@/lib/utils'

interface IntentCardProps {
  icon: LucideIcon
  label: string
  sublabel: string
  selected: boolean
  onSelect: () => void
}

export function IntentCard({
  icon: Icon,
  label,
  sublabel,
  selected,
  onSelect,
}: IntentCardProps) {
  return (
    <button
      type="button"
      onClick={onSelect}
      className={cn(
        'flex items-center w-full h-20 px-4 rounded-md border transition-all duration-100',
        'bg-bg-surface border-border-default',
        'active:scale-[0.98]',
        'lg:hover:-translate-y-0.5 lg:hover:border-border-strong lg:transition-all lg:duration-150',
        selected && 'border-accent bg-accent-subtle'
      )}
    >
      <div className="flex items-center justify-center w-10 h-10 rounded-[8px] bg-accent-subtle shrink-0">
        <Icon className="w-5 h-5 text-accent" strokeWidth={1.75} />
      </div>
      <div className="flex flex-col items-start ml-3 min-w-0">
        <span className="font-ui font-semibold text-base text-text-primary leading-tight">
          {label}
        </span>
        <span className="font-ui text-[13px] text-text-muted leading-tight mt-0.5">
          {sublabel}
        </span>
      </div>
      <ChevronRight className="w-5 h-5 text-text-muted ml-auto shrink-0" />
    </button>
  )
}
