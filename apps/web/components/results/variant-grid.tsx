'use client'

import { RefreshCw } from 'lucide-react'
import { cn } from '@/lib/utils'

const VARIANTS = [
  { id: 1, gradient: 'linear-gradient(135deg, #fdf0eb, #f5d5c5)' },
  { id: 2, gradient: 'linear-gradient(135deg, #f5e6d3, #e8c9a8)' },
  { id: 3, gradient: 'linear-gradient(135deg, #fef9f0, #fdecd5)' },
  { id: 4, gradient: 'linear-gradient(135deg, #f8e8d8, #f0cdb0)' },
] as const

interface VariantGridProps {
  selectedId: number
  onSelect: (id: number) => void
  onRegenerate?: () => void
  className?: string
}

export function VariantGrid({ selectedId, onSelect, onRegenerate, className }: VariantGridProps) {
  return (
    <div className={className}>
      <div className="flex items-center justify-between mb-2">
        <span className="text-[14px] font-semibold text-text-primary">All variations</span>
        <button
          onClick={onRegenerate}
          className="flex items-center gap-1.5 text-text-muted hover:text-text-primary transition-colors"
        >
          <RefreshCw className="w-3.5 h-3.5" />
          <span className="text-[13px]">Regenerate</span>
        </button>
      </div>

      <div className="grid grid-cols-2 gap-2">
        {VARIANTS.map((variant) => {
          const isSelected = selectedId === variant.id
          return (
            <button
              key={variant.id}
              onClick={() => onSelect(variant.id)}
              className={cn(
                'relative aspect-square rounded-[10px] overflow-hidden border transition-all',
                isSelected
                  ? 'ring-2 ring-[#D64C1A] ring-inset border-[#D64C1A]'
                  : 'border-border-default'
              )}
              style={{ background: variant.gradient }}
            >
              {isSelected && (
                <div className="absolute top-2 right-2 w-5 h-5 rounded-full bg-[#D64C1A] flex items-center justify-center">
                  <svg viewBox="0 0 10 10" fill="none" stroke="white" strokeWidth="2.5" className="w-3 h-3">
                    <polyline points="1.5,5 4,7.5 8.5,2.5" />
                  </svg>
                </div>
              )}
            </button>
          )
        })}
      </div>
    </div>
  )
}
